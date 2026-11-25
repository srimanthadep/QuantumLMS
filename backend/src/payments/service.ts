import { notify } from "../modules/student/notify.js"
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { Tx } from "../db/client.js"
import { audit_events, batch_registrations, cohort_batches, course_offers, courses, orders, payments, refunds, seat_reservations } from "../db/schema.js"
import { AppError, badRequest, conflict, notFound } from "../errors.js"
import { admit, cancelRegistration, reserveSeat } from "../learning/admission.js"
import { grantAccess, hasEntitlement, revokeSource } from "../learning/entitlements.js"
import type { ProviderOrder, ProviderPayment } from "./provider.js"

export function provider(ctx: AppContext) {
  if (!ctx.payments) throw new AppError(503, "payments_unavailable", "Test payments are not configured yet.")
  return ctx.payments
}
export function validSignature(body: Buffer | string, signature: string, secret?: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false
  return timingSafeEqual(createHmac("sha256", secret).update(body).digest(), Buffer.from(signature, "hex"))
}
export async function selfPacedSeat(tx: Tx, courseId: string, student: string) {
  const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("update")
  if (!course) throw notFound("Course not found")
  if (!await hasEntitlement(tx, student, course.id)) {
    const used = await tx.execute(sql`select count(distinct student_id) as used from (
      select student_id from lms.entitlement_grants where course_id=${course.id} and revoked_at is null and starts_at<=now() and (expires_at is null or expires_at>now())
      union select student_id from lms.seat_reservations where course_id=${course.id} and batch_id is null and state='active' and expires_at>now()
    ) seats where student_id<>${student}::uuid`)
    // A NULL capacity means the course is open to everyone, like any Coursera-style catalog course.
    if (course.capacity !== null && Number(used.rows[0].used) >= course.capacity) throw conflict("This course has reached its learner capacity")
  }
  return course
}
export async function bindProviderOrder(ctx: AppContext, order: typeof orders.$inferSelect, remote: ProviderOrder) {
  if (remote.receipt !== order.id || remote.amount !== order.amount || remote.currency !== order.currency) throw conflict("Provider order does not match checkout")
  await ctx.db.update(orders).set({ provider_order_id: remote.id, status: "pending", error: null, updated_at: new Date() })
    .where(and(eq(orders.id, order.id), sql`${orders.provider_order_id} is null`))
}
export async function checkout(ctx: AppContext, student: string, input: { offer_id: string; batch_id?: string; idempotency_key: string }) {
  const gateway = provider(ctx)
  const result = await ctx.db.transaction(async tx => {
    const [prior] = await tx.select().from(orders).where(and(eq(orders.student_id, student), eq(orders.idempotency_key, input.idempotency_key)))
    if (prior) {
      if (prior.offer_id !== input.offer_id || prior.batch_id !== (input.batch_id ?? null)) throw conflict("Checkout key already belongs to another offer")
      return { row: prior, created: false }
    }
    const [hint] = await tx.select().from(course_offers).where(eq(course_offers.id, input.offer_id))
    if (!hint) throw badRequest("Choose a published paid offer")
    // Only a self-paced offer belongs to a course. A live offer belongs to exactly one batch and never touches a course.
    const [course] = hint.course_id ? await tx.select().from(courses).where(eq(courses.id, hint.course_id)).for("update") : []
    const [offer] = await tx.select().from(course_offers).where(eq(course_offers.id, input.offer_id)).for("update")
    if (!offer || offer.status !== "Published" || offer.price <= 0) throw badRequest("Choose a published paid offer")
    if (offer.mode === "self_paced" && (!course || course.status !== "Published" || course.deleted_at)) throw conflict("This course is not published")
    if ((offer.mode === "live") !== Boolean(input.batch_id)) throw badRequest("Live checkout requires its batch; self-paced checkout has no batch")
    const expiry = new Date(Date.now() + ctx.config.PAYMENT_RESERVATION_MINUTES * 60_000)
    const [row] = await tx.insert(orders).values({ id: randomUUID(), student_id: student, offer_id: offer.id, course_id: offer.course_id,
      batch_id: input.batch_id, provider: gateway.name, mode: offer.mode, offer_title: offer.title, amount: offer.price * 100, currency: offer.currency,
      idempotency_key: input.idempotency_key, expires_at: expiry }).onConflictDoNothing().returning()
    if (!row) {
      const [existing] = await tx.select().from(orders).where(and(eq(orders.student_id, student), eq(orders.idempotency_key, input.idempotency_key)))
      if (existing.offer_id !== input.offer_id || existing.batch_id !== (input.batch_id ?? null)) throw conflict("Checkout key already belongs to another offer")
      return { row: existing, created: false }
    }
    if (input.batch_id) {
      const [batch] = await tx.select().from(cohort_batches).where(eq(cohort_batches.id, input.batch_id)).for("update")
      if (batch?.offer_id !== offer.id) throw badRequest("Batch and offer do not match")
      await reserveSeat(tx, { batchId: batch.id, student, orderId: row.id, minutes: ctx.config.PAYMENT_RESERVATION_MINUTES })
    } else {
      if (!course) throw badRequest("Choose a published paid offer")
      await selfPacedSeat(tx, course.id, student)
      const pending = await tx.select().from(seat_reservations).where(and(eq(seat_reservations.offer_id, offer.id), eq(seat_reservations.student_id, student), eq(seat_reservations.state, "active"), sql`${seat_reservations.expires_at}>now()`))
      if (pending.length) throw conflict("You already have a pending checkout for this offer")
      const purchased = await tx.execute(sql`select id from lms.entitlement_grants where student_id=${student}::uuid and offer_id=${offer.id} and source_type='payment' and revoked_at is null and (expires_at is null or expires_at>now())`)
      if (purchased.rows.length) throw conflict("You already purchased this offer")
      await tx.insert(seat_reservations).values({ id: randomUUID(), student_id: student, course_id: course.id, offer_id: offer.id, order_id: row.id, expires_at: expiry })
    }
    return { row, created: true }
  })
  // Only the transaction which created the local order may call createOrder. An uncertain response is reconciled by receipt, never blindly retried.
  if (result.created) {
    try { await bindProviderOrder(ctx, result.row, await gateway.createOrder({ receipt: result.row.id, amount: result.row.amount, currency: result.row.currency })) }
    catch { await ctx.db.update(orders).set({ error: "Provider confirmation is pending. Your checkout will be reconciled.", updated_at: new Date() }).where(eq(orders.id, result.row.id)) }
  }
  const [row] = await ctx.db.select().from(orders).where(eq(orders.id, result.row.id))
  return { order: row, key: gateway.publicKey, test_mode: true }
}

/**
 * One refund row per payment. `retryFailed` is for an admin asking again: a refund the provider rejected goes back
 * to the queue with a new idempotency key. Automatic callers leave a failed refund alone, so a rejection that keeps
 * happening isn't retried in a loop.
 */
export async function queueRefund(tx: Tx, payment: typeof payments.$inferSelect, reason: string, actor?: string, opts: { retryFailed?: boolean } = {}) {
  if (!["captured", "refunded"].includes(payment.status)) throw conflict("Only captured payments can be refunded")
  if (payment.refunded_amount > 0 && payment.refunded_amount < payment.amount) throw conflict("A partial provider refund exists. Reconcile it before requesting a full refund.")
  const [inserted] = await tx.insert(refunds).values({ id: randomUUID(), payment_id: payment.id, order_id: payment.order_id,
    amount: payment.amount, currency: payment.currency, reason, actor_id: actor,
    status: payment.refunded_amount >= payment.amount ? "processed" : "pending", confirmed_at: payment.refunded_amount >= payment.amount ? new Date() : null }).onConflictDoNothing().returning()
  let [existing] = inserted ? [inserted] : await tx.select().from(refunds).where(eq(refunds.payment_id, payment.id)).for("update")
  if (existing.status === "failed" && opts.retryFailed) {
    ;[existing] = await tx.update(refunds).set({
      status: "pending", provider_refund_id: null, retry_round: sql`${refunds.retry_round} + 1`, attempts: 0,
      available_at: new Date(), lease_token: null, lease_until: null, reason, actor_id: actor ?? existing.actor_id,
      error: existing.provider_refund_id ? `Retrying after provider refund ${existing.provider_refund_id} failed` : null,
    }).where(eq(refunds.id, existing.id)).returning()
  }
  // A failed refund that isn't being retried leaves the order as it was instead of claiming a refund is under way.
  if (existing.status !== "failed") {
    await tx.update(orders).set({ status: existing.status === "processed" ? "refunded" : "refund_pending", updated_at: new Date() })
      .where(and(eq(orders.id, payment.order_id), sql`(${orders.fulfilled_payment_id} is null or ${orders.fulfilled_payment_id}=${payment.id})`))
  }
  return existing
}

async function removePaymentAccess(tx: Tx, order: typeof orders.$inferSelect, payment: typeof payments.$inferSelect) {
  // Find by order, including registrations moved to another batch. Never revoke an unrelated purchase/manual source.
  const registrations = await tx.select().from(batch_registrations).where(and(eq(batch_registrations.order_id, order.id), eq(batch_registrations.student_id, order.student_id), sql`${batch_registrations.state}<>'cancelled'`))
  for (const registration of registrations.sort((a,b) => a.batch_id.localeCompare(b.batch_id))) await cancelRegistration(tx, registration.batch_id, registration.student_id)
  if (order.course_id) await revokeSource(tx, order.student_id, order.course_id, "payment", payment.id)
}

/** Canonical provider state, not the event snapshot, determines access. Serializing the order makes all ingress paths idempotent. */
export async function reconcilePayment(ctx: AppContext, remote: ProviderPayment) {
  return ctx.db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.provider_order_id, remote.order_id)).for("update")
    if (!order) throw conflict("Payment is awaiting order reconciliation")
    if (remote.amount !== order.amount || remote.currency !== order.currency) throw conflict("Payment amount or currency does not match the order")
    const [old] = await tx.select().from(payments).where(eq(payments.provider_payment_id, remote.id))
    if (old && old.order_id !== order.id) throw conflict("Payment belongs to a different order")
    if (remote.amount_refunded < 0 || remote.amount_refunded > remote.amount) throw conflict("Invalid provider refund total")
    const captured = ["captured", "refunded"].includes(remote.status)
    // Canonical API calls can finish out of order too. Never regress a captured payment or confirmed refund.
    const refunded = Math.max(remote.amount_refunded, old?.refunded_amount ?? 0)
    const status = refunded >= remote.amount ? "refunded" : old?.captured_at && !captured ? old.status : remote.status
    const [payment] = await tx.insert(payments).values({ id: old?.id ?? randomUUID(), order_id: order.id, provider_payment_id: remote.id,
      amount: remote.amount, currency: remote.currency, status, method: remote.method, refunded_amount: refunded,
      captured_at: old?.captured_at ?? (captured ? new Date(remote.created_at * 1000) : null) }).onConflictDoUpdate({ target: payments.provider_payment_id,
      set: { status, method: remote.method, refunded_amount: refunded, captured_at: old?.captured_at ?? (captured ? new Date(remote.created_at * 1000) : null) } }).returning()
    if (refunded >= remote.amount) {
      if (!order.fulfilled_payment_id || order.fulfilled_payment_id === payment.id) {
        await removePaymentAccess(tx, order, payment)
        await tx.update(orders).set({ status: "refunded", updated_at: new Date() }).where(eq(orders.id, order.id))
      }
      await tx.update(refunds).set({ status: "processed", confirmed_at: new Date(), lease_token: null, lease_until: null }).where(eq(refunds.payment_id, payment.id))
      await notify(tx,order.student_id,"payment","Refund confirmed","The payment provider has confirmed your full refund.","courses",undefined,{key:`refund-confirmed:${payment.id}`})
      return payment
    }
    if (!captured || old?.captured_at) return payment
    if (order.fulfilled_payment_id || ["refund_pending", "refunded"].includes(order.status)) {
      await queueRefund(tx, payment, "Duplicate or late capture after closure")
      return payment
    }
    try {
      await tx.transaction(async admissionTx => {
        if (order.batch_id) {
          const [existing] = await admissionTx.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, order.batch_id), eq(batch_registrations.student_id, order.student_id)))
          if (existing && ["confirmed", "paused"].includes(existing.state)) throw conflict("The learner already has a place in this batch")
          const result = await admit(admissionTx, { batchId: order.batch_id, student: order.student_id, source: "payment", orderId: order.id, paidAt: new Date(), allowUpdate: true })
          if (result.skipped) throw conflict("The learner already has a registration")
        } else {
          if (!order.course_id) throw conflict("This order has no course to unlock")
          await selfPacedSeat(admissionTx, order.course_id, order.student_id)
          const existingPurchase = await admissionTx.execute(sql`select id from lms.entitlement_grants where student_id=${order.student_id}::uuid and offer_id=${order.offer_id} and source_type='payment' and revoked_at is null and (expires_at is null or expires_at>now())`)
          if (existingPurchase.rows.length) throw conflict("This offer has already been purchased")
          await grantAccess(admissionTx, { student: order.student_id, course: order.course_id, offer: order.offer_id, sourceType: "payment", sourceId: payment.id })
        }
        await admissionTx.update(seat_reservations).set({ state: "converted" }).where(eq(seat_reservations.order_id, order.id))
      })
    } catch (error) {
      if (!(error instanceof AppError)) throw error
      await tx.update(seat_reservations).set({ state: "released" }).where(eq(seat_reservations.order_id, order.id))
      await queueRefund(tx, payment, `Admission unavailable: ${error.message}`)
      return payment
    }
    await tx.update(orders).set({ status: "paid", fulfilled_payment_id: payment.id, error: null, updated_at: new Date() }).where(eq(orders.id, order.id))
    await notify(tx,order.student_id,"payment","Payment confirmed","Your payment is confirmed and learning access is ready.","courses",undefined,{key:`payment-confirmed:${payment.id}`})
    await tx.insert(audit_events).values({ actor_role: "System", action: "payment.confirmed", target: order.id, outcome: "success" })
    return payment
  })
}

export async function requestOrderRefund(ctx: AppContext, id: string, reason: string, actor: string) {
  provider(ctx)
  return ctx.db.transaction(async tx => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update")
    if (!order) throw notFound("Order not found")
    const captured = await tx.select().from(payments).where(and(eq(payments.order_id, id), sql`${payments.captured_at} is not null`))
    if (!captured.length) throw conflict("No captured payment to refund")
    const result = []
    for (const payment of captured) result.push(await queueRefund(tx, payment, reason, actor, { retryFailed: true }))
    await tx.insert(audit_events).values({ actor_id: actor, actor_role: "Admin", action: "refund.requested", target: id, outcome: "pending" })
    return result
  })
}
