import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import { after, before, test } from "node:test"
import { and, eq, sql } from "drizzle-orm"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"
import { batch_registrations, cohort_batches, course_offers, courses, entitlement_grants, orders, payment_events, payments, refunds, seat_reservations } from "../src/db/schema.js"
import type { PaymentProvider, ProviderOrder, ProviderPayment, ProviderRefund } from "../src/payments/provider.js"
import { processEvent, processRefund, reconcileOrder } from "../src/payments/jobs.js"
import { reconcilePayment } from "../src/payments/service.js"
import { grantAccess, hasEntitlement } from "../src/learning/entitlements.js"
import { admit } from "../src/learning/admission.js"
import { loadConfig } from "../src/config.js"

let h: TestHarness, student: TestUser, other: TestUser, admin: TestUser, studentId: string, otherId: string
const remoteOrders = new Map<string, ProviderOrder>(), remotePayments = new Map<string, ProviderPayment>(), remoteRefunds = new Map<string, ProviderRefund>()
let createCalls = 0, refundCalls = 0, loseCreateResponse = false, loseRefundResponse = false, rejectRefund = false
const fake: PaymentProvider = {
  name: "razorpay", publicKey: "rzp_test_fixture",
  async createOrder(input) {
    createCalls++
    const order = { id: `order_${randomUUID().replaceAll("-", "")}`, ...input, status: "created" }; remoteOrders.set(order.id, order)
    if (loseCreateResponse) { loseCreateResponse = false; throw new Error("Connection lost after provider commit") }
    return order
  },
  async findOrders(receipt) { return [...remoteOrders.values()].filter(o => o.receipt === receipt) },
  async fetchPayment(id) { assert.ok(remotePayments.has(id)); return structuredClone(remotePayments.get(id)!) },
  async orderPayments(id) { return [...remotePayments.values()].filter(p => p.order_id === id).map(p => structuredClone(p)) },
  async refund(input) {
    refundCalls++
    if (remoteRefunds.has(input.idempotencyKey)) return remoteRefunds.get(input.idempotencyKey)!
    const row = { id: `rfnd_${randomUUID().replaceAll("-", "")}`, payment_id: input.paymentId, amount: input.amount, currency: "INR", status: rejectRefund ? "failed" : "pending" }
    rejectRefund = false
    remoteRefunds.set(input.idempotencyKey, row)
    if (loseRefundResponse) { loseRefundResponse = false; throw new Error("Connection lost after refund commit") }
    return row
  },
  async fetchRefund(id) { const row = [...remoteRefunds.values()].find(r => r.id === id); assert.ok(row); return row },
}
before(async () => {
  h = await createHarness(); h.ctx.payments = fake; h.ctx.config.RAZORPAY_KEY_SECRET = "fixture-secret"; h.ctx.config.RAZORPAY_WEBHOOK_SECRET = "fixture-webhook"
  student = await h.user(); other = await h.user(); admin = await h.user({ groups: ["admins"] })
  studentId = (await student.call("GET", "/api/me")).body.id; otherId = (await other.call("GET", "/api/me")).body.id
})
after(async () => { try { await h.ctx.db.delete(refunds); await h.ctx.db.delete(payments); await h.ctx.db.delete(orders) } finally { await h.close() } })
async function offer(mode = "self_paced", capacity = 20) {
  const id = randomUUID()
  await h.ctx.db.insert(courses).values({ id, code: id, title: "Payment fixture", instructor: "Teacher", category: "AI", level: "Beginner", status: "Published", capacity })
  await h.ctx.db.insert(course_offers).values({ id, course_id: id, title: "Paid learning", mode, price: 199, status: "Published" })
  if (mode === "live") await h.ctx.db.insert(cohort_batches).values({ id, course_id: id, offer_id: id, name: "Paid cohort", instructor: "Teacher", max_seats: capacity, start_date: "2027-01-01", end_date: "2027-06-30", lifecycle: "Recruiting" })
  return id
}
async function buy(id: string, mode = "self_paced", key = randomUUID()) {
  const response = await student.call("POST", "/api/student/checkout", { offer_id: id, ...(mode === "live" ? { batch_id: id } : {}), idempotency_key: key, amount: 1 })
  assert.equal(response.status, 200, JSON.stringify(response.body)); return response.body.order
}
function capture(order: { provider_order_id: string; amount: number }, status = "captured") {
  const row: ProviderPayment = { id: `pay_${randomUUID().replaceAll("-", "")}`, order_id: order.provider_order_id, amount: order.amount, currency: "INR", status, method: "upi", amount_refunded: 0, created_at: Math.floor(Date.now()/1000) }
  remotePayments.set(row.id, row); return row
}
async function webhook(payment: ProviderPayment, kind = "payment.captured", eventId = randomUUID(), secret = "fixture-webhook") {
  const raw = JSON.stringify({ event: kind, payload: { payment: { entity: payment } } })
  return h.app.inject({ method: "POST", url: "/api/webhooks/razorpay", payload: raw, headers: { "content-type": "application/json", "x-razorpay-event-id": eventId, "x-razorpay-signature": createHmac("sha256", secret).update(raw).digest("hex") } })
}
test("checkout uses server prices, isolates ownership, and creates one order under duplicate requests", async () => {
  const id = await offer(), key = randomUUID(), before = createCalls
  const results = await Promise.all([buy(id, "self_paced", key), buy(id, "self_paced", key)])
  assert.equal(results[0].id, results[1].id); assert.equal(createCalls - before, 1); assert.equal(results[0].amount, 19900)
  assert.equal((await other.call("GET", `/api/student/orders/${results[0].id}`)).status, 404)
  const rows = await h.ctx.db.select().from(seat_reservations).where(eq(seat_reservations.order_id, results[0].id)); assert.equal(rows.length, 1)
})
test("verified duplicate and out-of-order webhooks cannot double-grant or regress captured state", async () => {
  const id = await offer(), order = await buy(id), payment = capture(order), event = randomUUID()
  assert.equal((await webhook(payment, "payment.captured", event, "forged")).statusCode, 401)
  for (let i=0; i<2; i++) assert.equal((await webhook(payment, "payment.captured", event)).statusCode, 202)
  await Promise.all([processEvent(h.ctx), processEvent(h.ctx)])
  assert.equal(await hasEntitlement(h.ctx.db, studentId, id), true)
  const grants = await h.ctx.db.select().from(entitlement_grants).where(and(eq(entitlement_grants.student_id, studentId), eq(entitlement_grants.course_id, id)))
  assert.equal(grants.length, 1)
  assert.equal((await webhook({ ...payment, status: "failed" }, "payment.failed")).statusCode, 202); await processEvent(h.ctx)
  await reconcilePayment(h.ctx, { ...payment, status: "authorized" })
  const [paid] = await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)); assert.equal(paid.status, "paid")
  const [persisted] = await h.ctx.db.select().from(payments).where(eq(payments.provider_payment_id, payment.id)); assert.equal(persisted.status, "captured")
  assert.equal((await webhook({ ...payment, amount: 1 }, "payment.captured", event)).statusCode, 409)
})
test("checkout callback checks signature, order binding, and canonical payment amount", async () => {
  const id = await offer(), order = await buy(id), payment = capture(order)
  const path = `/api/student/orders/${order.id}/verify`
  const payload = { razorpay_order_id: order.provider_order_id, razorpay_payment_id: payment.id, razorpay_signature: "0".repeat(64) }
  assert.equal((await student.call("POST", path, payload)).status, 401)
  payload.razorpay_signature = createHmac("sha256", "fixture-secret").update(`${order.provider_order_id}|${payment.id}`).digest("hex")
  remotePayments.set(payment.id, { ...payment, amount: 1 }); assert.equal((await student.call("POST", path, payload)).status, 409)
  remotePayments.set(payment.id, payment); assert.equal((await student.call("POST", path, payload)).body.order.status, "paid")
})
test("uncertain provider order creation is recovered by receipt without a second charge order", async () => {
  const id = await offer(), before = createCalls; loseCreateResponse = true
  const order = await buy(id); assert.equal(order.status, "creating")
  await reconcileOrder(h.ctx, order.id)
  const [recovered] = await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)); assert.ok(recovered.provider_order_id); assert.equal(createCalls - before, 1)
})
test("expired paid reservation cannot steal an occupied seat; delayed capture queues refund without access", async () => {
  const id = await offer("live", 1), order = await buy(id, "live")
  await assert.rejects(h.ctx.db.transaction(tx => admit(tx, { batchId: id, student: otherId })), /full/)
  await h.ctx.db.execute(sql`update lms.seat_reservations set expires_at=now()-interval '1 second' where order_id=${order.id}`)
  await h.ctx.db.transaction(tx => admit(tx, { batchId: id, student: otherId }))
  const payment = capture(order); await reconcilePayment(h.ctx, payment)
  assert.equal(await hasEntitlement(h.ctx.db, studentId, id, id), false)
  const [pending] = await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)); assert.equal(pending.status, "refund_pending")
})
test("refund stays pending through a lost response; confirmed refund revokes only its own source", async () => {
  const id = await offer(), order = await buy(id), payment = capture(order); await reconcilePayment(h.ctx, payment)
  await h.ctx.db.transaction(tx => grantAccess(tx, { student: studentId, course: id, sourceType: "manual", sourceId: "independent" }))
  for (let i=0; i<2; i++) assert.equal((await admin.call("POST", `/api/admin/orders/${order.id}/refund`, { reason: "Requested by learner" })).status, 200)
  const [local] = await h.ctx.db.select().from(refunds).where(eq(refunds.order_id, order.id))
  // Other tests queued refunds; restrict this worker fixture by moving unrelated jobs into the future.
  await h.ctx.db.execute(sql`update lms.refunds set available_at=now()+interval '1 day' where id<>${local.id}`)
  loseRefundResponse = true; await processRefund(h.ctx)
  await h.ctx.db.update(refunds).set({ available_at: new Date(0) }).where(eq(refunds.id, local.id)); await processRefund(h.ctx)
  assert.equal((await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)))[0].status, "refund_pending")
  assert.equal(await hasEntitlement(h.ctx.db, studentId, id), true)
  const remoteRefund = remoteRefunds.get(local.id)!; remoteRefund.status = "processed"; payment.amount_refunded = payment.amount; payment.status = "refunded"
  await h.ctx.db.update(refunds).set({ available_at: new Date(0) }).where(eq(refunds.id, local.id)); await processRefund(h.ctx)
  assert.equal((await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)))[0].status, "refunded")
  assert.equal(await hasEntitlement(h.ctx.db, studentId, id), true, "independent source remains")
  const grants = await h.ctx.db.select().from(entitlement_grants).where(and(eq(entitlement_grants.course_id, id), eq(entitlement_grants.source_type, "payment"))); assert.ok(grants[0].revoked_at)
  assert.ok(refundCalls >= 2); assert.equal([...remoteRefunds.values()].filter(r => r.payment_id === payment.id).length, 1)
})
test("a refund the provider rejects stays failed until an admin retries it with a new idempotency key", async () => {
  const id = await offer(), order = await buy(id), payment = capture(order); await reconcilePayment(h.ctx, payment)
  assert.equal((await admin.call("POST", `/api/admin/orders/${order.id}/refund`, { reason: "Requested by learner" })).status, 200)
  const [local] = await h.ctx.db.select().from(refunds).where(eq(refunds.order_id, order.id))
  await h.ctx.db.execute(sql`update lms.refunds set available_at=now()+interval '1 day' where id<>${local.id}`)
  rejectRefund = true; await processRefund(h.ctx)
  const [failed] = await h.ctx.db.select().from(refunds).where(eq(refunds.id, local.id)); assert.equal(failed.status, "failed")
  // The worker never picks a failed refund up again on its own.
  await h.ctx.db.update(refunds).set({ available_at: new Date(0) }).where(eq(refunds.id, local.id))
  const calls = refundCalls; assert.equal(await processRefund(h.ctx), false); assert.equal(refundCalls, calls)
  assert.equal((await admin.call("POST", `/api/admin/orders/${order.id}/refund`, { reason: "Retry after rejection" })).status, 200)
  const [retried] = await h.ctx.db.select().from(refunds).where(eq(refunds.id, local.id))
  assert.equal(retried.status, "pending"); assert.equal(retried.retry_round, 1); assert.equal(retried.provider_refund_id, null)
  await processRefund(h.ctx)
  assert.ok(remoteRefunds.has(`${local.id}:retry-1`), "the retry used a fresh idempotency key")
  const [processing] = await h.ctx.db.select().from(refunds).where(eq(refunds.id, local.id)); assert.equal(processing.status, "processing")
  assert.equal((await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)))[0].status, "refund_pending")
})
test("paid admission is exactly once and duplicate capture refunds the extra payment", async () => {
  const id = await offer("live", 1), order = await buy(id, "live"), payment = capture(order)
  await Promise.all([reconcilePayment(h.ctx, payment), reconcilePayment(h.ctx, payment)])
  const rows = await h.ctx.db.select().from(batch_registrations).where(eq(batch_registrations.batch_id, id)); assert.equal(rows.length, 1); assert.ok(rows[0].paid_at)
  await reconcilePayment(h.ctx, capture(order))
  assert.equal((await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)))[0].status, "paid")
  assert.equal((await h.ctx.db.select().from(refunds).where(eq(refunds.order_id, order.id))).length, 1)
  assert.equal((await admin.call("POST", `/api/admin/batches/${id}/underfilled`, { action: "refund" })).status, 200)
})
test("self-paced last seat counts pending checkout against free enrollment; abandoned event lease is recoverable", async () => {
  const id = await offer("self_paced", 1), order = await buy(id)
  const free = `${id}-free`; await h.ctx.db.insert(course_offers).values({ id: free, course_id: id, title: "Free invitation", mode: "self_paced", price: 0, status: "Published" })
  assert.equal((await other.call("POST", "/api/student/enrollments", { offer_id: free })).status, 409)
  const payment = capture(order), event = randomUUID(); await webhook(payment, "payment.captured", event)
  await h.ctx.db.update(payment_events).set({ state: "processing", lease_token: "crashed", lease_until: new Date(0) }).where(eq(payment_events.event_id, event))
  await processEvent(h.ctx); assert.equal(await hasEntitlement(h.ctx.db, studentId, id), true)
})
test("ledger and revenue contain only persisted money; live mode configuration is rejected", async () => {
  const response = await admin.call("GET", "/api/admin/orders"); assert.equal(response.status, 200); assert.equal(response.body.test_mode, true)
  const captured = await h.ctx.db.select().from(payments).where(sql`${payments.captured_at} is not null`)
  assert.equal(response.body.revenue.gross, captured.reduce((sum,p) => sum+p.amount,0)); assert.equal(response.body.revenue.refunded, captured.reduce((sum,p) => sum+p.refunded_amount,0))
  assert.throws(() => loadConfig({ ...process.env, COGNITO_USER_POOL_ID: "test", COGNITO_CLIENT_ID: "test", RAZORPAY_KEY_ID: "rzp_live_forbidden", RAZORPAY_KEY_SECRET: "fixture", DATABASE_URL: h.ctx.config.DATABASE_URL }), /test/i)
})

test("refund received before capture never grants access, including a stale capture response", async () => {
  const id = await offer(), order = await buy(id), payment = capture(order)
  await reconcilePayment(h.ctx, { ...payment, status: "refunded", amount_refunded: payment.amount })
  await reconcilePayment(h.ctx, payment)
  assert.equal(await hasEntitlement(h.ctx.db, studentId, id), false)
  assert.equal((await h.ctx.db.select().from(orders).where(eq(orders.id, order.id)))[0].status, "refunded")
})

test("two paid checkouts competing for the last seat reserve exactly one place", async () => {
  for (const mode of ["live", "self_paced"]) {
    const id = await offer(mode, 1)
    const results = await Promise.all([student, other].map(user => user.call("POST", "/api/student/checkout", { offer_id: id, ...(mode === "live" ? { batch_id: id } : {}), idempotency_key: randomUUID() })))
    assert.deepEqual(results.map(r => r.status).sort(), [200, 409])
    const reservations = await h.ctx.db.select().from(seat_reservations).where(eq(seat_reservations.offer_id, id)); assert.equal(reservations.length, 1)
  }
})

test("a second delayed self-paced capture is refunded instead of granting a second paid source", async () => {
  const id = await offer(), first = await buy(id)
  await h.ctx.db.execute(sql`update lms.seat_reservations set expires_at=now()-interval '1 second' where order_id=${first.id}`)
  const second = await buy(id)
  await reconcilePayment(h.ctx, capture(first)); await reconcilePayment(h.ctx, capture(second))
  const granted = await h.ctx.db.select().from(entitlement_grants).where(and(eq(entitlement_grants.course_id, id), eq(entitlement_grants.source_type, "payment")))
  assert.equal(granted.length, 1)
  assert.equal((await h.ctx.db.select().from(orders).where(eq(orders.id, second.id)))[0].status, "refund_pending")
})
