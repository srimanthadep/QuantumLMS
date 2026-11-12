// Read-only reconciliation. A shared overwritten key cannot establish historical lesson identity.
import { writeFile } from "node:fs/promises"
import { createStorage } from "../src/bootstrap.js"
import { loadConfig } from "../src/config.js"
import { createPool } from "../src/db/client.js"
import { mediaKey } from "../src/storage/protected.js"

const config = loadConfig(), pool = createPool({ ...config, DATABASE_POOL_MAX: 1 })
try {
  const { storage } = createStorage(config)
  const { rows } = await pool.query<{ id: string; course_id: string; video_url: string | null; media_asset_id: string | null }>(
    "select id, course_id, video_url, to_jsonb(l)->>'media_asset_id' as media_asset_id from lms.lessons l")
  const keys = rows.map(l => ({ lesson: l, key: mediaKey(l.video_url, "videos") }))
  const report = []
  for (const { lesson, key } of keys) {
    const object = key ? await storage.head(key) : null
    const sharedWith = key ? keys.filter(k => k.key === key && k.lesson.id !== lesson.id).map(k => k.lesson.id) : []
    report.push({ lesson_id: lesson.id, course_id: lesson.course_id, key, bytes: object?.size ?? null, shared_with: sharedWith,
      status: lesson.media_asset_id ? "managed_asset" : !key || !object ? "needs_reupload" : sharedWith.length ? "ambiguous_shared_key_requires_history_or_reupload" : "unique_legacy_object_requires_content_review_and_processing" })
  }
  await writeFile(process.argv[2] ?? "media-reconciliation.json", JSON.stringify({ generated_at: new Date().toISOString(), read_only: true, lessons: report }, null, 2))
  console.log(`Reviewed ${report.length} lesson references. No data or objects changed.`)
} finally { await pool.end() }
