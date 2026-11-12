import { eq } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import { assertCourseAccess } from "../auth/access.js"
import { lessons } from "../db/schema.js"
import { notFound } from "../errors.js"
import { mediaKey, signedMedia } from "./protected.js"

export async function lessonPlayback(ctx: AppContext, user: AuthUser, id: string) {
  const lesson = await ctx.db.query.lessons.findFirst({ where: eq(lessons.id, id) })
  if (!lesson || lesson.archived_at) throw notFound("Lesson not found")
  await assertCourseAccess(ctx.db, user, lesson.course_id)
  const key = mediaKey(lesson.video_url, "videos")
  if (!key) throw notFound("A private video is not available for this lesson")
  const qualities: Record<string, { url: string }> = {}
  for (const [name, entry] of Object.entries((lesson.video_qualities ?? {}) as Record<string, { url?: string } | string>)) {
    const variant = mediaKey(typeof entry === "string" ? entry : entry.url, "videos")
    if (variant) qualities[name] = { url: await signedMedia(ctx, variant) }
  }
  return { url: await signedMedia(ctx, key), qualities, expires_in: 300 }
}
