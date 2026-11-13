import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import { isAdmin } from "../auth/access.js"
import type { Tx } from "../db/client.js"
import { audit_events, batch_teachers, cohort_batches, live_sessions, notifications, schedule_exceptions, schedule_rule_versions, schedule_rules, users } from "../db/schema.js"
import { badRequest, conflict, notFound } from "../errors.js"
import { lockBatch } from "../learning/admission.js"
import { assertBatchAuthor } from "./access.js"
import { occurrences, type RuleInput } from "./calendar.js"
import { validatedLinks } from "./providers.js"

export interface ScheduleInput extends RuleInput {
  id: string; batch_id: string; title: string; teacher_id?: string | null; provider: string; join_url?: string | null; host_url?: string | null; passcode?: string | null
  expected_version?: number
}
export async function chooseTeacher(tx: Tx, actor: AuthUser, batch: string, proposed?: string | null) {
  const assignment = proposed ? null : (await tx.select().from(batch_teachers).where(eq(batch_teachers.batch_id, batch)).limit(1))[0]
  const id = proposed ?? (actor.role === "Teacher" ? actor.id : assignment?.teacher_id)
  if (!id) throw badRequest("Assign a teacher before scheduling classes")
  const [teacher] = await tx.select().from(users).where(eq(users.id, id))
  if (teacher?.role !== "Teacher" || teacher.disabled_at || teacher.provisioning_state !== "active") throw badRequest("Select an active teacher account")
  if (!isAdmin(actor) && id !== actor.id) throw badRequest("Teachers can schedule themselves; an administrator can assign another teacher")
  return id
}
export async function notifyBatch(tx: Tx, batchId: string, title: string, message: string) {
  const recipients = await tx.execute(sql`select distinct br.student_id from lms.batch_registrations br join lms.profiles p on p.id=br.student_id
    join lms.entitlement_grants g on g.student_id=br.student_id and g.batch_id=br.batch_id
    where br.batch_id=${batchId} and br.state='confirmed' and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())`)
  if (recipients.rows.length) await tx.insert(notifications).values(recipients.rows.map(r => ({ student_id: String(r.student_id), kind: "class", title, message, link: "schedule" })))
}
export async function saveRule(ctx: AppContext, actor: AuthUser, input: ScheduleInput) {
  const result = await ctx.db.transaction(async tx => {
    const batch = await lockBatch(tx, input.batch_id)
    await assertBatchAuthor(tx, actor, batch.id)
    if (["Completed","Cancelled"].includes(batch.lifecycle)) throw conflict("This batch is closed")
    const preview = occurrences(input, batch)
    if (!preview.some(o => o.starts_at > new Date())) throw badRequest("The schedule must contain a future class")
    const [existing] = await tx.select().from(schedule_rules).where(eq(schedule_rules.id, input.id)).for("update")
    if (existing && existing.batch_id !== batch.id) throw notFound("Schedule rule not found")
    if (existing && input.expected_version !== existing.version) throw conflict("The schedule changed. Refresh before editing it")
    if (!existing && input.expected_version !== undefined) throw notFound("Schedule rule not found")
    const teacher = await chooseTeacher(tx, actor, batch.id, input.teacher_id)
    const links = validatedLinks({ provider: input.provider, join_url: input.join_url ?? batch.meeting_url, host_url: input.host_url ?? batch.default_host_url, passcode: input.passcode ?? batch.default_passcode })
    const values = { batch_id: batch.id, title: input.title, teacher_id: teacher, timezone: input.timezone, weekdays: [...new Set(input.weekdays)].sort(),
      local_start: input.local_start, duration_minutes: input.duration_minutes, start_date: input.start_date, end_date: input.end_date, ...links,
      version: (existing?.version ?? 0)+1, active: true, generation_error: null, available_at: new Date(), updated_at: new Date() }
    const [rule] = await tx.insert(schedule_rules).values({ id: input.id, ...values }).onConflictDoUpdate({ target: schedule_rules.id, set: values }).returning()
    await tx.insert(schedule_rule_versions).values({ rule_id: rule.id, version: rule.version, snapshot: rule, actor_id: actor.id })
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "schedule.saved", target: `${rule.id}:${rule.version}`, outcome: "queued" })
    return rule
  })
  // The saved rule is durable work. A transient generation failure is visible and picked up by the sweep.
  try { await generateRule(ctx, result.id) } catch { await ctx.db.update(schedule_rules).set({ generation_error: "Session generation is pending; the scheduler will retry", available_at: new Date(Date.now()+60000) }).where(eq(schedule_rules.id, result.id)) }
  return (await ctx.db.select().from(schedule_rules).where(eq(schedule_rules.id, result.id)))[0]
}

export async function generateRule(ctx: AppContext, ruleId: string) {
  const [hint] = await ctx.db.select().from(schedule_rules).where(eq(schedule_rules.id, ruleId))
  if (!hint) throw notFound("Schedule rule not found")
  return ctx.db.transaction(async tx => {
    const batch = await lockBatch(tx, hint.batch_id)
    const [rule] = await tx.select().from(schedule_rules).where(eq(schedule_rules.id, ruleId)).for("update")
    if (!rule.active || rule.generated_version === rule.version) return 0
    if (["Completed","Cancelled"].includes(batch.lifecycle)) {
      await tx.update(schedule_rules).set({ active: false, generation_error: "Batch closed before generation" }).where(eq(schedule_rules.id, rule.id))
      return 0
    }
    const now = new Date(), future = occurrences(rule, batch).filter(o => o.starts_at > now)
    const exceptions = await tx.select().from(schedule_exceptions).where(eq(schedule_exceptions.rule_id, rule.id))
    const protectedKeys = new Set(exceptions.map(e => e.occurrence_key))
    const current = await tx.select().from(live_sessions).where(eq(live_sessions.schedule_rule_id, rule.id))
    const plannedKeys = new Set(future.map(o => `${rule.id}:${o.local_date}`))
    for (const session of current) if (session.starts_at > now && session.status === "Scheduled" && !plannedKeys.has(session.occurrence_key) && !protectedKeys.has(session.occurrence_key)) {
      await tx.update(live_sessions).set({ status: "Cancelled", updated_at: now }).where(eq(live_sessions.id, session.id))
    }
    let changed = 0
    for (const occurrence of future) {
      const key = `${rule.id}:${occurrence.local_date}`
      if (protectedKeys.has(key)) continue
      const previous = current.find(s => s.occurrence_key === key)
      if (previous && (previous.starts_at <= now || ["Live","Ended"].includes(previous.status))) continue
      const values = { batch_id: batch.id, teacher_id: rule.teacher_id, title: rule.title, starts_at: occurrence.starts_at, ends_at: occurrence.ends_at,
        timezone: rule.timezone, local_date: occurrence.local_date, schedule_rule_id: rule.id, schedule_version: rule.version, status: "Scheduled",
        provider: rule.provider, join_url: rule.join_url, host_url: rule.host_url, passcode: rule.passcode, updated_at: now }
      await tx.insert(live_sessions).values({ id: previous?.id ?? randomUUID(), occurrence_key: key, ...values }).onConflictDoUpdate({ target: live_sessions.occurrence_key, set: values })
      changed++
    }
    await tx.update(schedule_rules).set({ generated_version: rule.version, generation_error: null, updated_at: now }).where(eq(schedule_rules.id, rule.id))
    await notifyBatch(tx, batch.id, "Class schedule updated", `${batch.name}: ${changed} future classes have been scheduled. Past classes and individual exceptions are preserved.`)
    return changed
  })
}

export async function scheduleSweep(ctx: AppContext) {
  const queued = await ctx.db.select({ id: schedule_rules.id }).from(schedule_rules).where(and(eq(schedule_rules.active, true), sql`${schedule_rules.generated_version}<${schedule_rules.version}`, sql`${schedule_rules.available_at}<=now()`)).limit(10)
  for (const rule of queued) {
    try { await generateRule(ctx, rule.id) } catch { await ctx.db.update(schedule_rules).set({ generation_error: "Unable to generate sessions. Check batch bounds and schedule settings, then retry.", available_at: new Date(Date.now()+60000) }).where(eq(schedule_rules.id, rule.id)) }
  }
}
