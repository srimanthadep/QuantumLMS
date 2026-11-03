import type { FastifyBaseLogger, FastifyInstance } from "fastify"
import type { AppContext } from "./context.js"
import { adminModule } from "./modules/admin/index.js"
import { evaluatorModule } from "./modules/evaluator/index.js"
import { studentModule } from "./modules/student/index.js"
import { supportModule } from "./modules/support/index.js"
import { startQuizSweep } from "./modules/student/quizzes.js"

/** Route modules registered by the server (and by tests through buildApp). */
export const modules: ((app: FastifyInstance, ctx: AppContext) => Promise<void>)[] = [studentModule, evaluatorModule, supportModule, adminModule]

/** Background jobs. Returns a function that stops them. */
export function startJobs(ctx: AppContext, log: FastifyBaseLogger): () => void {
  const stops = [startQuizSweep(ctx, log)]
  return () => stops.forEach((stop) => stop())
}
