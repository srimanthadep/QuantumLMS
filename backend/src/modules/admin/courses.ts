import { contentChanged, lockCourse, reorderContent, snapshotLesson } from "../../learning/content.js"
import { randomUUID } from "node:crypto"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  courses,
  course_modules,
  lessons,
  lesson_revisions,
  course_materials,
  assignments,
  cohort_batches,
  enrollments,
  profiles,
} from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { parse, me } from "../../http.js"
import { assertPublishable } from "../../media/publication.js"
import { invalidateCatalogCache } from "../student/courses.js"

export async function adminCoursesRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  // 1. List all courses with stats
  app.get("/courses", async () => {
    // Query courses, enrollments count, modules count, lessons count and cohort count in parallel
    const [courseRows, enrolledCounts, moduleCounts, lessonCounts, cohortCounts] = await Promise.all([
      db.select().from(courses).where(sql`${courses.deleted_at} is null`).orderBy(asc(courses.position), asc(courses.title)),
      db.execute(sql`
        select course_id, count(*)::int as count
        from lms.enrollments
        group by course_id
      `),
      db.execute(sql`
        select course_id, count(*)::int as count
        from lms.course_modules where archived_at is null
        group by course_id
      `),
      db.execute(sql`
        select course_id, count(*)::int as count
        from lms.lessons where archived_at is null
        group by course_id
      `),
      db
        .select({ course_id: cohort_batches.course_id, count: sql<number>`count(*)::int` })
        .from(cohort_batches)
        .groupBy(cohort_batches.course_id),
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
    const cohortMap = new Map<string, number>(cohortCounts.map((r) => [r.course_id, r.count]))

    const financial = await db.execute(sql`select o.course_id, coalesce(sum(p.amount-p.refunded_amount) filter(where p.captured_at is not null),0)::bigint as net from lms.orders o left join lms.payments p on p.order_id=o.id group by o.course_id`)
    const revenue = new Map(financial.rows.map(r => [String(r.course_id), Number(r.net) / 100]))
    const detailedCourses = courseRows.map((c) => ({
      ...c,
      revenue: revenue.get(c.id) ?? 0,
      enrolled_students: enrolledMap.get(c.id) ?? 0,
      modules_count: moduleMap.get(c.id) ?? 0,
      lessons_count: lessonMap.get(c.id) ?? 0,
      cohort_count: cohortMap.get(c.id) ?? 0,
    }))

    return { courses: detailedCourses }
  })

  // 2. Get single course with its modules and lessons
  app.get<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const courseId = req.params.id
    const [[course], modulesList, lessonsList, [enrolledCountRow], materialsList, assignmentsList] = await Promise.all([
      db.select().from(courses).where(and(eq(courses.id, courseId), sql`${courses.deleted_at} is null`)).limit(1),
      db
        .select()
        .from(course_modules)
        .where(and(eq(course_modules.course_id, courseId), sql`${course_modules.archived_at} is null`))
        .orderBy(asc(course_modules.position)),
      db
        .select()
        .from(lessons)
        .where(and(eq(lessons.course_id, courseId), sql`${lessons.archived_at} is null`))
        .orderBy(asc(lessons.position)),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(enrollments)
        .where(eq(enrollments.course_id, courseId)),
      db
        .select()
        .from(course_materials)
        .where(eq(course_materials.course_id, courseId))
        .orderBy(asc(course_materials.position)),
      db
        .select()
        .from(assignments)
        .where(eq(assignments.course_id, courseId))
        .orderBy(asc(assignments.due_at)),
    ])
    if (!course) {
      throw notFound("Course not found.")
    }

    return {
      course: {
        ...course,
        enrolled_students: enrolledCountRow?.n ?? 0,
        modules_count: modulesList.length,
        lessons_count: lessonsList.length,
      },
      modules: modulesList,
      lessons: lessonsList,
      materials: materialsList,
      assignments: assignmentsList,
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
    price: z.number().int().min(0).max(10_000_000).default(39999),
    capacity: z.number().int().min(1).max(100_000).default(250),
    status: z.enum(["Published", "Draft", "Archived"]).default("Draft"),
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
        rating: "",
        reviews: "0",
        progress_color: "#6d4aff",
        certificate_title: input.certificate_title || `${input.title} Specialist`,
        certificate_skills: input.certificate_skills || [input.category, "AI Systems", "Hands-on Labs"],
        is_starter: input.is_starter,
        price: input.price,
        capacity: input.capacity,
        status: "Draft",
        position: nextPos,
      })
      .returning()

    invalidateCatalogCache()

    reply.code(201)
    return {
      ok: true,
      course: {
        ...created,
        enrolled_students: 0,
        modules_count: 0,
        lessons_count: 0,
        cohort_count: 0,
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
    certificate_title: z.string().trim().min(1).max(150).optional(),
    certificate_skills: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    is_starter: z.boolean().optional(),
    position: z.number().int().optional(),
    price: z.number().int().min(0).max(10_000_000).optional(),
    capacity: z.number().int().min(1).max(100_000).optional(),
    status: z.enum(["Published", "Draft", "Archived"]).optional(),
  })

  app.patch<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const patch = parse(patchSchema, req.body)

    const updated = await db.transaction(async tx => {
      const [existing] = await tx.select().from(courses).where(eq(courses.id, req.params.id)).for("update")
      if (!existing || existing.deleted_at) throw notFound("Course not found")
      if (!Object.keys(patch).length) return existing
      if (patch.status === "Published") await assertPublishable(tx, req.params.id)
      const [row] = await tx.update(courses).set(patch).where(eq(courses.id, req.params.id)).returning()
      return row
    })
    invalidateCatalogCache()

    return { ok: true, course: updated }
  })

  // 5. Delete course
  app.delete<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const [existing] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1)
    if (!existing) throw notFound("Course not found.")

    await db.transaction(async tx => {
      await lockCourse(tx, req.params.id)
      await tx.update(courses).set({ deleted_at: new Date(), status: "Archived" }).where(eq(courses.id, req.params.id))
    })
    invalidateCatalogCache()
    return { ok: true, deleted: existing.id }
  })

  app.post<{ Params: { id: string } }>("/courses/:id/restore", async req => {
    const [course] = await db.update(courses).set({ deleted_at: null, status: "Draft" }).where(eq(courses.id, req.params.id)).returning()
    if (!course) throw notFound("Course not found")
    invalidateCatalogCache(); return { course }
  })
  app.put<{ Params: { id: string } }>("/courses/:id/order", async req => {
    const input = parse(z.object({ module_ids: z.array(z.string()).max(2000), lesson_ids: z.array(z.string()).max(5000) }), req.body)
    await db.transaction(tx => reorderContent(tx, req.params.id, input, me(req).id)); invalidateCatalogCache(); return { ok: true }
  })
  app.get<{ Params: { id: string; lessonId: string } }>("/courses/:id/lessons/:lessonId/history", async req => {
    const [lesson] = await db.select().from(lessons).where(and(eq(lessons.id, req.params.lessonId), eq(lessons.course_id, req.params.id)))
    if (!lesson) throw notFound("Lesson not found")
    return { revisions: await db.select().from(lesson_revisions).where(eq(lesson_revisions.lesson_id, lesson.id)).orderBy(desc(lesson_revisions.created_at)) }
  })
  app.post<{ Params: { id: string; lessonId: string } }>("/courses/:id/lessons/:lessonId/restore", async req => {
    await db.transaction(async tx => {
      await lockCourse(tx, req.params.id)
      const [lesson] = await tx.select().from(lessons).where(and(eq(lessons.id, req.params.lessonId), eq(lessons.course_id, req.params.id)))
      if (!lesson) throw notFound("Lesson not found")
      await snapshotLesson(tx, lesson, me(req).id, "restore")
      await tx.update(course_modules).set({ archived_at: null }).where(eq(course_modules.id, lesson.module_id))
      await tx.update(lessons).set({ archived_at: null }).where(eq(lessons.id, lesson.id))
      await contentChanged(tx, req.params.id, me(req).id, "lesson.restored")
    }); invalidateCatalogCache(); return { ok: true }
  })
  // --- 5a. Modules / Chapters Management ---
  const moduleSchema = z.object({
    title: z.string().trim().min(2).max(200),
    duration: z.string().trim().max(50).default("1 hour"),
  })

  app.post<{ Params: { id: string } }>("/courses/:id/modules", async (req, reply) => {
    const input = parse(moduleSchema, req.body)
    const courseId = req.params.id
    const moduleRow = await db.transaction(async tx => {
      const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("update")
      if (!course || course.deleted_at) throw notFound("Course not found")
      await contentChanged(tx, courseId, me(req).id, "module.created")
      const [pos] = await tx.select({ max: sql<number>`coalesce(max(${course_modules.position}), 0)::int` }).from(course_modules).where(eq(course_modules.course_id, courseId))
      const [row] = await tx.insert(course_modules).values({ id: randomUUID(), course_id: courseId, position: pos.max + 1, title: input.title, duration: input.duration }).returning()
      return row
    })
    invalidateCatalogCache()

    reply.code(201)
    return { ok: true, module: moduleRow }
  })

  app.patch<{ Params: { id: string; moduleId: string } }>("/courses/:id/modules/:moduleId", async (req) => {
    const input = parse(moduleSchema.partial(), req.body)
    const updated = await db.transaction(async tx => {
      await lockCourse(tx, req.params.id)
      const [row] = await tx.update(course_modules).set(input).where(and(eq(course_modules.id, req.params.moduleId), eq(course_modules.course_id, req.params.id), sql`${course_modules.archived_at} is null`)).returning()
      if (!row) throw notFound("Module not found")
      await contentChanged(tx, req.params.id, me(req).id, "module.edited")
      return row
    })
    invalidateCatalogCache()
    return { ok: true, module: updated }
  })

  app.delete<{ Params: { id: string; moduleId: string } }>("/courses/:id/modules/:moduleId", async (req) => {
    await db.transaction(async tx => {
      await lockCourse(tx, req.params.id)
      const [module] = await tx.select().from(course_modules).where(and(eq(course_modules.id, req.params.moduleId), eq(course_modules.course_id, req.params.id)))
      if (!module) throw notFound("Module not found")
      const children = await tx.select().from(lessons).where(eq(lessons.module_id, module.id))
      for (const lesson of children) await snapshotLesson(tx, lesson, me(req).id, "archive-module")
      await tx.update(lessons).set({ archived_at: new Date() }).where(eq(lessons.module_id, module.id))
      await tx.update(course_modules).set({ archived_at: new Date() }).where(eq(course_modules.id, module.id))
      await contentChanged(tx, req.params.id, me(req).id, "module.archived")
    })
    invalidateCatalogCache()
    return { ok: true, deleted: req.params.moduleId }
  })

  // --- 5b. Lessons / Video Chapters Management ---
  const lessonSchema = z.object({
    moduleId: z.string().min(1),
    title: z.string().trim().min(2).max(200),
    type: z.enum(["video", "reading", "lab"]).default("video"),
    duration: z.string().trim().max(50).default("15m"),
    minutes: z.number().int().min(0).default(15),
    summary: z.string().default(""),
    videoUrl: z.string().optional(),
    videoQualities: z.record(z.string(), z.any()).optional(),
  })

  app.post<{ Params: { id: string } }>("/courses/:id/lessons", async (req, reply) => {
    const input = parse(lessonSchema, req.body)
    const courseId = req.params.id
    if (input.videoUrl || input.videoQualities) throw badRequest("Attach a ready media asset instead of a raw video URL")
    const lessonRow = await db.transaction(async tx => {
      const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("update")
      if (!course || course.deleted_at) throw notFound("Course not found")
      const [module] = await tx.select().from(course_modules).where(and(eq(course_modules.id, input.moduleId), eq(course_modules.course_id, courseId)))
      if (!module || module.archived_at) throw badRequest("The module must belong to this course and be active")
      const [pos] = await tx.select({ max: sql<number>`coalesce(max(${lessons.position}), 0)::int` }).from(lessons).where(eq(lessons.course_id, courseId))
      const [row] = await tx.insert(lessons).values({ id: randomUUID(), course_id: module.course_id, module_id: module.id, position: pos.max + 1,
        title: input.title, duration: input.duration, minutes: input.minutes, type: input.type, summary: input.summary }).returning()
      // Editing structure requires review and an explicit publish action.
      await contentChanged(tx, courseId, me(req).id, "lesson.created")
      return row
    })
    invalidateCatalogCache()

    reply.code(201)
    return { ok: true, lesson: lessonRow }
  })

  app.patch<{ Params: { id: string; lessonId: string } }>("/courses/:id/lessons/:lessonId", async (req) => {
    const patchSchema = lessonSchema.partial()
    const input = parse(patchSchema, req.body)
    if (input.videoUrl !== undefined || input.videoQualities !== undefined) throw badRequest("Attach a ready media asset instead of a raw video URL")
    if (input.moduleId) {
      const [module] = await db.select().from(course_modules).where(and(eq(course_modules.id, input.moduleId), eq(course_modules.course_id, req.params.id)))
      if (!module || module.archived_at) throw badRequest("The module must belong to this course and be active")
    }
    const updateData: any = {}
    if (input.moduleId !== undefined) updateData.module_id = input.moduleId
    if (input.title !== undefined) updateData.title = input.title
    if (input.duration !== undefined) updateData.duration = input.duration
    if (input.minutes !== undefined) updateData.minutes = input.minutes
    if (input.type !== undefined) updateData.type = input.type
    if (input.summary !== undefined) updateData.summary = input.summary
    if (input.videoUrl !== undefined) updateData.video_url = input.videoUrl
    if (input.videoQualities !== undefined) updateData.video_qualities = input.videoQualities

    const updated = await db.transaction(async tx => {
      await lockCourse(tx, req.params.id)
      const [current] = await tx.select().from(lessons).where(and(eq(lessons.id, req.params.lessonId), eq(lessons.course_id, req.params.id)))
      if (!current || current.archived_at) throw notFound("Lesson not found")
      if (input.moduleId) {
        const [module] = await tx.select().from(course_modules).where(and(eq(course_modules.id, input.moduleId), eq(course_modules.course_id, req.params.id)))
        if (!module || module.archived_at) throw badRequest("Select an active module in this course")
      }
      await snapshotLesson(tx, current, me(req).id, "edit")
      const [row] = await tx.update(lessons).set(updateData).where(eq(lessons.id, current.id)).returning()
      await contentChanged(tx, req.params.id, me(req).id, "lesson.edited")
      return row
    })
    invalidateCatalogCache()
    return { ok: true, lesson: updated }
  })

  app.delete<{ Params: { id: string; lessonId: string } }>("/courses/:id/lessons/:lessonId", async (req) => {
    await db.transaction(async tx => {
      await lockCourse(tx, req.params.id)
      const [lesson] = await tx.select().from(lessons).where(and(eq(lessons.id, req.params.lessonId), eq(lessons.course_id, req.params.id)))
      if (!lesson) throw notFound("Lesson not found")
      await snapshotLesson(tx, lesson, me(req).id, "archive")
      await tx.update(lessons).set({ archived_at: new Date() }).where(eq(lessons.id, lesson.id))
      await contentChanged(tx, req.params.id, me(req).id, "lesson.archived")
    })
    invalidateCatalogCache()
    return { ok: true, deleted: req.params.lessonId }
  })

  // --- 5c. Course Materials Management ---
  const materialSchema = z.object({
    title: z.string().trim().min(2).max(200),
    type: z.enum(["PDF", "Code Notebook", "Dataset", "Slides"]).default("PDF"),
    description: z.string().trim().max(1000).default(""),
    url: z.string().optional(),
    fileName: z.string().optional(),
    size: z.string().default("1.5 MB"),
  })

  app.get<{ Params: { id: string } }>("/courses/:id/materials", async (req) => {
    const materialsList = await db
      .select()
      .from(course_materials)
      .where(eq(course_materials.course_id, req.params.id))
      .orderBy(asc(course_materials.position))
    return { materials: materialsList }
  })

  app.post<{ Params: { id: string } }>("/courses/:id/materials", async (req, reply) => {
    const input = parse(materialSchema, req.body)
    const courseId = req.params.id

    const [maxPos] = await db
      .select({ max: sql<number>`coalesce(max(${course_materials.position}), 0)` })
      .from(course_materials)
      .where(eq(course_materials.course_id, courseId))
    const nextPos = (maxPos?.max ?? 0) + 1
    const matId = `mat-${courseId}-${nextPos}`

    const [row] = await db
      .insert(course_materials)
      .values({
        id: matId,
        course_id: courseId,
        position: nextPos,
        title: input.title,
        type: input.type,
        description: input.description,
        url: input.url || null,
        file_name: input.fileName || null,
        size: input.size,
        published_at: new Date(),
        is_available: true,
      })
      .returning()

    reply.code(201)
    return { ok: true, material: row }
  })

  app.delete<{ Params: { id: string; materialId: string } }>("/courses/:id/materials/:materialId", async (req) => {
    await db
      .delete(course_materials)
      .where(and(eq(course_materials.id, req.params.materialId), eq(course_materials.course_id, req.params.id)))
    return { ok: true, deleted: req.params.materialId }
  })

  // Direct file upload for Course Materials (PDFs, Jupyter notebooks, slides)
  app.post<{ Params: { id: string } }>("/courses/:id/materials/upload", async (req, reply) => {
    const query = req.query as { filename?: string }
    const courseId = req.params.id
    const rawFilename = query.filename || (req.headers["x-filename"] as string) || "document.pdf"
    const safeName = rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)
    const key = `materials/${courseId}/${Date.now()}-${safeName}`
    const contentType = (req.headers["content-type"] as string) || "application/octet-stream"

    const data = req.body as Buffer
    if (data?.length > 20 * 1024 * 1024 || !["application/pdf", "application/json", "text/plain", "application/zip", "application/octet-stream"].includes(contentType)) throw badRequest("Materials must be an allowed document under 20 MB")
    if (!data || !Buffer.isBuffer(data) || data.length === 0) {
      return reply.code(400).send({ error: "Missing or empty file payload." })
    }

    await ctx.storage.put(key, data, contentType)
    const url = `/api/files/${key}`

    const mb = data.length / (1024 * 1024)
    const sizeStr = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(data.length / 1024)} KB`

    return {
      ok: true,
      url,
      key,
      fileName: rawFilename,
      size: sizeStr,
      contentType,
    }
  })

  // --- 5d. Assignments Management ---
  const assignmentSchema = z.object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(5000).default(""),
    maxMarks: z.number().int().min(1).max(1000).default(100),
    priority: z.enum(["High", "Medium", "Normal"]).default("Normal"),
    dueAt: z.string().min(1),
  })

  app.get<{ Params: { id: string } }>("/courses/:id/assignments", async (req) => {
    const assignmentsList = await db
      .select()
      .from(assignments)
      .where(eq(assignments.course_id, req.params.id))
      .orderBy(asc(assignments.due_at))
    return { assignments: assignmentsList }
  })

  app.post<{ Params: { id: string } }>("/courses/:id/assignments", async (req, reply) => {
    const input = parse(assignmentSchema, req.body)
    const courseId = req.params.id
    const assignId = `a-${courseId}-${Date.now().toString(36)}`

    const [row] = await db
      .insert(assignments)
      .values({
        id: assignId,
        course_id: courseId,
        title: input.title,
        description: input.description,
        max_marks: input.maxMarks,
        priority: input.priority,
        due_at: new Date(input.dueAt),
      })
      .returning()

    reply.code(201)
    return { ok: true, assignment: row }
  })

  app.patch<{ Params: { id: string; assignmentId: string } }>("/courses/:id/assignments/:assignmentId", async (req) => {
    const input = parse(assignmentSchema.partial(), req.body)
    const updateData: any = {}
    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.maxMarks !== undefined) updateData.max_marks = input.maxMarks
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.dueAt !== undefined) updateData.due_at = new Date(input.dueAt)

    const [updated] = await db
      .update(assignments)
      .set(updateData)
      .where(and(eq(assignments.id, req.params.assignmentId), eq(assignments.course_id, req.params.id)))
      .returning()
    if (!updated) throw notFound("Assignment not found.")
    return { ok: true, assignment: updated }
  })

  app.delete<{ Params: { id: string; assignmentId: string } }>("/courses/:id/assignments/:assignmentId", async (req) => {
    await db
      .delete(assignments)
      .where(and(eq(assignments.id, req.params.assignmentId), eq(assignments.course_id, req.params.id)))
    return { ok: true, deleted: req.params.assignmentId }
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
