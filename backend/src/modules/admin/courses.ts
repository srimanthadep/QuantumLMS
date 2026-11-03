import { asc, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  courses,
  course_modules,
  lessons,
  enrollments,
  profiles,
} from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { parse } from "../../http.js"

export async function adminCoursesRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  // 1. List all courses with stats
  app.get("/courses", async () => {
    const courseRows = await db
      .select()
      .from(courses)
      .orderBy(asc(courses.position), asc(courses.title))

    // Query enrollments count, modules count and lessons count per course
    const [enrolledCounts, moduleCounts, lessonCounts] = await Promise.all([
      db.execute(sql`
        select course_id, count(*)::int as count
        from lms.enrollments
        group by course_id
      `),
      db.execute(sql`
        select course_id, count(*)::int as count
        from lms.course_modules
        group by course_id
      `),
      db.execute(sql`
        select course_id, count(*)::int as count
        from lms.lessons
        group by course_id
      `),
    ])

    const enrolledMap = new Map<string, number>(
      (enrolledCounts.rows as { course_id: string; count: number }[]).map((r) => [r.course_id, r.count])
    )
    const moduleMap = new Map<string, number>(
      (moduleCounts.rows as { course_id: string; count: number }[]).map((r) => [r.course_id, r.count])
    )
    const lessonMap = new Map<string, number>(
      (lessonCounts.rows as { course_id: string; count: number }[]).map((r) => [r.course_id, r.count])
    )

    const detailedCourses = courseRows.map((c) => ({
      ...c,
      enrolled_students: enrolledMap.get(c.id) ?? 0,
      modules_count: moduleMap.get(c.id) ?? 0,
      lessons_count: lessonMap.get(c.id) ?? 0,
      status: "Published",
    }))

    return { courses: detailedCourses }
  })

  // 2. Get single course with its modules and lessons
  app.get<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1)
    if (!course) throw notFound("Course not found.")

    const [modulesList, lessonsList, enrollmentsList] = await Promise.all([
      db
        .select()
        .from(course_modules)
        .where(eq(course_modules.course_id, course.id))
        .orderBy(asc(course_modules.position)),
      db
        .select()
        .from(lessons)
        .where(eq(lessons.course_id, course.id))
        .orderBy(asc(lessons.position)),
      db
        .select()
        .from(enrollments)
        .where(eq(enrollments.course_id, course.id)),
    ])

    return {
      course: {
        ...course,
        enrolled_students: enrollmentsList.length,
        modules_count: modulesList.length,
        lessons_count: lessonsList.length,
      },
      modules: modulesList,
      lessons: lessonsList,
    }
  })

  // 3. Create a new course
  const createSchema = z.object({
    title: z.string().trim().min(3, "Title must be at least 3 characters.").max(150),
    code: z.string().trim().min(2).max(30).optional(),
    category: z.string().trim().min(2, "Category is required.").max(100),
    instructor: z.string().trim().min(2, "Instructor name is required.").max(100),
    instructor_role: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
    credits: z.number().int().min(0).max(20).default(4),
    duration: z.string().trim().max(50).default("12 Weeks"),
    image: z.string().trim().max(300).optional(),
    certificate_title: z.string().trim().max(150).optional(),
    certificate_skills: z.array(z.string().trim()).optional(),
    is_starter: z.boolean().default(false),
  })

  app.post("/courses", async (req, reply) => {
    const input = parse(createSchema, req.body)

    // Generate unique code if not given
    let code = input.code
    if (!code) {
      const prefix = input.category
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3) || "AI"
      code = `${prefix}-${Math.floor(100 + Math.random() * 899)}`
    }

    // Check code uniqueness
    const [existingCode] = await db.select({ id: courses.id }).from(courses).where(eq(courses.code, code)).limit(1)
    if (existingCode) {
      code = `${code}-${Math.floor(10 + Math.random() * 90)}`
    }

    // Generate ID
    const courseId = `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`

    // Determine max position
    const [maxPosRow] = await db
      .select({ max: sql<number>`coalesce(max(${courses.position}), 0)` })
      .from(courses)
    const nextPos = (maxPosRow?.max ?? 0) + 1

    const [created] = await db
      .insert(courses)
      .values({
        id: courseId,
        code,
        title: input.title,
        category: input.category,
        image: input.image || "/assets/course_genai.jpg",
        instructor: input.instructor,
        instructor_role: input.instructor_role || "Lead Instructor",
        description: input.description || `Comprehensive track in ${input.title} covering architecture, practical applications and production deployment.`,
        level: input.level,
        credits: input.credits,
        duration: input.duration,
        rating: "5.0",
        reviews: "1",
        progress_color: "#6d4aff",
        certificate_title: input.certificate_title || `${input.title} Specialist`,
        certificate_skills: input.certificate_skills || [input.category, "AI Systems", "Hands-on Labs"],
        is_starter: input.is_starter,
        position: nextPos,
      })
      .returning()

    // Create an initial starter module and starter lesson so it can be viewed and taken by learners immediately
    const moduleId = `m-${courseId}-1`
    await db.insert(course_modules).values({
      id: moduleId,
      course_id: courseId,
      position: 1,
      title: "Module 1: Orientation & Architecture Setup",
      duration: "4 hours",
    })

    const lessonId = `l-${courseId}-1`
    await db.insert(lessons).values({
      id: lessonId,
      course_id: courseId,
      module_id: moduleId,
      position: 1,
      title: "1.1 Welcome, Prerequisites & Environment Setup",
      duration: "20m",
      minutes: 20,
      type: "video",
      summary: `Welcome to ${input.title}. In this initial lesson we establish development tools, environment dependencies, and project structure.`,
    })

    reply.code(201)
    return {
      ok: true,
      course: {
        ...created,
        enrolled_students: 0,
        modules_count: 1,
        lessons_count: 1,
        status: "Published",
      },
    }
  })

  // 4. Update course
  const patchSchema = z.object({
    title: z.string().trim().min(3).max(150).optional(),
    category: z.string().trim().min(2).max(100).optional(),
    instructor: z.string().trim().min(2).max(100).optional(),
    instructor_role: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
    credits: z.number().int().min(0).max(20).optional(),
    duration: z.string().trim().max(50).optional(),
    image: z.string().trim().max(300).optional(),
    is_starter: z.boolean().optional(),
    position: z.number().int().optional(),
  })

  app.patch<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const patch = parse(patchSchema, req.body)

    const [existing] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1)
    if (!existing) throw notFound("Course not found.")

    const [updated] = await db
      .update(courses)
      .set(patch)
      .where(eq(courses.id, req.params.id))
      .returning()

    return { ok: true, course: updated }
  })

  // 5. Delete course
  app.delete<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const [existing] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1)
    if (!existing) throw notFound("Course not found.")

    await db.delete(courses).where(eq(courses.id, req.params.id))
    return { ok: true, deleted: existing.id }
  })

  // 6. Platform stats overview for Admin
  app.get("/stats", async () => {
    const [coursesCount, studentsCount, enrollmentsCount, modulesCount, lessonsCount] =
      await Promise.all([
        db.execute(sql`select count(*)::int as count from lms.courses`),
        db.execute(sql`select count(*)::int as count from lms.profiles`),
        db.execute(sql`select count(*)::int as count from lms.enrollments`),
        db.execute(sql`select count(*)::int as count from lms.course_modules`),
        db.execute(sql`select count(*)::int as count from lms.lessons`),
      ])

    return {
      stats: {
        totalCourses: (coursesCount.rows[0] as any)?.count ?? 0,
        totalStudents: (studentsCount.rows[0] as any)?.count ?? 0,
        totalEnrollments: (enrollmentsCount.rows[0] as any)?.count ?? 0,
        totalModules: (modulesCount.rows[0] as any)?.count ?? 0,
        totalLessons: (lessonsCount.rows[0] as any)?.count ?? 0,
      },
    }
  })
}
