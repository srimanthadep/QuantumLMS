import { eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { invalidateUserCache, type AuthUser } from "../../auth/users.js"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { evaluator_assignments, evaluator_profiles, rubrics, users } from "../../db/schema.js"
import { seedContent } from "../../db/seed/index.js"
import { seedEvaluatorDemo } from "../../db/seed/evaluator.js"
import { DEMO_ACCOUNTS } from "../../demo-accounts.js"
import { forbidden } from "../../errors.js"
import { authenticate, me, parse } from "../../http.js"
import type { Storage } from "../../storage/storage.js"
import { invalidateCatalogCache } from "../student/courses.js"
import { queueRoutes } from "./queue.js"
import { reevaluationRoutes } from "./reevaluations.js"
import { reportRoutes } from "./reports.js"

const onboardedEvaluators = new Set<string>()

export const isDemoEvaluator = (ctx: Pick<AppContext, "config">, u: AuthUser) =>
  ctx.config.DEMO_MODE && u.is_demo && u.email.toLowerCase() === ctx.config.DEMO_EVALUATOR_EMAIL.toLowerCase()

/** Settings the portal reads; stored values are merged over these. */
export const PREFERENCE_DEFAULTS = { queue_sort: "oldest", auto_advance: true, show_levels: true, daily_goal: 8 }
const preferencesInput = z
  .object({
    queue_sort: z.enum(["oldest", "newest", "due", "student"]),
    auto_advance: z.boolean(),
    show_levels: z.boolean(),
    daily_goal: z.number().int().min(1, "Set a daily goal of at least 1.").max(50, "Keep the daily goal at 50 or fewer."),
  })
  .partial()
  .strict()

/**
 * A new evaluator: a profile, and every assignment that has a rubric to mark. (Admins will assign work per
 * evaluator once that screen exists.) The shared demo evaluator gets the demo marking history instead.
 */
export async function onboardEvaluator(tx: Tx, user: AuthUser, ctx: Pick<AppContext, "config"> & { storage?: Storage }) {
  if (isDemoEvaluator(ctx, user)) {
    await seedEvaluatorDemo(tx, { evaluatorId: user.id, anchor: new Date(), tz: ctx.config.CAMPUS_TZ, storage: ctx.storage, demoStudentEmail: ctx.config.DEMO_STUDENT_EMAIL })
    return
  }
  await tx.insert(evaluator_profiles).values({ id: user.id }).onConflictDoNothing()
  const marked = await tx.select({ id: rubrics.assignment_id }).from(rubrics)
  if (marked.length) await tx.insert(evaluator_assignments).values(marked.map((m) => ({ evaluator_id: user.id, assignment_id: m.id }))).onConflictDoNothing()
}

async function profileView(db: Tx, user: AuthUser) {
  const [[row], statsRes, assignedRes] = await Promise.all([
    db.select({ u: users, p: evaluator_profiles }).from(evaluator_profiles).innerJoin(users, eq(users.id, evaluator_profiles.id)).where(eq(evaluator_profiles.id, user.id)).limit(1),
    db.execute(sql`
      select count(*) filter (where status in ('evaluated', 'released'))::int as finished,
             count(*) filter (where status = 'released')::int as released
      from lms.evaluations where evaluator_id = ${user.id}::uuid`),
    db.execute(sql`
      select a.id, a.title, c.code as course_code from lms.evaluator_assignments ea
      join lms.assignments a on a.id = ea.assignment_id join lms.courses c on c.id = a.course_id
      where ea.evaluator_id = ${user.id}::uuid order by a.due_at`),
  ])
  const stats = statsRes.rows[0] as { finished: number; released: number }
  const assigned = assignedRes.rows as { id: string; title: string; course_code: string }[]
  return {
    id: row.u.id,
    email: row.u.email,
    full_name: row.u.full_name,
    avatar_url: row.u.avatar_url,
    is_demo: row.u.is_demo,
    title: row.p.title,
    department: row.p.department,
    specializations: row.p.specializations,
    preferences: { ...PREFERENCE_DEFAULTS, ...(row.p.preferences as object) },
    finished_total: stats?.finished ?? 0,
    released_total: stats?.released ?? 0,
    assigned,
  }
}

export async function evaluatorModule(app: FastifyInstance, ctx: AppContext) {
  await app.register(async (scope) => {
    scope.addHook("preHandler", authenticate(ctx, ["Evaluator"]))
    // Accounts that joined the evaluators group after their first sign-in get their profile on first use.
    scope.addHook("preHandler", async (req) => {
      const u = me(req)
      if (onboardedEvaluators.has(u.id)) return
      const has = await ctx.db.query.evaluator_profiles.findFirst({ where: eq(evaluator_profiles.id, u.id), columns: { id: true } })
      if (!has) await ctx.db.transaction((tx) => onboardEvaluator(tx, u, ctx))
      onboardedEvaluators.add(u.id)
    })

    await queueRoutes(scope, ctx)
    await reevaluationRoutes(scope, ctx)
    await reportRoutes(scope, ctx)

    scope.get("/api/evaluator/profile", async (req) => profileView(ctx.db, me(req)))

    scope.patch("/api/evaluator/profile", async (req) => {
      const u = me(req)
      const b = parse(
        z
          .object({
            full_name: z.string().trim().min(2, "Enter your full name.").max(120),
            title: z.string().trim().min(1, "Enter a title.").max(120),
            department: z.string().trim().max(160),
            specializations: z.array(z.string().trim().min(1).max(60)).max(12, "Add up to 12 specialisations."),
            preferences: preferencesInput,
          })
          .partial()
          .strict(),
        req.body,
      )
      await ctx.db.transaction(async (tx) => {
        const now = new Date()
        if (b.full_name !== undefined) await tx.update(users).set({ full_name: b.full_name, updated_at: now }).where(eq(users.id, u.id))
        const [p] = await tx.select().from(evaluator_profiles).where(eq(evaluator_profiles.id, u.id)).limit(1)
        await tx
          .update(evaluator_profiles)
          .set({
            ...(b.title !== undefined ? { title: b.title } : {}),
            ...(b.department !== undefined ? { department: b.department } : {}),
            ...(b.specializations !== undefined ? { specializations: [...new Set(b.specializations)] } : {}),
            ...(b.preferences ? { preferences: { ...(p?.preferences as object), ...b.preferences } } : {}),
            updated_at: now,
          })
          .where(eq(evaluator_profiles.id, u.id))
      })
      if (b.full_name !== undefined) invalidateUserCache(u.id)
      return profileView(ctx.db, u)
    })

    // Restores the demo marking history (learners, submissions, evaluations, requests) and moves it to today.
    scope.post("/api/evaluator/demo/reset", async (req, reply) => {
      const u = me(req)
      if (!isDemoEvaluator(ctx, u)) throw forbidden("Only the shared demo account can be reset.")
      const now = new Date()
      await ctx.db.transaction(async (tx) => {
        await seedContent(tx, now, ctx.config.CAMPUS_TZ)
        await seedEvaluatorDemo(tx, { evaluatorId: u.id, anchor: now, tz: ctx.config.CAMPUS_TZ, storage: ctx.storage, demoStudentEmail: ctx.config.DEMO_STUDENT_EMAIL })
      })
      invalidateCatalogCache()
      invalidateUserCache(u.id)
      const demo = DEMO_ACCOUNTS.find((a) => a.role === "Evaluator")
      if (demo) {
        await ctx.cognito.setPassword(u.username, demo.password).catch((err) => req.log.warn({ err }, "demo password reset failed"))
        await ctx.cognito.disableMfa(u.username).catch((err) => req.log.warn({ err }, "demo MFA reset failed"))
      }
      return reply.code(204).send()
    })
  })
}
