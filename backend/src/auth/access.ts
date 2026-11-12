import { hasEntitlement } from "../learning/entitlements.js"
import { and, eq, sql, type SQLWrapper } from "drizzle-orm"
import type { AuthUser } from "./users.js"
import type { Tx } from "../db/client.js"
import { courses, enrollments } from "../db/schema.js"
import { forbidden } from "../errors.js"

export const isAdmin = (u: AuthUser) => u.role === "Admin" || u.role === "Super Admin"

export async function teacherCourseIds(db: Tx, u: AuthUser): Promise<string[]> {
  if (isAdmin(u)) return (await db.select({ id: courses.id }).from(courses)).map((c) => c.id)
  if (u.role !== "Teacher") return []
  const rows = await db.execute(sql`
    select course_id as id from lms.course_teachers where teacher_id = ${u.id}::uuid
    union select b.course_id as id from lms.batch_teachers t
    join lms.cohort_batches b on b.id = t.batch_id where t.teacher_id = ${u.id}::uuid`)
  return rows.rows.map((r) => String(r.id))
}

export async function assertCourseAccess(db: Tx, u: AuthUser, courseId: string): Promise<void> {
  if (isAdmin(u)) return
  if (u.role === "Teacher" && (await teacherCourseIds(db, u)).includes(courseId)) return
  if (u.role === "Student") {
    if (await hasEntitlement(db, u.id, courseId)) return
  }
  throw forbidden("You don't have access to this course.")
}

/** Batch-only teachers must not see learners in another batch using the same course. */
export function teacherStudentPredicate(u: AuthUser, studentId: SQLWrapper = sql`u.id`, courseId?: SQLWrapper) {
  if (isAdmin(u)) return sql`true`
  return sql`(exists (select 1 from lms.enrollments se join lms.course_teachers ct on ct.course_id = se.course_id
    where se.student_id = ${studentId} and ct.teacher_id = ${u.id}::uuid ${courseId ? sql`and se.course_id = ${courseId}` : sql``})
    or exists (select 1 from lms.batch_students bs join lms.batch_teachers bt on bt.batch_id = bs.batch_id join lms.cohort_batches cb on cb.id = bs.batch_id
    where bs.student_id = ${studentId} ${courseId ? sql`and cb.course_id = ${courseId}` : sql``} and bs.status in ('Active','Completed','At Risk') and bt.teacher_id = ${u.id}::uuid))`
}
