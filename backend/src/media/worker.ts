import { setTimeout as delay } from "node:timers/promises"
import { eq } from "drizzle-orm"
import { loadConfig } from "../config.js"
import { createDb, createPool } from "../db/client.js"
import { createStorage } from "../bootstrap.js"
import { media_assets } from "../db/schema.js"
import { claimJob, failJob, finishJob, renewLease } from "./jobs.js"
import { processMedia } from "./processor.js"

const config = loadConfig()
const pool = createPool({ ...config, DATABASE_POOL_MAX: 2 })
const db = createDb(pool)
const { storage } = createStorage(config)
let stopping = false
let current: AbortController | undefined
const stop = () => { stopping = true; current?.abort() }
process.on("SIGTERM", stop)
process.on("SIGINT", stop)
try {
  while (!stopping) {
    const job = await claimJob(db, config.MEDIA_LEASE_SECONDS)
    if (!job) { await delay(config.MEDIA_POLL_SECONDS * 1000); continue }
    current = new AbortController()
    const controller = current
    let renewing = false
    const heartbeat = setInterval(async () => {
      if (renewing) return
      renewing = true
      try { if (!await renewLease(db, job, config.MEDIA_LEASE_SECONDS)) controller.abort() }
      catch { controller.abort() } finally { renewing = false }
    }, config.MEDIA_LEASE_SECONDS * 1000 / 3)
    try {
      const asset = await db.query.media_assets.findFirst({ where: eq(media_assets.id, job.asset_id) })
      if (!asset) throw new Error("Asset missing")
      const result = await processMedia(storage, config, asset.id, asset.source_key, job.lease_token!, controller.signal)
      await finishJob(db, job, result)
    } catch (error) {
      console.error(JSON.stringify({ event: "media_job_failed", job: job.id, attempt: job.attempts }))
      await failJob(db, job, error)
    } finally { clearInterval(heartbeat); current = undefined }
  }
} finally { await pool.end() }
