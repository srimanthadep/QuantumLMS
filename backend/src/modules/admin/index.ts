import { paymentAdminRoutes } from "../../payments/routes.js"
import { learningAdminRoutes } from "../../learning/routes.js"
import { mediaRoutes } from "../../media/routes.js"
import type { FastifyInstance } from "fastify"
import type { AppContext } from "../../context.js"
import { authenticate } from "../../http.js"
import { adminAlumniRoutes } from "./alumni.js"
import { adminBatchRoutes } from "./batches.js"
import { adminCoursesRoutes } from "./courses.js"
import { adminOperationsRoutes } from "./operations.js"

export async function adminModule(app: FastifyInstance, ctx: AppContext) {
  await app.register(
    async (scope) => {
      // Require Admin or Super Admin role for all /api/admin endpoints
      scope.addHook("preHandler", authenticate(ctx, ["Admin", "Super Admin"]))
      await adminCoursesRoutes(scope, ctx)
      await mediaRoutes(scope, ctx)
      await learningAdminRoutes(scope, ctx)
      await adminBatchRoutes(scope, ctx)
      await adminOperationsRoutes(scope, ctx)
      await paymentAdminRoutes(scope, ctx)
      await adminAlumniRoutes(scope, ctx)
    },
    { prefix: "/api/admin" }
  )
}

