import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  announcement_reads, announcements, attendance_records, campus_events, certificates, event_registrations, gpa_history,
  grades, leave_requests, notes, notifications, reminders, study_activity, timetable_slots, users,
} from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { addDays, localDay } from "../../lib/time.js"

/** Schedule, attendance, campus feed, grades, notes and notifications: the student's own rows plus shared content. */
export async function campusRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  /* --------------------------------- Reminders -------------------------------- */
  app.get("/api/student/reminders", async (req) =>
    db.select({ target_type: reminders.target_type, target_id: reminders.target_id }).from(reminders).where(eq(reminders.student_id, me(req).id)),
  )
  app.put("/api/student/reminders", async (req) => {
    const s = me(req)
    const b = parse(z.object({ target_type: z.enum(["slot", "quiz", "event"]), target_id: z.string().min(1).max(64), on: z.boolean() }), req.body)
    if (b.on) await db.insert(reminders).values({ student_id: s.id, target_type: b.target_type, target_id: b.target_id }).onConflictDoNothing()
    else await db.delete(reminders).where(and(eq(reminders.student_id, s.id), eq(reminders.target_type, b.target_type), eq(reminders.target_id, b.target_id)))
    return { on: b.on }
  })

  /* --------------------------------- Timetable -------------------------------- */
  app.get("/api/student/timetable", async () => db.select().from(timetable_slots).orderBy(asc(timetable_slots.starts)))

  /* -------------------------------- Attendance -------------------------------- */
  app.get("/api/student/attendance", async (req) => {
    const s = me(req)
    const [records, leaves] = await Promise.all([
      db
        .select({ course_code: attendance_records.course_code, course_name: attendance_records.course_name, class_date: attendance_records.class_date, status: attendance_records.status })
        .from(attendance_records)
        .where(eq(attendance_records.student_id, s.id))
        .orderBy(asc(attendance_records.class_date)),
      db.select().from(leave_requests).where(eq(leave_requests.student_id, s.id)).orderBy(desc(leave_requests.created_at)),
    ])
    return { records, leaves }
  })

  app.post("/api/student/leave-requests", async (req) => {
    const s = me(req)
    const b = parse(
      z.object({
        course_code: z.string().trim().min(2).max(20),
        leave_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
        reason: z.string().trim().min(10, "Explain the reason in at least 10 characters.").max(1000),
      }),
      req.body,
    )
    if (b.leave_date < localDay(new Date(), ctx.config.CAMPUS_TZ)) throw badRequest("Pick today or a later date.")
    const [row] = await db.insert(leave_requests).values({ student_id: s.id, ...b }).returning()
    return row
  })

  /* ------------------------- Events and announcements ------------------------ */
  app.get("/api/student/campus-feed", async (req) => {
    const s = me(req)
    const [events, regs, anns, reads] = await Promise.all([
      db.select().from(campus_events).orderBy(asc(campus_events.starts_at)),
      db.select({ event_id: event_registrations.event_id }).from(event_registrations).where(eq(event_registrations.student_id, s.id)),
      db.select().from(announcements).orderBy(desc(announcements.published_at)),
      db.select({ announcement_id: announcement_reads.announcement_id }).from(announcement_reads).where(eq(announcement_reads.student_id, s.id)),
    ])
    return { events, registered: regs.map((r) => r.event_id), announcements: anns, read: reads.map((r) => r.announcement_id) }
  })

  app.put<{ Params: { id: string } }>("/api/student/events/:id/registration", async (req) => {
    const s = me(req)
    const { on } = parse(z.object({ on: z.boolean() }), req.body)
    const e = await db.query.campus_events.findFirst({ where: eq(campus_events.id, req.params.id) })
    if (!e) throw notFound("Event not found.")
    if (on) await db.insert(event_registrations).values({ student_id: s.id, event_id: e.id }).onConflictDoNothing()
    else await db.delete(event_registrations).where(and(eq(event_registrations.student_id, s.id), eq(event_registrations.event_id, e.id)))
    return { on }
  })

  app.post("/api/student/announcements/read", async (req, reply) => {
    const s = me(req)
    const { ids } = parse(z.object({ ids: z.array(z.string().min(1).max(64)).max(200) }), req.body)
    if (ids.length) {
      const known = await db.select({ id: announcements.id }).from(announcements).where(inArray(announcements.id, ids))
      if (known.length) await db.insert(announcement_reads).values(known.map((k) => ({ student_id: s.id, announcement_id: k.id }))).onConflictDoNothing()
    }
    return reply.code(204).send()
  })

  /* ------------------------------ Study activity ------------------------------ */
  app.get("/api/student/activity", async (req) => {
    const since = addDays(localDay(new Date(), ctx.config.CAMPUS_TZ), -120)
    return db
      .select({ day: study_activity.day, minutes: study_activity.minutes, lessons: study_activity.lessons })
      .from(study_activity)
      .where(and(eq(study_activity.student_id, me(req).id), gte(study_activity.day, since)))
      .orderBy(asc(study_activity.day))
  })

  /* ---------------------------------- Grades ---------------------------------- */
  app.get("/api/student/grades", async (req) => {
    const s = me(req)
    const [g, gpa, certs] = await Promise.all([
      db.select().from(grades).where(eq(grades.student_id, s.id)).orderBy(asc(grades.position)),
      db.select({ term: gpa_history.term, gpa: gpa_history.gpa, position: gpa_history.position }).from(gpa_history).where(eq(gpa_history.student_id, s.id)).orderBy(asc(gpa_history.position)),
      db.select().from(certificates).where(eq(certificates.student_id, s.id)).orderBy(sql`${certificates.issued_at} desc nulls last`),
    ])
    return { grades: g, gpa, certificates: certs }
  })

  /* ----------------------------------- Notes ---------------------------------- */
  const noteInput = z.object({
    title: z.string().trim().min(1, "Give the note a title.").max(200),
    course: z.string().max(200).default(""),
    content: z.string().max(20000, "Notes can be up to 20,000 characters.").default(""),
    snippet: z.string().max(20000).nullish(),
    tags: z.array(z.string().max(40)).max(20, "Use up to 20 tags.").default([]),
    pinned: z.boolean().default(false),
    lesson: z.string().max(200).nullish(),
  })

  app.get("/api/student/notes", async (req) => db.select().from(notes).where(eq(notes.student_id, me(req).id)).orderBy(desc(notes.updated_at)))

  app.post("/api/student/notes", async (req) => {
    const b = parse(noteInput, req.body)
    const [row] = await db.insert(notes).values({ ...b, snippet: b.snippet ?? null, lesson: b.lesson ?? null, student_id: me(req).id }).returning()
    return row
  })

  app.patch<{ Params: { id: string } }>("/api/student/notes/:id", async (req) => {
    const s = me(req)
    const b = parse(noteInput.partial().strict(), req.body)
    const current = await db.query.notes.findFirst({ where: and(eq(notes.id, req.params.id), eq(notes.student_id, s.id)) })
    if (!current) throw notFound("Note not found.")
    // Pinning is not an edit: only content changes move "last modified".
    const edited = (["title", "course", "content", "snippet", "tags", "lesson"] as const).some((k) => k in b && JSON.stringify(b[k] ?? null) !== JSON.stringify(current[k] ?? null))
    const [row] = await db.update(notes).set({ ...b, ...(edited ? { updated_at: new Date() } : {}) }).where(eq(notes.id, current.id)).returning()
    return row
  })

  app.delete<{ Params: { id: string } }>("/api/student/notes/:id", async (req, reply) => {
    const [gone] = await db.delete(notes).where(and(eq(notes.id, req.params.id), eq(notes.student_id, me(req).id))).returning({ id: notes.id })
    if (!gone) throw notFound("Note not found.")
    return reply.code(204).send()
  })

  /* ------------------------------- Notifications ------------------------------ */
  app.get("/api/student/notifications", async (req) =>
    db.select().from(notifications).where(eq(notifications.student_id, me(req).id)).orderBy(desc(notifications.created_at)).limit(30),
  )
  app.post("/api/student/notifications/read", async (req, reply) => {
    const s = me(req)
    const { id } = parse(z.object({ id: z.string().uuid().optional() }), req.body ?? {})
    await db
      .update(notifications)
      .set({ read_at: new Date() })
      .where(and(eq(notifications.student_id, s.id), isNull(notifications.read_at), id ? eq(notifications.id, id) : undefined))
    return reply.code(204).send()
  })
}

/** Public: anyone with a shared credential link sees what was earned and by whom, nothing else. */
export async function publicCertificateRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get<{ Params: { credentialId: string } }>("/api/public/certificates/:credentialId", async (req) => {
    const id = req.params.credentialId.slice(0, 64)
    const [row] = await ctx.db
      .select({ credential_id: certificates.credential_id, title: certificates.title, course_title: certificates.course_title, issued_at: certificates.issued_at, grade: certificates.grade, skills: certificates.skills, recipient: users.full_name })
      .from(certificates)
      .innerJoin(users, eq(users.id, certificates.student_id))
      .where(and(eq(certificates.credential_id, id), eq(certificates.status, "Earned")))
      .limit(1)
    if (!row) throw notFound("No certificate has this credential id.")
    return row
  })
}
