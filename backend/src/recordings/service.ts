import { isAdmin } from "../auth/access.js"
import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import type { Tx } from "../db/client.js"
import { audit_events, cohort_batches, live_sessions, media_assets, media_variants, recordings, recording_chapters, recording_provider_events, recording_revisions } from "../db/schema.js"
import { closeRecordingRequests, openRecordingRequest } from "../approvals/requests.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { lockBatch } from "../learning/admission.js"
import { lockCourse } from "../learning/content.js"
import { assertBatchAuthor, sessionFor } from "../live/access.js"
import { notifyBatch } from "../live/schedules.js"
import { assertReplayWindow, recordingFor } from "./access.js"

export type Chapter = { title: string; start_seconds: number; end_seconds: number }
export function validateChapters(chapters: Chapter[], duration: number) {
  if (!chapters.length || chapters.length > 500) throw badRequest("Add between 1 and 500 chapters")
  let previousEnd = 0
  for (const c of chapters) {
    if (!c.title.trim() || c.title.length>200 || !Number.isInteger(c.start_seconds) || !Number.isInteger(c.end_seconds) || c.start_seconds < previousEnd || c.end_seconds<=c.start_seconds || c.end_seconds>duration) throw badRequest("Chapters must be ordered, non-overlapping, and within the recording duration")
    previousEnd = c.end_seconds
  }
}
function expiry(end: Date, months: number) { const result = new Date(end); const day = result.getUTCDate(); result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth()+months); const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth()+1, 0)).getUTCDate(); result.setUTCDate(Math.min(day,last)); return result }
async function hasLessonReference(tx: Tx, asset: typeof media_assets.$inferSelect) {
  const rows = await tx.execute(sql`select 1 from lms.lessons l where l.media_asset_id=${asset.id}
    or l.video_url in (${asset.source_key},${`/api/files/${asset.source_key}`},${`/api/files/videos/${asset.source_key}`})
    or exists(select 1 from lms.media_variants v where v.asset_id=${asset.id} and
      (l.video_url in(v.key,'/api/files/'||v.key,'/api/files/videos/'||v.key) or position(v.key in coalesce(l.video_qualities::text,''))>0)) limit 1`)
  return rows.rows.length>0
}
export async function initializeChapters(tx: Tx, id: string) {
  const [r] = await tx.select().from(recordings).where(eq(recordings.id,id)).for("update")
  if (!r || r.chapters_initialized) return
  const [asset] = await tx.select().from(media_assets).where(eq(media_assets.id,r.asset_id))
  if (asset?.state !== "ready" || !asset.duration_seconds) return
  const draft = (asset.draft_chapters ?? []) as { start: number; title: string }[]
  const starts = [...new Set([0,...draft.filter(c => Number.isFinite(c.start) && c.start>=0 && c.start<asset.duration_seconds!).map(c => Math.floor(c.start))])].sort((a,b)=>a-b).slice(0,500)
  const chapters = starts.map((start,i) => ({ id: randomUUID(), recording_id: id, position: i+1, title: draft.find(c => Math.floor(c.start)===start)?.title?.trim().slice(0,200) || (i===0 ? "Introduction" : `Chapter ${i+1}`), start_seconds: start, end_seconds: starts[i+1] ?? asset.duration_seconds! }))
  await tx.insert(recording_chapters).values(chapters)
  await tx.update(recordings).set({ chapters_initialized: true }).where(eq(recordings.id,id))
}
export async function initializeAssetRecordings(tx: Tx, asset: string) {
  const rows = await tx.select({ id: recordings.id }).from(recordings).where(eq(recordings.asset_id,asset))
  for (const r of rows) await initializeChapters(tx,r.id)
}
export async function attachRecording(ctx: AppContext, actor: AuthUser, sessionId: string, assetId: string, providerEventId?: string) {
  const context = await sessionFor(ctx.db, actor, sessionId, true)
  return ctx.db.transaction(async tx => {
    if (context.batch.course_id) await lockCourse(tx,context.batch.course_id)
    const batch = await lockBatch(tx,context.batch.id)
    const { session } = await sessionFor(tx,actor,sessionId,true)
    if (session.status !== "Ended" || !session.actual_end) throw conflict("End the session before attaching its recording")
    if (!batch.ends_at) throw badRequest("Set the batch end before attaching a replay")
    const [asset] = await tx.select().from(media_assets).where(eq(media_assets.id,assetId)).for("update")
    if (!asset || !ownsAsset(asset,batch) || (asset.session_id && asset.session_id !== sessionId)) throw badRequest("Choose an asset for this session and batch")
    if (!asset.session_id && asset.batch_id !== batch.id && !isAdmin(actor)) throw badRequest("Use a recording upload scoped to this batch")
    if (await hasLessonReference(tx,asset)) throw conflict("This asset is used by a course lesson. Upload a separate recording file.")
    const [existing] = await tx.select().from(recordings).where(eq(recordings.session_id,sessionId)).for("update")
    if (existing) { if (existing.asset_id===assetId) return existing; throw conflict("This session already has a recording. Use its explicit replacement action.") }
    if (providerEventId) {
      const [notice] = await tx.select().from(recording_provider_events).where(eq(recording_provider_events.id,providerEventId)).for("update")
      if (!notice || notice.state !== "Awaiting upload") throw conflict("This provider notice is missing or already linked")
      await tx.update(recording_provider_events).set({ state: "Uploaded" }).where(eq(recording_provider_events.id,providerEventId))
    }
    const release = new Date(session.actual_end.getTime()+batch.replay_delay_hours*3600000), expires = expiry(batch.ends_at,batch.access_expiry_months)
    if (expires<=release) throw badRequest("The batch replay expiry must be after the recording release time")
    await tx.update(media_assets).set({ session_id: sessionId }).where(eq(media_assets.id,asset.id))
    const [r] = await tx.insert(recordings).values({ id: randomUUID(), session_id: sessionId, batch_id: batch.id, asset_id: asset.id, title: session.title, release_at: release, expires_at: expires, provider_event_id: providerEventId }).returning()
    await initializeChapters(tx,r.id)
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "recording.attached", target: r.id, outcome: "draft" })
    return r
  })
}
/** An asset belongs to a batch when it was uploaded for it. Older uploads stay usable while the batch still carries the same course link. */
function ownsAsset(asset: typeof media_assets.$inferSelect, batch: typeof cohort_batches.$inferSelect) {
  return asset.batch_id === batch.id || (asset.course_id !== null && asset.course_id === batch.course_id)
}
/**
 * A batch video is content a teacher uploads straight to the batch, outside any live class (a workshop recap, bonus lesson, notes walkthrough).
 * It uses the same processing, review, approval and signed-playback pipeline as a class replay, but has no class to anchor its dates:
 * it becomes available as soon as it is published and ends with the batch's access window.
 */
export async function attachBatchVideo(ctx: AppContext, actor: AuthUser, batchId: string, assetId: string, title: string) {
  await assertBatchAuthor(ctx.db,actor,batchId)
  return ctx.db.transaction(async tx => {
    const batch = await lockBatch(tx,batchId)
    if (!batch.ends_at) throw badRequest("Set the batch end date before adding videos")
    const [asset] = await tx.select().from(media_assets).where(eq(media_assets.id,assetId)).for("update")
    if (!asset || asset.batch_id !== batch.id || asset.session_id) throw badRequest("Choose a video uploaded for this batch")
    const [existing] = await tx.select().from(recordings).where(eq(recordings.asset_id,asset.id))
    if (existing) return existing
    const release = new Date(), expires = expiry(batch.ends_at,batch.access_expiry_months)
    if (expires<=release) throw badRequest("This batch's access window has already ended")
    const [r] = await tx.insert(recordings).values({ id: randomUUID(), session_id: null, batch_id: batch.id, asset_id: asset.id, title: title.trim().slice(0,200) || "Untitled video", release_at: release, expires_at: expires }).returning()
    await initializeChapters(tx,r.id)
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "recording.video-added", target: r.id, outcome: "draft" })
    return r
  })
}
async function revision(tx: Tx, r: typeof recordings.$inferSelect, actor: AuthUser) {
  const chapters = await tx.select().from(recording_chapters).where(eq(recording_chapters.recording_id,r.id)).orderBy(recording_chapters.position)
  await tx.insert(recording_revisions).values({ id: randomUUID(), recording_id: r.id, version: r.version, snapshot: { ...r, chapters }, actor_id: actor.id })
}
export async function editRecording(ctx: AppContext, actor: AuthUser, id: string, input: { expected_version: number; title: string; summary: string; release_at: string; expires_at: string; chapters: Chapter[] }) {
  const hint = await recordingFor(ctx.db,actor,id,true)
  return ctx.db.transaction(async tx => {
    const batch = await lockBatch(tx,hint.batch.id); const session = hint.session ? (await sessionFor(tx,actor,hint.session.id,true)).session : null
    const [r] = await tx.select().from(recordings).where(eq(recordings.id,id)).for("update")
    if (r.version !== input.expected_version) throw conflict("Recording changed. Refresh before saving")
    const [asset] = await tx.select().from(media_assets).where(eq(media_assets.id,r.asset_id))
    if (asset.state !== "ready" || !asset.duration_seconds) throw conflict("Processing must finish successfully before review")
    validateChapters(input.chapters,asset.duration_seconds)
    const release = new Date(input.release_at), expires = new Date(input.expires_at)
    const earliest = !session ? 0 : session.actual_end ? session.actual_end.getTime()+batch.replay_delay_hours*3600000 : Infinity
    if (!batch.ends_at || release.getTime()<earliest || expires>expiry(batch.ends_at,batch.access_expiry_months) || expires<=release) throw badRequest("Dates must respect the batch release delay and access expiry")
    await revision(tx,r,actor)
    await tx.delete(recording_chapters).where(eq(recording_chapters.recording_id,id))
    await tx.insert(recording_chapters).values(input.chapters.map((c,i)=>({ ...c,title:c.title.trim(),id:randomUUID(),recording_id:id,position:i+1 })))
    const [updated] = await tx.update(recordings).set({ title: input.title, summary: input.summary, release_at: release, expires_at: expires, status: "Draft", published_at: null, published_by: null, version: r.version+1, updated_at: new Date() }).where(eq(recordings.id,id)).returning()
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "recording.reviewed", target: id, outcome: "draft" })
    await closeRecordingRequests(tx,id,"Superseded",{ actor, note: "The recording was edited after this request." })
    return updated
  })
}
export async function replaceRecording(ctx: AppContext, actor: AuthUser, id: string, assetId: string, expectedVersion: number) {
  const hint = await recordingFor(ctx.db,actor,id,true)
  return ctx.db.transaction(async tx => {
    const sessionId = hint.session?.id ?? null
    if (hint.batch.course_id) await lockCourse(tx,hint.batch.course_id)
    await lockBatch(tx,hint.batch.id); if (sessionId) await sessionFor(tx,actor,sessionId,true)
    const [asset] = await tx.select().from(media_assets).where(eq(media_assets.id,assetId)).for("update")
    if (!asset || !ownsAsset(asset,hint.batch) || (asset.session_id && asset.session_id !== sessionId) || asset.state !== "ready") throw badRequest("Choose a ready video for this batch")
    if (!asset.session_id && asset.batch_id !== hint.batch.id && !isAdmin(actor)) throw badRequest("Use an upload scoped to this batch")
    if (await hasLessonReference(tx,asset)) throw conflict("A lesson asset cannot become a recording")
    const [r] = await tx.select().from(recordings).where(eq(recordings.id,id)).for("update")
    if (r.asset_id===assetId) return r
    if (r.version!==expectedVersion) throw conflict("Recording changed. Refresh before replacing it")
    await revision(tx,r,actor)
    if (sessionId) await tx.update(media_assets).set({ session_id: sessionId }).where(eq(media_assets.id,assetId))
    await tx.delete(recording_chapters).where(eq(recording_chapters.recording_id,id))
    const [saved] = await tx.update(recordings).set({ asset_id: assetId, version: r.version+1, status: "Draft", chapters_initialized: false, published_at: null, published_by: null, updated_at: new Date() }).where(eq(recordings.id,id)).returning()
    await initializeChapters(tx,id)
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "recording.replaced", target: id, outcome: "draft; previous version retained" })
    await closeRecordingRequests(tx,id,"Superseded",{ actor, note: "The recording video was replaced after this request." })
    return saved
  })
}
/** Server-side checks every publication must pass, whether an admin publishes or approves a teacher's request. */
export async function assertPublishable(tx: Tx, r: typeof recordings.$inferSelect, batch: typeof cohort_batches.$inferSelect, session: typeof live_sessions.$inferSelect | null) {
  const [asset] = await tx.select().from(media_assets).where(eq(media_assets.id,r.asset_id))
  const variants = await tx.select().from(media_variants).where(eq(media_variants.asset_id,asset.id))
  if (asset.state !== "ready" || !asset.duration_seconds || !variants.length || (session && session.status !== "Ended")) throw conflict(session ? "A successfully processed recording and ended class are required" : "A successfully processed video is required")
  validateChapters(await tx.select().from(recording_chapters).where(eq(recording_chapters.recording_id,r.id)).orderBy(recording_chapters.position),asset.duration_seconds)
  if ((session && (!session.actual_end || r.release_at.getTime()<session.actual_end.getTime()+batch.replay_delay_hours*3600000)) || r.expires_at<=new Date() || !batch.ends_at || r.expires_at>expiry(batch.ends_at,batch.access_expiry_months)) throw conflict("Review the replay access window before publishing")
}
/** Writes the publication change. Callers hold the batch and recording locks and have run assertPublishable when publishing. */
export async function applyPublication(tx: Tx, actor: AuthUser, r: typeof recordings.$inferSelect, batch: typeof cohort_batches.$inferSelect, publish: boolean) {
  await revision(tx,r,actor)
  const [saved] = await tx.update(recordings).set({ status: publish ? "Published" : "Draft", published_at: publish ? new Date() : null, published_by: publish ? actor.id : null, version: r.version+1, updated_at: new Date() }).where(eq(recordings.id,r.id)).returning()
  await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: publish ? "recording.published" : "recording.unpublished", target: r.id, outcome: "success" })
  if (publish) await notifyBatch(tx,batch.id,r.session_id ? "Replay published" : "New batch video",r.session_id ? `${r.title} is ready to replay.` : `${r.title} was added to your batch.`,{key:`replay:${r.id}:${saved.version}`,availableAt:r.release_at,link:"courses",guard:{recording:r.id,version:saved.version}})
  return saved
}
/**
 * Administrators publish directly. A teacher's publish becomes an approval request after the same checks;
 * unpublishing stays immediate for everyone because it only reduces access.
 */
export async function publishRecording(ctx: AppContext, actor: AuthUser, id: string, expectedVersion: number, publish: boolean, note = "") {
  const hint = await recordingFor(ctx.db,actor,id,true)
  return ctx.db.transaction(async tx => {
    const batch = await lockBatch(tx,hint.batch.id); const session = hint.session ? (await sessionFor(tx,actor,hint.session.id,true)).session : null
    const [r] = await tx.select().from(recordings).where(eq(recordings.id,id)).for("update")
    if (r.version !== expectedVersion) throw conflict("Recording changed. Refresh before publishing")
    if (r.status === (publish ? "Published" : "Draft")) return { recording: r, approval: null }
    if (publish) await assertPublishable(tx,r,batch,session)
    if (publish && !isAdmin(actor)) return { recording: r, approval: await openRecordingRequest(tx,actor,r,batch,note) }
    const saved = await applyPublication(tx,actor,r,batch,publish)
    if (publish) await closeRecordingRequests(tx,r.id,"Approved",{ actor, version: r.version, note: "Published directly by an administrator.", title: r.title, batchName: batch.name })
    return { recording: saved, approval: null }
  })
}
export async function recordingPlayback(ctx: AppContext, actor: AuthUser, id: string) {
  const { recording: r, batch } = await recordingFor(ctx.db,actor,id,actor.role !== "Student")
  if (actor.role === "Student") assertReplayWindow(ctx,r,batch)
  const [asset] = await ctx.db.select().from(media_assets).where(eq(media_assets.id,r.asset_id))
  if (asset?.state !== "ready") throw conflict("Recording is still processing or needs attention")
  const variants = await ctx.db.select().from(media_variants).where(eq(media_variants.asset_id,asset.id))
  if (!variants.length) throw notFound("Playable recording is unavailable")
  // Signed links never outlive the replay window, even when less than five minutes remain.
  const seconds = actor.role === "Student" ? Math.max(1,Math.min(300,Math.floor((r.expires_at.getTime()-Date.now())/1000))) : 300
  const qualities: Record<string,{url:string}> = Object.fromEntries(await Promise.all(variants.map(async v => [v.quality,{ url: await ctx.storage.createDownloadUrl(v.key,{ expiresInSeconds: seconds }) }] as const)))
  await ctx.db.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "recording.playback", target: id, outcome: "signed" })
  return { url: qualities["720p"]?.url ?? Object.values(qualities)[0].url, qualities, expires_in: seconds, duration_seconds: asset.duration_seconds,
    chapters: await ctx.db.select({ title: recording_chapters.title, start_seconds: recording_chapters.start_seconds, end_seconds: recording_chapters.end_seconds }).from(recording_chapters).where(eq(recording_chapters.recording_id,id)).orderBy(recording_chapters.position) }
}
