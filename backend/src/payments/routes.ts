import { and, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { cohort_batches, course_offers, courses, orders, payments, refunds, users } from "../db/schema.js"
import { conflict, notFound, unauthorized } from "../errors.js"
import { authenticate, me, parse } from "../http.js"
import { receiveWebhook, reconcileOrder } from "./jobs.js"
import { checkout, provider, reconcilePayment, requestOrderRefund, validSignature } from "./service.js"

export async function paymentModule(app: FastifyInstance, ctx: AppContext) {
  app.get("/api/catalog/offers", async req => {
    const query = parse(z.object({ course_id: z.string().min(1) }), req.query)
    const offers = await ctx.db.select({ id: course_offers.id, title: course_offers.title, price: course_offers.price, currency: course_offers.currency, mode: course_offers.mode }).from(course_offers)
      .innerJoin(courses, eq(courses.id, course_offers.course_id)).where(and(eq(course_offers.course_id, query.course_id), eq(course_offers.status, "Published"), eq(courses.status, "Published")))
    const batches = await ctx.db.select({ id: cohort_batches.id, offer_id: cohort_batches.offer_id, name: cohort_batches.name, starts_at: cohort_batches.starts_at, timezone: cohort_batches.timezone }).from(cohort_batches)
      .where(and(eq(cohort_batches.course_id, query.course_id), sql`(${cohort_batches.lifecycle} in ('Recruiting','Ready','Scheduled') or (${cohort_batches.lifecycle}='Running' and ${cohort_batches.allow_late_join}=true))`,
        sql`(${cohort_batches.registration_deadline} is null or ${cohort_batches.registration_deadline}>now() or (${cohort_batches.lifecycle}='Running' and ${cohort_batches.allow_late_join}=true))`))
    return { offers: offers.map(o => ({ ...o, batches: batches.filter(b => b.offer_id === o.id) })) }
  })
  await app.register(async scope => {
    scope.removeContentTypeParser("application/json")
    scope.addContentTypeParser("application/json", { parseAs: "buffer", bodyLimit: 256 * 1024 }, (_req, body, done) => done(null, body))
    scope.post("/razorpay", { bodyLimit: 256 * 1024 }, async (req, reply) => {
      const result = await receiveWebhook(ctx, req.body as Buffer, String(req.headers["x-razorpay-signature"] ?? ""), String(req.headers["x-razorpay-event-id"] ?? ""))
      return reply.code(202).send(result)
    })
  }, { prefix: "/api/webhooks" })
  await app.register(async scope => {
    scope.addHook("preHandler", authenticate(ctx, ["Student"]))
    scope.post("/checkout", async req => checkout(ctx, me(req).id, parse(z.object({ offer_id: z.string().min(1), batch_id: z.string().optional(), idempotency_key: z.string().uuid() }), req.body)))
    scope.get("/orders", async req => ({ orders: await ctx.db.select().from(orders).where(eq(orders.student_id, me(req).id)).orderBy(desc(orders.created_at)) }))
    scope.get<{ Params: { id: string } }>("/orders/:id", async req => {
      const [order] = await ctx.db.select().from(orders).where(and(eq(orders.id, req.params.id), eq(orders.student_id, me(req).id)))
      if (!order) throw notFound()
      return { order }
    })
    scope.post<{ Params: { id: string } }>("/orders/:id/verify", async req => {
      const input = parse(z.object({ razorpay_payment_id: z.string(), razorpay_order_id: z.string(), razorpay_signature: z.string() }), req.body)
      const [order] = await ctx.db.select().from(orders).where(and(eq(orders.id, req.params.id), eq(orders.student_id, me(req).id)))
      if (!order) throw notFound()
      if (!order.provider_order_id || input.razorpay_order_id !== order.provider_order_id || !validSignature(`${order.provider_order_id}|${input.razorpay_payment_id}`, input.razorpay_signature, ctx.config.RAZORPAY_KEY_SECRET)) throw unauthorized("Invalid checkout confirmation")
      const remote = await provider(ctx).fetchPayment(input.razorpay_payment_id)
      if (remote.id !== input.razorpay_payment_id || remote.order_id !== order.provider_order_id) throw conflict("Payment does not belong to this checkout")
      await reconcilePayment(ctx, remote)
      return { order: (await ctx.db.select().from(orders).where(eq(orders.id, order.id)))[0] }
    })
  }, { prefix: "/api/student" })
}

export async function paymentAdminRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/orders", async () => {
    const rows = await ctx.db.select({ order: orders, student_name: users.full_name, student_email: users.email }).from(orders).innerJoin(users, eq(users.id, orders.student_id)).orderBy(desc(orders.created_at))
    const paymentRows = await ctx.db.select().from(payments)
    const refundRows = await ctx.db.select().from(refunds)
    const captured = paymentRows.filter(p => p.captured_at)
    const gross = captured.reduce((sum, p) => sum + p.amount, 0), returned = captured.reduce((sum, p) => sum + p.refunded_amount, 0)
    return { configured: Boolean(ctx.payments), test_mode: true, revenue: { currency: "INR", gross, refunded: returned, net: gross - returned, captured_payments: captured.length },
      orders: rows.map(({ order, ...student }) => ({ ...order, ...student, payments: paymentRows.filter(p => p.order_id === order.id), refunds: refundRows.filter(r => r.order_id === order.id) })) }
  })
  app.post<{ Params: { id: string } }>("/orders/:id/refund", async req => {
    const { reason } = parse(z.object({ reason: z.string().trim().min(3).max(1000) }), req.body)
    return { refunds: await requestOrderRefund(ctx, req.params.id, reason, me(req).id), message: "Refund requested. Completion requires provider confirmation." }
  })
  app.post<{ Params: { id: string } }>("/orders/:id/reconcile", async req => { await reconcileOrder(ctx, req.params.id); return { ok: true } })
  app.delete("/orders/:id", async () => { throw conflict("Financial records cannot be deleted") })
  app.get("/revenue", async () => {
    const result = await ctx.db.execute(sql`select o.course_id, coalesce(sum(p.amount) filter(where p.captured_at is not null),0)::bigint as gross,
      coalesce(sum(p.refunded_amount),0)::bigint as refunded from lms.orders o left join lms.payments p on p.order_id=o.id group by o.course_id`)
    return { currency: "INR", unit: "paise", courses: result.rows.map(r => ({ course_id: r.course_id, gross: Number(r.gross), refunded: Number(r.refunded), net: Number(r.gross) - Number(r.refunded) })) }
  })
}
