import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { cohort_batches, course_offers } from "../db/schema.js"
import { conflict } from "../errors.js"

/**
 * Each batch owns its live offer, created from a plain price so admins never manage a separate "offer" object.
 * Returns the batch's offer id (null for a free, admin-admitted batch).
 */
export async function setBatchPrice(tx: Tx, batch: typeof cohort_batches.$inferSelect, price: number) {
  const [current] = batch.offer_id ? await tx.select().from(course_offers).where(eq(course_offers.id, batch.offer_id)).for("update") : []
  if (price > 0) {
    if (current) {
      await tx.update(course_offers).set({ price, title: batch.name, status: "Published" }).where(eq(course_offers.id, current.id))
      return current.id
    }
    const [created] = await tx.insert(course_offers).values({ id: randomUUID(), course_id: null, mode: "live", title: batch.name, price, status: "Published" }).returning()
    return created.id
  }
  if (!current) return null
  if (batch.lifecycle !== "Draft") throw conflict("A batch that has opened registration cannot become free. Cancel it or keep its price.")
  await tx.update(course_offers).set({ status: "Archived" }).where(eq(course_offers.id, current.id))
  return null
}
