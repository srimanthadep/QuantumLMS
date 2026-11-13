import { desc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { invalidateUserCache } from "../../auth/users.js"
import type { AppContext } from "../../context.js"
import { audit_events, users } from "../../db/schema.js"
import { AppError, forbidden } from "../../errors.js"
import { authenticate } from "../../http.js"
import { invalidateCatalogCache } from "../student/courses.js"

export async function superAdminModule(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  await app.register(
    async (scope) => {
      // Platform governance is reserved for Super Admin.
      scope.addHook("preHandler", authenticate(ctx, ["Super Admin"]))

      scope.get("/health",async()=>{
        const started=performance.now();await db.execute(sql`select 1`);const databaseLatencyMs=performance.now()-started
        const counts=(await db.execute(sql`select
          (select count(*)::int from lms.processing_jobs where state='queued') as media_queued,
          (select count(*)::int from lms.processing_jobs where state='processing' and lease_until>now()) as media_processing,
          (select count(*)::int from lms.processing_jobs where state='failed') as media_failed,
          (select count(*)::int from lms.notification_outbox where delivered_at is null and skipped_at is null) as notifications_pending,
          (select count(*)::int from lms.notification_outbox where delivered_at is null and skipped_at is null and attempts>0) as notifications_retrying,
          (select count(*)::int from lms.realtime_consumers where heartbeat_at>now()-interval '30 seconds') as realtime_instances`)).rows[0]
        const t=ctx.telemetry,latencies=[...(t?.latencies??[])].sort((a,b)=>a-b)
        return {observedAt:new Date().toISOString(),scope:"This API process and shared database queues",uptimeSeconds:(Date.now()-(t?.startedAt??Date.now()))/1000,
          p95LatencyMs:latencies.length?latencies[Math.ceil(latencies.length*.95)-1]:null,sampleSize:latencies.length,requests:t?.requests??0,errors:t?.errors??0,
          poolClients:ctx.pool.totalCount,poolIdle:ctx.pool.idleCount,poolWaiting:ctx.pool.waitingCount,maxPoolClients:ctx.config.DATABASE_POOL_MAX,
          databaseLatencyMs,queues:counts,services:[{id:"api",name:"API process",status:"Responding"},{id:"database",name:"PostgreSQL",status:"Query succeeded"}],
          limitations:"Request latency covers the latest 1,000 completed requests on this process. Queue counts are shared. Provider uptime, AI usage and CDN health are not monitored here."}
      })
      scope.post("/flush-cache",async()=>{invalidateCatalogCache();invalidateUserCache();return {ok:true,clearedAt:new Date().toISOString(),message:"In-process catalog and identity caches cleared on this API instance."}})
      const unavailable=async()=>{throw new AppError(501,"not_available","This operation has no configured integration. No changes were made.")}
      scope.post("/snapshot",unavailable)
      scope.get("/tenants",async()=>({singleTenant:true,tenants:[]}))
      scope.post("/tenants",unavailable);scope.patch("/tenants/:id",unavailable);scope.delete("/tenants/:id",unavailable)

      // 5. RBAC Permission Matrix
      scope.get("/rbac", async () => {
        const policies = [
          ["courses", "Manage course curriculum", "Admin course APIs", ["Admin", "Super Admin"]],
          ["teaching", "Assigned teaching workspace", "Assigned courses, learners and questions", ["Teacher", "Admin", "Super Admin"]],
          ["evaluation", "Evaluate assigned submissions", "Evaluator assignments and grading locks apply", ["Evaluator"]],
          ["support", "Support desk", "Ticket administration", ["Support", "Admin", "Super Admin"]],
          ["learning", "Own learning records", "Enrollment and record ownership required", ["Student"]],
          ["platform", "Platform administration", "Audit trail and fixed permission policy", ["Super Admin"]],
        ] as const
        const rows = policies.map(([id, permission, description, roles]) => {
          const allowed: readonly string[] = roles
          return { id, permission, description, category: "Fixed policy", superAdmin: allowed.includes("Super Admin"),
            admin: allowed.includes("Admin"), teacher: allowed.includes("Teacher"), evaluator: allowed.includes("Evaluator"),
            support: allowed.includes("Support"), student: allowed.includes("Student") }
        })
        return {
          rbac: rows,
          matrix: rows,
        }
      })

      scope.patch("/rbac/:id", async () => {
        throw forbidden("Permissions are a fixed server policy and cannot be edited here.")
      })

      scope.get("/audit", async () => {
        const rows = await db.select({ event: audit_events, name: users.full_name, email: users.email })
          .from(audit_events).leftJoin(users, eq(users.id, audit_events.actor_id))
          .orderBy(desc(audit_events.created_at)).limit(200)
        const logs = rows.map(({ event, name, email }) => ({
          id: event.id, timestamp: event.created_at.toISOString(), actorName: name ?? (event.actor_id?"Deleted account":"System"),
          actorRole: event.actor_role, actorEmail: email ?? "", action: event.action, category: "Admin",
          target: event.target, ip: "", status: /^HTTP [45]/.test(event.outcome)?"Refused":"Success", details: event.outcome,
        }))
        return { logs }
      })

      scope.get("/ai",async()=>({available:false,totalTokensMonth:null,totalCostInr:null,models:[],message:"AI token usage and billing are not instrumented. Media transcription runs in the dedicated worker; its job states appear in Platform Health."}))
      scope.patch("/ai",unavailable)
      scope.get("/settings",async()=>({settings:{environment:ctx.config.NODE_ENV,poolerMaxClients:ctx.config.DATABASE_POOL_MAX,
        databaseTls:ctx.config.DATABASE_SSL,demoMode:ctx.config.DEMO_MODE,replayEnabled:ctx.config.REPLAY_ENABLED,zoomRecordingWebhook:ctx.config.ZOOM_RECORDING_WEBHOOK_ENABLED,
        notificationSweepSeconds:ctx.config.NOTIFICATION_SWEEP_SECONDS,realtimePollMs:ctx.config.REALTIME_POLL_MS},readOnly:true,message:"These settings are loaded from deployment configuration. Change them there and restart the service."}))
      scope.patch("/settings",unavailable)

    },
    { prefix: "/api/super-admin" },
  )
}
