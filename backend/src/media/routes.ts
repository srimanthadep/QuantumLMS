import { authorizeRecordingAsset } from "../recordings/access.js"
import { lessonPlayback } from "../storage/lesson-playback.js"
import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { assertCourseAccess } from "../auth/access.js"
import { lessons, media_assets, media_variants, processing_jobs } from "../db/schema.js"
import { badRequest, notFound } from "../errors.js"
import { parse } from "../http.js"
import { beginUpload, verifyUpload } from "../storage/uploads.js"
import { attachAssetToLesson } from "./attach.js"
import { objectKey } from "../storage/storage.js"
import { invalidateCatalogCache } from "../modules/student/courses.js"

/** Registered only inside authenticated author scopes (admin, or teacher with explicit assignment). */
export async function mediaRoutes(app: FastifyInstance, ctx: AppContext) {
  app.post<{ Params: { id: string } }>("/lessons/:id/playback", async req => lessonPlayback(ctx, req.user!, req.params.id))
  const getAsset = async (id: string, user: NonNullable<Parameters<typeof assertCourseAccess>[1]>) => {
    const asset = await ctx.db.query.media_assets.findFirst({ where: eq(media_assets.id, id) })
    if (!asset) throw notFound("Media asset not found")
    if (asset.session_id || asset.batch_id) await authorizeRecordingAsset(ctx,user,asset.id)
    else await assertCourseAccess(ctx.db, user, asset.course_id!)
    return asset
  }
  app.get("/media", async req => {
    const input = parse(z.object({ courseId: z.string().min(1) }), req.query)
    await assertCourseAccess(ctx.db, req.user!, input.courseId)
    return { assets: await ctx.db.select().from(media_assets).where(and(eq(media_assets.course_id, input.courseId), sql`${media_assets.session_id} is null`)) }
  })
  app.post("/media/uploads", async req => {
    const input = parse(z.object({ courseId: z.string().min(1), filename: z.string().min(1).max(200),
      contentType: z.enum(["video/mp4", "video/webm", "video/quicktime"]), bytes: z.number().int().positive().max(ctx.config.MEDIA_MAX_UPLOAD_BYTES),
      lessonId: z.string().min(1).optional() }), req.body)
    await assertCourseAccess(ctx.db, req.user!, input.courseId)
    if (input.lessonId) {
      const [target] = await ctx.db.select().from(lessons).where(and(eq(lessons.id, input.lessonId), eq(lessons.course_id, input.courseId)))
      if (!target || target.archived_at || target.type !== "video") throw badRequest("Select an active video lesson in this course")
    }
    const id = randomUUID()
    const key = objectKey("videos", req.user!.id, id, input.filename)
    const target = await beginUpload(ctx, req.user!.id, { key, bucket: "videos", type: input.contentType, size: input.bytes })
    const [asset] = await ctx.db.insert(media_assets).values({ id, course_id: input.courseId, owner_id: req.user!.id, source_key: key, target_lesson_id: input.lessonId ?? null }).returning()
    return { asset, upload: target }
  })
  app.post<{ Params: { id: string } }>("/media/:id/finalize", async req => {
    const asset = await getAsset(req.params.id, req.user!)
    // Ownership is checked even for admins: a presigned upload cannot be borrowed from another account.
    await verifyUpload(ctx, req.user!.id, asset.source_key, "videos")
    await ctx.db.transaction(async tx => {
      const [locked] = await tx.select().from(media_assets).where(eq(media_assets.id, asset.id)).for("update")
      if (locked.state !== "uploading") return
      await tx.insert(processing_jobs).values({ id: randomUUID(), asset_id: asset.id }).onConflictDoNothing()
      await tx.update(media_assets).set({ state: "queued" }).where(eq(media_assets.id, asset.id))
    })
    return { asset: await getAsset(asset.id, req.user!) }
  })
  app.get<{ Params: { id: string } }>("/media/:id", async req => {
    const asset = await getAsset(req.params.id, req.user!)
    const job = await ctx.db.query.processing_jobs.findFirst({ where: eq(processing_jobs.asset_id, asset.id) })
    const variants = await ctx.db.select().from(media_variants).where(eq(media_variants.asset_id, asset.id))
    return { asset, job: job ? { state: job.state, attempts: job.attempts, error: job.error } : null,
      variants: await Promise.all(variants.map(async v => ({ ...v, url: await ctx.storage.createDownloadUrl(v.key, { expiresInSeconds: 300 }) }))) }
  })
  app.post<{ Params: { id: string } }>("/media/:id/retry", async req => {
    const asset = await getAsset(req.params.id, req.user!)
    await ctx.db.transaction(async tx => {
      const [job] = await tx.select().from(processing_jobs).where(eq(processing_jobs.asset_id, asset.id)).for("update")
      if (!job || job.state !== "failed") throw badRequest("Only a failed job can be retried")
      await tx.update(processing_jobs).set({ state: "queued", attempts: 0, error: null, available_at: new Date() }).where(eq(processing_jobs.id, job.id))
      await tx.update(media_assets).set({ state: "queued", error: null }).where(eq(media_assets.id, asset.id))
    })
    return { ok: true }
  })
  app.post<{ Params: { id: string } }>("/media/:id/attach", async req => {
    const input = parse(z.object({ lessonId: z.string().min(1) }), req.body)
    const asset = await getAsset(req.params.id, req.user!)
    const lesson = await attachAssetToLesson(ctx.db, asset.id, input.lessonId, req.user!.id)
    invalidateCatalogCache()
    return { lesson }
  })
}

/** Admin only: every upload and its processing state, newest first, for the Video uploads page. */
export async function mediaOverviewRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/media/overview", async () => {
    const rows = await ctx.db.execute(sql`
      select a.id, a.state, a.error, a.created_at, a.duration_seconds, a.source_key, a.course_id, a.batch_id,
        c.title as course_title, b.name as batch_name, u.full_name as uploader,
        j.state as job_state, j.attempts, j.max_attempts, j.error as job_error, j.completed_at
      from lms.media_assets a
      left join lms.courses c on c.id = a.course_id
      left join lms.cohort_batches b on b.id = a.batch_id
      left join lms.users u on u.id = a.owner_id
      left join lms.processing_jobs j on j.asset_id = a.id
      order by a.created_at desc
      limit 200`)
    return { assets: rows.rows }
  })
}
