import { eq } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import type { Tx } from "../db/client.js"
import { cohort_batches, media_assets, recordings } from "../db/schema.js"
import { forbidden, notFound } from "../errors.js"
import { batchFor, sessionFor } from "../live/access.js"

export async function recordingFor(db: Tx, actor: AuthUser, id: string, author = false) {
  const [recording] = await db.select().from(recordings).where(eq(recordings.id,id))
  if (!recording) throw notFound("Recording not found")
  // A recording with a session is a class replay. One without is a video the teacher uploaded straight to the batch.
  if (recording.session_id) return { recording, ...(await sessionFor(db, actor, recording.session_id, author)) }
  return { recording, session: null, ...(await batchFor(db, actor, recording.batch_id, author)) }
}
export function assertReplayWindow(ctx: AppContext, recording: typeof recordings.$inferSelect, batch: typeof cohort_batches.$inferSelect, now = new Date()) {
  // The replay switch only governs class replays; batch videos are uploaded content and stay available.
  if (!ctx.config.REPLAY_ENABLED || (recording.session_id && !batch.replay_enabled)) throw forbidden("Replays are disabled for this batch")
  if (recording.status !== "Published" || now < recording.release_at || now >= recording.expires_at) throw forbidden("This replay is not released or its access window has ended")
}
/** A recording asset keeps its batch scope even after replacement or if its storage key is used elsewhere. */
export async function authorizeRecordingAsset(ctx: AppContext, actor: AuthUser, assetId: string, db: Tx = ctx.db) {
  const [asset] = await db.select().from(media_assets).where(eq(media_assets.id, assetId))
  if (!asset?.session_id && !asset?.batch_id) return
  const { batch } = asset.session_id ? await sessionFor(db, actor, asset.session_id, actor.role !== "Student") : await batchFor(db, actor, asset.batch_id!, actor.role !== "Student")
  if (actor.role === "Student") {
    const [recording] = await db.select().from(recordings).where(eq(recordings.asset_id, assetId))
    if (asset.state !== "ready") throw forbidden("Recording is not ready")
    if (!recording) throw forbidden("This recording version is not available")
    assertReplayWindow(ctx, recording, batch)
    return Math.max(1,Math.min(300,Math.floor((recording.expires_at.getTime()-Date.now())/1000)))
  }
}
