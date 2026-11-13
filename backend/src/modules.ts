import { liveModule } from "./live/routes.js"
import { scheduleSweep } from "./live/schedules.js"
import { paymentModule } from "./payments/routes.js"
import { startPaymentSweep } from "./payments/jobs.js"
import type { FastifyBaseLogger, FastifyInstance } from "fastify"
import type { AppContext } from "./context.js"
import { adminModule } from "./modules/admin/index.js"
import { evaluatorModule } from "./modules/evaluator/index.js"
import { studentModule } from "./modules/student/index.js"
import { supportModule } from "./modules/support/index.js"
import { teacherModule } from "./modules/teacher/index.js"
import { superAdminModule } from "./modules/super-admin/index.js"
import { startQuizSweep } from "./modules/student/quizzes.js"

/** Route modules registered by the server (and by tests through buildApp). */
export const modules: ((app: FastifyInstance, ctx: AppContext) => Promise<void>)[] = [
  liveModule,
  paymentModule,
  studentModule,
  evaluatorModule,
  supportModule,
  adminModule,
  teacherModule,
  superAdminModule,
]

/** Background jobs. Returns a function that stops them. */
export function startJobs(ctx: AppContext, log: FastifyBaseLogger): () => void {
  const stops = [startQuizSweep(ctx, log), startPaymentSweep(ctx, log)]
  if (ctx.config.SCHEDULE_SWEEP_SECONDS) {
    let running = false
    const timer = setInterval(async () => {
      if (running) return
      running = true
      try { await scheduleSweep(ctx) } catch { log.error("Schedule generation failed; will retry") } finally { running = false }
    }, ctx.config.SCHEDULE_SWEEP_SECONDS*1000)
    timer.unref(); stops.push(() => clearInterval(timer))
  }
  return () => stops.forEach((stop) => stop())
}
