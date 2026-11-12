import crypto from "node:crypto"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  attendance_records,
  campus_events,
  courses,
  course_modules,
  course_questions,
  enrollments,
  lessons,
  profiles,
  timetable_slots,
  users,
} from "../../db/schema.js"
import { forbidden, notFound } from "../../errors.js"
import { authenticate, me, parse } from "../../http.js"
import { assertCourseAccess, isAdmin, teacherCourseIds, teacherStudentPredicate } from "../../auth/access.js"
import { broadcastToChannel } from "../../ws.js"

export async function teacherModule(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  await app.register(
    async (scope) => {
      scope.addHook("preHandler", authenticate(ctx, ["Teacher", "Admin", "Super Admin"]))

      // 0. List teacher courses with full curriculum
      scope.get("/courses", async (req) => {
        const ids = await teacherCourseIds(db, me(req))
        const [courseRows, modulesRows, lessonsRows, enrolledCounts] = await Promise.all([
          db.select().from(courses).where(inArray(courses.id, ids)).orderBy(asc(courses.position), asc(courses.title)),
          db.select().from(course_modules).where(inArray(course_modules.course_id, ids)).orderBy(asc(course_modules.position)),
          db.select().from(lessons).where(inArray(lessons.course_id, ids)).orderBy(asc(lessons.position)),
          db.select({ course_id: enrollments.course_id, n: sql<number>`count(*)::int` }).from(enrollments).where(and(inArray(enrollments.course_id, ids), teacherStudentPredicate(me(req), enrollments.student_id, enrollments.course_id))).groupBy(enrollments.course_id),
        ])

        const countMap = new Map(enrolledCounts.map((e) => [e.course_id, e.n]))
        const lessonsByModule = new Map<string, typeof lessonsRows>()
        for (const l of lessonsRows) {
          const arr = lessonsByModule.get(l.module_id) || []
          arr.push(l)
          lessonsByModule.set(l.module_id, arr)
        }

        const modulesByCourse = new Map<string, any[]>()
        for (const m of modulesRows) {
          const arr = modulesByCourse.get(m.course_id) || []
          const modLessons = lessonsByModule.get(m.id) || []
          arr.push({
            id: m.id,
            title: m.title,
            description: "",
            objectives: [],
            completed: false,
            progress: 0,
            lessons: modLessons.map((l) => ({
              id: l.id,
              title: l.title,
              duration: l.duration,
              completed: false,
              type: l.type === "video" ? "Video Lecture" : l.type === "lab" ? "Lab / Project" : "Reading",
              description: l.summary || "",
              objectives: [],
              contentSummary: l.summary || "",
              materials: [],
              resourceType: l.type,
              videoUrl: l.video_url || undefined,
            })),
          })
          modulesByCourse.set(m.course_id, arr)
        }

        const result = courseRows.map((c) => {
          const cModules = modulesByCourse.get(c.id) || []
          const totalLessons = cModules.reduce((acc, m) => acc + m.lessons.length, 0)
          return {
            id: c.id,
            code: c.code,
            name: c.title,
            thumbnail: c.image || "/assets/course_genai.jpg",
            description: c.description,
            enrolledStudentsCount: countMap.get(c.id) || 0,
            modulesCount: cModules.length,
            lessonsCount: totalLessons,
            progress: 0,
            status: "Active" as const,
            tone: "purple" as const,
            assignedClass: "Cohort · " + c.category,
            term: "Term 1 (2026)",
            instructor: c.instructor,
            enrolledStudentIds: [],
            modules: cModules,
          }
        })

        return { courses: result }
      })

      // 1. List teacher classes / live sessions
      scope.get("/classes", async (req) => {
        const ids = await teacherCourseIds(db, me(req))
        const slots = await db
          .select({
            id: timetable_slots.id,
            course_id: timetable_slots.course_id,
            course_title: courses.title,
            course_code: timetable_slots.course_code,
            day: timetable_slots.day,
            starts: timetable_slots.starts,
            ends: timetable_slots.ends,
            title: timetable_slots.title,
            instructor: timetable_slots.instructor,
            room: timetable_slots.room,
            is_online: timetable_slots.is_online,
          })
          .from(timetable_slots)
          .leftJoin(courses, eq(courses.id, timetable_slots.course_id))
          .where(inArray(timetable_slots.course_id, ids))
          .orderBy(asc(timetable_slots.day), asc(timetable_slots.starts))

        return { classes: slots }
      })

      // 2. Schedule a live class session
      scope.post("/classes", async (req) => {
        const u = me(req)
        const b = parse(
          z.object({
            course_id: z.string().min(1).optional(),
            course_code: z.string().min(1).optional(),
            title: z.string().min(3).max(200),
            day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]).default("Monday"),
            starts: z.string().default("10:00:00"),
            ends: z.string().default("11:30:00"),
            instructor: z.string().min(1).optional(),
            room: z.string().max(80).default("Online Studio 1"),
            is_online: z.boolean().default(true),
          }),
          req.body,
        )

        if (!b.course_id) throw forbidden("Choose an assigned course.")
        await assertCourseAccess(db, u, b.course_id)
        const [course] = await db.select().from(courses).where(eq(courses.id, b.course_id))
        if (!course) throw notFound("Course not found.")
        const courseId = course.id
        const courseCode = course.code

        const [slot] = await db
          .insert(timetable_slots)
          .values({
            id: crypto.randomUUID(),
            course_id: courseId,
            course_code: courseCode || "AI-101",
            title: b.title,
            day: b.day,
            starts: b.starts.length === 5 ? `${b.starts}:00` : b.starts,
            ends: b.ends.length === 5 ? `${b.ends}:00` : b.ends,
            instructor: b.instructor || u.full_name || "Instructor",
            room: b.room,
            is_online: b.is_online,
          })
          .returning()

        broadcastToChannel("notifications", "class-scheduled", {
          id: slot.id,
          title: slot.title,
          instructor: slot.instructor,
          starts: slot.starts,
        })
        broadcastToChannel("live:classroom", "class-scheduled", slot)

        return { classSession: slot }
      })

      // 3. List doubts / student questions
      scope.get("/doubts", async (req) => {
        const ids = await teacherCourseIds(db, me(req))
        const questions = await db
          .select({
            id: course_questions.id,
            course_id: course_questions.course_id,
            course_title: courses.title,
            student_id: course_questions.author_id,
            student_name: course_questions.author_name,
            student_avatar: course_questions.author_avatar,
            body: course_questions.body,
            votes: course_questions.vote_count,
            answer: course_questions.answer_text,
            answer_author: course_questions.answer_author,
            created_at: course_questions.created_at,
          })
          .from(course_questions)
          .leftJoin(courses, eq(courses.id, course_questions.course_id))
          .where(and(inArray(course_questions.course_id, ids), teacherStudentPredicate(me(req), course_questions.author_id, course_questions.course_id)))
          .orderBy(desc(course_questions.created_at))

        return { doubts: questions }
      })

      // 4. Answer / resolve a doubt
      scope.post<{ Params: { id: string } }>("/doubts/:id/reply", async (req) => {
        const u = me(req)
        const b = parse(
          z.object({
            answer: z.string().min(1).max(5000),
          }),
          req.body,
        )

        const [question] = await db.select().from(course_questions).where(eq(course_questions.id, req.params.id))
        if (!question) throw notFound("Question not found.")
        await assertCourseAccess(db, u, question.course_id)
        const allowed = await db.select({ id: course_questions.id }).from(course_questions).where(and(eq(course_questions.id, question.id), teacherStudentPredicate(u, course_questions.author_id, course_questions.course_id)))
        if (!allowed.length) throw forbidden("This learner is not assigned to you.")
        const [updated] = await db
          .update(course_questions)
          .set({
            answer_text: b.answer.trim(),
            answer_author: u.full_name || "Instructor",
          })
          .where(eq(course_questions.id, req.params.id))
          .returning()

        if (!updated) throw notFound("Doubt question not found.")
        return { doubt: updated }
      })

      // 5. List calendar events
      scope.get("/calendar", async () => {
        const events = await db
          .select()
          .from(campus_events)
          .orderBy(asc(campus_events.starts_at))

        return { events }
      })

      // 6. Create calendar event
      scope.post("/calendar", async (req) => {
        if (!isAdmin(me(req))) throw forbidden("Only admins can create campus-wide events.")
        const b = parse(
          z.object({
            title: z.string().min(3).max(200),
            description: z.string().max(2000).default(""),
            location: z.string().max(120).default("Online Lab"),
            starts_at: z.string().datetime(),
            ends_at: z.string().datetime().optional(),
            category: z.enum(["Hackathons", "Guest Lectures", "Workshops", "Academic"]).default("Workshops"),
            speaker: z.string().optional(),
            time_label: z.string().default(""),
          }),
          req.body,
        )

        const [event] = await db
          .insert(campus_events)
          .values({
            id: crypto.randomUUID(),
            title: b.title,
            description: b.description,
            location: b.location,
            starts_at: new Date(b.starts_at),
            ends_at: b.ends_at ? new Date(b.ends_at) : undefined,
            category: b.category,
            speaker: b.speaker,
            time_label: b.time_label,
          })
          .returning()

        return { event }
      })

      // 7. List students enrolled across teacher courses
      scope.get("/students", async (req) => {
        const ids = await teacherCourseIds(db, me(req))
        const rows = (
          await db.execute(sql`
            select
              u.id, u.full_name as name, u.email, u.avatar_url,
              coalesce(p.batch, '') as batch_name,
              coalesce(p.roll_number, '') as roll_number,
              coalesce(p.program, 'Artificial Intelligence') as program,
              count(distinct e.course_id)::int as enrolled_courses,
              null::int as attendance_rate
            from lms.users u
            left join lms.profiles p on p.id = u.id
            left join lms.enrollments e on e.student_id = u.id and e.course_id in (select jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
            left join lms.attendance_records a on a.student_id = u.id
            where u.role = 'Student' and ${teacherStudentPredicate(me(req))}
            group by u.id, u.full_name, u.email, u.avatar_url, p.batch, p.roll_number, p.program
            order by u.full_name asc
          `)
        ).rows

        return { students: rows }
      })

      // 8. Teacher analytics and performance KPIs
      scope.get("/analytics", async (req) => {
        const ids = await teacherCourseIds(db, me(req))
        const [stats] = (
          await db.execute(sql`
            select
              count(distinct e.student_id)::int as total_students,
              count(distinct c.id)::int as total_courses,
              count(distinct s.id)::int as live_sessions_scheduled,
              count(distinct q.id) filter (where q.answer_text is null)::int as pending_doubts
            from lms.courses c
            left join lms.enrollments e on e.course_id = c.id and ${teacherStudentPredicate(me(req), sql`e.student_id`, sql`c.id`)}
            left join lms.timetable_slots s on s.course_id = c.id
            left join lms.course_questions q on q.course_id = c.id and ${teacherStudentPredicate(me(req), sql`q.author_id`, sql`c.id`)}
            where c.id in (select jsonb_array_elements_text(${JSON.stringify(ids)}::jsonb))
          `)
        ).rows as any[]

        return {
          analytics: {
            total_students: stats?.total_students || 0,
            total_courses: stats?.total_courses || 0,
            live_sessions: stats?.live_sessions_scheduled || 0,
            pending_doubts: stats?.pending_doubts || 0,
            attendance_average: null,
            csat_rating: null,
          },
        }
      })
    },
    { prefix: "/api/teacher" },
  )
}
