import type { FastifyBaseLogger, FastifyInstance } from "fastify"
import type { AppContext } from "./context.js"

/** Route modules registered by the server (and by tests through buildApp). */
export const modules: ((app: FastifyInstance, ctx: AppContext) => Promise<void>)[] = []

/** Background jobs. Returns a function that stops them. */
export function startJobs(_ctx: AppContext, _log: FastifyBaseLogger): () => void {
  return () => undefined
}
