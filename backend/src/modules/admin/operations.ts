import { invalidateUserCache } from "../../auth/users.js"
import { app_state, audit_events } from "../../db/schema.js"
import { grantAccess } from "../../learning/entitlements.js"
import { and, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import {
  cohort_batches,
  courses,
  course_teachers,
  enrollments,
  users,
} from "../../db/schema.js"
import { AppError, badRequest, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
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
        select u.id,u.full_name as name,u.email,u.avatar_url,u.created_at,
          case when u.disabled_at is null then 'Active' else 'Paused' end as status,
          (select string_agg(distinct c.title,', ' order by c.title) from lms.entitlement_grants g join lms.courses c on c.id=g.course_id where g.student_id=u.id and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())) as course_title,
          (select string_agg(distinct b.name,', ' order by b.name) from lms.batch_registrations r join lms.cohort_batches b on b.id=r.batch_id where r.student_id=u.id and r.state in ('confirmed','paused')) as batch_name,
          (select count(*)::int from lms.session_attendance where student_id=u.id) as join_clicks
        from lms.users u where u.role='Student' order by u.full_name
      `)
    ).rows

    return { students }
  })

  // Account edits do not silently transfer a learner or alter course completion.
  app.patch<{Params:{id:string}}>("/students/:id",async req=>{
    const id=parse(z.uuid(),req.params.id),b=parse(z.object({name:z.string().trim().min(1).max(120)}).strict(),req.body)
    const [row]=await db.update(users).set({full_name:b.name,updated_at:new Date()}).where(and(eq(users.id,id),eq(users.role,"Student"))).returning()
    if(!row)throw notFound("Student not found");invalidateUserCache(id);return {ok:true}
  })
  app.delete<{Params:{id:string}}>("/students/:id",async req=>{
    const id=parse(z.uuid(),req.params.id)
    return db.transaction(async tx=>{const [row]=await tx.update(users).set({disabled_at:new Date(),updated_at:new Date()}).where(and(eq(users.id,id),eq(users.role,"Student"))).returning()
      if(!row)throw notFound("Student not found");await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"student.disabled",target:id,outcome:"History retained"});invalidateUserCache(id);return {ok:true,disabled:id}})
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

  const defaults={name:"Quantum School of AI",tagline:"",domain:"",supportEmail:"",timezone:ctx.config.CAMPUS_TZ,currency:"INR"}
  app.get("/settings",async()=>{const [row]=await db.select().from(app_state).where(eq(app_state.key,"academy_profile"));return {settings:{...defaults,...row?.value as object}}})
  app.patch("/settings",async req=>{
    const b=parse(z.object({name:z.string().trim().min(1).max(160).optional(),tagline:z.string().trim().max(300).optional(),domain:z.string().trim().max(254).optional(),supportEmail:z.union([z.email(),z.literal("")]).optional()}).strict(),req.body)
    return db.transaction(async tx=>{
      await tx.insert(app_state).values({key:"academy_profile",value:defaults}).onConflictDoNothing()
      const [row]=await tx.select().from(app_state).where(eq(app_state.key,"academy_profile")).for("update")
      const settings={...defaults,...row.value as object,...b}
      await tx.update(app_state).set({value:settings,updated_at:new Date()}).where(eq(app_state.key,"academy_profile"))
      await tx.insert(audit_events).values({actor_id:me(req).id,actor_role:me(req).role,action:"academy.profile-updated",target:"academy_profile",outcome:"success"})
      return {settings}
    })
  })
}
