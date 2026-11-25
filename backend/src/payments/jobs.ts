import { createHash, randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { FastifyBaseLogger } from "fastify"
import type { AppContext } from "../context.js"
import { orders, payment_events, payments, refunds, seat_reservations } from "../db/schema.js"
import { badRequest, conflict, unauthorized } from "../errors.js"
import { bindProviderOrder, provider, reconcilePayment, validSignature } from "./service.js"

export async function receiveWebhook(ctx: AppContext, raw: Buffer, signature: string, eventId: string) {
  if (!validSignature(raw, signature, ctx.config.RAZORPAY_WEBHOOK_SECRET)) throw unauthorized("Invalid payment webhook signature")
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(eventId)) throw badRequest("Missing provider event identifier")
  let body: { event?: unknown; payload?: { payment?: { entity?: { id?: unknown } }; refund?: { entity?: { id?: unknown; payment_id?: unknown } } } }
  try { body = JSON.parse(raw.toString("utf8")) } catch { throw badRequest("Invalid event JSON") }
  if (typeof body.event !== "string") throw badRequest("Missing event type")
  const supported = ["payment.captured", "payment.authorized", "payment.failed", "order.paid", "refund.processed", "refund.failed", "refund.created"].includes(body.event)
  const payment = body.payload?.payment?.entity?.id ?? body.payload?.refund?.entity?.payment_id
  const refund = body.payload?.refund?.entity?.id
  if (supported && (typeof payment !== "string" || !/^pay_[a-zA-Z0-9]+$/.test(payment))) throw badRequest("Missing payment identifier")
  if (refund !== undefined && (typeof refund !== "string" || !/^rfnd_[a-zA-Z0-9]+$/.test(refund))) throw badRequest("Invalid refund identifier")
  const hash = createHash("sha256").update(raw).digest("hex")
  await ctx.db.insert(payment_events).values({ id: randomUUID(), event_id: eventId, body_hash: hash, kind: body.event,
    payment_id: supported ? String(payment) : null, refund_id: refund ? String(refund) : null, state: supported ? "pending" : "ignored" }).onConflictDoNothing()
  const [existing] = await ctx.db.select().from(payment_events).where(and(eq(payment_events.provider, "razorpay"), eq(payment_events.event_id, eventId)))
  if (existing.body_hash !== hash) throw conflict("Event identifier already has a different payload")
  return { accepted: true }
}

export async function processEvent(ctx: AppContext) {
  const lease = randomUUID()
  const claimed = await ctx.db.execute(sql`update lms.payment_events set state='processing', attempts=attempts+1, lease_token=${lease}, lease_until=now()+interval '2 minutes'
    where id=(select id from lms.payment_events where ((state='pending' and available_at<=now()) or (state='processing' and lease_until<now())) order by available_at for update skip locked limit 1) returning id,payment_id,refund_id,attempts`)
  const job = claimed.rows[0]
  if (!job) return false
  try {
    const remote = await provider(ctx).fetchPayment(String(job.payment_id))
    if (remote.id !== job.payment_id) throw new Error("Payment identity mismatch")
    await reconcilePayment(ctx, remote)
    await ctx.db.update(payment_events).set({ state: "processed", processed_at: new Date(), lease_token: null, lease_until: null, error: null })
      .where(and(eq(payment_events.id, String(job.id)), eq(payment_events.lease_token, lease)))
  } catch {
    await ctx.db.update(payment_events).set({ state: "pending", error: "Provider state could not be reconciled; retry scheduled", available_at: new Date(Date.now() + Math.min(3600, 2 ** Math.min(12, Number(job.attempts))) * 1000), lease_token: null, lease_until: null })
      .where(and(eq(payment_events.id, String(job.id)), eq(payment_events.lease_token, lease)))
  }
  return true
}

export async function processRefund(ctx: AppContext) {
  const lease = randomUUID()
  const claimed = await ctx.db.execute(sql`update lms.refunds set attempts=attempts+1, lease_token=${lease}, lease_until=now()+interval '2 minutes'
    where id=(select id from lms.refunds where status in ('pending','processing') and available_at<=now() and (lease_until is null or lease_until<now()) order by available_at for update skip locked limit 1) returning *`)
  const job = claimed.rows[0]
  if (!job) return false
  try {
    const [payment] = await ctx.db.select().from(payments).where(eq(payments.id, String(job.payment_id)))
    const gateway = provider(ctx)
    const remote = job.provider_refund_id ? await gateway.fetchRefund(String(job.provider_refund_id)) : await gateway.refund({ paymentId: payment.provider_payment_id, amount: Number(job.amount), idempotencyKey: Number(job.retry_round) ? `${job.id}:retry-${job.retry_round}` : String(job.id) })
    if (remote.payment_id !== payment.provider_payment_id || remote.amount !== Number(job.amount) || remote.currency !== job.currency) throw new Error("Refund does not match the requested payment")
    // Store the provider reference before polling payment state; subsequent retries never create a second refund.
    await ctx.db.update(refunds).set({ provider_refund_id: remote.id, status: remote.status === "failed" ? "failed" : "processing", error: remote.status === "failed" ? "Provider rejected this refund. Review it in Razorpay." : null,
      available_at: new Date(Date.now() + 30_000) }).where(and(eq(refunds.id, String(job.id)), eq(refunds.lease_token, lease)))
    const canonical = await gateway.fetchPayment(payment.provider_payment_id)
    if (canonical.id !== payment.provider_payment_id) throw new Error("Payment identity mismatch")
    // The payment must also reflect the refund before access and order status change.
    await reconcilePayment(ctx, canonical)
    await ctx.db.update(refunds).set({ lease_token: null, lease_until: null }).where(and(eq(refunds.id, String(job.id)), eq(refunds.lease_token, lease)))
  } catch {
    await ctx.db.update(refunds).set({ error: "Refund confirmation pending; the same idempotency key will be retried", available_at: new Date(Date.now() + Math.min(3600, 2 ** Math.min(12, Number(job.attempts))) * 1000), lease_token: null, lease_until: null })
      .where(and(eq(refunds.id, String(job.id)), eq(refunds.lease_token, lease)))
  }
  return true
}

export async function reconcileOrder(ctx: AppContext, id: string) {
  const [order] = await ctx.db.select().from(orders).where(eq(orders.id, id))
  if (!order) return
  const gateway = provider(ctx)
  let remoteId = order.provider_order_id
  if (!remoteId) {
    const candidates = await gateway.findOrders(order.id)
    if (candidates.length !== 1) {
      await ctx.db.update(orders).set({ error: candidates.length ? "Multiple provider orders require manual review" : "Provider order not found. No automatic retry was made.", updated_at: new Date() }).where(eq(orders.id, id))
      return
    }
    await bindProviderOrder(ctx, order, candidates[0]); remoteId = candidates[0].id
  }
  for (const payment of await gateway.orderPayments(remoteId)) {
    if (payment.order_id !== remoteId) throw new Error("Provider returned payment for another order")
    await reconcilePayment(ctx, payment)
  }
  await ctx.db.update(orders).set({ updated_at: new Date() }).where(eq(orders.id, id))
}

export async function paymentSweep(ctx: AppContext) {
  if (!ctx.payments) return
  await ctx.db.update(seat_reservations).set({ state: "released" }).where(and(eq(seat_reservations.state, "active"), sql`${seat_reservations.expires_at}<now()`))
  // Rotate every order, including paid ones, to detect provider-side refunds and recover missed webhooks. Bounded work per tick.
  const pending = await ctx.db.select({ id: orders.id }).from(orders).where(sql`${orders.updated_at}<now()-interval '30 seconds'`).orderBy(orders.updated_at).limit(5)
  for (const order of pending) { try { await reconcileOrder(ctx, order.id) } catch { await ctx.db.update(orders).set({ error: "Reconciliation will retry", updated_at: new Date() }).where(eq(orders.id, order.id)) } }
  for (let i = 0; i < 10; i++) if (!await processEvent(ctx)) break
  for (let i = 0; i < 5; i++) if (!await processRefund(ctx)) break
}
export function startPaymentSweep(ctx: AppContext, log: FastifyBaseLogger) {
  if (!ctx.config.PAYMENT_SWEEP_SECONDS || !ctx.payments) return () => {}
  let active = false
  const timer = setInterval(async () => {
    if (active) return
    active = true
    try { await paymentSweep(ctx) } catch { log.error("Payment reconciliation failed; will retry") } finally { active = false }
  }, ctx.config.PAYMENT_SWEEP_SECONDS * 1000)
  timer.unref()
  return () => clearInterval(timer)
}
