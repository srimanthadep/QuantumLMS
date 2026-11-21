import { and, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { course_offers, courses, orders, payments, refunds, users } from "../db/schema.js"
import { conflict, notFound, unauthorized } from "../errors.js"
import { authenticate, me, parse } from "../http.js"
import { receiveWebhook, reconcileOrder } from "./jobs.js"
import { checkout, provider, reconcilePayment, requestOrderRefund, validSignature } from "./service.js"

export async function paymentModule(app: FastifyInstance, ctx: AppContext) {
  // Courses are Coursera-style: one self-paced offer per course (free or paid). Batches are never listed under a course.
  app.get("/api/catalog/offers", async req => {
    const query = parse(z.object({ course_id: z.string().min(1) }), req.query)
    const offers = await ctx.db.select({ id: course_offers.id, title: course_offers.title, price: course_offers.price, currency: course_offers.currency, mode: course_offers.mode }).from(course_offers)
      .innerJoin(courses, eq(courses.id, course_offers.course_id)).where(and(eq(course_offers.course_id, query.course_id), eq(course_offers.mode, "self_paced"), eq(course_offers.status, "Published"), eq(courses.status, "Published"), sql`${courses.deleted_at} is null`))
    return { offers: offers.map(o => ({ ...o, batches: [] })) }
  })
  // Live batches are a separate product: their own price, seats, schedule and videos. No course is involved.
  app.get("/api/catalog/batches", async () => {
    const rows = await ctx.db.execute(sql`select b.id,b.name,b.instructor,b.instructor_avatar,b.starts_at,b.ends_at,b.start_date,b.end_date,b.schedule,b.timezone,b.max_seats,b.delivery_mode,b.notes as description,
        b.lifecycle,b.allow_late_join,b.registration_deadline,o.id as offer_id,o.price,o.currency,c.title as topic,
        greatest(0, b.max_seats - (select count(*) from lms.batch_registrations r where r.batch_id=b.id and r.state in ('confirmed','paused'))
          - (select count(*) from lms.seat_reservations x where x.batch_id=b.id and x.state='active' and x.expires_at>now()))::int as seats_left
      from lms.cohort_batches b left join lms.course_offers o on o.id=b.offer_id and o.status='Published' left join lms.courses c on c.id=b.course_id and c.deleted_at is null
      where o.id is not null and (b.lifecycle in ('Recruiting','Ready','Scheduled') or (b.lifecycle='Running' and b.allow_late_join=true))
        and (b.registration_deadline is null or b.registration_deadline>now() or (b.lifecycle='Running' and b.allow_late_join=true))
      order by b.starts_at nulls last, b.created_at desc limit 200`)
    return { batches: rows.rows }
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
    // The learner's live batches: each is a separate product from any course, so it carries its own schedule and content counts.
    scope.get("/batches", async req => {
      const rows = await ctx.db.execute(sql`select b.id,b.name,b.instructor,b.instructor_avatar,b.schedule,b.timezone,b.starts_at,b.ends_at,b.lifecycle,b.delivery_mode,b.replay_enabled,
          r.state as registration_state,r.confirmed_at,c.title as topic,
          (select min(s.starts_at) from lms.live_sessions s where s.batch_id=b.id and s.status='Scheduled' and s.starts_at>now()) as next_session_at,
          (select count(*)::int from lms.recordings x join lms.media_assets a on a.id=x.asset_id where x.batch_id=b.id and x.status='Published' and x.release_at<=now() and x.expires_at>now() and a.state='ready' and x.session_id is not null) as replay_count,
          (select count(*)::int from lms.recordings x join lms.media_assets a on a.id=x.asset_id where x.batch_id=b.id and x.status='Published' and x.release_at<=now() and x.expires_at>now() and a.state='ready' and x.session_id is null) as video_count
        from lms.batch_registrations r join lms.cohort_batches b on b.id=r.batch_id left join lms.courses c on c.id=b.course_id and c.deleted_at is null
        where r.student_id=${me(req).id}::uuid and r.state in ('confirmed','waitlisted','paused') order by b.starts_at nulls last, b.created_at desc`)
      return { batches: rows.rows }
    })
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
    const result = await ctx.db.execute(sql`select o.course_id, o.batch_id, coalesce(sum(p.amount) filter(where p.captured_at is not null),0)::bigint as gross,
      coalesce(sum(p.refunded_amount),0)::bigint as refunded from lms.orders o left join lms.payments p on p.order_id=o.id group by o.course_id, o.batch_id`)
    const line = (r: Record<string, unknown>) => ({ gross: Number(r.gross), refunded: Number(r.refunded), net: Number(r.gross) - Number(r.refunded) })
    // Course sales and live-batch sales are different products, so they are reported separately.
    return { currency: "INR", unit: "paise",
      courses: result.rows.filter(r => r.course_id && !r.batch_id).map(r => ({ course_id: r.course_id, ...line(r) })),
      batches: result.rows.filter(r => r.batch_id).map(r => ({ batch_id: r.batch_id, ...line(r) })) }
  })
}
