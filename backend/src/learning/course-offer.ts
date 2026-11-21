import { randomUUID } from "node:crypto"
import { and, asc, eq, ne } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { course_offers, courses } from "../db/schema.js"

/**
 * A course is sold exactly once, the way a Coursera course is: one self-paced offer whose price is the course price.
 * Price 0 means free to enroll; anything above 0 goes through checkout. The offer follows the course's publication state,
 * so admins never maintain a second price or a second publish switch. The caller must already hold the course row lock.
 */
export async function syncCourseOffer(tx: Tx, courseId: string) {
  const [course] = await tx.select().from(courses).where(eq(courses.id, courseId))
  if (!course) return null
  const status = course.status === "Published" && !course.deleted_at ? "Published" : "Draft"
  const live = await tx.select().from(course_offers).where(and(eq(course_offers.course_id, courseId), eq(course_offers.mode, "self_paced"), ne(course_offers.status, "Archived")))
    .orderBy(asc(course_offers.created_at), asc(course_offers.id))
  // Prefer the offer people may already have bought through. Extras from the old multi-offer model are retired, never deleted.
  const keep = live.find(o => o.status === "Published") ?? live[0]
  for (const extra of live.filter(o => o.id !== keep?.id)) await tx.update(course_offers).set({ status: "Archived" }).where(eq(course_offers.id, extra.id))
  if (!keep) {
    const [created] = await tx.insert(course_offers).values({ id: randomUUID(), course_id: courseId, mode: "self_paced", title: course.title, price: course.price, status }).returning()
    return created
  }
  const [row] = await tx.update(course_offers).set({ title: course.title, price: course.price, status }).where(eq(course_offers.id, keep.id)).returning()
  return row
}
