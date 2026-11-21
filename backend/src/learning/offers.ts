import { selfPacedSeat } from "../payments/service.js"
import { and, eq } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { course_offers, courses } from "../db/schema.js"
import { forbidden } from "../errors.js"
import { grantAccess } from "./entitlements.js"

export async function enrollFree(tx: Tx, student: string, input: { offerId?: string; courseId?: string }) {
  const candidates = await tx.select().from(course_offers).where(and(
    input.offerId ? eq(course_offers.id, input.offerId) : eq(course_offers.course_id, input.courseId!),
    eq(course_offers.mode, "self_paced"), eq(course_offers.status, "Published"),
  ))
  if (candidates.length > 1) throw forbidden("Choose a specific learning offer before enrolling")
  const [candidate] = candidates
  let offer = candidate
  if (!offer) throw forbidden("Choose a published self-paced offer")
  if (offer.price !== 0) throw forbidden("This offer requires checkout")
  const courseId = offer.course_id
  if (!courseId) throw forbidden("Choose a published self-paced offer")
  const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("update")
  ;[offer] = await tx.select().from(course_offers).where(eq(course_offers.id, candidate.id)).for("update")
  if (!offer || offer.status !== "Published" || offer.price !== 0) throw forbidden("This free offer is not currently available")
  if (!course || course.deleted_at || course.status !== "Published") throw forbidden("This course is not published")
  await selfPacedSeat(tx, course.id, student)
  await grantAccess(tx, { student, course: courseId, offer: offer.id, sourceType: "free_offer", sourceId: offer.id })
  return offer
}
