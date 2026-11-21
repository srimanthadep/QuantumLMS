import { and, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import type { AppContext } from "../context.js"
import type { Tx } from "../db/client.js"
import { notification_outbox, notifications, profiles, users } from "../db/schema.js"
import { authenticate, me } from "../http.js"
import { notify, type DeliveryOptions } from "../modules/student/notify.js"
import { offeringScope } from "../assessments/access.js"
import { publishRealtime } from "./realtime.js"

async function allowed(tx:Tx,ctx:AppContext,row:typeof notification_outbox.$inferSelect) {
  const [user]=await tx.select().from(users).where(eq(users.id,row.recipient_id));if(!user||user.disabled_at)return false
  const [profile]=await tx.select().from(profiles).where(eq(profiles.id,row.recipient_id))
  const prefs=(profile?.notification_prefs??{}) as Record<string,unknown>
  if(row.preference&&[false,"false"].includes(prefs[row.preference] as boolean|string))return false
  const g=row.guard as Record<string,string>
  if(g.batch) {
    const scope=await tx.execute(sql`select 1 from lms.batch_registrations br where br.student_id=${row.recipient_id}::uuid and br.batch_id=${g.batch} and br.state='confirmed' limit 1`)
    if(!scope.rows.length)return false
  }
  if(g.session) {
    const live=await tx.execute(sql`select 1 from lms.live_sessions where id=${g.session} and status='Scheduled' and starts_at=${g.starts}::timestamptz and starts_at>now()`)
    if(!live.rows.length)return false
  }
  if(g.recording) {
    if(!ctx.config.REPLAY_ENABLED)return false
    const replay=await tx.execute(sql`select 1 from lms.recordings r join lms.cohort_batches b on b.id=r.batch_id join lms.media_assets a on a.id=r.asset_id
      where r.id=${g.recording} and r.version=${Number(g.version)} and r.status='Published' and a.state='ready' and (b.replay_enabled or r.session_id is null) and r.release_at<=now() and r.expires_at>now()`)
    if(!replay.rows.length)return false
  }
  if(g.assessment) {
    const scope=await tx.execute(sql`select ao.id from lms.assessment_offerings ao where ao.id=${g.assessment}::uuid and ${offeringScope(row.recipient_id)} and (ao.available_from is null or ao.available_from<=now())`)
    if(!scope.rows.length||g.due&&new Date(g.due)<=new Date())return false
  }
  if(g.placement){const result=await tx.execute(sql`select 1 from lms.placement_memberships m join lms.placement_tracks t on t.id=m.track_id join lms.completion_credentials c on c.completion_id=m.completion_id where m.id=${g.placement}::uuid and m.eligibility='Eligible' and t.active and c.revoked_at is null`);if(!result.rows.length)return false}
  if(g.credential){const result=await tx.execute(sql`select 1 from lms.completion_credentials where id=${g.credential} and revoked_at is null`);if(!result.rows.length)return false}
  return true
}
/** Row locks plus the delivery transaction make restart/duplicate workers safe. Failures retry indefinitely with capped backoff. */
export async function outboxSweep(ctx:AppContext,options:{limit?:number;beforeDelivery?:(row:typeof notification_outbox.$inferSelect)=>Promise<void>}={}) {
  let count=0
  for(let i=0;i<(options.limit??200);i++) {
    const handled=await ctx.db.transaction(async tx=>{
      const [row]=await tx.select().from(notification_outbox).where(sql`delivered_at is null and skipped_at is null and available_at<=now()`).orderBy(notification_outbox.available_at).limit(1).for("update",{skipLocked:true})
      if(!row)return false
      try {
        await tx.transaction(async delivery=>{
          if(!await allowed(delivery,ctx,row)){await delivery.update(notification_outbox).set({skipped_at:new Date(),last_error:null}).where(eq(notification_outbox.id,row.id));return}
          await options.beforeDelivery?.(row)
          const [note]=await delivery.insert(notifications).values({id:row.id,student_id:row.recipient_id,kind:row.kind,title:row.title,message:row.message,link:row.link}).returning()
          await publishRealtime(delivery,`user:${row.recipient_id}`,"notification",note)
          await publishRealtime(delivery,"notifications","notification",{refresh:true})
          await delivery.update(notification_outbox).set({delivered_at:new Date(),attempts:row.attempts+1,last_error:null}).where(eq(notification_outbox.id,row.id))
        })
      } catch {
        await tx.update(notification_outbox).set({attempts:row.attempts+1,last_error:"Delivery failed; retry scheduled",available_at:new Date(Date.now()+Math.min(3600,2**Math.min(row.attempts+1,12))*1000)}).where(eq(notification_outbox.id,row.id))
      }
      return true
    })
    if(!handled)break;count++
  }
  return count
}
export async function notifyCohort(tx:Tx,batch:string,title:string,message:string,options:DeliveryOptions={}) {
  const rows=await tx.execute(sql`select distinct br.student_id from lms.batch_registrations br where br.batch_id=${batch} and br.state='confirmed'`)
  for(const row of rows.rows)await notify(tx,String(row.student_id),"class",title,message,"schedule","classes",{...options,guard:{batch,...options.guard}})
}
/** Polling also covers learners admitted after a release. Deterministic keys make repeated/overlapping sweeps harmless. */
export async function enqueueReminders(ctx:AppContext) {
  await ctx.db.transaction(async tx=>{
    const sessions=await tx.execute(sql`select id,batch_id,title,starts_at from lms.live_sessions where status='Scheduled' and starts_at>now() and starts_at<=now()+${ctx.config.SESSION_REMINDER_MINUTES}*interval '1 minute'`)
    for(const s of sessions.rows){const starts=new Date(s.starts_at as string).toISOString();await notifyCohort(tx,String(s.batch_id),"Class starting soon",`${s.title} starts at ${starts}. Open your schedule to join.`,{key:`session-reminder:${s.id}:${starts}`,guard:{session:s.id,starts}})}
    const rows=await tx.execute(sql`select distinct ao.id,ao.title,ao.quiz_id,g.student_id,
      case when ao.days_after_enrollment is null then ao.due_at else least(ao.due_at,(select min(starts_at) from lms.entitlement_grants where student_id=g.student_id and offer_id=ao.offer_id and batch_id is null)+ao.days_after_enrollment*interval '1 day') end as due
      from lms.assessment_offerings ao join lms.entitlement_grants g on g.course_id=ao.course_id
      where ao.status='Published' and ao.context<>'legacy' and (ao.available_from is null or ao.available_from<=now())
      and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())
      and ((ao.context='self_paced' and g.offer_id=ao.offer_id and g.batch_id is null) or (ao.context='batch' and g.batch_id=ao.batch_id and exists(select 1 from lms.batch_registrations br where br.batch_id=ao.batch_id and br.student_id=g.student_id and br.state='confirmed')))`)
    for(const a of rows.rows){const due=a.due?new Date(a.due as string):null;if(due&&due<=new Date())continue
      const link=a.quiz_id?"quizzes":"assessments",guard={assessment:a.id,...(due?{due:due.toISOString()}:{})}
      await notify(tx,String(a.student_id),"assessment","Assessment released",`${a.title} is ready in your learning workspace.`,link,"assessments",{key:`assessment-release:${a.id}`,guard})
      if(due&&due.getTime()-Date.now()<=ctx.config.ASSESSMENT_DUE_REMINDER_HOURS*3600000)await notify(tx,String(a.student_id),"assessment","Assessment due soon",`${a.title} is due ${due.toISOString()}.`,link,"assessments",{key:`assessment-due:${a.id}:${due.toISOString()}`,guard})
    }
    const ready=await tx.execute(sql`select b.id,b.name,coalesce(b.minimum_paid_registrations,ceil(b.max_seats*0.6)) as minimum from lms.cohort_batches b
      where b.lifecycle in ('Recruiting','Ready','Scheduled') and (select count(*) from lms.batch_registrations r where r.batch_id=b.id and r.state='confirmed' and r.paid_at is not null)>=coalesce(b.minimum_paid_registrations,ceil(b.max_seats*0.6))`)
    for(const b of ready.rows){const staff=await tx.execute(sql`select id from lms.users where disabled_at is null and (role in ('Admin','Super Admin') or id in(select teacher_id from lms.batch_teachers where batch_id=${b.id}))`)
      for(const u of staff.rows)await notify(tx,String(u.id),"system","Registration target reached",`${b.name} has reached its target of ${b.minimum} paid registrations. Review its teachers and schedule before starting.`,"batches",undefined,{key:`threshold:${b.id}:${b.minimum}`})}
  })
}
export async function notificationRoutes(app:FastifyInstance,ctx:AppContext){
  app.get("/api/notifications",{preHandler:authenticate(ctx)},async req=>ctx.db.select().from(notifications).where(eq(notifications.student_id,me(req).id)).orderBy(desc(notifications.created_at)).limit(100))
  app.post<{Params:{id:string}}>("/api/notifications/:id/read",{preHandler:authenticate(ctx)},async(req,reply)=>{await ctx.db.update(notifications).set({read_at:new Date()}).where(and(eq(notifications.id,req.params.id),eq(notifications.student_id,me(req).id)));return reply.code(204).send()})
}
