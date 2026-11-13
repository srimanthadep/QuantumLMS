import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import { isAdmin } from "../auth/access.js"
import type { Tx } from "../db/client.js"
import { audit_events, cohort_batches, live_sessions, schedule_exceptions, session_attendance } from "../db/schema.js"
import { badRequest, conflict, forbidden, notFound } from "../errors.js"
import { lockBatch } from "../learning/admission.js"
import { transitionBatch } from "../learning/lifecycle.js"
import { assertBatchAuthor, sessionFor } from "./access.js"
import { localInstant } from "./calendar.js"
import { liveProvider, validatedLinks } from "./providers.js"
import { chooseTeacher, notifyBatch } from "./schedules.js"

export interface SessionInput {
  id?: string; batch_id: string; title: string; teacher_id?: string | null; date: string; local_start: string; timezone: string; duration_minutes: number
  provider?: string; join_url?: string | null; host_url?: string | null; passcode?: string | null
}
export async function createSession(ctx: AppContext, actor: AuthUser, input: SessionInput) {
  return ctx.db.transaction(async tx => {
    const batch = await lockBatch(tx, input.batch_id)
    await assertBatchAuthor(tx, actor, batch.id)
    if (["Completed","Cancelled"].includes(batch.lifecycle)) throw conflict("This batch is closed")
    if (input.id && (await tx.select().from(live_sessions).where(eq(live_sessions.id, input.id))).length) throw conflict("This session already exists. Refresh the schedule.")
    const start = localInstant(input.date, input.local_start, input.timezone).instant, end = new Date(start.getTime()+input.duration_minutes*60000)
    if (start < new Date() || !batch.starts_at || !batch.ends_at || start < batch.starts_at || end > batch.ends_at) throw badRequest("Choose a future date and time within this batch's configured bounds")
    const teacher = await chooseTeacher(tx, actor, batch.id, input.teacher_id)
    const links = validatedLinks({ provider: input.provider ?? batch.live_provider, join_url: input.join_url ?? batch.meeting_url, host_url: input.host_url ?? batch.default_host_url, passcode: input.passcode ?? batch.default_passcode })
    const id = input.id ?? randomUUID()
    const [session] = await tx.insert(live_sessions).values({ id, occurrence_key: `manual:${id}`, batch_id: batch.id, title: input.title, teacher_id: teacher,
      starts_at: start, ends_at: end, local_date: input.date, timezone: input.timezone, ...links }).returning()
    await notifyBatch(tx, batch.id, "Class scheduled", `${session.title} is scheduled for ${input.date} at ${input.local_start} (${input.timezone}).`)
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "session.scheduled", target: id, outcome: "success" })
    return session
  })
}

async function lockedSession(tx: Tx, actor: AuthUser, id: string) {
  const [hint] = await tx.select().from(live_sessions).where(eq(live_sessions.id, id))
  if (!hint) throw notFound("Session not found")
  await lockBatch(tx, hint.batch_id)
  const authorized = await sessionFor(tx, actor, id, true)
  const [session] = await tx.select().from(live_sessions).where(eq(live_sessions.id, id)).for("update")
  return { session, batch: authorized.batch }
}
export async function changeSession(ctx: AppContext, actor: AuthUser, id: string, input: { action: "start" | "end" | "cancel" | "reschedule" | "override"; status?: string; reason?: string; starts_at?: string; ends_at?: string }) {
  return ctx.db.transaction(async tx => {
    const { session, batch } = await lockedSession(tx, actor, id)
    const now = new Date()
    let patch: Partial<typeof live_sessions.$inferInsert> = { updated_at: now }
    if (input.action === "start") {
      if (session.status === "Live") return session
      if (session.status !== "Scheduled") throw conflict("Only a scheduled session can start")
      if (now.getTime() < session.starts_at.getTime()-batch.join_before_minutes*60000 || now > session.ends_at) throw conflict("This session is outside its start window")
      liveProvider(session.provider).join(session)
      liveProvider(session.provider).host(session)
      if (batch.lifecycle !== "Running") {
        if (batch.lifecycle !== "Scheduled") throw conflict("Prepare and schedule the batch before starting its first class")
        await transitionBatch(tx, actor, batch.id, "Running")
      }
      patch = { ...patch, status: "Live", actual_start: now }
    } else if (input.action === "end") {
      if (session.status === "Ended") return session
      if (session.status !== "Live") throw conflict("Only a live session can end")
      patch = { ...patch, status: "Ended", actual_end: now }
    } else if (input.action === "override") {
      if (!isAdmin(actor)) throw forbidden("Only an administrator can override session status")
      if (!input.reason?.trim() || !["Scheduled","Live","Ended","Cancelled"].includes(input.status ?? "")) throw badRequest("Provide the new status and an explanation")
      patch.status = input.status
      if (input.status === "Live") {
        liveProvider(session.provider).join(session)
        liveProvider(session.provider).host(session)
        if (batch.lifecycle !== "Running") {
          if (batch.lifecycle !== "Scheduled") throw conflict("Prepare and schedule the batch before starting its first class")
          await transitionBatch(tx, actor, batch.id, "Running")
        }
        patch.actual_start = session.actual_start ?? now
      }
      if (input.status === "Ended") patch.actual_end = session.actual_end ?? now
      const exception = { rule_id: session.schedule_rule_id, session_id: session.id, action: "override", reason: input.reason, actor_id: actor.id }
      await tx.insert(schedule_exceptions).values({ occurrence_key: session.occurrence_key, ...exception }).onConflictDoUpdate({ target: schedule_exceptions.occurrence_key, set: exception })
    } else {
      if (!input.reason?.trim()) throw badRequest("Explain the schedule change")
      if (session.status !== "Scheduled" || session.starts_at <= now) throw conflict("Only future scheduled sessions can be cancelled or rescheduled")
      if (input.action === "reschedule") {
        const start = new Date(input.starts_at ?? ""), end = new Date(input.ends_at ?? "")
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start<=now || end<=start || end.getTime()-start.getTime()>720*60000 || !batch.starts_at || !batch.ends_at || start<batch.starts_at || end>batch.ends_at) throw badRequest("Choose a future session within the batch bounds, lasting no more than twelve hours")
        patch = { ...patch, starts_at: start, ends_at: end }
      } else patch.status = "Cancelled"
      const exception = { rule_id: session.schedule_rule_id, session_id: session.id, action: input.action, reason: input.reason, actor_id: actor.id,
        starts_at: patch.starts_at as Date | undefined, ends_at: patch.ends_at as Date | undefined }
      await tx.insert(schedule_exceptions).values({ occurrence_key: session.occurrence_key, ...exception }).onConflictDoUpdate({ target: schedule_exceptions.occurrence_key, set: exception })
    }
    const [updated] = await tx.update(live_sessions).set(patch).where(eq(live_sessions.id, id)).returning()
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: `session.${input.action}`, target: id, outcome: input.reason ? input.reason.slice(0,1000) : "success" })
    await notifyBatch(tx, batch.id, `Class ${input.action === "start" ? "started" : input.action === "end" ? "ended" : "updated"}`, `${session.title}: ${input.reason ?? updated.status}.`)
    return updated
  })
}

export async function joinSession(ctx: AppContext, actor: AuthUser, id: string, now = new Date()) {
  if (actor.role !== "Student") throw forbidden("Use the assigned teacher's host action")
  return ctx.db.transaction(async tx => {
    const [hint] = await tx.select().from(live_sessions).where(eq(live_sessions.id, id))
    if (!hint) throw notFound("Session not found")
    // Shared locks allow different learners to join concurrently; cancellation/admission changes wait until authorization finishes.
    await tx.select().from(cohort_batches).where(eq(cohort_batches.id, hint.batch_id)).for("share")
    await tx.select().from(live_sessions).where(eq(live_sessions.id, id)).for("share")
    const { session, batch } = await sessionFor(tx, actor, id)
    if (["Completed","Cancelled"].includes(batch.lifecycle) || !["Scheduled","Live"].includes(session.status)) throw conflict("This class has ended or was cancelled")
    if (!["Scheduled","Running"].includes(batch.lifecycle)) throw conflict("The batch is not ready to start yet")
    if (now.getTime()<session.starts_at.getTime()-batch.join_before_minutes*60000) throw conflict(`Joining opens ${batch.join_before_minutes} minutes before class`)
    if (now.getTime()>session.ends_at.getTime()+batch.join_after_minutes*60000) throw conflict("The join window has closed")
    const target = liveProvider(session.provider).join(session)
    await tx.insert(session_attendance).values({ session_id: id, student_id: actor.id, joined_at: now, last_joined_at: now }).onConflictDoUpdate({ target: [session_attendance.session_id,session_attendance.student_id], set: { last_joined_at: now, join_clicks: sql`${session_attendance.join_clicks}+1` } })
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "session.join-click", target: id, outcome: "link-issued" })
    return { ...target, attendance: "Join click recorded; external meeting presence is not verified." }
  })
}
