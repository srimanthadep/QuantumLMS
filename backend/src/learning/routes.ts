import { lockCourse } from "./content.js"
import { provider, queueRefund } from "../payments/service.js"
import { localDay } from "../lib/time.js"
import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { audit_events, batch_registrations, batch_teachers, cohort_batches, course_offers, course_teachers, courses, orders, payments, users } from "../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { parse, me } from "../http.js"
import { assertPublishable } from "../media/publication.js"
import { admit, availableSeats, cancelRegistration, lockBatch } from "./admission.js"
import { transitionBatch } from "./lifecycle.js"

const policy = z.object({ requiredLessonsPercent: z.number().min(0).max(100).default(100), requiredAssessments: z.boolean().default(true),
  passMark: z.number().min(0).max(100).default(40), batchEnded: z.boolean().default(true), attendancePercent: z.number().min(0).max(100).default(0) })
export async function learningAdminRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db
  app.get("/offers", async () => ({ offers: await db.select().from(course_offers) }))
  app.post("/offers", async req => {
    const input = parse(z.object({ course_id: z.string().min(1), title: z.string().min(2).max(150), mode: z.enum(["live", "self_paced"]),
      price: z.number().int().min(0).max(10_000_000), currency: z.literal("INR").default("INR"), completion_policy: policy.optional() }), req.body)
    const [course] = await db.select().from(courses).where(eq(courses.id, input.course_id))
    if (!course) throw notFound("Course not found")
    const [offer] = await db.insert(course_offers).values({ id: randomUUID(), ...input }).returning()
    return { offer }
  })
  app.patch<{ Params: { id: string } }>("/offers/:id", async req => {
    const patch = parse(z.object({ title: z.string().min(2).max(150).optional(), price: z.number().int().min(0).max(10_000_000).optional(),
      status: z.enum(["Draft", "Published", "Archived"]).optional(), completion_policy: policy.optional() }), req.body)
    const offer = await db.transaction(async tx => {
      const [hint] = await tx.select().from(course_offers).where(eq(course_offers.id, req.params.id))
      if (!hint) throw notFound("Offer not found")
      await lockCourse(tx, hint.course_id)
      const [current] = await tx.select().from(course_offers).where(eq(course_offers.id, req.params.id)).for("update")
      if (!current) throw notFound("Offer not found")
      if (patch.status === "Published") {
        await lockCourse(tx, current.course_id)
        if (current.mode === "self_paced") await assertPublishable(tx, current.course_id)
        await tx.update(courses).set({ status: "Published" }).where(eq(courses.id, current.course_id))
      }
      const [row] = await tx.update(course_offers).set(patch).where(eq(course_offers.id, current.id)).returning()
      return row
    })
    return { offer }
  })
  app.get<{ Params: { id: string } }>("/batches/:id/admission", async req => {
    const [batch] = await db.select().from(cohort_batches).where(eq(cohort_batches.id, req.params.id))
    if (!batch) throw notFound("Batch not found")
    const teachers = await db.select({ id: users.id, name: users.full_name }).from(batch_teachers).innerJoin(users, eq(users.id, batch_teachers.teacher_id)).where(eq(batch_teachers.batch_id, batch.id))
    const paid = await db.execute(sql`select count(*)::int as count from lms.batch_registrations where batch_id = ${batch.id} and state = 'confirmed' and paid_at is not null`)
    const { meeting_url: _protected, ...safe } = batch
    return { batch: safe, teachers, paid: paid.rows[0].count, available: await availableSeats(db, batch) }
  })
  app.patch<{ Params: { id: string } }>("/batches/:id/admission", async req => {
    const input = parse(z.object({ offer_id: z.string().optional(), minimum_paid_registrations: z.number().int().min(0).optional(),
      starts_at: z.string().datetime({ offset: true }).optional(), ends_at: z.string().datetime({ offset: true }).optional(), registration_deadline: z.string().datetime({ offset: true }).optional(),
      allow_late_join: z.boolean().optional(), underfilled_action: z.enum(["admin_decides", "extend", "merge", "refund", "cancel"]).optional(),
      live_provider: z.enum(["zoom_link", "meet_link"]).optional(), join_before_minutes: z.number().int().min(0).max(1440).optional(), join_after_minutes: z.number().int().min(0).max(1440).optional(),
      teacher_ids: z.array(z.string().uuid()).max(20).optional(), timezone: z.string().refine(v => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true } catch { return false } }, "Choose an IANA timezone").optional() }), req.body)
    return db.transaction(async tx => {
      const batch = await lockBatch(tx, req.params.id)
      if (["Completed", "Cancelled"].includes(batch.lifecycle)) throw conflict("This batch is closed")
      if (input.offer_id) {
        const [offer] = await tx.select().from(course_offers).where(eq(course_offers.id, input.offer_id))
        if (!offer || offer.course_id !== batch.course_id || offer.mode !== "live") throw badRequest("Select a live offer for this course")
      }
      if ((input.minimum_paid_registrations ?? batch.minimum_paid_registrations ?? 0) > batch.max_seats) throw badRequest("The minimum cannot exceed capacity")
      const start = input.starts_at ? new Date(input.starts_at) : batch.starts_at
      const end = input.ends_at ? new Date(input.ends_at) : batch.ends_at
      if (start && end && start >= end) throw badRequest("The end must follow the start")
      if (batch.lifecycle === "Running" && (input.starts_at || input.ends_at || input.offer_id)) throw conflict("Running batch dates and offer are locked")
      const deadline = input.registration_deadline ? new Date(input.registration_deadline) : batch.registration_deadline ?? (start ? new Date(start.getTime() - 3 * 86400_000) : null)
      if (deadline && start && deadline > start && !(input.allow_late_join ?? batch.allow_late_join)) throw badRequest("Registration must close by the start unless late joining is enabled")
      const { teacher_ids, starts_at: _s, ends_at: _e, registration_deadline: _d, ...rest } = input
      await tx.update(cohort_batches).set({ ...rest, starts_at: start, ends_at: end, registration_deadline: deadline,
        ...(start ? { start_date: localDay(start, input.timezone ?? batch.timezone) } : {}), ...(end ? { end_date: localDay(end, input.timezone ?? batch.timezone) } : {}),
        minimum_paid_registrations: input.minimum_paid_registrations ?? batch.minimum_paid_registrations ?? Math.ceil(batch.max_seats * 0.6), updated_at: new Date() }).where(eq(cohort_batches.id, batch.id))
      if (teacher_ids) {
        const names: string[] = []
        for (const id of teacher_ids) {
          const [teacher] = await tx.select().from(users).where(eq(users.id, id))
          if (!teacher || teacher.role !== "Teacher" || teacher.disabled_at || teacher.provisioning_state !== "active") throw badRequest("Every assigned teacher must be an active provisioned teacher")
          names.push(teacher.full_name)
        }
        await tx.update(cohort_batches).set({ instructor: names.join(", ") || "Unassigned" }).where(eq(cohort_batches.id, batch.id))
        await tx.delete(batch_teachers).where(eq(batch_teachers.batch_id, batch.id))
        if (teacher_ids.length) await tx.insert(batch_teachers).values([...new Set(teacher_ids)].map(id => ({ batch_id: batch.id, teacher_id: id })))
      }
      return { ok: true }
    })
  })
  app.post<{ Params: { id: string } }>("/batches/:id/transition", async req => {
    const { state } = parse(z.object({ state: z.enum(["Recruiting", "Ready", "Scheduled", "Running", "Completed", "Cancelled"]) }), req.body)
    if (state === "Cancelled") throw badRequest("Use the underfilled cancellation action to revoke registrations safely")
    return db.transaction(async tx => ({ batch: await transitionBatch(tx, me(req), req.params.id, state) }))
  })
  app.post<{ Params: { id: string } }>("/batches/:id/underfilled", async req => {
    const input = parse(z.object({ action: z.enum(["extend", "merge", "refund", "cancel"]), deadline: z.string().datetime({ offset: true }).optional(), target_batch_id: z.string().optional() }), req.body)
    if (input.action === "refund") provider(ctx)
    return db.transaction(async tx => {
      // Payment paths lock order before batch; maintain that order for bulk refund requests.
      const relatedOrders = input.action === "refund" ? await tx.select().from(orders).where(sql`${orders.batch_id}=${req.params.id} or ${orders.id} in (select order_id from lms.batch_registrations where batch_id=${req.params.id} and state<>'cancelled')`).orderBy(orders.id).for("update") : []
      for (const id of [...new Set([req.params.id, ...(input.target_batch_id ? [input.target_batch_id] : [])])].sort()) await lockBatch(tx, id)
      const batch = await lockBatch(tx, req.params.id)
      if (["Running", "Completed", "Cancelled"].includes(batch.lifecycle)) throw conflict("Underfilled decisions apply before a batch begins")
      if (input.action === "refund") {
        let requested = 0
        for (const order of relatedOrders) {
          const captured = await tx.select().from(payments).where(and(eq(payments.order_id, order.id), sql`${payments.captured_at} is not null`))
          for (const payment of captured) { await queueRefund(tx, payment, "Underfilled batch refund", me(req).id); requested++ }
        }
        if (!requested) throw conflict("No verified captured payments exist for this batch. Legacy registrations require manual reconciliation.")
        await tx.update(cohort_batches).set({ underfilled_action: "refund", registration_deadline: new Date() }).where(eq(cohort_batches.id, batch.id))
      } else if (input.action === "extend") {
        if (!input.deadline || new Date(input.deadline) <= new Date()) throw badRequest("Choose a future deadline")
        if (batch.starts_at && new Date(input.deadline) > batch.starts_at && !batch.allow_late_join) throw badRequest("Move the start date before extending registration beyond it")
        await tx.update(cohort_batches).set({ registration_deadline: new Date(input.deadline), underfilled_action: "extend", lifecycle: "Recruiting" }).where(eq(cohort_batches.id, batch.id))
      } else {
        const registrations = await tx.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, batch.id), sql`${batch_registrations.state} <> 'cancelled'`))
        if (registrations.some(r => r.paid_at) && input.action === "cancel") throw conflict("Refund paid registrations before cancelling this batch")
        let target: typeof cohort_batches.$inferSelect | undefined
        if (input.action === "merge") {
          if (!input.target_batch_id || input.target_batch_id === batch.id) throw badRequest("Select a different target batch")
          target = await lockBatch(tx, input.target_batch_id)
          if (target.course_id !== batch.course_id) throw badRequest("Merge only batches of the same course")
        }
        for (const registration of registrations.sort((a, b) => a.student_id.localeCompare(b.student_id))) {
          if (target) {
            const result = await admit(tx, { batchId: target.id, student: registration.student_id, status: registration.state === "waitlisted" ? "Waitlisted" : registration.state === "paused" ? "Paused" : "Active",
              source: registration.source_type, orderId: registration.order_id ?? undefined, paidAt: registration.paid_at ?? undefined })
            if (result.skipped) throw conflict("A learner is already registered in the target batch; resolve the overlap first")
          }
          await cancelRegistration(tx, batch.id, registration.student_id)
        }
        await transitionBatch(tx, me(req), batch.id, "Cancelled")
        await tx.update(cohort_batches).set({ underfilled_action: input.action }).where(eq(cohort_batches.id, batch.id))
      }
      await tx.insert(audit_events).values({ actor_id: me(req).id, actor_role: me(req).role, action: `batch.underfilled.${input.action}`, target: batch.id, outcome: "success" })
      return { ok: true }
    })
  })
  app.put<{ Params: { id: string } }>("/courses/:id/teachers", async req => {
    const { teacher_ids } = parse(z.object({ teacher_ids: z.array(z.string().uuid()).max(20) }), req.body)
    await db.transaction(async tx => {
      for (const id of teacher_ids) {
        const [teacher] = await tx.select().from(users).where(eq(users.id, id))
        if (teacher?.role !== "Teacher" || teacher.disabled_at) throw badRequest("Select active teachers")
      }
      await tx.delete(course_teachers).where(eq(course_teachers.course_id, req.params.id))
      if (teacher_ids.length) await tx.insert(course_teachers).values([...new Set(teacher_ids)].map(id => ({ course_id: req.params.id, teacher_id: id })))
    })
    return { ok: true }
  })
}
