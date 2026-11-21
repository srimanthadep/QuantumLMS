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
  // Everything about one learner in a single read: courses, batches, payments, recent activity.
  app.get<{ Params: { id: string } }>("/students/:id/360", async (req) => {
    const id = parse(z.uuid(), req.params.id)
    const who = await db.execute(sql`
      select u.id, u.full_name as name, u.email, u.avatar_url, u.created_at, u.disabled_at,
        coalesce(p.roll_number, '') as roll_number, coalesce(p.phone, '') as phone, coalesce(p.location, '') as location
      from lms.users u left join lms.profiles p on p.id = u.id
      where u.id = ${id}::uuid and u.role = 'Student'`)
    const student = who.rows[0] as { id: string; name: string; email: string; avatar_url: string | null; created_at: Date | string; disabled_at: Date | string | null; roll_number: string; phone: string; location: string } | undefined
    if (!student) throw notFound("Student not found")
    const [courseRes, batchRes, payRes, timelineRes, activityRes] = await Promise.all([
      db.execute(sql`
        select c.id, c.title, c.category, e.enrolled_at,
          (select count(*)::int from lms.lessons l where l.course_id = e.course_id and l.archived_at is null) as total_lessons,
          (select count(*)::int from lms.lesson_progress lp join lms.lessons l on l.id = lp.lesson_id and l.archived_at is null where lp.student_id = e.student_id and lp.course_id = e.course_id) as completed_lessons,
          (select max(lp.completed_at) from lms.lesson_progress lp where lp.student_id = e.student_id and lp.course_id = e.course_id) as last_activity,
          exists(select 1 from lms.completion_credentials cc where cc.student_id = e.student_id and cc.course_id = e.course_id and cc.revoked_at is null) as certified,
          exists(select 1 from lms.orders o join lms.payments pay on pay.order_id = o.id where o.student_id = e.student_id and o.course_id = e.course_id and o.batch_id is null and pay.captured_at is not null) as paid
        from lms.enrollments e join lms.courses c on c.id = e.course_id
        where e.student_id = ${id}::uuid order by e.enrolled_at desc`),
      db.execute(sql`
        select b.id, b.name, b.instructor, b.lifecycle, bs.status, bs.enrolled_at, b.start_date, b.end_date,
          (select count(*)::int from lms.live_sessions ls where ls.batch_id = b.id and ls.status = 'Ended' and ls.starts_at >= bs.enrolled_at) as sessions_held,
          (select count(*)::int from lms.live_sessions ls join lms.session_attendance sa on sa.session_id = ls.id and sa.student_id = bs.student_id where ls.batch_id = b.id and ls.status = 'Ended' and ls.starts_at >= bs.enrolled_at) as sessions_attended
        from lms.batch_students bs join lms.cohort_batches b on b.id = bs.batch_id
        where bs.student_id = ${id}::uuid order by bs.enrolled_at desc`),
      db.execute(sql`
        select o.id, o.offer_title as title, o.amount, o.status, o.created_at, o.batch_id is not null as is_batch,
          pay.captured_at, coalesce(pay.refunded_amount, 0) as refunded, pay.method
        from lms.orders o left join lms.payments pay on pay.order_id = o.id and pay.captured_at is not null
        where o.student_id = ${id}::uuid and o.status <> 'creating' order by o.created_at desc limit 20`),
      db.execute(sql`
        select * from (
          select 'lesson' as kind, l.title, c.title as detail, lp.completed_at as at from lms.lesson_progress lp join lms.lessons l on l.id = lp.lesson_id join lms.courses c on c.id = lp.course_id where lp.student_id = ${id}::uuid
          union all select 'session', ls.title, b.name, sa.joined_at from lms.session_attendance sa join lms.live_sessions ls on ls.id = sa.session_id join lms.cohort_batches b on b.id = ls.batch_id where sa.student_id = ${id}::uuid
          union all select 'certificate', cc.title, cc.course_title, cc.issued_at from lms.completion_credentials cc where cc.student_id = ${id}::uuid and cc.revoked_at is null
          union all select 'payment', o.offer_title, null, pay.captured_at from lms.orders o join lms.payments pay on pay.order_id = o.id where o.student_id = ${id}::uuid and pay.captured_at is not null
          union all select 'enrolled', c.title, null, e.enrolled_at from lms.enrollments e join lms.courses c on c.id = e.course_id where e.student_id = ${id}::uuid
        ) t order by at desc limit 15`),
      db.execute(sql`select to_char(day, 'YYYY-MM-DD') as day, minutes, lessons from lms.study_activity where student_id = ${id}::uuid and day >= current_date - 13`),
    ])
    const iso = (v: Date | string | null | undefined) => (v ? new Date(v).toISOString() : null)
    const courseRows = (courseRes.rows as { id: string; title: string; category: string; enrolled_at: Date | string; total_lessons: number; completed_lessons: number; last_activity: Date | string | null; certified: boolean; paid: boolean }[]).map((r) => {
      const total = Number(r.total_lessons), done = Math.min(Number(r.completed_lessons), total)
      return { id: r.id, title: r.title, category: r.category, enrolled_at: iso(r.enrolled_at), last_activity: iso(r.last_activity), completed_lessons: done, total_lessons: total, progress: total > 0 ? Math.round((done / total) * 100) : 0, certified: Boolean(r.certified), source: r.paid ? "paid" : "free_or_added" }
    })
    const batchRows = (batchRes.rows as { id: string; name: string; instructor: string; lifecycle: string; status: string; enrolled_at: Date | string; start_date: string; end_date: string; sessions_held: number; sessions_attended: number }[]).map((r) => {
      const held = Number(r.sessions_held), attended = Math.min(Number(r.sessions_attended), held)
      return { id: r.id, name: r.name, instructor: r.instructor, lifecycle: r.lifecycle, status: r.status, enrolled_at: iso(r.enrolled_at), start_date: r.start_date, end_date: r.end_date, sessions_held: held, sessions_attended: attended, attendance: held > 0 ? Math.round((attended / held) * 100) : null }
    })
    const payments = (payRes.rows as { id: string; title: string; amount: number; status: string; created_at: Date | string; is_batch: boolean; captured_at: Date | string | null; refunded: number; method: string | null }[]).map((r) => ({
      id: r.id, title: r.title, kind: r.is_batch ? "batch" : "course", amount: Number(r.amount) / 100, refunded: Number(r.refunded) / 100, status: r.captured_at ? (Number(r.refunded) > 0 ? "refunded" : "paid") : r.status, method: r.method, at: iso(r.captured_at ?? r.created_at),
    }))
    const byDay = new Map((activityRes.rows as { day: string; minutes: number; lessons: number }[]).map((r) => [r.day, r]))
    const activity: { day: string; minutes: number; lessons: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10), hit = byDay.get(key)
      activity.push({ day: key, minutes: Number(hit?.minutes ?? 0), lessons: Number(hit?.lessons ?? 0) })
    }
    const held = batchRows.reduce((n, b) => n + b.sessions_held, 0), attended = batchRows.reduce((n, b) => n + b.sessions_attended, 0)
    return {
      student: { id: student.id, name: student.name, email: student.email, avatar_url: student.avatar_url, roll_number: student.roll_number, phone: student.phone, location: student.location, joined_at: iso(student.created_at), disabled: Boolean(student.disabled_at) },
      totals: {
        courses: courseRows.length, batches: batchRows.length,
        lessons_completed: courseRows.reduce((n, c) => n + c.completed_lessons, 0),
        certificates: courseRows.filter((c) => c.certified).length,
        attendance: held > 0 ? Math.round((attended / held) * 100) : null,
        paid: payments.filter((p) => p.status === "paid" || p.status === "refunded").reduce((n, p) => n + p.amount - p.refunded, 0),
      },
      courses: courseRows, batches: batchRows, payments, activity,
      timeline: (timelineRes.rows as { kind: string; title: string; detail: string | null; at: Date | string }[]).map((r) => ({ kind: r.kind, title: r.title, detail: r.detail, at: iso(r.at) })),
    }
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
        course_id: z.string().min(1).optional(),
        batch_id: z.string().trim().min(1).optional(),
      }).refine(v => v.course_id || v.batch_id, "Choose a course or a batch"),
      req.body,
    )

    // A course and a batch are separate products, so either (or both) can be given and neither has to match the other.
    const [c] = b.course_id ? await db.select().from(courses).where(eq(courses.id, b.course_id)).limit(1) : []
    if (b.course_id && !c) throw notFound("Course not found.")

    let targetBatchName: string | undefined
    if (b.batch_id) {
      const [batchRow] = await db
        .select({ id: cohort_batches.id, name: cohort_batches.name, course_id: cohort_batches.course_id })
        .from(cohort_batches)
        .where(eq(cohort_batches.id, b.batch_id))
        .limit(1)
      if (!batchRow) throw notFound("Batch not found")
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

      let admission: Awaited<ReturnType<typeof addStudentsToBatchTx>> | undefined
      if (b.batch_id && targetBatchName) {
        admission = await addStudentsToBatchTx(tx, {
          batchId: b.batch_id,
          studentIds: [studentId],
          status: "Active",
          autoWaitlistWhenFull: true,
        })
      }
      if (!c) return { admission }

      await grantAccess(tx, { student: studentId, course: c.id, sourceType: "manual", sourceId: `admin:${c.id}` })
      const [enrollment] = await tx.select().from(enrollments).where(sql`${enrollments.student_id} = ${studentId}::uuid and ${enrollments.course_id} = ${c.id}`)
      return admission ? { admission, enrollment } : { enrollment }

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
