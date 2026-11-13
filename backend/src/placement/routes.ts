import { and, desc, eq, sql } from "drizzle-orm"
import { z } from "zod"
import type { FastifyInstance } from "fastify"
import type { AppContext } from "../context.js"
import { isAdmin } from "../auth/access.js"
import { audit_events, courses, job_application_events, placement_jobs, placement_memberships, placement_tracks, resumes, users } from "../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../errors.js"
import { authenticate, me, parse } from "../http.js"
import { applicationFor, applyForJob, membershipFor, memberScope, requestHelp, syncTrack, transitionApplication } from "./service.js"

const jobInput=z.object({track_id:z.uuid(),title:z.string().trim().min(3).max(200),company:z.string().trim().min(2).max(200),location:z.string().trim().min(2).max(200),work_mode:z.enum(["Remote","Hybrid","On-site"]).default("Remote"),employment_type:z.string().trim().min(2).max(80).default("Full-time"),description:z.string().trim().min(30).max(15000),requirements:z.string().max(10000).default(""),status:z.enum(["Draft","Published","Closed"]).default("Draft"),closes_at:z.iso.datetime().nullable().default(null)})
const transitionInput=z.object({status:z.enum(["Reviewing","Shortlisted","Interview","Offered","Placed","Rejected","Withdrawn"]),expected_version:z.number().int().positive(),note:z.string().trim().min(5).max(2000)})
export async function placementModule(app:FastifyInstance,ctx:AppContext) {
  await app.register(async scope=>{
    scope.addHook("preHandler",authenticate(ctx,["Student","Admin","Super Admin","Support"]))
    scope.get("/memberships",async req=>{
      const actor=me(req),result=await ctx.db.execute(sql`select m.*,t.title,t.description,t.active,t.eligible_modes,c.course_id,co.title as course_title,u.full_name as student_name,u.email as student_email,mentor.full_name as mentor_name,
        case when cc.revoked_at is not null then 'Revoked' else m.eligibility end as eligibility,
        (select count(*)::int from lms.job_applications a where a.membership_id=m.id) as applications
        from lms.placement_memberships m join lms.placement_tracks t on t.id=m.track_id join lms.completions c on c.id=m.completion_id join lms.courses co on co.id=c.course_id
        join lms.completion_credentials cc on cc.completion_id=c.id join lms.users u on u.id=m.student_id left join lms.users mentor on mentor.id=m.mentor_id
        where ${memberScope(actor)} order by m.eligible_at desc limit 1000`)
      return {memberships:result.rows}
    })
    scope.get("/applications",async req=>{
      const rows=await ctx.db.execute(sql`select a.id,a.job_id,a.membership_id,a.student_id,a.status,a.version,a.submitted_at,a.updated_at,j.title,j.company,m.mentor_id,u.full_name as student_name,t.title as track_title
        from lms.job_applications a join lms.placement_memberships m on m.id=a.membership_id join lms.placement_jobs j on j.id=a.job_id join lms.placement_tracks t on t.id=m.track_id join lms.users u on u.id=a.student_id
        where ${memberScope(me(req))} order by a.updated_at desc limit 1000`)
      return {applications:rows.rows}
    })
    scope.get<{Params:{id:string}}>("/applications/:id",async req=>{
      const application=await applicationFor(ctx.db,me(req),req.params.id),[job]=await ctx.db.select().from(placement_jobs).where(eq(placement_jobs.id,application.job_id))
      return {application,job,events:await ctx.db.select().from(job_application_events).where(eq(job_application_events.application_id,application.id)).orderBy(desc(job_application_events.version))}
    })
    scope.post<{Params:{id:string}}>("/applications/:id/status",async req=>({application:await ctx.db.transaction(tx=>transitionApplication(tx,me(req),req.params.id,parse(transitionInput,req.body)))}))
  },{prefix:"/api/placement"})
  await app.register(async scope=>{
    scope.addHook("preHandler",authenticate(ctx,["Student"]))
    scope.get("/resume",async req=>{const [resume]=await ctx.db.select().from(resumes).where(eq(resumes.student_id,me(req).id));return {resume:resume?{data:resume.data,updated_at:resume.updated_at}:null}})
    scope.get("/jobs",async req=>{
      const rows=await ctx.db.execute(sql`select j.*,m.id as membership_id,t.title as track_title from lms.placement_jobs j join lms.placement_tracks t on t.id=j.track_id
        join lms.placement_memberships m on m.track_id=t.id join lms.completions c on c.id=m.completion_id join lms.completion_credentials cc on cc.completion_id=c.id
        where m.student_id=${me(req).id}::uuid and m.eligibility='Eligible' and m.status='Active' and cc.revoked_at is null and t.active and j.status='Published' and (j.closes_at is null or j.closes_at>now())
        and (case when c.batch_id is not null then 'live' else 'self_paced' end)=any(t.eligible_modes) order by j.created_at desc limit 500`)
      return {jobs:rows.rows}
    })
    scope.post<{Params:{id:string}}>("/jobs/:id/apply",async req=>{const b=parse(z.object({cover_note:z.string().trim().max(4000).default(""),resume_updated_at:z.iso.datetime()}),req.body);return {application:await ctx.db.transaction(tx=>applyForJob(tx,me(req),req.params.id,b))}})
    scope.post<{Params:{id:string}}>("/memberships/:id/help",async req=>{const b=parse(z.object({application_id:z.uuid().optional(),message:z.string().trim().min(20).max(4000)}),req.body);return ctx.db.transaction(tx=>requestHelp(tx,me(req),req.params.id,b.application_id,b.message))})
  },{prefix:"/api/student/placement"})
  await app.register(async scope=>{
    scope.addHook("preHandler",authenticate(ctx,["Admin","Super Admin","Support"]))
    scope.get("/tracks",async()=>({tracks:await ctx.db.select().from(placement_tracks).orderBy(placement_tracks.title)}))
    scope.get("/jobs",async()=>({jobs:await ctx.db.select().from(placement_jobs).orderBy(desc(placement_jobs.updated_at)).limit(1000)}))
    scope.get("/options",async req=>{
      if(!isAdmin(me(req)))return {courses:[],mentors:[]}
      return {courses:await ctx.db.select({id:courses.id,title:courses.title}).from(courses).where(sql`${courses.deleted_at} is null`),mentors:await ctx.db.select({id:users.id,name:users.full_name,email:users.email}).from(users).where(sql`${users.role}='Support' and ${users.disabled_at} is null`)}
    })
    scope.post("/tracks",async req=>{
      if(!isAdmin(me(req)))throw forbidden("Only administrators configure placement eligibility")
      const b=parse(z.object({course_id:z.string().min(1),title:z.string().trim().min(3).max(200),description:z.string().max(5000).default(""),active:z.boolean().default(true),auto_enroll:z.boolean().default(true),eligible_modes:z.array(z.enum(["live","self_paced"])).min(1).max(2).default(["live","self_paced"]),expected_version:z.number().int().min(0).default(0)}),req.body)
      return ctx.db.transaction(async tx=>{
        const [course]=await tx.select().from(courses).where(eq(courses.id,b.course_id)).for("update");if(!course)throw notFound()
        const [existing]=await tx.select().from(placement_tracks).where(eq(placement_tracks.course_id,b.course_id)).for("update")
        if((existing?.version??0)!==b.expected_version)throw conflict("Track configuration changed. Reload before saving.")
        const {expected_version:_version,...values}=b
        const [track]=existing?await tx.update(placement_tracks).set({...values,version:existing.version+1}).where(eq(placement_tracks.id,existing.id)).returning():await tx.insert(placement_tracks).values(values).returning()
        await syncTrack(tx,track.id)
        await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"placement.track-configured",target:track.id,outcome:`version ${track.version}`});return {track}
      })
    })
    scope.put<{Params:{id:string}}>("/memberships/:id",async req=>{
      if(!isAdmin(me(req)))throw forbidden("Only administrators assign mentors and change membership status")
      const b=parse(z.object({mentor_id:z.uuid().nullable(),status:z.enum(["Active","Placed","Closed"]),expected_version:z.number().int().positive(),reason:z.string().trim().min(5).max(1000)}),req.body)
      return ctx.db.transaction(async tx=>{const m=await membershipFor(tx,me(req),req.params.id,true);if(m.version!==b.expected_version)throw conflict("Membership changed; reload before saving")
        if(b.mentor_id){const [mentor]=await tx.select().from(users).where(and(eq(users.id,b.mentor_id),eq(users.role,"Support"),sql`${users.disabled_at} is null`));if(!mentor)throw badRequest("Choose an active Support/Mentor account")}
        const [membership]=await tx.update(placement_memberships).set({mentor_id:b.mentor_id,status:b.status,version:m.version+1,updated_at:new Date()}).where(eq(placement_memberships.id,m.id)).returning()
        await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"placement.mentor-membership-updated",target:m.id,outcome:b.reason});return {membership}
      })
    })
    scope.post("/jobs",async req=>{
      const b=parse(jobInput,req.body)
      return ctx.db.transaction(async tx=>{const [track]=await tx.select().from(placement_tracks).where(eq(placement_tracks.id,b.track_id));if(!track)throw notFound("Placement track not found");if(b.status==="Published"&&(!track.active||(b.closes_at&&new Date(b.closes_at)<=new Date())))throw badRequest("Publish only to an active track with a future closing date")
        const [job]=await tx.insert(placement_jobs).values({...b,closes_at:b.closes_at?new Date(b.closes_at):null,created_by:me(req).id}).returning();await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"placement.job-created",target:job.id,outcome:job.status});return {job}})
    })
    scope.patch<{Params:{id:string}}>("/jobs/:id",async req=>{
      const b=parse(jobInput.omit({track_id:true}).extend({expected_version:z.number().int().positive()}),req.body)
      return ctx.db.transaction(async tx=>{const [current]=await tx.select().from(placement_jobs).where(eq(placement_jobs.id,req.params.id)).for("update");if(!current)throw notFound();if(current.version!==b.expected_version)throw conflict("Job changed. Reload before editing.")
        const [track]=await tx.select().from(placement_tracks).where(eq(placement_tracks.id,current.track_id));if(b.status==="Published"&&(!track.active||(b.closes_at&&new Date(b.closes_at)<=new Date())))throw badRequest("Publish only to an active track with a future closing date")
        const {expected_version:_version,...values}=b
        const [job]=await tx.update(placement_jobs).set({...values,closes_at:b.closes_at?new Date(b.closes_at):null,version:current.version+1,updated_at:new Date()}).where(eq(placement_jobs.id,current.id)).returning();await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"placement.job-updated",target:job.id,outcome:`${job.status}, version ${job.version}`});return {job}})
    })
  },{prefix:"/api/staff/placement"})
}
