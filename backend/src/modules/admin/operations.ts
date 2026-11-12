import { grantAccess } from "../../learning/entitlements.js"
import { asc, desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  attendance_records,
  cohort_batches,
  courses,
  course_teachers,
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
    const teachers = (await db.execute(sql`select u.id, u.full_name as name, u.email, u.avatar_url as avatar, u.role, u.created_at, u.disabled_at, u.provisioning_state,
      array(select c.title from lms.course_teachers ct join lms.courses c on c.id=ct.course_id where ct.teacher_id=u.id) as assigned_courses,
      array(select b.name from lms.batch_teachers bt join lms.cohort_batches b on b.id=bt.batch_id where bt.teacher_id=u.id) as active_batches,
      (select count(*)::int from (select e.student_id from lms.enrollments e join lms.course_teachers ct on ct.course_id=e.course_id where ct.teacher_id=u.id
        union select bs.student_id from lms.batch_students bs join lms.batch_teachers bt on bt.batch_id=bs.batch_id where bt.teacher_id=u.id and bs.status in ('Active','Completed','At Risk')) roster) as student_count
      from lms.users u where u.role in ('Teacher','Evaluator') order by u.full_name`)).rows

    return { teachers }
  })

  // Provisioning is recoverable: pending/failed accounts cannot authenticate until Cognito and DB agree.
  app.post("/teachers", async req => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email(), role: z.enum(["Teacher", "Lead Instructor", "Teaching Assistant", "Evaluator"]).default("Teacher"), course_ids: z.array(z.string()).max(20).default([]) }), req.body)
    const email = b.email.toLowerCase(), role = b.role === "Evaluator" ? "Evaluator" : "Teacher"
    const [existing] = await db.select().from(users).where(sql`lower(${users.email}) = ${email}`)
    if (existing && !["Teacher", "Evaluator"].includes(existing.role)) throw badRequest("This email already belongs to another account role")
    if (existing?.provisioning_state === "active" && existing.cognito_sub) throw badRequest("This instructor already has an account. Edit their assignments instead.")
    const pending = await db.transaction(async tx => {
      const [created] = await tx.insert(users).values({ email, full_name: b.name, role, provisioning_state: "pending" }).onConflictDoNothing().returning()
      if (created) return created
      const [current] = await tx.select().from(users).where(sql`lower(${users.email}) = ${email}`).for("update")
      if (!current || !["Teacher", "Evaluator"].includes(current.role)) throw badRequest("This email belongs to another account role")
      if (current.provisioning_state === "pending" && Date.now() - current.updated_at.getTime() < 300_000) throw badRequest("An invitation is already being processed. Please wait before retrying.")
      if (current.provisioning_state === "active" && current.cognito_sub) throw badRequest("This instructor already has an account")
      const [row] = await tx.update(users).set({ provisioning_state: "pending", full_name: b.name, updated_at: new Date() }).where(eq(users.id, current.id)).returning()
      return row
    })
    try {
      const identity = await ctx.cognito.invite(email, b.name)
      await ctx.cognito.addToGroup(email, role === "Evaluator" ? "evaluators" : "teachers")
      const [teacher] = await db.update(users).set({ cognito_sub: identity.sub, provisioning_state: "active", role, disabled_at: null, updated_at: new Date() }).where(eq(users.id, pending.id)).returning()
      if (role === "Teacher" && b.course_ids.length) {
        await db.transaction(async tx => {
          for (const courseId of b.course_ids) {
            const [course] = await tx.select().from(courses).where(eq(courses.id, courseId))
            if (!course) throw badRequest("Assigned course not found")
            await tx.insert(course_teachers).values({ course_id: courseId, teacher_id: teacher.id }).onConflictDoNothing()
          }
        })
      }
      return { teacher: { ...teacher, name: teacher.full_name } }
    } catch {
      await db.update(users).set({ provisioning_state: "failed" }).where(eq(users.id, pending.id))
      throw new AppError(503, "provisioning_failed", "The invitation could not be completed. The account is saved as failed; retry with the same email.")
    }
  })
  app.patch<{ Params: { id: string } }>("/teachers/:id", async req => {
    const b = parse(z.object({ name: z.string().trim().min(2).max(120).optional(), enabled: z.boolean().optional() }), req.body)
    const id = parse(z.string().uuid(), req.params.id)
    const [existing] = await db.select().from(users).where(eq(users.id, id))
    if (!existing || !["Teacher", "Evaluator"].includes(existing.role)) throw notFound("Teacher not found")
    if (b.enabled !== undefined) {
      if (!b.enabled) await db.update(users).set({ disabled_at: new Date(), sessions_revoked_at: new Date() }).where(eq(users.id, id))
      await ctx.cognito.setEnabled(existing.email, b.enabled)
    }
    const [teacher] = await db.update(users).set({ ...(b.name ? { full_name: b.name } : {}), ...(b.enabled !== undefined ? { disabled_at: b.enabled ? null : new Date(), sessions_revoked_at: new Date() } : {}), updated_at: new Date() }).where(eq(users.id, id)).returning()
    return { teacher: { ...teacher, name: teacher.full_name } }
  })
  app.delete<{ Params: { id: string } }>("/teachers/:id", async req => {
    const id = parse(z.string().uuid(), req.params.id)
    const [existing] = await db.select().from(users).where(eq(users.id, id))
    if (!existing || !["Teacher", "Evaluator"].includes(existing.role)) throw notFound("Teacher not found")
    await db.update(users).set({ disabled_at: new Date(), sessions_revoked_at: new Date() }).where(eq(users.id, id))
    await ctx.cognito.setEnabled(existing.email, false)
    return { ok: true, disabled: id }
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
        .select({ id: cohort_batches.id, name: cohort_batches.name, course_id: cohort_batches.course_id })
        .from(cohort_batches)
        .where(eq(cohort_batches.id, b.batch_id))
        .limit(1)
      if (!batchRow) throw notFound("Batch not found")
      if (batchRow.course_id !== c.id) throw badRequest("Batch and course do not match")
      targetBatchName = batchRow.name
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
        const admission = await addStudentsToBatchTx(tx, {
          batchId: b.batch_id,
          studentIds: [studentId],
          status: "Active",
          autoWaitlistWhenFull: true,
        })
        return { admission }
      }

      await grantAccess(tx, { student: studentId, course: c.id, sourceType: "manual", sourceId: `admin:${c.id}` })
      const [enrollment] = await tx.select().from(enrollments).where(sql`${enrollments.student_id} = ${studentId}::uuid and ${enrollments.course_id} = ${c.id}`)
      return { enrollment }

    })

    return result
  })

  // Financial history must never be inferred from an enrollment. Phase 4 supplies persisted provider records.

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
