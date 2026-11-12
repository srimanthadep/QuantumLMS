import { eq } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { course_modules, lessons, media_assets, media_variants } from "../db/schema.js"
import { badRequest } from "../errors.js"

export async function assertPublishable(db: Tx, courseId: string) {
  const modules = await db.select().from(course_modules).where(eq(course_modules.course_id, courseId))
  const content = await db.select().from(lessons).where(eq(lessons.course_id, courseId))
  if (!modules.length || !content.length || modules.some(m => !content.some(l => l.module_id === m.id))) throw badRequest("Every published course needs modules with lessons")
  for (const lesson of content) {
    if (!modules.some(m => m.id === lesson.module_id)) throw badRequest("A lesson belongs to a different course module")
    if (lesson.type === "video") {
      if (!lesson.media_asset_id) throw badRequest("Every video lesson needs a processed media asset")
      const [asset] = await db.select().from(media_assets).where(eq(media_assets.id, lesson.media_asset_id))
      const variants = await db.select().from(media_variants).where(eq(media_variants.asset_id, lesson.media_asset_id))
      if (asset?.state !== "ready" || asset.course_id !== courseId || !variants.length) throw badRequest("Video processing must finish successfully before publishing")
    } else if (!lesson.summary.trim()) throw badRequest("Reading and lab lessons need content before publishing")
  }
}
