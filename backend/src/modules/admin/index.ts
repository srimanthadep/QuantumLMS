import type { FastifyInstance } from "fastify"
import type { AppContext } from "../../context.js"
import { authenticate } from "../../http.js"
import { adminCoursesRoutes } from "./courses.js"

export async function adminModule(app: FastifyInstance, ctx: AppContext) {
  await app.register(
    async (scope) => {
      // Require Admin or Super Admin role for all /api/admin endpoints
      scope.addHook("preHandler", authenticate(ctx, ["Admin", "Super Admin"]))
      await adminCoursesRoutes(scope, ctx)
    },
    { prefix: "/api/admin" }
  )
}

