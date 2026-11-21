import { admit, cancelRegistration, lockBatch, availableSeats } from "../../learning/admission.js"
import { setBatchPrice } from "../../learning/batch-offer.js"
import { batch_registrations, seat_reservations } from "../../db/schema.js"
import { asc, eq, inArray, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import type { Db, Tx } from "../../db/client.js"
import {
  app_state,
  batch_students,
  cohort_batches,
  course_offers,
  courses,
  enrollments,
  profiles,
  roll_number_seq,
  users,
} from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../errors.js"
import { parse } from "../../http.js"

const BATCHES_INITIALIZED_KEY = "batches_initialized"

export const BATCH_STATUSES = ["Active", "Upcoming", "Completed", "Archived"] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

export const DELIVERY_MODES = ["Live + Replay", "Replay Only", "Self-Paced"] as const
export type DeliveryMode = (typeof DELIVERY_MODES)[number]

export const ROSTER_STATUSES = ["Active", "Waitlisted", "Completed", "Paused", "At Risk"] as const
export type RosterStatus = (typeof ROSTER_STATUSES)[number]

export interface BatchFeatures {
  liveChat: boolean
  doubtClearing: boolean
  aiTutor: boolean
  certificate: boolean
}

const DEFAULT_FEATURES: BatchFeatures = {
  liveChat: true,
  doubtClearing: true,
  aiTutor: true,
  certificate: true,
}

const FEATURES_SCHEMA = z.object({
  liveChat: z.boolean().optional(),
  doubtClearing: z.boolean().optional(),
  aiTutor: z.boolean().optional(),
  certificate: z.boolean().optional(),
})

function normalizeFeatures(raw: unknown, base: BatchFeatures = DEFAULT_FEATURES): BatchFeatures {
  const f = (raw && typeof raw === "object" ? raw : {}) as Partial<BatchFeatures>
  return {
    liveChat: typeof f.liveChat === "boolean" ? f.liveChat : base.liveChat,
    doubtClearing: typeof f.doubtClearing === "boolean" ? f.doubtClearing : base.doubtClearing,
    aiTutor: typeof f.aiTutor === "boolean" ? f.aiTutor : base.aiTutor,
    certificate: typeof f.certificate === "boolean" ? f.certificate : base.certificate,
  }
}

function defaultStartDate(offsetDays = 7): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return d.toISOString().slice(0, 10)
}

function defaultEndDate(startIso: string, durationDays = 90): string {
  const parsed = Date.parse(startIso)
  const base = Number.isNaN(parsed) ? Date.now() : parsed
  return new Date(base + durationDays * 86_400_000).toISOString().slice(0, 10)
}

function assertDateOrder(startDate: string, endDate: string) {
  if (startDate && endDate && endDate < startDate) {
    throw badRequest("End date cannot be earlier than start date.")
  }
}

const DEFAULT_BATCH_SEEDS = [
  {
    id: "batch-genai-14",
    name: "GenAI Cohort — Nov 2026",
    preferredCourseId: "c-1",
    instructor: "Srimanth",
    start_date: "2026-11-10",
    end_date: "2027-02-15",
    schedule: "Mon, Wed, Fri · 7:30 PM - 9:30 PM",
    timezone: "Asia/Kolkata",
    max_seats: 100,
    delivery_mode: "Live + Replay" as DeliveryMode,
    replay_delay_hours: 2,
    access_expiry_months: 24,
    meeting_url: null as string | null,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Active" as BatchStatus,
    notes: "Flagship enterprise LLM & RAG cohort with weekly Friday demo labs.",
    position: 0,
  },
  {
    id: "batch-agents-04",
    name: "AI Agents Bootcamp — Batch 4",
    preferredCourseId: "c-4",
    instructor: "Srimanth",
    start_date: "2026-12-01",
    end_date: "2027-02-28",
    schedule: "Tue, Thu · 8:00 PM - 10:00 PM",
    timezone: "Asia/Kolkata",
    max_seats: 80,
    delivery_mode: "Live + Replay" as DeliveryMode,
    replay_delay_hours: 1,
    access_expiry_months: 24,
    meeting_url: null as string | null,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Upcoming" as BatchStatus,
    notes: "Multi-agent tool calling, stateful memory persistence, and evaluation harnesses.",
    position: 1,
  },
  {
    id: "batch-py-22",
    name: "Python for AI — Batch 22",
    preferredCourseId: "c-2",
    instructor: "Srimanth",
    start_date: "2026-10-05",
    end_date: "2026-12-20",
    schedule: "Sat, Sun · 10:00 AM - 1:00 PM",
    timezone: "Asia/Kolkata",
    max_seats: 150,
    delivery_mode: "Live + Replay" as DeliveryMode,
    replay_delay_hours: 4,
    access_expiry_months: 18,
    meeting_url: null as string | null,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Active" as BatchStatus,
    notes: "Weekend intensive cohort covering NumPy, Pandas, and PyTorch tensor workflows.",
    position: 2,
  },
  {
    id: "batch-ml-09",
    name: "ML Foundations — Batch 09",
    preferredCourseId: "c-3",
    instructor: "Srimanth",
    start_date: "2026-07-01",
    end_date: "2026-10-15",
    schedule: "Self-Paced",
    timezone: "Asia/Kolkata",
    max_seats: 120,
    delivery_mode: "Replay Only" as DeliveryMode,
    replay_delay_hours: 0,
    access_expiry_months: 12,
    meeting_url: null as string | null,
    features: { liveChat: false, doubtClearing: false, aiTutor: true, certificate: true },
    status: "Completed" as BatchStatus,
    notes: "Completed Q3 cohort; replay access and peer capstones remain unlocked.",
    position: 3,
  },
  {
    id: "batch-cv-03",
    name: "Computer Vision Track — Cohort 03",
    preferredCourseId: "cat-2",
    instructor: "Dr. Elena Vance",
    start_date: "2027-01-12",
    end_date: "2027-04-05",
    schedule: "Tue, Thu · 7:00 PM - 9:00 PM",
    timezone: "Asia/Kolkata",
    max_seats: 60,
    delivery_mode: "Live + Replay" as DeliveryMode,
    replay_delay_hours: 2,
    access_expiry_months: 24,
    meeting_url: null as string | null,
    features: { liveChat: true, doubtClearing: true, aiTutor: true, certificate: true },
    status: "Upcoming" as BatchStatus,
    notes: "Object detection, segmentation, and real-time OpenCV deployment workshops.",
    position: 4,
  },
] as const

export async function seedBatchesDefaults(dbOrTx: Db | Tx, { force = false } = {}) {
  const [marker] = await dbOrTx
    .select({ key: app_state.key })
    .from(app_state)
    .where(eq(app_state.key, BATCHES_INITIALIZED_KEY))
    .limit(1)

  if (marker && !force) return

  const courseRows = await dbOrTx
    .select({ id: courses.id, instructor: courses.instructor })
    .from(courses)
    .orderBy(asc(courses.position), asc(courses.title))

  if (courseRows.length === 0) return

  const courseIds = new Set(courseRows.map((c) => c.id))
  const fallbackCourse = courseRows[0]!

  const rowsToInsert = DEFAULT_BATCH_SEEDS.map((seed) => {
    const courseId = courseIds.has(seed.preferredCourseId) ? seed.preferredCourseId : fallbackCourse.id
    return {
      id: seed.id,
      name: seed.name,
      course_id: courseId,
      instructor: seed.instructor,
      instructor_avatar: "",
      start_date: seed.start_date,
      end_date: seed.end_date,
      schedule: seed.schedule,
      timezone: seed.timezone,
      max_seats: seed.max_seats,
      delivery_mode: seed.delivery_mode,
      replay_delay_hours: seed.replay_delay_hours,
      access_expiry_months: seed.access_expiry_months,
      meeting_url: seed.meeting_url,
      features: seed.features,
      status: seed.status,
      notes: seed.notes,
      position: seed.position,
    }
  })

  await dbOrTx.insert(cohort_batches).values(rowsToInsert).onConflictDoNothing()

  await dbOrTx
    .insert(app_state)
    .values({ key: BATCHES_INITIALIZED_KEY, value: true, updated_at: new Date() })
    .onConflictDoUpdate({
      target: app_state.key,
      set: { value: true, updated_at: new Date() },
    })
}

let batchesSeedInFlight: Promise<void> | null = null

export async function ensureBatchesSeeded(db: Db) {
  const [marker] = await db
    .select({ key: app_state.key })
    .from(app_state)
    .where(eq(app_state.key, BATCHES_INITIALIZED_KEY))
    .limit(1)
  if (marker) return

  if (!batchesSeedInFlight) {
    batchesSeedInFlight = db
      .transaction((tx: Tx) => seedBatchesDefaults(tx, { force: false }))
      .finally(() => {
        batchesSeedInFlight = null
      })
  }
  await batchesSeedInFlight
}

export async function findOrCreateStudentInTx(
  tx: Tx,
  input: { name: string; email: string; program?: string; batchName?: string },
): Promise<{ studentId: string; created: boolean }> {
  const cleanEmail = input.email.trim().toLowerCase()
  const cleanName = input.name.trim()
  if (!cleanEmail || !cleanName) {
    throw badRequest("Student name and email are required.")
  }

  const [existing] = await tx
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(sql`lower(${users.email}) = ${cleanEmail}`)
    .limit(1)

  if (existing) {
    const [hasProfile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, existing.id))
      .limit(1)
    if (!hasProfile) {
      const [{ n }] = (
        await tx.execute(sql`select nextval(${sql.raw(`'lms.${roll_number_seq.seqName}'`)}) as n`)
      ).rows as { n: string }[]
      await tx
        .insert(profiles)
        .values({
          id: existing.id,
          roll_number: `QAI-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`,
          ...(input.program ? { program: input.program } : {}),
          ...(input.batchName ? { batch: input.batchName } : {}),
        })
        .onConflictDoNothing()
    }
    return { studentId: existing.id, created: false }
  }

  const [userRow] = await tx
    .insert(users)
    .values({
      email: cleanEmail,
      full_name: cleanName,
      role: "Student",
      is_demo: false,
    })
    .returning({ id: users.id })

  const [{ n }] = (
    await tx.execute(sql`select nextval(${sql.raw(`'lms.${roll_number_seq.seqName}'`)}) as n`)
  ).rows as { n: string }[]

  await tx.insert(profiles).values({
    id: userRow!.id,
    roll_number: `QAI-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`,
    program: input.program?.trim() || "Bachelor of Science in Artificial Intelligence",
    batch: input.batchName?.trim() || "Class of 2027 · AI Engineering Cohort",
  })

  return { studentId: userRow!.id, created: true }
}

interface AddStudentsTxInput {
  batchId: string
  studentIds: string[]
  status: RosterStatus
  notes?: string
  allowOverCapacity?: boolean
  autoWaitlistWhenFull?: boolean
}

export async function addStudentsToBatchTx(tx: Tx, input: AddStudentsTxInput) {
  const batch = await lockBatch(tx, input.batchId)
  if (!batch) throw notFound("Batch not found.")

  const uniqueIds = Array.from(new Set(input.studentIds))
  if (uniqueIds.length === 0) {
    return { addedCount: 0, waitlistedCount: 0, skippedCount: 0 }
  }

  const validUsers = await tx
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, uniqueIds))

  if (validUsers.length !== uniqueIds.length) {
    throw notFound("One or more selected students were not found.")
  }

  // Ensure every targeted user has a profile row (covers Cognito accounts created without onboarding yet).
  const existingProfiles = await tx
    .select({ id: profiles.id })
    .from(profiles)
    .where(inArray(profiles.id, uniqueIds))
  const profileSet = new Set(existingProfiles.map((p) => p.id))
  for (const id of uniqueIds) {
    if (!profileSet.has(id)) {
      const [{ n }] = (
        await tx.execute(sql`select nextval(${sql.raw(`'lms.${roll_number_seq.seqName}'`)}) as n`)
      ).rows as { n: string }[]
      await tx
        .insert(profiles)
        .values({
          id,
          roll_number: `QAI-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`,
          batch: batch.name,
        })
        .onConflictDoNothing()
    }
  }

  let addedCount = 0, waitlistedCount = 0, skippedCount = 0
  for (const studentId of [...uniqueIds].sort()) {
    const result = await admit(tx, { batchId: batch.id, student: studentId, status: input.status, notes: input.notes, autoWaitlist: input.autoWaitlistWhenFull })
    if (result.skipped) skippedCount++
    else if (result.waitlisted) waitlistedCount++
    else {
      addedCount++
      await tx.update(profiles).set({ batch: batch.name, updated_at: new Date() }).where(eq(profiles.id, studentId))
    }
  }
  return { addedCount, waitlistedCount, skippedCount }
}

async function queryBatches(db: Db, filters?: { courseId?: string; status?: string; q?: string; batchId?: string }) {

  const whereClauses = []
  if (filters?.batchId) whereClauses.push(sql`cb.id = ${filters.batchId}`)
  if (filters?.courseId && filters.courseId !== "All") whereClauses.push(sql`cb.course_id = ${filters.courseId}`)
  if (filters?.status && filters.status !== "All") whereClauses.push(sql`cb.status = ${filters.status}`)
  if (filters?.q?.trim()) {
    const like = `%${filters.q.trim().toLowerCase()}%`
    whereClauses.push(
      sql`(lower(cb.name) like ${like} or lower(cb.instructor) like ${like} or lower(coalesce(c.title, '')) like ${like})`,
    )
  }

  const whereSql = whereClauses.length ? sql`where ${sql.join(whereClauses, sql` and `)}` : sql``

  const result = await db.execute(sql`
    select
      cb.id,
      cb.name,
      cb.course_id,
      c.code as course_code,
      c.title as course_title,
      c.category as course_category,
      cb.instructor,
      cb.instructor_avatar,
      cb.start_date,
      cb.end_date,
      cb.schedule,
      cb.timezone,
      coalesce(count(case when bs.status <> 'Waitlisted' then 1 end), 0)::int as enrolled_seats,
      coalesce(count(case when bs.status = 'Waitlisted' then 1 end), 0)::int as waitlisted_seats,
      coalesce(count(bs.student_id), 0)::int as total_roster_count,
      cb.max_seats,
      cb.delivery_mode,
      cb.replay_delay_hours,
      cb.access_expiry_months,
      null::text as meeting_url,
      cb.features,
      cb.status, cb.lifecycle, cb.offer_id, cb.minimum_paid_registrations,
      case when o.status = 'Published' then o.price else 0 end::int as price,
      cb.notes,
      cb.position,
      cb.created_at,
      cb.updated_at
    from lms.cohort_batches cb
    left join lms.courses c on c.id = cb.course_id
    left join lms.course_offers o on o.id = cb.offer_id
    left join lms.batch_students bs on bs.batch_id = cb.id
    ${whereSql}
    group by cb.id, c.code, c.title, c.category, o.status, o.price
    order by cb.position asc, cb.created_at desc
  `)

  return result.rows.map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    lifecycle: row.lifecycle, offer_id: row.offer_id, minimum_paid_registrations: row.minimum_paid_registrations,
    // The course is only an optional topic label. A batch stands on its own price, seats, classes and videos.
    course_id: row.course_id ? String(row.course_id) : null,
    price: Number(row.price ?? 0),
    course_code: String(row.course_code ?? ""),
    course_title: String(row.course_title ?? ""),
    course_category: String(row.course_category ?? ""),
    instructor: String(row.instructor),
    instructor_avatar: String(row.instructor_avatar ?? ""),
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    schedule: String(row.schedule),
    timezone: String(row.timezone ?? "Asia/Kolkata"),
    enrolled_seats: Number(row.enrolled_seats ?? 0),
    waitlisted_seats: Number(row.waitlisted_seats ?? 0),
    total_roster_count: Number(row.total_roster_count ?? 0),
    max_seats: Number(row.max_seats ?? 100),
    delivery_mode: String(row.delivery_mode) as DeliveryMode,
    replay_delay_hours: Number(row.replay_delay_hours ?? 2),
    access_expiry_months: Number(row.access_expiry_months ?? 24),
    meeting_url: row.meeting_url ? String(row.meeting_url) : null,
    features: normalizeFeatures(row.features),
    status: String(row.status) as BatchStatus,
    notes: String(row.notes ?? ""),
    position: Number(row.position ?? 0),
  }))
}

async function getBatchDto(db: Db, batchId: string) {
  const rows = await queryBatches(db, { batchId })
  return rows[0] ?? null
}

const meetingUrlField = z.union([z.literal(""), z.null()]).optional().transform(() => null)

const dateField = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates must use YYYY-MM-DD format")

const createBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters.").max(150),
  course_id: z.string().trim().min(1).nullable().optional(),
  price: z.number().int().min(0).max(10_000_000).default(0),
  instructor: z.string().trim().min(2, "Lead instructor is required.").max(120).optional(),
  instructor_avatar: z.string().trim().max(300).optional(),
  start_date: dateField.optional(),
  end_date: dateField.optional(),
  schedule: z.string().trim().min(2).max(150).default("Mon, Wed, Fri · 7:30 PM - 9:30 PM"),
  timezone: z.string().trim().min(2).max(60).default("Asia/Kolkata"),
  max_seats: z.number().int().min(1, "Max seats must be at least 1.").max(5000).default(100),
  delivery_mode: z.enum(DELIVERY_MODES).default("Live + Replay"),
  replay_delay_hours: z.number().int().min(0).max(168).default(2),
  access_expiry_months: z.number().int().min(0).max(120).default(12),
  meeting_url: meetingUrlField,
  features: FEATURES_SCHEMA.optional(),
  status: z.enum(BATCH_STATUSES).default("Active"),
  notes: z.string().trim().max(1000).default(""),
  student_ids: z.array(z.string().uuid()).max(200).optional(),
})

const patchBatchSchema = z.object({
  name: z.string().trim().min(2, "Batch name must be at least 2 characters.").max(150).optional(),
  course_id: z.string().trim().min(1).nullable().optional(),
  price: z.number().int().min(0).max(10_000_000).optional(),
  instructor: z.string().trim().min(2).max(120).optional(),
  instructor_avatar: z.string().trim().max(300).optional(),
  start_date: dateField.optional(),
  end_date: dateField.optional(),
  schedule: z.string().trim().min(2).max(150).optional(),
  timezone: z.string().trim().min(2).max(60).optional(),
  max_seats: z.number().int().min(1).max(5000).optional(),
  delivery_mode: z.enum(DELIVERY_MODES).optional(),
  replay_delay_hours: z.number().int().min(0).max(168).optional(),
  access_expiry_months: z.number().int().min(0).max(120).optional(),
  meeting_url: meetingUrlField,
  features: FEATURES_SCHEMA.optional(),
  status: z.enum(BATCH_STATUSES).optional(),
  notes: z.string().trim().max(1000).optional(),
  position: z.number().int().optional(),
})

export async function adminBatchRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  // 1. List cohort batches (with real roster seat counts and optional filtering)
  app.get<{ Querystring: { courseId?: string; status?: string; q?: string } }>("/batches", async (req) => {
    const batches = await queryBatches(db, req.query)
    return { batches }
  })

  // 2. Get a single cohort batch with its students
  app.get<{ Params: { id: string } }>("/batches/:id", async (req) => {
    const batch = await getBatchDto(db, req.params.id)
    if (!batch) throw notFound("Batch not found.")
    return { batch }
  })

  // 3. Create cohort batch
  app.post("/batches", async (req, reply) => {
    const b = parse(createBatchSchema, req.body)

    const [course] = b.course_id ? await db.select().from(courses).where(eq(courses.id, b.course_id)).limit(1) : []
    if (b.course_id && !course) throw notFound("Course not found.")

    const startDate = b.start_date ?? defaultStartDate(7)
    const endDate = b.end_date ?? defaultEndDate(startDate, 90)
    assertDateOrder(startDate, endDate)

    const batchId = `batch-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`

    await db.transaction(async (tx) => {
      const [{ minPos }] = (
        await tx.execute(sql`select coalesce(min(position), 0)::int as "minPos" from lms.cohort_batches`)
      ).rows as { minPos: number }[]

      await tx.insert(cohort_batches).values({
        id: batchId,
        name: b.name,
        course_id: course?.id ?? null,
        instructor: b.instructor || course?.instructor || "Srimanth",
        instructor_avatar: b.instructor_avatar ?? "",
        start_date: startDate,
        end_date: endDate,
        schedule: b.schedule,
        timezone: b.timezone,
        max_seats: b.max_seats,
        delivery_mode: b.delivery_mode,
        replay_delay_hours: b.replay_delay_hours,
        access_expiry_months: b.access_expiry_months,
        meeting_url: b.meeting_url ?? null,
        features: normalizeFeatures(b.features),
        status: b.status,
        notes: b.notes,
        position: (minPos ?? 0) - 1,
      })
      if (b.price > 0) {
        const offerId = await setBatchPrice(tx, await lockBatch(tx, batchId), b.price)
        await tx.update(cohort_batches).set({ offer_id: offerId }).where(eq(cohort_batches.id, batchId))
      }

      if (b.student_ids?.length) {
        await addStudentsToBatchTx(tx, {
          batchId,
          studentIds: b.student_ids,
          status: "Active",
          autoWaitlistWhenFull: true,
        })
      }
    })

    const created = await getBatchDto(db, batchId)
    reply.code(201)
    return { ok: true, batch: created }
  })

  // 4. Duplicate an existing cohort batch (great for opening Batch N+1 quickly)
  app.post<{ Params: { id: string } }>("/batches/:id/duplicate", async (req, reply) => {
    const b = parse(
      z
        .object({
          name: z.string().trim().min(2).max(150).optional(),
          start_date: dateField.optional(),
          end_date: dateField.optional(),
          status: z.enum(BATCH_STATUSES).default("Upcoming"),
          copy_students: z.boolean().default(false),
        })
        .optional()
        .default({ status: "Upcoming", copy_students: false }),
      req.body ?? {},
    )

    const [source] = await db.select().from(cohort_batches).where(eq(cohort_batches.id, req.params.id)).limit(1)
    if (!source) throw notFound("Batch not found.")

    const startDate = b.start_date ?? defaultStartDate(14)
    const endDate = b.end_date ?? defaultEndDate(startDate, 90)
    assertDateOrder(startDate, endDate)

    const duplicateId = `batch-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const nextName = b.name ?? `${source.name.replace(/\s*\(Copy\)$/i, "")} (Copy)`

    await db.transaction(async (tx) => {
      await tx.insert(cohort_batches).values({
        id: duplicateId,
        name: nextName.slice(0, 150),
        course_id: source.course_id,
        instructor: source.instructor,
        instructor_avatar: source.instructor_avatar,
        start_date: startDate,
        end_date: endDate,
        schedule: source.schedule,
        timezone: source.timezone,
        max_seats: source.max_seats,
        delivery_mode: source.delivery_mode,
        replay_delay_hours: source.replay_delay_hours,
        access_expiry_months: source.access_expiry_months,
        meeting_url: null,
        features: normalizeFeatures(source.features),
        status: b.status,
        notes: source.notes,
        position: source.position,
      })
      // The copy gets its own offer at the same price; two batches never share one.
      const [sourceOffer] = source.offer_id ? await tx.select().from(course_offers).where(eq(course_offers.id, source.offer_id)) : []
      if (sourceOffer && sourceOffer.status === "Published" && sourceOffer.price > 0) {
        const offerId = await setBatchPrice(tx, await lockBatch(tx, duplicateId), sourceOffer.price)
        await tx.update(cohort_batches).set({ offer_id: offerId }).where(eq(cohort_batches.id, duplicateId))
      }

      if (b.copy_students) {
        const existingStudents = await tx
          .select({ student_id: batch_students.student_id })
          .from(batch_students)
          .where(eq(batch_students.batch_id, source.id))
        if (existingStudents.length > 0) {
          await addStudentsToBatchTx(tx, {
            batchId: duplicateId,
            studentIds: existingStudents.map((s) => s.student_id),
            status: "Active",
            autoWaitlistWhenFull: true,
          })
        }
      }
    })

    const created = await getBatchDto(db, duplicateId)
    reply.code(201)
    return { ok: true, batch: created }
  })

  // 5. Update cohort batch
  app.patch<{ Params: { id: string } }>("/batches/:id", async (req) => {
    const b = parse(patchBatchSchema, req.body)

    const [existing] = await db.select().from(cohort_batches).where(eq(cohort_batches.id, req.params.id)).limit(1)
    if (!existing) throw notFound("Batch not found.")

    if (b.course_id && b.course_id !== existing.course_id) {
      const [c] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, b.course_id)).limit(1)
      if (!c) throw notFound("Course not found.")
    }

    const nextStart = b.start_date ?? existing.start_date
    const nextEnd = b.end_date ?? existing.end_date
    assertDateOrder(nextStart, nextEnd)

    await db.transaction(async (tx) => {
      const locked = await lockBatch(tx, existing.id)
      const available = await availableSeats(tx, locked)
      if (b.max_seats !== undefined && (b.max_seats < locked.max_seats - available || b.max_seats < (locked.minimum_paid_registrations ?? 0))) throw conflict("Capacity cannot be below allocated seats or the configured minimum")
      const updateSet: Record<string, unknown> = { updated_at: new Date() }
      const currentPrice = locked.offer_id
        ? (await tx.select({ price: course_offers.price, status: course_offers.status }).from(course_offers).where(eq(course_offers.id, locked.offer_id)))[0]
        : undefined
      const priceChanged = b.price !== undefined && b.price !== (currentPrice && currentPrice.status === "Published" ? currentPrice.price : 0)
      if (b.price !== undefined && priceChanged) {
        if (locked.lifecycle === "Running") throw conflict("The price of a running batch is locked")
        if (["Completed", "Cancelled"].includes(locked.lifecycle)) throw conflict("This batch is closed")
        updateSet.offer_id = await setBatchPrice(tx, locked, b.price)
      }
      if (b.name !== undefined) updateSet.name = b.name
      if (b.course_id !== undefined) updateSet.course_id = b.course_id
      if (b.instructor !== undefined) updateSet.instructor = b.instructor
      if (b.instructor_avatar !== undefined) updateSet.instructor_avatar = b.instructor_avatar
      if (b.start_date !== undefined) updateSet.start_date = b.start_date
      if (b.end_date !== undefined) updateSet.end_date = b.end_date
      if (b.schedule !== undefined) updateSet.schedule = b.schedule
      if (b.timezone !== undefined) updateSet.timezone = b.timezone
      if (b.max_seats !== undefined) updateSet.max_seats = b.max_seats
      if (b.delivery_mode !== undefined) updateSet.delivery_mode = b.delivery_mode
      if (b.replay_delay_hours !== undefined) updateSet.replay_delay_hours = b.replay_delay_hours
      if (b.access_expiry_months !== undefined) updateSet.access_expiry_months = b.access_expiry_months
      // Meeting links are managed only by the protected live settings endpoint.
      if (b.features !== undefined) {
        updateSet.features = normalizeFeatures(b.features, normalizeFeatures(existing.features))
      }
      if (b.status !== undefined) updateSet.status = b.status
      if (b.notes !== undefined) updateSet.notes = b.notes
      if (b.position !== undefined) updateSet.position = b.position

      await tx.update(cohort_batches).set(updateSet).where(eq(cohort_batches.id, existing.id))

      // Keep student profile batch labels synchronized when a cohort is renamed.
      if (b.name !== undefined && b.name !== existing.name) {
        await tx
          .update(profiles)
          .set({ batch: b.name, updated_at: new Date() })
          .where(eq(profiles.batch, existing.name))
      }


    })

    const updated = await getBatchDto(db, existing.id)
    return {
      ok: true,
      id: existing.id,
      batch: updated,
      message: "Batch updated successfully.",
    }
  })

  // 6. Delete cohort batch
  app.delete<{ Params: { id: string } }>("/batches/:id", async (req) => {
    const history = await db.select({ id: batch_registrations.id }).from(batch_registrations).where(eq(batch_registrations.batch_id, req.params.id)).limit(1)
    if (history.length) throw conflict("This batch has registration history. Cancel or archive it instead of deleting it.")
    const [deleted] = await db
      .delete(cohort_batches)
      .where(eq(cohort_batches.id, req.params.id))
      .returning({ id: cohort_batches.id })

    if (!deleted) throw notFound("Batch not found.")
    return { ok: true, deleted: deleted.id }
  })

  // 7. View students inside a batch + available directory students to add
  app.get<{ Params: { id: string } }>("/batches/:id/students", async (req) => {
    const batch = await getBatchDto(db, req.params.id)
    if (!batch) throw notFound("Batch not found.")

    const [rosterRes, availableRes] = await Promise.all([
      db.execute(sql`
        select
          u.id,
          u.full_name as name,
          u.email,
          u.avatar_url,
          coalesce(p.roll_number, '') as roll_number,
          coalesce(p.program, 'Artificial Intelligence') as program,
          bs.status,
          bs.notes,
          bs.enrolled_at,
          (select round(100.0*count(sa.student_id)/nullif(count(ls.id),0))::int from lms.live_sessions ls left join lms.session_attendance sa on sa.session_id=ls.id and sa.student_id=u.id where ls.batch_id=${batch.id} and ls.status='Ended' and ls.starts_at>=bs.enrolled_at) as attendance_rate,
          coalesce((
            select case when count(l.id) > 0
              then round((count(lp.lesson_id)::numeric / count(l.id)) * 100)::int
              else 0
            end
            from lms.lessons l
            left join lms.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = u.id
            where l.course_id = ${batch.course_id} and l.archived_at is null
          ), 0)::int as course_progress
        from lms.batch_students bs
        join lms.users u on u.id = bs.student_id
        left join lms.profiles p on p.id = u.id
        where bs.batch_id = ${batch.id}
        group by u.id, u.full_name, u.email, u.avatar_url, p.roll_number, p.program, bs.status, bs.notes, bs.enrolled_at
        order by
          case when bs.status = 'Waitlisted' then 1 else 0 end asc,
          u.full_name asc
      `),
      db.execute(sql`
        select
          u.id,
          u.full_name as name,
          u.email,
          u.avatar_url,
          coalesce(p.roll_number, '') as roll_number,
          coalesce(p.batch, '') as current_batch
        from lms.users u
        left join lms.profiles p on p.id = u.id
        where u.role = 'Student'
          and not exists (
            select 1 from lms.batch_students bs
            where bs.batch_id = ${batch.id} and bs.student_id = u.id
          )
        order by u.full_name asc
      `),
    ])

    return {
      batch,
      students: rosterRes.rows,
      available_students: availableRes.rows,
    }
  })

  // 8. Add existing student(s) OR create-and-enrol a new student into a batch
  app.post<{ Params: { id: string } }>("/batches/:id/students", async (req, reply) => {
    const b = parse(
      z.object({
        student_ids: z.array(z.string().uuid()).min(1).max(200).optional(),
        name: z.string().trim().min(2).max(120).optional(),
        email: z.string().trim().email().max(200).optional(),
        program: z.string().trim().max(150).optional(),
        status: z.enum(ROSTER_STATUSES).default("Active"),
        notes: z.string().trim().max(500).default(""),
        allow_over_capacity: z.boolean().default(false),
        auto_waitlist_when_full: z.boolean().default(false),
      }),
      req.body,
    )

    if (!b.student_ids?.length && !(b.name && b.email)) {
      throw badRequest("Provide existing student_ids or both name and email to enrol a student.")
    }

    const batch = await getBatchDto(db, req.params.id)
    if (!batch) throw notFound("Batch not found.")

    const outcome = await db.transaction(async (tx) => {
      const targetIds = [...(b.student_ids ?? [])]
      if (b.name && b.email) {
        const { studentId } = await findOrCreateStudentInTx(tx, {
          name: b.name,
          email: b.email,
          program: b.program,
          batchName: batch.name,
        })
        targetIds.push(studentId)
      }

      return addStudentsToBatchTx(tx, {
        batchId: batch.id,
        studentIds: targetIds,
        status: b.status,
        notes: b.notes,
        allowOverCapacity: b.allow_over_capacity,
        autoWaitlistWhenFull: b.auto_waitlist_when_full,
      })
    })

    const updatedBatch = await getBatchDto(db, batch.id)
    reply.code(201)
    return {
      ok: true,
      added_count: outcome.addedCount,
      waitlisted_count: outcome.waitlistedCount,
      skipped_count: outcome.skippedCount,
      batch: updatedBatch,
    }
  })

  // 9. Update a student's status/notes in a batch OR transfer them to another batch
  app.patch<{ Params: { id: string; studentId: string } }>("/batches/:id/students/:studentId", async (req) => {
    const b = parse(
      z.object({
        status: z.enum(ROSTER_STATUSES).optional(),
        notes: z.string().trim().max(500).optional(),
        target_batch_id: z.string().trim().min(1).optional(),
        allow_over_capacity: z.boolean().default(false),
      }),
      req.body,
    )

    const { id: batchId, studentId } = req.params
    const [existing] = await db
      .select()
      .from(batch_students)
      .where(sql`${batch_students.batch_id} = ${batchId} and ${batch_students.student_id} = ${studentId}::uuid`)
      .limit(1)

    if (!existing) throw notFound("Student is not enrolled in this batch.")

    if (b.target_batch_id && b.target_batch_id !== batchId) {
      await db.transaction(async tx => {
        for (const id of [batchId, b.target_batch_id!].sort()) await lockBatch(tx, id)
        const [sourceRegistration] = await tx.select().from(batch_registrations).where(sql`${batch_registrations.batch_id} = ${batchId} and ${batch_registrations.student_id} = ${studentId}::uuid`)
        const source = await lockBatch(tx, batchId), target = await lockBatch(tx, b.target_batch_id!)
        if (sourceRegistration?.paid_at) {
          const priceOf = async (offerId: string | null) => offerId ? (await tx.select({ price: course_offers.price }).from(course_offers).where(eq(course_offers.id, offerId)))[0]?.price ?? 0 : 0
          if (await priceOf(source.offer_id) !== await priceOf(target.offer_id)) throw conflict("Refund the original payment before moving a paid registration to a batch with a different price")
        }
        const result = await admit(tx, { batchId: target.id, student: studentId, status: b.status ?? existing.status,
          notes: b.notes ?? existing.notes, orderId: sourceRegistration?.order_id ?? undefined, paidAt: sourceRegistration?.paid_at ?? undefined, source: sourceRegistration?.source_type })
        if (result.skipped) throw conflict("This student is already registered in the target batch")
        await cancelRegistration(tx, batchId, studentId)
      })
      return { ok: true, transferred: true, batch: await getBatchDto(db, batchId), target_batch: await getBatchDto(db, b.target_batch_id) }
    }
    await db.transaction(async tx => {
      await admit(tx, { batchId, student: studentId, status: b.status ?? existing.status, notes: b.notes, allowUpdate: true })
    })

    const updatedBatch = await getBatchDto(db, batchId)
    return { ok: true, transferred: false, batch: updatedBatch }
  })

  // 10. Remove a student from a batch
  app.delete<{ Params: { id: string; studentId: string } }>(
    "/batches/:id/students/:studentId",
    async (req) => {
      const { id: batchId, studentId } = req.params

      const [batch] = await db.select().from(cohort_batches).where(eq(cohort_batches.id, batchId)).limit(1)
      if (!batch) throw notFound("Batch not found.")

      await db.transaction(async tx => {
        await cancelRegistration(tx, batchId, studentId)
        const [nextBatch] = (await tx.execute(sql`select cb.name from lms.batch_students bs join lms.cohort_batches cb on cb.id = bs.batch_id
          where bs.student_id = ${studentId}::uuid order by bs.enrolled_at desc limit 1`)).rows as { name: string }[]
        await tx.update(profiles).set({ batch: nextBatch?.name ?? "Unassigned", updated_at: new Date() }).where(eq(profiles.id, studentId))
      })

      const updatedBatch = await getBatchDto(db, batchId)
      return { ok: true, removed: studentId, batch: updatedBatch }
    },
  )
}
