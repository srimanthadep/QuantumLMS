import { course_offers } from "../../db/schema.js"
import { enrollFree } from "../../learning/offers.js"
import { and, asc, eq, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { invalidateUserCache, type AuthUser } from "../../auth/users.js"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { courses, enrollments, profiles, roll_number_seq, upload_intents } from "../../db/schema.js"
import { openCertificates, seedContent, seedStudentDemo } from "../../db/seed/index.js"
import { DEMO_ACCOUNTS } from "../../demo-accounts.js"
import { badRequest, forbidden } from "../../errors.js"
import { authenticate, me, parse } from "../../http.js"
import { beginUpload, verifyUpload } from "../../storage/uploads.js"
import { BUCKETS, objectKey, keyOwner, type Bucket } from "../../storage/storage.js"
import { campusRoutes, publicCertificateRoutes } from "./campus.js"
import { courseRoutes, invalidateCatalogCache } from "./courses.js"
import { evaluationRoutes } from "./evaluation.js"
import { notify } from "./notify.js"
import { quizRoutes } from "./quizzes.js"
import { socialRoutes } from "./social.js"
import { supportRoutes } from "./support.js"

const onboardedStudents = new Set<string>()

const isDemoStudent = (ctx: AppContext, u: AuthUser) =>
  ctx.config.DEMO_MODE && u.is_demo && u.email.toLowerCase() === ctx.config.DEMO_STUDENT_EMAIL.toLowerCase()

/** A new student: profile with a roll number, the starter courses (if any) and a welcome note. */
export async function onboardStudent(tx: Tx, user: AuthUser, ctx: Pick<AppContext, "config">) {
  const [{ n }] = (await tx.execute(sql`select nextval(${sql.raw(`'lms.${roll_number_seq.seqName}'`)}) as n`)).rows as { n: string }[]
  const [created] = await tx
    .insert(profiles)
    .values({ id: user.id, roll_number: `QAI-${new Date().getFullYear()}-${String(n).padStart(3, "0")}` })
    .onConflictDoNothing()
    .returning()
  if (!created) return
  const starters = await tx.select({ id: courses.id, offer: course_offers.id }).from(courses).innerJoin(course_offers, eq(course_offers.course_id, courses.id)).where(and(eq(courses.is_starter, true), eq(course_offers.price, 0), eq(course_offers.mode, "self_paced"), eq(course_offers.status, "Published"), eq(courses.status, "Published")))
  if (starters.length) {
    for (const starter of starters) await enrollFree(tx, user.id, { offerId: starter.offer })
    await openCertificates(tx, user.id, starters.map((c) => c.id))
  }
  await notify(tx, user.id, "system", "Welcome to Quantum School", "Your learning account is ready.", "courses")
}

export async function studentModule(app: FastifyInstance, ctx: AppContext) {
  await publicCertificateRoutes(app, ctx)
  await app.register(async (scope) => {
    scope.addHook("preHandler", authenticate(ctx, ["Student"]))
    // Accounts created before they were students (or moved into the group later) get their profile on first use.
    scope.addHook("preHandler", async (req) => {
      const u = me(req)
      if (onboardedStudents.has(u.id)) return
      const has = await ctx.db.query.profiles.findFirst({ where: eq(profiles.id, u.id), columns: { id: true } })
      if (!has) await ctx.db.transaction((tx) => onboardStudent(tx, u, ctx))
      onboardedStudents.add(u.id)
    })

    await courseRoutes(scope, ctx)
    await evaluationRoutes(scope, ctx)
    await quizRoutes(scope, ctx)
    await campusRoutes(scope, ctx)
    await socialRoutes(scope, ctx)
    await supportRoutes(scope, ctx)

    // Upload targets: the browser PUTs the file to the returned URL, then sends the key with the form.
    scope.post("/api/student/uploads", async (req) => {
      const s = me(req)
      const b = parse(
        z.object({
          bucket: z.enum(["submissions", "ticket-attachments", "avatars"]),
          folder: z.string().max(80).default("files"),
          filename: z.string().min(1).max(400),
          content_type: z.string().max(200).default("application/octet-stream"),
          size: z.number().int().min(1),
        }),
        req.body,
      )
      const rule = BUCKETS[b.bucket]
      if (b.size > rule.maxBytes) throw badRequest(`Files here can be up to ${Math.round(rule.maxBytes / 1024 / 1024)} MB.`, "too_large")
      if (rule.types && !(rule.types as readonly string[]).includes(b.content_type)) throw badRequest("Use a PNG, JPG, WebP or GIF image.")
      return beginUpload(ctx, s.id, { key: objectKey(b.bucket, s.id, b.folder, b.filename), bucket: b.bucket, type: b.content_type, size: b.size })
    })

    scope.post("/api/student/uploads/finalize", async (req) => {
      const b = parse(z.object({ key: z.string().max(500), bucket: z.enum(["submissions", "ticket-attachments", "avatars"]) }), req.body)
      return { key: await verifyUpload(ctx, me(req).id, b.key, b.bucket) }
    })

    // A short-lived link to one of the student's own files.
    scope.get<{ Querystring: { key?: string; name?: string } }>("/api/student/files", async (req) => {
      const s = me(req)
      const key = String(req.query.key ?? "")
      const o = keyOwner(key)
      if (!o || o.owner !== s.id || !(o.bucket in BUCKETS)) throw forbidden("That file isn't yours.")
      if (!(await ctx.storage.head(key))) throw badRequest("The file is no longer available.", "missing_file")
      const intent = await ctx.db.query.upload_intents.findFirst({ where: eq(upload_intents.key, key) })
      if (intent && intent.state !== "verified") throw forbidden("This upload is not ready for use.")
      return { url: await ctx.storage.createDownloadUrl(key, { filename: req.query.name?.slice(0, 200) }) }
    })

    // Restores the shared demo student and moves the demo calendar to today. Other students can't reset anything.
    scope.post("/api/student/demo/reset", async (req, reply) => {
      const s = me(req)
      if (!isDemoStudent(ctx, s)) throw forbidden("Only the shared demo account can be reset.")
      const now = new Date()
      await ctx.db.transaction(async (tx) => {
        await seedContent(tx, now, ctx.config.CAMPUS_TZ)
        await seedStudentDemo(tx, s.id, now, ctx.config.CAMPUS_TZ)
      })
      invalidateCatalogCache()
      invalidateUserCache(s.id)
      // Files the demo uploaded aren't referenced any more.
      for (const bucket of Object.keys(BUCKETS)) {
        const keys = await ctx.storage.list(`${bucket}/${s.id}/`).catch(() => [])
        if (keys.length) await ctx.storage.remove(keys).catch((err) => req.log.warn({ err }, "demo file cleanup failed"))
      }
      // Its password is public: put it back, and drop any authenticator someone added.
      const demo = DEMO_ACCOUNTS.find((a) => a.role === "Student")
      if (demo) {
        await ctx.cognito.setPassword(s.username, demo.password).catch((err) => req.log.warn({ err }, "demo password reset failed"))
        await ctx.cognito.disableMfa(s.username).catch((err) => req.log.warn({ err }, "demo MFA reset failed"))
      }
      return reply.code(204).send()
    })
  })
}
