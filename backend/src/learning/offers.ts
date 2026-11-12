import { and, eq, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { course_offers, courses } from "../db/schema.js"
import { forbidden, conflict } from "../errors.js"
import { grantAccess, hasEntitlement } from "./entitlements.js"

export async function enrollFree(tx: Tx, student: string, input: { offerId?: string; courseId?: string }) {
  const [offer] = await tx.select().from(course_offers).where(and(
    input.offerId ? eq(course_offers.id, input.offerId) : eq(course_offers.course_id, input.courseId!),
    eq(course_offers.mode, "self_paced"), eq(course_offers.status, "Published"),
  )).for("update").limit(1)
  if (!offer) throw forbidden("Choose a published self-paced offer")
  if (offer.price !== 0) throw forbidden("This offer requires checkout")
  const [course] = await tx.select().from(courses).where(eq(courses.id, offer.course_id)).for("update")
  if (!course || course.status !== "Published") throw forbidden("This course is not published")
  if (!await hasEntitlement(tx, student, course.id)) {
    const count = await tx.execute(sql`select count(distinct student_id)::int as used from lms.entitlement_grants where course_id=${course.id}
      and revoked_at is null and starts_at <= now() and (expires_at is null or expires_at > now())`)
    if (Number(count.rows[0].used) >= course.capacity) throw conflict("This offer has reached its learner capacity")
  }
  await grantAccess(tx, { student, course: offer.course_id, offer: offer.id, sourceType: "free_offer", sourceId: offer.id })
  return offer
}
