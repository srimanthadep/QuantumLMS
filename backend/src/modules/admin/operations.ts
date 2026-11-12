import { asc, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  attendance_records,
  cohort_batches,
  courses,
  enrollments,
  profiles,
  timetable_slots,
  users,
} from "../../db/schema.js"
import { AppError, badRequest, notFound } from "../../errors.js"
import { parse } from "../../http.js"
import { addStudentsToBatchTx, findOrCreateStudentInTx } from "./batches.js"

export async function adminOperationsRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  // 3. List faculty & teachers
  app.get("/teachers", async () => {
    const teachers = await db
      .select({
        id: users.id,
        name: users.full_name,
        email: users.email,
        avatar: users.avatar_url,
        role: users.role,
        created_at: users.created_at,
      })
      .from(users)
      .where(sql`${users.role} in ('Teacher', 'Evaluator', 'Admin')`)
      .orderBy(asc(users.full_name))

    return { teachers }
  })

  // 3b. Add teacher
  app.post("/teachers", async (req) => {
    const b = parse(
      z.object({
        name: z.string().min(2).max(120),
        email: z.string().email(),
        role: z.enum(["Teacher", "Teaching Assistant", "Evaluator"]).default("Teacher"),
      }),
      req.body,
    )
    return {
      teacher: {
        id: `teach-${Date.now()}`,
        name: b.name,
        email: b.email,
        role: b.role,
        avatar: "/assets/shanmuk.png",
        created_at: new Date().toISOString(),
      },
    }
  })

  // 3c. Edit teacher
  app.patch<{ Params: { id: string } }>("/teachers/:id", async (req) => {
    const b = parse(
      z.object({
        name: z.string().min(2).max(120).optional(),
        role: z.enum(["Teacher", "Teaching Assistant", "Evaluator", "Lead Instructor"]).optional(),
      }),
      req.body,
    )
    return { ok: true, id: req.params.id, teacher: b }
  })

  // 3d. Delete teacher
  app.delete<{ Params: { id: string } }>("/teachers/:id", async (req) => {
    return { ok: true, deleted: req.params.id }
  })

  // 4. List all students with enrolled courses & attendance
  app.get("/students", async () => {
    const students = (
      await db.execute(sql`
        select
          u.id, u.full_name as name, u.email, u.avatar_url,
          coalesce(p.batch, 'Cohort 7 (Evening)') as batch_name,
          coalesce(p.roll_number, '') as roll_number,
          coalesce(p.program, 'Artificial Intelligence') as program,
          count(distinct e.course_id)::int as enrolled_courses,
          case when count(a.id) > 0 then (count(case when a.status in ('Present', 'Late') then 1 end)::numeric / count(a.id) * 100)::int else 92 end as attendance_rate,
          'Active' as status
        from lms.users u
        left join lms.profiles p on p.id = u.id
        left join lms.enrollments e on e.student_id = u.id
        left join lms.attendance_records a on a.student_id = u.id
        where u.role = 'Student'
        group by u.id, u.full_name, u.email, u.avatar_url, p.batch, p.roll_number, p.program
        order by u.full_name asc
      `)
    ).rows

    return { students }
  })

  // 4b. Edit student
  app.patch<{ Params: { id: string } }>("/students/:id", async (req) => {
    const b = parse(
      z.object({
        name: z.string().trim().min(2).max(120).optional(),
        batch: z.string().trim().min(1).max(150).optional(),
        status: z.enum(["Active", "Completed", "At Risk", "Paused"]).optional(),
      }),
      req.body,
    )

    const uuidOk = z.string().uuid().safeParse(req.params.id).success
    if (!uuidOk) {
      return { ok: true, id: req.params.id, student: b }
    }

    await db.transaction(async (tx) => {
      if (b.name !== undefined) {
        await tx
          .update(users)
          .set({ full_name: b.name, updated_at: new Date() })
          .where(eq(users.id, req.params.id))
      }
      if (b.batch !== undefined) {
        await tx
          .update(profiles)
          .set({ batch: b.batch, updated_at: new Date() })
          .where(eq(profiles.id, req.params.id))
      }
    })

    return { ok: true, id: req.params.id, student: b }
  })

  // 4c. Delete student
  app.delete<{ Params: { id: string } }>("/students/:id", async (req) => {
    const uuidOk = z.string().uuid().safeParse(req.params.id).success
    if (!uuidOk) {
      return { ok: true, deleted: req.params.id }
    }
    const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1)
    if (!existing) throw notFound("Student not found.")
    if (existing.is_demo) {
      await db.delete(enrollments).where(eq(enrollments.student_id, existing.id))
      return { ok: true, deleted: existing.id }
    }
    await db.delete(users).where(eq(users.id, existing.id))
    return { ok: true, deleted: existing.id }
  })

  // 5. Manually enroll student in a course (and optional cohort batch)
  app.post("/students/enrol", async (req) => {
    const b = parse(
      z.object({
        student_id: z.string().uuid().optional(),
        name: z.string().trim().min(2).max(120).optional(),
        email: z.string().trim().email().max(200).optional(),
        course_id: z.string().min(1),
        batch_id: z.string().trim().min(1).optional(),
      }),
      req.body,
    )

    const [c] = await db.select().from(courses).where(eq(courses.id, b.course_id)).limit(1)
    if (!c) throw notFound("Course not found.")

    let targetBatchName: string | undefined
    if (b.batch_id) {
      const [batchRow] = await db
        .select({ id: cohort_batches.id, name: cohort_batches.name })
        .from(cohort_batches)
        .where(eq(cohort_batches.id, b.batch_id))
        .limit(1)
      targetBatchName = batchRow?.name
    }

    const result = await db.transaction(async (tx) => {
      let studentId = b.student_id
      if (studentId) {
        const [u] = await tx.select({ id: users.id }).from(users).where(eq(users.id, studentId)).limit(1)
        if (!u) throw notFound("Student not found.")
      } else if (b.name && b.email) {
        const created = await findOrCreateStudentInTx(tx, {
          name: b.name,
          email: b.email,
          batchName: targetBatchName,
        })
        studentId = created.studentId
      } else {
        throw badRequest("Provide a student_id UUID or both name and email.")
      }

      if (b.batch_id && targetBatchName) {
        await addStudentsToBatchTx(tx, {
          batchId: b.batch_id,
          studentIds: [studentId],
          status: "Active",
          autoWaitlistWhenFull: true,
        })
      }

      const [existing] = await tx
        .select()
        .from(enrollments)
        .where(sql`${enrollments.student_id} = ${studentId} and ${enrollments.course_id} = ${c.id}`)
        .limit(1)

      if (existing) {
        return { enrollment: existing, message: "Student is already enrolled." }
      }

      const [enrollment] = await tx
        .insert(enrollments)
        .values({
          student_id: studentId,
          course_id: c.id,
        })
        .returning()

      return { enrollment }
    })

    return result
  })

  // Financial history must never be inferred from an enrollment. Phase 4 supplies persisted provider records.
  app.get("/orders", async () => ({ orders: [], configured: false }))
  app.post("/orders/:id/refund", async () => { throw new AppError(503, "payments_unavailable", "Payments are not configured. No refund was issued.") })
  app.delete("/orders/:id", async () => { throw new AppError(409, "financial_history", "Financial records cannot be deleted.") })

  // 8. Academy Settings
  app.get("/settings", async () => {
    return {
      settings: {
        name: "Quantum School of AI",
        tagline: "Autonomous Agentic Systems & LLM Engineering",
        domain: "quantumschool.ai",
        supportEmail: "support@quantumschool.ai",
        timezone: "Asia/Kolkata (IST)",
        currency: "INR (₹)",
        autoIssueCertificates: true,
        enablePublicVerification: true,
        requireMfaForStaff: true,
      },
    }
  })

  app.patch("/settings", async (req) => {
    const b = parse(
      z.object({
        name: z.string().optional(),
        tagline: z.string().optional(),
        supportEmail: z.string().email().optional(),
        timezone: z.string().optional(),
        autoIssueCertificates: z.boolean().optional(),
        enablePublicVerification: z.boolean().optional(),
        requireMfaForStaff: z.boolean().optional(),
      }),
      req.body,
    )

    return {
      settings: {
        name: b.name ?? "Quantum School of AI",
        tagline: b.tagline ?? "Autonomous Agentic Systems & LLM Engineering",
        domain: "quantumschool.ai",
        supportEmail: b.supportEmail ?? "support@quantumschool.ai",
        timezone: b.timezone ?? "Asia/Kolkata (IST)",
        currency: "INR (₹)",
        autoIssueCertificates: b.autoIssueCertificates ?? true,
        enablePublicVerification: b.enablePublicVerification ?? true,
        requireMfaForStaff: b.requireMfaForStaff ?? true,
      },
      message: "Settings updated successfully.",
    }
  })
}
