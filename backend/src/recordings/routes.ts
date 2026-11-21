import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { isAdmin } from "../auth/access.js"
import { audit_events, cohort_batches, media_assets, processing_jobs, recording_chapters, recording_provider_events, recording_revisions } from "../db/schema.js"
import { conflict, forbidden, notFound } from "../errors.js"
import { authenticate, me, parse } from "../http.js"
import { lockBatch } from "../learning/admission.js"
import { assertBatchAuthor, batchFor, sessionFor, sessionScope } from "../live/access.js"
import { beginUpload, verifyUpload } from "../storage/uploads.js"
import { objectKey } from "../storage/storage.js"
import { recordingFor } from "./access.js"
import { attachBatchVideo, attachRecording, editRecording, publishRecording, recordingPlayback, replaceRecording } from "./service.js"
import { latestRecordingRequest } from "../approvals/requests.js"
import { withdrawRequest } from "../approvals/service.js"
import { zoomRecordingWebhook } from "./zoom.js"

export async function recordingModule(app: FastifyInstance, ctx: AppContext) {
  await zoomRecordingWebhook(app,ctx)
  await app.register(async scope => {
    scope.addHook("preHandler",authenticate(ctx,["Student","Teacher","Admin","Super Admin"]))
    scope.get("/recordings",async req => {
      const input = parse(z.object({ batch_id: z.string().optional(), session_id: z.string().optional(), course_id: z.string().optional() }),req.query), actor=me(req)
      const rows = await ctx.db.execute(sql`select r.id,r.session_id,r.title,r.summary,r.status,r.version,r.release_at,r.expires_at,r.published_at,r.batch_id,case when r.session_id is null then 'video' else 'replay' end as kind,b.name as batch_name,b.replay_enabled,b.course_id,c.title as course_title,c.code as course_code,coalesce(s.starts_at,r.created_at) as starts_at,coalesce(s.timezone,b.timezone) as timezone,
        a.state as processing_state,a.error as processing_error,a.duration_seconds
        ${actor.role === "Student" ? sql`` : sql`,ap.id as approval_id,ap.state as approval_state,ap.target_version as approval_version,ap.decision_note as approval_note`}
        from lms.recordings r left join lms.live_sessions s on s.id=r.session_id join lms.cohort_batches b on b.id=r.batch_id join lms.media_assets a on a.id=r.asset_id left join lms.courses c on c.id=b.course_id
        ${actor.role === "Student" ? sql`` : sql`left join lateral (select x.id,x.state,x.target_version,x.decision_note from lms.approval_requests x where x.kind='recording.publish' and x.target_id=r.id order by x.created_at desc limit 1) ap on true`}
        where ${sessionScope(actor)} ${input.batch_id ? sql`and b.id=${input.batch_id}` : sql``} ${input.session_id ? sql`and s.id=${input.session_id}` : sql``} ${input.course_id ? sql`and b.course_id=${input.course_id}` : sql``}
        ${actor.role === "Student" ? sql`and ${ctx.config.REPLAY_ENABLED} and (b.replay_enabled or r.session_id is null) and r.status='Published' and r.release_at<=now() and r.expires_at>now() and a.state='ready'` : sql``}
        order by coalesce(s.starts_at,r.created_at) desc limit 1000`)
      return { recordings: rows.rows, replay_enabled: ctx.config.REPLAY_ENABLED }
    })
    scope.get<{ Params: { id: string } }>("/recordings/:id", async req => {
      const { recording: r } = await recordingFor(ctx.db,me(req),req.params.id,true)
      const [asset] = await ctx.db.select().from(media_assets).where(eq(media_assets.id,r.asset_id))
      return { recording:r, approval: await latestRecordingRequest(ctx.db,r.id), asset: { id:asset.id,state:asset.state,error:asset.error,duration_seconds:asset.duration_seconds,transcript:asset.transcript },
        chapters: await ctx.db.select().from(recording_chapters).where(eq(recording_chapters.recording_id,r.id)).orderBy(recording_chapters.position) }
    })
    scope.post<{ Params: { id: string } }>("/recordings/:id/playback",async req => recordingPlayback(ctx,me(req),req.params.id))
    scope.patch<{ Params: { id: string } }>("/recordings/:id",async req => ({ recording: await editRecording(ctx,me(req),req.params.id,parse(z.object({ expected_version:z.number().int().positive(),title:z.string().trim().min(1).max(200),summary:z.string().max(10000),release_at:z.string().datetime({ offset:true }),expires_at:z.string().datetime({ offset:true }),chapters:z.array(z.object({ title:z.string().trim().min(1).max(200),start_seconds:z.number().int().min(0),end_seconds:z.number().int().positive() })).min(1).max(500) }),req.body)) }))
    scope.post<{ Params: { id: string } }>("/recordings/:id/publish",async req => {
      const b=parse(z.object({ expected_version:z.number().int().positive(),publish:z.boolean(),note:z.string().max(1000).optional() }),req.body)
      // A teacher's publish returns the unchanged draft plus the approval request it opened.
      return publishRecording(ctx,me(req),req.params.id,b.expected_version,b.publish,b.note)
    })
    scope.post<{ Params: { id: string } }>("/approvals/:id/withdraw",async req => {
      if(!["Teacher","Admin","Super Admin"].includes(me(req).role)) throw forbidden()
      return withdrawRequest(ctx,me(req),parse(z.string().uuid(),req.params.id))
    })
    scope.get<{ Params: { id: string } }>("/recordings/:id/history",async req => { await recordingFor(ctx.db,me(req),req.params.id,true); return { revisions:await ctx.db.select().from(recording_revisions).where(eq(recording_revisions.recording_id,req.params.id)).orderBy(recording_revisions.version) } })
    scope.post<{ Params: { id: string } }>("/recordings/:id/replace",async req => { const b=parse(z.object({ asset_id:z.string(),expected_version:z.number().int().positive() }),req.body); return { recording:await replaceRecording(ctx,me(req),req.params.id,b.asset_id,b.expected_version) } })
    scope.post("/recordings/attach",async req => { const b=parse(z.object({ session_id:z.string(),asset_id:z.string(),provider_event_id:z.string().optional() }),req.body); if(b.provider_event_id && !isAdmin(me(req))) throw forbidden("Only an administrator can reconcile a provider notice"); return { recording:await attachRecording(ctx,me(req),b.session_id,b.asset_id,b.provider_event_id) } })
    // Uploads are scoped to a batch: either to one of its ended classes (a replay) or to the batch itself (a video outside any class).
    scope.post("/recordings/uploads",async req => {
      const b=parse(z.object({ session_id:z.string().optional(),batch_id:z.string().optional(),filename:z.string().min(1).max(200),content_type:z.enum(["video/mp4","video/webm","video/quicktime"]),bytes:z.number().int().positive().max(ctx.config.MEDIA_MAX_UPLOAD_BYTES) }).refine(v=>Boolean(v.session_id)!==Boolean(v.batch_id),"Choose either a class or a batch"),req.body)
      let sessionId:string|null=null,batchId:string
      if(b.session_id){
        const { session,batch }=await sessionFor(ctx.db,me(req),b.session_id,true)
        if(session.status!=="Ended" || !session.actual_end) throw conflict("End the class before uploading its recording")
        sessionId=session.id; batchId=batch.id
      } else {
        const { batch }=await batchFor(ctx.db,me(req),b.batch_id!,true)
        if(["Completed","Cancelled"].includes(batch.lifecycle)) throw conflict("This batch is closed")
        batchId=batch.id
      }
      const id=randomUUID(),key=objectKey("videos",me(req).id,id,b.filename)
      const upload=await beginUpload(ctx,me(req).id,{ key,bucket:"videos",type:b.content_type,size:b.bytes })
      await ctx.db.insert(media_assets).values({ id,session_id:sessionId,batch_id:batchId,owner_id:me(req).id,source_key:key })
      return { asset_id:id,upload }
    })
    scope.post("/recordings/batch-videos",async req => { const b=parse(z.object({ batch_id:z.string(),asset_id:z.string(),title:z.string().trim().max(200).default("") }),req.body); return { recording:await attachBatchVideo(ctx,me(req),b.batch_id,b.asset_id,b.title) } })
    const scopedAsset=async (id:string,actor:ReturnType<typeof me>) => {
      const [asset]=await ctx.db.select().from(media_assets).where(eq(media_assets.id,id))
      if(!asset || (!asset.session_id && !asset.batch_id)) throw notFound("Recording upload not found")
      if(asset.session_id) await sessionFor(ctx.db,actor,asset.session_id,true); else await batchFor(ctx.db,actor,asset.batch_id!,true)
      return asset
    }
    scope.post<{ Params:{ id:string } }>("/recordings/assets/:id/finalize",async req => {
      const asset=await scopedAsset(req.params.id,me(req)); await verifyUpload(ctx,me(req).id,asset.source_key,"videos")
      await ctx.db.transaction(async tx => { const [locked]=await tx.select().from(media_assets).where(eq(media_assets.id,asset.id)).for("update"); if(locked.state!=="uploading") return
        await tx.insert(processing_jobs).values({ id:randomUUID(),asset_id:asset.id }).onConflictDoNothing(); await tx.update(media_assets).set({ state:"queued" }).where(eq(media_assets.id,asset.id)) })
      return { ok:true }
    })
    scope.get<{ Params:{ id:string } }>("/recordings/assets/:id",async req => { const a=await scopedAsset(req.params.id,me(req)); return { asset:{ id:a.id,state:a.state,error:a.error,duration_seconds:a.duration_seconds } } })
    scope.post<{ Params:{ id:string } }>("/recordings/assets/:id/retry",async req => {
      const asset=await scopedAsset(req.params.id,me(req))
      await ctx.db.transaction(async tx => { const [job]=await tx.select().from(processing_jobs).where(eq(processing_jobs.asset_id,asset.id)).for("update"); if(job?.state!=="failed") throw conflict("Only failed processing can be retried")
        await tx.update(processing_jobs).set({ state:"queued",attempts:0,error:null,available_at:new Date() }).where(eq(processing_jobs.id,job.id)); await tx.update(media_assets).set({ state:"queued",error:null }).where(eq(media_assets.id,asset.id)) })
      return { ok:true }
    })
    scope.get<{ Params:{ id:string } }>("/recordings/batches/:id/assets",async req => {
      const input=parse(z.object({ session_id:z.string().optional() }),req.query)
      if(input.session_id) { const {batch}=await sessionFor(ctx.db,me(req),input.session_id,true); if(batch.id!==req.params.id) throw forbidden("Session belongs to another batch") }
      else await assertBatchAuthor(ctx.db,me(req),req.params.id)
      const [batch]=await ctx.db.select().from(cohort_batches).where(eq(cohort_batches.id,req.params.id)); if(!batch) throw notFound()
      // Generic course media can be attached only by an admin. Teachers see their explicitly scoped recording uploads.
      const assets=await ctx.db.execute(sql`select a.id,a.state,a.error,a.duration_seconds,a.session_id from lms.media_assets a where (a.batch_id=${batch.id} ${batch.course_id ? sql`or a.course_id=${batch.course_id}` : sql``})
        and (${input.session_id ? sql`a.session_id=${input.session_id}` : sql`(a.session_id in(select id from lms.live_sessions where batch_id=${batch.id}) or (a.batch_id=${batch.id} and a.session_id is null))`} ${isAdmin(me(req)) ? sql`or a.session_id is null` : sql``}) order by a.created_at desc limit 100`)
      return { assets:assets.rows,replay_enabled:batch.replay_enabled }
    })
    scope.put<{ Params:{ id:string } }>("/recordings/batches/:id/settings",async req => {
      if(!isAdmin(me(req))) throw forbidden("Only an administrator can change replay access")
      const b=parse(z.object({ replay_enabled:z.boolean() }),req.body)
      await ctx.db.transaction(async tx => { await lockBatch(tx,req.params.id); await tx.update(cohort_batches).set(b).where(eq(cohort_batches.id,req.params.id)); await tx.insert(audit_events).values({ actor_id:me(req).id,actor_role:me(req).role,action:"batch.replay-access",target:req.params.id,outcome:b.replay_enabled?"enabled":"disabled" }) })
      return { ok:true }
    })
    scope.get("/recordings/provider-notices",async req => { if(!isAdmin(me(req))) throw forbidden(); return { notices:await ctx.db.select().from(recording_provider_events).where(eq(recording_provider_events.state,"Awaiting upload")).limit(1000) } })
  },{ prefix:"/api" })
}
