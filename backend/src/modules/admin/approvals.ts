import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import { me, parse } from "../../http.js"
import { APPROVAL_STATES, approveRequest, listRequests, pendingCount, rejectRequest } from "../../approvals/service.js"

const decision = z.object({ note: z.string().max(1000).optional() })

/** Approval queue for administrators (registered behind the Admin / Super Admin preHandler). */
export async function adminApprovalRoutes(app: FastifyInstance, ctx: AppContext) {
  app.get("/approvals", async (req) => {
    const q = parse(z.object({ state: z.enum([...APPROVAL_STATES, "all"]).default("Pending"), limit: z.coerce.number().int().min(1).max(500).default(200) }), req.query)
    return listRequests(ctx, q.state, q.limit)
  })
  app.get("/approvals/count", async () => ({ pending: await pendingCount(ctx) }))
  app.post<{ Params: { id: string } }>("/approvals/:id/approve", async (req) => {
    const b = parse(decision, req.body ?? {})
    return approveRequest(ctx, me(req), parse(z.string().uuid(),req.params.id), b.note)
  })
  app.post<{ Params: { id: string } }>("/approvals/:id/reject", async (req) => {
    const b = parse(decision, req.body ?? {})
    return rejectRequest(ctx, me(req), parse(z.string().uuid(),req.params.id), b.note)
  })
}
