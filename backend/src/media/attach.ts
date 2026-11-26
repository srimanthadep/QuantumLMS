import { and, eq } from "drizzle-orm"
import type { Db } from "../db/client.js"
import { lessons, media_assets, media_variants } from "../db/schema.js"
import { badRequest, notFound } from "../errors.js"
import { contentChanged, lockCourse, snapshotLesson } from "../learning/content.js"

/**
 * Puts a processed video on a course lesson. Used by the "Attach" action and by the worker, which attaches an upload to
 * the lesson it was made for once processing finishes. `onlyIfEmpty` skips lessons that already have a video, so a
 * replacement in a live course still waits for an author to attach it.
 */
export async function attachAssetToLesson(db: Db, assetId: string, lessonId: string, actorId: string, opts: { onlyIfEmpty?: boolean } = {}) {
  const [asset] = await db.select().from(media_assets).where(eq(media_assets.id, assetId))
  if (!asset) throw notFound("Media asset not found")
  if (asset.state !== "ready") throw badRequest("Wait for successful processing before attaching this asset")
  const variants = await db.select().from(media_variants).where(eq(media_variants.asset_id, asset.id))
  const qualities = Object.fromEntries(variants.map(v => [v.quality, { url: `/api/files/videos/${v.key}`, height: v.height }]))
  const preferred = variants.find(v => v.quality === "720p") ?? variants[0]
  if (!preferred) throw badRequest("No playable variants exist")
  const courseId = asset.course_id
  if (!courseId) throw badRequest("Batch videos belong to their batch and cannot be attached to a course lesson")
  return db.transaction(async tx => {
    await lockCourse(tx, courseId)
    const [freshAsset] = await tx.select().from(media_assets).where(eq(media_assets.id, asset.id)).for("update")
    if (freshAsset.session_id) throw badRequest("Recordings cannot be attached to course lessons; use batch replay")
    const [current] = await tx.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.course_id, courseId)))
    if (!current || current.archived_at || current.type !== "video") throw badRequest("Select an active video lesson in this asset's course")
    if (opts.onlyIfEmpty && current.media_asset_id) return null
    await snapshotLesson(tx, current, actorId, "replace-media")
    const [row] = await tx.update(lessons).set({ media_asset_id: asset.id, video_url: `/api/files/videos/${preferred.key}`,
      video_qualities: qualities, minutes: Math.ceil((asset.duration_seconds ?? 0) / 60) }).where(eq(lessons.id, current.id)).returning()
    await contentChanged(tx, courseId, actorId, "lesson.media-replaced")
    return row
  })
}
