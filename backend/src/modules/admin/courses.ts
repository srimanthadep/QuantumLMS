import { execFile } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { and, asc, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  courses,
  course_modules,
  lessons,
  course_materials,
  assignments,
  enrollments,
  profiles,
} from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { parse } from "../../http.js"
import { transcodeMultiQuality } from "../../services/video_transcode.js"
import { invalidateCatalogCache } from "../student/courses.js"

export async function adminCoursesRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  // 1. List all courses with stats
  app.get("/courses", async () => {
    // Query courses, enrollments count, modules count and lessons count in parallel
    const [courseRows, enrolledCounts, moduleCounts, lessonCounts] = await Promise.all([
      db.select().from(courses).orderBy(asc(courses.position), asc(courses.title)),
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
    const courseId = req.params.id
    const [[course], modulesList, lessonsList, [enrolledCountRow], materialsList, assignmentsList] = await Promise.all([
      db.select().from(courses).where(eq(courses.id, courseId)).limit(1),
      db
        .select()
        .from(course_modules)
        .where(eq(course_modules.course_id, courseId))
        .orderBy(asc(course_modules.position)),
      db
        .select()
        .from(lessons)
        .where(eq(lessons.course_id, courseId))
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
    if (!course) throw notFound("Course not found.")

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
    invalidateCatalogCache()

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
    invalidateCatalogCache()

    return { ok: true, course: updated }
  })

  // 5. Delete course
  app.delete<{ Params: { id: string } }>("/courses/:id", async (req) => {
    const [existing] = await db.select().from(courses).where(eq(courses.id, req.params.id)).limit(1)
    if (!existing) throw notFound("Course not found.")

    await db.delete(courses).where(eq(courses.id, req.params.id))
    invalidateCatalogCache()
    return { ok: true, deleted: existing.id }
  })

  // --- 5a. Modules / Chapters Management ---
  const moduleSchema = z.object({
    title: z.string().trim().min(2).max(200),
    duration: z.string().trim().max(50).default("1 hour"),
  })

  app.post<{ Params: { id: string } }>("/courses/:id/modules", async (req, reply) => {
    const input = parse(moduleSchema, req.body)
    const courseId = req.params.id
    const [c] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!c) throw notFound("Course not found.")

    const [maxPos] = await db
      .select({ max: sql<number>`coalesce(max(${course_modules.position}), 0)` })
      .from(course_modules)
      .where(eq(course_modules.course_id, courseId))
    const nextPos = (maxPos?.max ?? 0) + 1
    const moduleId = `m-${courseId}-${nextPos}`

    const [moduleRow] = await db
      .insert(course_modules)
      .values({
        id: moduleId,
        course_id: courseId,
        position: nextPos,
        title: input.title,
        duration: input.duration,
      })
      .returning()
    invalidateCatalogCache()

    reply.code(201)
    return { ok: true, module: moduleRow }
  })

  app.patch<{ Params: { id: string; moduleId: string } }>("/courses/:id/modules/:moduleId", async (req) => {
    const input = parse(moduleSchema.partial(), req.body)
    const [updated] = await db
      .update(course_modules)
      .set(input)
      .where(and(eq(course_modules.id, req.params.moduleId), eq(course_modules.course_id, req.params.id)))
      .returning()
    if (!updated) throw notFound("Module not found.")
    invalidateCatalogCache()
    return { ok: true, module: updated }
  })

  app.delete<{ Params: { id: string; moduleId: string } }>("/courses/:id/modules/:moduleId", async (req) => {
    await db
      .delete(course_modules)
      .where(and(eq(course_modules.id, req.params.moduleId), eq(course_modules.course_id, req.params.id)))
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
    const [c] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!c) throw notFound("Course not found.")

    const [maxPos] = await db
      .select({ max: sql<number>`coalesce(max(${lessons.position}), 0)` })
      .from(lessons)
      .where(eq(lessons.course_id, courseId))
    const nextPos = (maxPos?.max ?? 0) + 1
    const lessonId = `l-${courseId}-${nextPos}`

    const [lessonRow] = await db
      .insert(lessons)
      .values({
        id: lessonId,
        course_id: courseId,
        module_id: input.moduleId,
        position: nextPos,
        title: input.title,
        duration: input.duration,
        minutes: input.minutes,
        type: input.type,
        summary: input.summary,
        video_url: input.videoUrl || null,
        video_qualities: input.videoQualities || {},
      })
      .returning()
    invalidateCatalogCache()

    reply.code(201)
    return { ok: true, lesson: lessonRow }
  })

  app.patch<{ Params: { id: string; lessonId: string } }>("/courses/:id/lessons/:lessonId", async (req) => {
    const patchSchema = lessonSchema.partial()
    const input = parse(patchSchema, req.body)
    const updateData: any = {}
    if (input.moduleId !== undefined) updateData.module_id = input.moduleId
    if (input.title !== undefined) updateData.title = input.title
    if (input.duration !== undefined) updateData.duration = input.duration
    if (input.minutes !== undefined) updateData.minutes = input.minutes
    if (input.type !== undefined) updateData.type = input.type
    if (input.summary !== undefined) updateData.summary = input.summary
    if (input.videoUrl !== undefined) updateData.video_url = input.videoUrl
    if (input.videoQualities !== undefined) updateData.video_qualities = input.videoQualities

    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(and(eq(lessons.id, req.params.lessonId), eq(lessons.course_id, req.params.id)))
      .returning()
    if (!updated) throw notFound("Lesson not found.")
    invalidateCatalogCache()
    return { ok: true, lesson: updated }
  })

  app.delete<{ Params: { id: string; lessonId: string } }>("/courses/:id/lessons/:lessonId", async (req) => {
    await db
      .delete(lessons)
      .where(and(eq(lessons.id, req.params.lessonId), eq(lessons.course_id, req.params.id)))
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

  // 7. Video Course Presigned Upload Target (Cloudflare R2 'videos' folder)
  const videoPresignSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    courseId: z.string().optional(),
    isAudio: z.boolean().optional(),
  })

  app.post("/courses/video-presign", async (req) => {
    const input = parse(videoPresignSchema, req.body)
    const courseId = input.courseId || `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)
    const folder = input.isAudio ? "audio" : "video"
    const key = `videos/${courseId}/${folder}/${Date.now()}-${safeName}`

    // Use max 5GB for video or 100MB for audio
    const maxBytes = input.isAudio ? 100 * 1024 * 1024 : 5 * 1024 * 1024 * 1024
    const upload = await ctx.storage.createUpload({
      key,
      contentType: input.contentType,
      maxBytes,
    })

    return {
      courseId,
      key,
      uploadUrl: upload.url,
      method: upload.method,
      headers: upload.headers,
      expiresAt: upload.expiresAt,
    }
  })

  // Direct Server-Side Video Upload to Cloudflare R2 (Bypasses Browser CORS)
  app.post("/courses/video-upload", async (req, reply) => {
    const query = req.query as { courseId?: string; filename?: string; key?: string }
    const courseId = query.courseId || `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const rawFilename = query.filename || (req.headers["x-filename"] as string) || "video.mp4"
    const safeName = rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100)
    const key = query.key || `videos/${courseId}/video/${Date.now()}-${safeName}`
    const contentType = (req.headers["content-type"] as string) || "video/mp4"

    const data = req.body as Buffer
    if (!data || !Buffer.isBuffer(data) || data.length === 0) {
      return reply.code(400).send({ error: "Missing or empty video payload." })
    }

    await ctx.storage.put(key, data, contentType)

    // Cache temporary local copy for immediate fast multi-quality transcoding
    const tempUploadPath = path.join(os.tmpdir(), `upload_${courseId}.mp4`)
    await fs.promises.writeFile(tempUploadPath, data).catch(() => {})

    return {
      ok: true,
      courseId,
      key,
      size: data.length,
      contentType,
    }
  })

  // Multi-Quality Video Processing (1080p, 720p, 480p, 144p)
  const transcodeSchema = z.object({
    courseId: z.string().min(1),
    videoKey: z.string().min(1),
  })

  app.post("/courses/video-transcode", async (req) => {
    const input = parse(transcodeSchema, req.body)
    const tempDir = os.tmpdir()
    const tempUploadPath = path.join(tempDir, `upload_${input.courseId}.mp4`)

    let sourcePath = tempUploadPath
    let cleanupSource = false

    if (!fs.existsSync(tempUploadPath)) {
      const buffer = await ctx.storage.getBuffer?.(input.videoKey)
      if (!buffer) throw notFound("Source video not found in storage.")
      sourcePath = path.join(tempDir, `source_${Date.now()}_${input.courseId}.mp4`)
      await fs.promises.writeFile(sourcePath, buffer)
      cleanupSource = true
    }

    try {
      const qualities = await transcodeMultiQuality(sourcePath, input.courseId, ctx.storage)

      // If a lesson already exists, update its video_qualities and video_url
      await db
        .update(lessons)
        .set({
          video_qualities: qualities,
          video_url: qualities["720p"]?.url || qualities["1080p"]?.url || `/api/files/videos/${input.videoKey}`,
        })
        .where(eq(lessons.course_id, input.courseId))
      invalidateCatalogCache()

      return {
        ok: true,
        courseId: input.courseId,
        qualities,
      }
    } finally {
      if (cleanupSource) {
        fs.unlink(sourcePath, () => {})
      }
      fs.unlink(tempUploadPath, () => {})
    }
  })

  // 8. Streamed Audio Chunk Ingestion & Transcription (VAD-aware)
  const chunkSchema = z.object({
    courseId: z.string(),
    chunkIndex: z.number().int().min(0),
    totalChunks: z.number().int().min(1),
    startTime: z.number().min(0),
    endTime: z.number().min(0),
    isSilent: z.boolean().default(false),
    audioData: z.string().optional(), // base64 encoded 16kHz WAV chunk
    audioKey: z.string().optional(),
    modelChoice: z.enum(["parakeet", "whisper-multilingual"]).default("parakeet"),
    language: z.string().default("en"),
    title: z.string().optional(),
  })

  app.post("/courses/audio-chunk", async (req) => {
    const input = parse(chunkSchema, req.body)

    // Save audio chunk to Cloudflare R2 if data provided
    let savedKey = input.audioKey
    if (input.audioData && !savedKey) {
      try {
        const audioBuffer = Buffer.from(input.audioData, "base64")
        savedKey = `videos/${input.courseId}/audio/chunk_${input.chunkIndex.toString().padStart(4, "0")}.wav`
        await ctx.storage.put(savedKey, audioBuffer, "audio/wav")
      } catch (err) {
        req.log.warn({ err }, "Could not persist audio chunk to R2")
      }
    }

    // 1. If VAD detected silence: skip heavy ASR computation entirely
    if (input.isSilent) {
      return {
        chunkIndex: input.chunkIndex,
        startTime: input.startTime,
        endTime: input.endTime,
        text: "",
        confidence: 1.0,
        isSilent: true,
        skipped: true,
        modelUsed: input.modelChoice,
        audioKey: savedKey,
      }
    }

    // 2. Perform speech transcription with real neural ASR model
    // NVIDIA Parakeet TDT 0.6B / OpenAI Whisper neural engine
    const startM = Math.floor(input.startTime / 60)
    const startS = Math.floor(input.startTime % 60).toString().padStart(2, "0")
    const endM = Math.floor(input.endTime / 60)
    const endS = Math.floor(input.endTime % 60).toString().padStart(2, "0")
    const timestampLabel = `[${startM}:${startS} - ${endM}:${endS}]`

    let extractedText = ""
    let extractedSegments: { start: number; end: number; text: string }[] = []
    let confidence = 0.95
    let engineLabel = input.modelChoice === "parakeet" ? "OpenAI Whisper / Parakeet" : "Faster-Whisper Indic"

    if (input.audioData) {
      try {
        const audioBuffer = Buffer.from(input.audioData, "base64")
        const tempWav = path.join(os.tmpdir(), `chunk_${Date.now()}_${input.chunkIndex}.wav`)
        await fs.promises.writeFile(tempWav, audioBuffer)

        const pythonBin = fs.existsSync("C:\\Python314\\python.exe")
          ? "C:\\Python314\\python.exe"
          : fs.existsSync("C:\\Users\\srima\\AppData\\Local\\Programs\\Python\\Python313\\python.exe")
          ? "C:\\Users\\srima\\AppData\\Local\\Programs\\Python\\Python313\\python.exe"
          : "python"

        const scriptPath = path.resolve(process.cwd(), "scripts/transcribe_chunk.py")

        const asrResult = await new Promise<{
          text: string
          confidence: number
          engine?: string
          model?: string
          segments?: { start: number; end: number; text: string }[]
        }>((resolve) => {
          execFile(
            pythonBin,
            [scriptPath, "--audio", tempWav, "--model", input.modelChoice, "--language", input.language || "en"],
            { timeout: 45000 },
            (err, stdout, stderr) => {
              fs.unlink(tempWav, () => {})
              if (err || !stdout.trim()) {
                req.log.warn({ err, stderr }, "Neural transcription execution error")
                resolve({ text: "", confidence: 0.85, segments: [] })
                return
              }
              try {
                const lines = stdout.trim().split("\n")
                const lastLine = lines.filter((l) => l.trim().startsWith("{")).pop() || "{}"
                const parsed = JSON.parse(lastLine)
                resolve({
                  text: parsed.text || "",
                  confidence: parsed.confidence || 0.95,
                  engine: parsed.engine,
                  model: parsed.model,
                  segments: Array.isArray(parsed.segments) ? parsed.segments : [],
                })
              } catch {
                resolve({ text: "", confidence: 0.85, segments: [] })
              }
            }
          )
        })

        extractedText = asrResult.text
        extractedSegments = asrResult.segments || []
        confidence = asrResult.confidence
        if (asrResult.engine) {
          engineLabel = `${asrResult.engine} (${asrResult.model || input.modelChoice})`
        }
      } catch (err) {
        req.log.error({ err }, "Error processing audio chunk for transcription")
      }
    }

    return {
      chunkIndex: input.chunkIndex,
      startTime: input.startTime,
      endTime: input.endTime,
      timestampLabel,
      text: extractedText,
      confidence,
      isSilent: false,
      skipped: false,
      modelUsed: engineLabel,
      audioKey: savedKey,
      segments: extractedSegments,
    }
  })

  // 9. Finalize Video Course with Extracted Audio & Full Assembled Transcript
  const finalizeSchema = z.object({
    courseId: z.string().optional(),
    title: z.string().trim().min(3).max(150),
    code: z.string().trim().min(2).max(30).optional(),
    category: z.string().trim().min(2).max(100),
    instructor: z.string().trim().min(2).max(100),
    description: z.string().trim().max(2000).optional(),
    level: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
    duration: z.string().trim().max(50).default("12 Weeks"),
    videoKey: z.string().min(1),
    audioKey: z.string().optional(),
    modelUsed: z.string().default("NVIDIA Parakeet-TDT-0.6B"),
    chunks: z.array(
      z.object({
        chunkIndex: z.number(),
        startTime: z.number(),
        endTime: z.number(),
        text: z.string(),
        isSilent: z.boolean(),
      })
    ),
    fullTranscript: z.string().default(""),
    totalDurationSeconds: z.number().default(0),
    qualities: z.record(z.string(), z.any()).optional(),
    moduleId: z.string().optional(),
  })

  app.post("/courses/video-finalize", async (req) => {
    const input = parse(finalizeSchema, req.body)

    const mins = Math.max(1, Math.round(input.totalDurationSeconds / 60))
    const formattedDuration = mins >= 60 ? `${(mins / 60).toFixed(1)} Hours` : `${mins} Mins`

    const existingCourse = input.courseId
      ? (await db.select().from(courses).where(eq(courses.id, input.courseId)).limit(1))[0]
      : null

    let courseRecord = existingCourse
    let courseId = existingCourse ? existingCourse.id : (input.courseId || `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`)
    let moduleId: string
    let lessonPosition = 1

    if (existingCourse) {
      if (input.moduleId) {
        moduleId = input.moduleId
      } else {
        const [maxModRow] = await db
          .select({ max: sql<number>`coalesce(max(${course_modules.position}), 0)` })
          .from(course_modules)
          .where(eq(course_modules.course_id, existingCourse.id))
        const nextModPos = (maxModRow?.max ?? 0) + 1
        moduleId = `m-${existingCourse.id}-${nextModPos}`
        await db.insert(course_modules).values({
          id: moduleId,
          course_id: existingCourse.id,
          position: nextModPos,
          title: input.title.startsWith("Module") || input.title.startsWith("Chapter") ? input.title : `Chapter ${nextModPos}: ${input.title}`,
          duration: formattedDuration,
        })
      }

      const [maxLessonRow] = await db
        .select({ max: sql<number>`coalesce(max(${lessons.position}), 0)` })
        .from(lessons)
        .where(eq(lessons.course_id, existingCourse.id))
      lessonPosition = (maxLessonRow?.max ?? 0) + 1
    } else {
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
          image: "/assets/course_genai.jpg",
          instructor: input.instructor,
          instructor_role: "Video Course Instructor",
          description: input.description || "",
          level: input.level,
          credits: 4,
          duration: formattedDuration,
          rating: "5.0",
          reviews: "1",
          progress_color: "#1a6dff",
          certificate_title: `${input.title} Mastery Certificate`,
          certificate_skills: [input.category, "Video Learning", "Neural Transcripts"],
          is_starter: false,
          position: nextPos,
        })
        .returning()
      courseRecord = created

      moduleId = `m-${courseId}-1`
      await db.insert(course_modules).values({
        id: moduleId,
        course_id: courseId,
        position: 1,
        title: "Module 1: Complete Video Masterclass",
        duration: formattedDuration,
      })
    }

    // Create Video Lesson with the transcribed summary, video_url, and multi-qualities
    const lessonId = `l-${courseId}-${lessonPosition}`
    const defaultStreamUrl = `/api/files/videos/${input.videoKey}`
    const chosenUrl =
      input.qualities?.["720p"]?.url ||
      input.qualities?.["1080p"]?.url ||
      input.qualities?.["480p"]?.url ||
      defaultStreamUrl

    await db.insert(lessons).values({
      id: lessonId,
      module_id: moduleId,
      course_id: courseId,
      position: lessonPosition,
      title: `${input.title} - Full Lecture & Neural Transcript`,
      duration: formattedDuration,
      minutes: mins,
      type: "video",
      summary: input.fullTranscript || "",
      video_url: chosenUrl,
      video_qualities: input.qualities || {},
    })
    invalidateCatalogCache()

    // Create download/stream URL for the uploaded video
    let r2PresignedUrl: string = input.videoKey
    try {
      r2PresignedUrl = await ctx.storage.createDownloadUrl(input.videoKey, { expiresInSeconds: 86400 * 7 })
    } catch {
      r2PresignedUrl = `https://94f886a9b3a51271b0b96a8794bffdcb.r2.cloudflarestorage.com/quantumlms/${input.videoKey}`
    }

    return {
      ok: true,
      course: courseRecord,
      videoKey: input.videoKey,
      videoStreamUrl: chosenUrl,
      r2PresignedUrl,
      audioKey: input.audioKey,
      moduleId,
      lessonId,
      qualities: input.qualities || {},
      chunksTranscribed: input.chunks.filter((c) => !c.isSilent).length,
      silenceChunksSkipped: input.chunks.filter((c) => c.isSilent).length,
      fullTranscript: input.fullTranscript,
    }
  })
}

