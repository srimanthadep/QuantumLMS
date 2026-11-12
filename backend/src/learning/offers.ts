import { selfPacedSeat } from "../payments/service.js"
import { and, eq } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { course_offers, courses } from "../db/schema.js"
import { forbidden } from "../errors.js"
import { grantAccess } from "./entitlements.js"

export async function enrollFree(tx: Tx, student: string, input: { offerId?: string; courseId?: string }) {
  const [offer] = await tx.select().from(course_offers).where(and(
    input.offerId ? eq(course_offers.id, input.offerId) : eq(course_offers.course_id, input.courseId!),
    eq(course_offers.mode, "self_paced"), eq(course_offers.status, "Published"),
  )).for("update").limit(1)
  if (!offer) throw forbidden("Choose a published self-paced offer")
  if (offer.price !== 0) throw forbidden("This offer requires checkout")
  const [course] = await tx.select().from(courses).where(eq(courses.id, offer.course_id)).for("update")
  if (!course || course.status !== "Published") throw forbidden("This course is not published")
  await selfPacedSeat(tx, course.id, student)
  await grantAccess(tx, { student, course: offer.course_id, offer: offer.id, sourceType: "free_offer", sourceId: offer.id })
  return offer
}
