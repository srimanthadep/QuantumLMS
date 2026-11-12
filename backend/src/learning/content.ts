import { randomUUID } from "node:crypto"
import { and, eq, sql } from "drizzle-orm"
import type { Tx } from "../db/client.js"
import { audit_events, course_modules, course_offers, courses, lesson_revisions, lessons } from "../db/schema.js"
import { badRequest, notFound } from "../errors.js"

export async function lockCourse(tx: Tx, course: string) {
  const [row] = await tx.select().from(courses).where(and(eq(courses.id, course), sql`${courses.deleted_at} is null`)).for("update")
  if (!row) throw notFound("Course not found")
  return row
}
export async function contentChanged(tx: Tx, course: string, actor: string, action: string) {
  await tx.update(courses).set({ status: "Draft" }).where(eq(courses.id, course))
  await tx.update(course_offers).set({ status: "Draft" }).where(and(eq(course_offers.course_id, course), eq(course_offers.mode, "self_paced"), eq(course_offers.status, "Published")))
  await tx.insert(audit_events).values({ actor_id: actor, actor_role: "Author", action, target: course, outcome: "success" })
}
export async function snapshotLesson(tx: Tx, lesson: typeof lessons.$inferSelect, actor: string, action: string) {
  await tx.insert(lesson_revisions).values({ id: randomUUID(), lesson_id: lesson.id, actor_id: actor, action, snapshot: lesson })
}
export async function reorderContent(tx: Tx, course: string, input: { module_ids: string[]; lesson_ids: string[] }, actor: string) {
  await lockCourse(tx, course)
  const modules = await tx.select().from(course_modules).where(eq(course_modules.course_id, course)).orderBy(course_modules.position)
  const content = await tx.select().from(lessons).where(eq(lessons.course_id, course)).orderBy(lessons.position)
  const exact = (given: string[], expected: string[]) => given.length === expected.length && new Set(given).size === given.length && given.every(id => expected.includes(id))
  if (!exact(input.module_ids, modules.filter(m => !m.archived_at).map(m => m.id)) || !exact(input.lesson_ids, content.filter(l => !l.archived_at).map(l => l.id))) throw badRequest("Order must include each active module and lesson exactly once. Refresh and retry.")
  // Park all positions below the existing range, then compact active + archived rows to positive positions.
  // Stable IDs and progress rows never change; each statement respects the non-deferrable unique keys.
  const moduleOrder = [...input.module_ids, ...modules.filter(m => m.archived_at).map(m => m.id)]
  const lessonOrder = [...input.lesson_ids, ...content.filter(l => l.archived_at).map(l => l.id)]
  const moduleMin = Math.min(0, ...modules.map(m => m.position)) - modules.length - 1
  const lessonMin = Math.min(0, ...content.map(l => l.position)) - content.length - 1
  for (let i=0;i<moduleOrder.length;i++) await tx.update(course_modules).set({ position: moduleMin+i }).where(eq(course_modules.id, moduleOrder[i]))
  for (let i=0;i<lessonOrder.length;i++) await tx.update(lessons).set({ position: lessonMin+i }).where(eq(lessons.id, lessonOrder[i]))
  for (let i=0;i<moduleOrder.length;i++) await tx.update(course_modules).set({ position: i+1 }).where(eq(course_modules.id, moduleOrder[i]))
  for (let i=0;i<lessonOrder.length;i++) await tx.update(lessons).set({ position: i+1 }).where(eq(lessons.id, lessonOrder[i]))
  await tx.insert(audit_events).values({ actor_id: actor, actor_role: "Author", action: "course.reordered", target: course, outcome: "success" })
}
