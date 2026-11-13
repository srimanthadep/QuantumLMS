import { and, eq, sql } from "drizzle-orm"
import type { AuthUser } from "../auth/users.js"
import { isAdmin } from "../auth/access.js"
import type { Tx } from "../db/client.js"
import { batch_registrations, batch_teachers, cohort_batches, live_sessions } from "../db/schema.js"
import { forbidden, notFound } from "../errors.js"
import { requireEntitlement } from "../learning/entitlements.js"

export async function assertBatchAuthor(db: Tx, user: AuthUser, batch: string, sessionTeacher?: string | null) {
  if (isAdmin(user)) return
  if (user.role !== "Teacher") throw forbidden("Only an assigned teacher or administrator can manage this class")
  if (sessionTeacher === user.id) return
  const [assignment] = await db.select().from(batch_teachers).where(and(eq(batch_teachers.batch_id, batch), eq(batch_teachers.teacher_id, user.id)))
  if (!assignment) throw forbidden("You are not assigned to this batch or session")
}
export async function sessionFor(db: Tx, user: AuthUser, id: string, author = false) {
  const [session] = await db.select().from(live_sessions).where(eq(live_sessions.id, id))
  if (!session) throw notFound("Session not found")
  const [batch] = await db.select().from(cohort_batches).where(eq(cohort_batches.id, session.batch_id))
  if (!batch) throw notFound("Batch not found")
  if (user.role === "Student" && !author) {
    const [registration] = await db.select().from(batch_registrations).where(and(eq(batch_registrations.batch_id, batch.id), eq(batch_registrations.student_id, user.id), eq(batch_registrations.state, "confirmed")))
    if (!registration) throw forbidden("You need a confirmed place in this exact batch")
    await requireEntitlement(db, user.id, batch.course_id, batch.id)
  } else await assertBatchAuthor(db, user, batch.id, session.teacher_id)
  return { session, batch }
}
/** Uses the s/b aliases of session queries. Never broaden session access to course-only membership. */
export function sessionScope(user: AuthUser) {
  if (isAdmin(user)) return sql`true`
  if (user.role === "Teacher") return sql`(s.teacher_id=${user.id}::uuid or exists(select 1 from lms.batch_teachers bt where bt.batch_id=b.id and bt.teacher_id=${user.id}::uuid))`
  if (user.role === "Student") return sql`(exists(select 1 from lms.batch_registrations br where br.batch_id=b.id and br.student_id=${user.id}::uuid and br.state='confirmed')
    and exists(select 1 from lms.entitlement_grants g where g.batch_id=b.id and g.course_id=b.course_id and g.student_id=${user.id}::uuid and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())))`
  throw forbidden("Your role does not have access to live sessions")
}

export async function listSessions(db: Tx, user: AuthUser, input: { id?: string; batch_id?: string; from?: string; to?: string } = {}) {
  const result = await db.execute(sql`select s.id,s.batch_id,s.teacher_id,s.occurrence_key,s.title,s.starts_at,s.ends_at,s.status,s.provider,s.actual_start,s.actual_end,s.timezone,s.local_date,
    b.name as batch_name,b.course_id,c.title as course_title,c.code as course_code,u.full_name as teacher_name,b.join_before_minutes,b.join_after_minutes,
    a.joined_at,a.join_clicks
    from lms.live_sessions s join lms.cohort_batches b on b.id=s.batch_id join lms.courses c on c.id=b.course_id left join lms.users u on u.id=s.teacher_id
    left join lms.session_attendance a on a.session_id=s.id and a.student_id=${user.id}::uuid
    where ${sessionScope(user)} ${input.id ? sql`and s.id=${input.id}` : sql``} ${input.batch_id ? sql`and b.id=${input.batch_id}` : sql``}
    ${input.from ? sql`and s.ends_at>=${input.from}::timestamptz` : sql``} ${input.to ? sql`and s.starts_at<=${input.to}::timestamptz` : sql``}
    order by s.starts_at,s.id limit 2000`)
  return result.rows
}
