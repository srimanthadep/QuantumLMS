import { and, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { isAdmin } from "../auth/access.js"
import { audit_events, batch_teachers, cohort_batches, live_sessions, schedule_rules, session_attendance, users } from "../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../errors.js"
import { authenticate, me, parse } from "../http.js"
import { lockBatch } from "../learning/admission.js"
import { assertBatchAuthor, listSessions, sessionFor } from "./access.js"
import { occurrences } from "./calendar.js"
import { validatedLinks } from "./providers.js"
import { saveRule } from "./schedules.js"
import { changeSession, createSession, joinSession } from "./sessions.js"

const links = z.object({ provider: z.enum(["zoom_link","meet_link","own_stream"]), join_url: z.string().max(4096).nullable().optional(), host_url: z.string().max(4096).nullable().optional(), passcode: z.string().max(100).nullable().optional() })
export const sessionInput = links.partial().extend({ id: z.string().uuid().optional(), batch_id: z.string().min(1), title: z.string().trim().min(3).max(200), teacher_id: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), local_start: z.string().regex(/^\d{2}:\d{2}$/), timezone: z.string().min(1), duration_minutes: z.number().int().min(1).max(720) })
const recurrence = links.extend({ batch_id: z.string().min(1), title: z.string().trim().min(3).max(200), teacher_id: z.string().uuid().nullable().optional(),
  timezone: z.string().min(1), weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7), local_start: z.string().regex(/^\d{2}:\d{2}$/),
  duration_minutes: z.number().int().min(1).max(720), start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

export async function liveModule(app: FastifyInstance, ctx: AppContext) {
  await app.register(async scope => {
    scope.addHook("preHandler", authenticate(ctx, ["Student","Teacher","Admin","Super Admin"]))
    scope.get("/sessions", async req => ({ sessions: await listSessions(ctx.db, me(req), parse(z.object({ id: z.string().optional(), batch_id: z.string().optional(), from: z.string().datetime({ offset: true }).optional(), to: z.string().datetime({ offset: true }).optional() }), req.query)), now: new Date().toISOString() }))
    scope.post<{ Params: { id: string } }>("/sessions/:id/join", async req => joinSession(ctx, me(req), req.params.id))
    scope.post<{ Params: { id: string } }>("/sessions/:id/host", async req => {
      const { session } = await sessionFor(ctx.db, me(req), req.params.id, true)
      if (session.status === "Cancelled") throw conflict("This session was cancelled")
      const { liveProvider } = await import("./providers.js")
      const target = liveProvider(session.provider).host(session)
      await ctx.db.insert(audit_events).values({ actor_id: me(req).id, actor_role: me(req).role, action: "session.host-link", target: session.id, outcome: "link-issued" })
      return target
    })
    scope.post<{ Params: { id: string } }>("/sessions/:id/action", async req => {
      const input = parse(z.object({ action: z.enum(["start","end","cancel","reschedule","override"]), status: z.enum(["Scheduled","Live","Ended","Cancelled"]).optional(), reason: z.string().trim().max(1000).optional(), starts_at: z.string().datetime({ offset: true }).optional(), ends_at: z.string().datetime({ offset: true }).optional() }), req.body)
      const session = await changeSession(ctx, me(req), req.params.id, input)
      return { id: session.id, status: session.status, starts_at: session.starts_at, ends_at: session.ends_at, actual_start: session.actual_start, actual_end: session.actual_end }
    })
    scope.get<{ Params: { id: string } }>("/sessions/:id/settings", async req => ({ session: (await sessionFor(ctx.db, me(req), req.params.id, true)).session }))
    scope.patch<{ Params: { id: string } }>("/sessions/:id/settings", async req => {
      const patch = parse(links.partial(), req.body)
      await ctx.db.transaction(async tx => {
        const [hint] = await tx.select().from(live_sessions).where(eq(live_sessions.id, req.params.id))
        if (!hint) throw notFound()
        await lockBatch(tx, hint.batch_id)
        const { session } = await sessionFor(tx, me(req), hint.id, true)
        if (["Ended","Cancelled"].includes(session.status)) throw conflict("Meeting settings can change only for scheduled or live classes")
        const validated = validatedLinks({ ...session, ...patch })
        await tx.update(live_sessions).set({ ...validated, updated_at: new Date() }).where(eq(live_sessions.id, session.id))
      })
      return { ok: true }
    })
    scope.post("/sessions", async req => { const session = await createSession(ctx, me(req), parse(sessionInput, req.body)); return { id: session.id, starts_at: session.starts_at, ends_at: session.ends_at, status: session.status } })
    scope.get<{ Params: { id: string } }>("/sessions/:id/attendance", async req => {
      const { session } = await sessionFor(ctx.db, me(req), req.params.id)
      const student = me(req).role === "Student"
      const rows = await ctx.db.select({ student_id: session_attendance.student_id, name: users.full_name, joined_at: session_attendance.joined_at, last_joined_at: session_attendance.last_joined_at, join_clicks: session_attendance.join_clicks })
        .from(session_attendance).innerJoin(users, eq(users.id, session_attendance.student_id)).where(and(eq(session_attendance.session_id, session.id), student ? eq(session_attendance.student_id, me(req).id) : undefined))
      return { basis: "Join clicks only; presence in Zoom or Google Meet is not verified.", records: rows }
    })
    scope.get("/live/batches", async req => {
      const u = me(req)
      if (!isAdmin(u) && u.role !== "Teacher") throw forbidden("Only authors can view scheduling options")
      const rows = await ctx.db.select({ id: cohort_batches.id, name: cohort_batches.name, course_id: cohort_batches.course_id, timezone: cohort_batches.timezone, starts_at: cohort_batches.starts_at, ends_at: cohort_batches.ends_at, lifecycle: cohort_batches.lifecycle, provider: cohort_batches.live_provider })
        .from(cohort_batches).where(isAdmin(u) ? undefined : sql`exists(select 1 from lms.batch_teachers bt where bt.batch_id=${cohort_batches.id} and bt.teacher_id=${u.id}::uuid)`)
      return { batches: rows }
    })
    scope.get<{ Params: { id: string } }>("/live/batches/:id/settings", async req => {
      await assertBatchAuthor(ctx.db, me(req), req.params.id)
      const [batch] = await ctx.db.select().from(cohort_batches).where(eq(cohort_batches.id, req.params.id)); if (!batch) throw notFound()
      const teachers = await ctx.db.select({ id: users.id, name: users.full_name }).from(batch_teachers).innerJoin(users, eq(users.id, batch_teachers.teacher_id)).where(and(eq(batch_teachers.batch_id, batch.id), sql`${users.disabled_at} is null`))
      return { provider: batch.live_provider, join_url: batch.meeting_url, host_url: batch.default_host_url, passcode: batch.default_passcode, teachers,
        rules: await ctx.db.select().from(schedule_rules).where(eq(schedule_rules.batch_id, batch.id)) }
    })
    scope.put<{ Params: { id: string } }>("/live/batches/:id/settings", async req => {
      const input = validatedLinks(parse(links, req.body))
      await ctx.db.transaction(async tx => { await lockBatch(tx, req.params.id); await assertBatchAuthor(tx, me(req), req.params.id)
        await tx.update(cohort_batches).set({ live_provider: input.provider, meeting_url: input.join_url, default_host_url: input.host_url, default_passcode: input.passcode }).where(eq(cohort_batches.id, req.params.id)) })
      return { ok: true, note: "Defaults apply to newly scheduled sessions. Edit an existing session or rule to change its links." }
    })
    scope.post("/live/validate-link", async req => { if (!isAdmin(me(req)) && me(req).role !== "Teacher") throw forbidden(); const checked = validatedLinks(parse(links, req.body)); if (!checked.join_url) throw badRequest("Paste a student meeting link to validate"); return { valid: true, note: "Link format is valid. Meeting availability is checked by Zoom or Google Meet." } })
    scope.post("/live/rules/preview", async req => {
      const input = parse(recurrence, req.body)
      await assertBatchAuthor(ctx.db, me(req), input.batch_id)
      const [batch] = await ctx.db.select().from(cohort_batches).where(eq(cohort_batches.id, input.batch_id)); if (!batch) throw notFound()
      validatedLinks(input)
      const preview = occurrences(input, batch)
      return { occurrences: preview, future_count: preview.filter(o => o.starts_at > new Date()).length, clock_change_policy: "Nonexistent local times are rejected; repeated local times use the earlier instant." }
    })
    scope.post("/live/rules", async req => ({ rule: await saveRule(ctx, me(req), parse(recurrence.extend({ id: z.string().uuid(), expected_version: z.number().int().positive().optional(), apply_to: z.literal("future") }), req.body)) }))
  }, { prefix: "/api" })
}
