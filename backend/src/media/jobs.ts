import { initializeAssetRecordings } from "../recordings/service.js"
import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { Db } from "../db/client.js"
import { media_assets, media_variants, processing_jobs } from "../db/schema.js"

export interface MediaResult {
  duration: number
  variants: { quality: string; key: string; bytes: number; height: number }[]
  transcript: { start: number; end: number; text: string }[]
  chapters: { start: number; title: string }[]
}
export type ClaimedJob = typeof processing_jobs.$inferSelect

export async function claimJob(db: Db, leaseSeconds = 120): Promise<ClaimedJob | undefined> {
  return db.transaction(async tx => {
    // SKIP LOCKED allows bounded independent worker replicas. Expired leases survive a worker restart.
    const result = await tx.execute(sql`select id from lms.processing_jobs
      where (state = 'queued' and available_at <= now()) or (state = 'processing' and lease_until < now())
      order by created_at for update skip locked limit 1`)
    const id = (result.rows[0] as { id: string } | undefined)?.id
    if (!id) return
    const [job] = await tx.update(processing_jobs).set({ state: "processing", attempts: sql`${processing_jobs.attempts} + 1`,
      lease_token: randomUUID(), lease_until: new Date(Date.now() + leaseSeconds * 1000) }).where(eq(processing_jobs.id, id)).returning()
    if (job.attempts > job.max_attempts) {
      await tx.update(processing_jobs).set({ state: "failed", error: "Worker retry limit reached", lease_token: null, lease_until: null }).where(eq(processing_jobs.id, id))
      await tx.update(media_assets).set({ state: "failed", error: "Worker retry limit reached" }).where(eq(media_assets.id, job.asset_id))
      return
    }
    await tx.update(media_assets).set({ state: "processing", error: null }).where(eq(media_assets.id, job.asset_id))
    return job
  })
}

export async function renewLease(db: Db, job: ClaimedJob, seconds = 120) {
  const rows = await db.update(processing_jobs).set({ lease_until: new Date(Date.now() + seconds * 1000) })
    .where(and(eq(processing_jobs.id, job.id), eq(processing_jobs.state, "processing"), eq(processing_jobs.lease_token, job.lease_token!))).returning({ id: processing_jobs.id })
  return rows.length === 1
}

export async function finishJob(db: Db, job: ClaimedJob, result: MediaResult) {
  if (!Number.isFinite(result.duration) || result.duration <= 0 || !result.variants.length) throw new Error("Invalid processing output")
  if (result.transcript.some(s => s.start < 0 || s.end <= s.start || s.end > result.duration + 1)) throw new Error("Invalid transcript timestamps")
  return db.transaction(async tx => {
    const [owned] = await tx.select().from(processing_jobs).where(eq(processing_jobs.id, job.id)).for("update")
    if (owned?.state !== "processing" || owned.lease_token !== job.lease_token || !owned.lease_until || owned.lease_until.getTime() <= Date.now()) return false
    await tx.delete(media_variants).where(eq(media_variants.asset_id, job.asset_id))
    await tx.insert(media_variants).values(result.variants.map(v => ({ ...v, asset_id: job.asset_id })))
    await tx.update(media_assets).set({ state: "ready", duration_seconds: Math.ceil(result.duration), transcript: result.transcript, draft_chapters: result.chapters, error: null }).where(eq(media_assets.id, job.asset_id))
    await initializeAssetRecordings(tx,job.asset_id)
    await tx.update(processing_jobs).set({ state: "ready", completed_at: new Date(), lease_token: null, lease_until: null, error: null }).where(eq(processing_jobs.id, job.id))
    return true
  })
}

export async function failJob(db: Db, job: ClaimedJob, error: unknown) {
  // Never persist command arguments, signed URLs or arbitrary provider responses.
  const message = error instanceof Error && error.name === "TranscriptionError" ? "Transcription failed. Retry processing or contact support." : "Media processing failed. Inspect the worker logs and retry."
  await db.transaction(async tx => {
    const [owned] = await tx.select().from(processing_jobs).where(eq(processing_jobs.id, job.id)).for("update")
    if (owned?.lease_token !== job.lease_token || owned.state !== "processing") return
    const retry = owned.attempts < owned.max_attempts
    await tx.update(processing_jobs).set({ state: retry ? "queued" : "failed", error: message, lease_token: null, lease_until: null,
      available_at: new Date(Date.now() + Math.min(300, 10 * 2 ** owned.attempts) * 1000) }).where(eq(processing_jobs.id, job.id))
    await tx.update(media_assets).set({ state: retry ? "queued" : "failed", error: message }).where(eq(media_assets.id, job.asset_id))
  })
}
