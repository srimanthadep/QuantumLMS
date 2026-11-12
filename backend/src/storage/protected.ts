import { and, eq, or, sql } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import { assertCourseAccess } from "../auth/access.js"
import { course_materials, lessons } from "../db/schema.js"
import { notFound } from "../errors.js"

/** Legacy paths resolve to private object keys. External URLs are not private media. */
export function mediaKey(value: string | null | undefined, kind: "videos" | "materials"): string | null {
  if (!value) return null
  const prefix = `/api/files/${kind}/`
  let key = value.startsWith(prefix) ? value.slice(prefix.length) : value
  if (!key.startsWith(`${kind}/`)) key = `${kind}/${key}`
  if (key.includes("..") || key.includes(":") || key.includes("?") || key.includes("\\") || key.includes("#")) return null
  return key
}

export async function authorizeMediaKey(ctx: AppContext, user: AuthUser, key: string, kind: "videos" | "materials") {
  const short = `/api/files/${key}`
  const doubled = `/api/files/${kind}/${key}`
  const sources = kind === "videos"
    ? await ctx.db.select({ course_id: lessons.course_id }).from(lessons).where(or(
      eq(lessons.video_url, short), eq(lessons.video_url, doubled), eq(lessons.video_url, key),
      sql`exists (select 1 from jsonb_each(coalesce(${lessons.video_qualities}, '{}'::jsonb)) v
        where v.value->>'url' in (${short}, ${doubled}, ${key}) or v.value #>> '{}' in (${short}, ${doubled}, ${key}))`,
    ))
    : await ctx.db.select({ course_id: course_materials.course_id }).from(course_materials).where(and(
      eq(course_materials.is_available, true), or(eq(course_materials.url, short), eq(course_materials.url, doubled), eq(course_materials.url, key)),
    ))
  if (!sources.length) throw notFound("This file is not published course content.")
  // Legacy shared keys must be authorized in every linked course until reconciled.
  for (const source of sources) await assertCourseAccess(ctx.db, user, source.course_id)
}

export async function signedMedia(ctx: AppContext, key: string) {
  if (!(await ctx.storage.head(key))) throw notFound("Media is unavailable. Contact your instructor.")
  return ctx.storage.createDownloadUrl(key, { expiresInSeconds: 300 })
}
