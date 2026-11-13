import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../context.js"
import { recording_provider_events } from "../db/schema.js"
import { badRequest, unauthorized } from "../errors.js"
import { parse } from "../http.js"

/** Optional signed notices only. Zoom/Meet media still requires explicit upload and review. */
export async function zoomRecordingWebhook(app: FastifyInstance, ctx: AppContext) {
  if (!ctx.config.ZOOM_RECORDING_WEBHOOK_ENABLED) return
  await app.register(async scope => {
    scope.removeContentTypeParser("application/json")
    scope.addContentTypeParser("application/json",{ parseAs:"buffer" },(_req,body,done)=>done(null,body))
    scope.post("/api/webhooks/zoom/recordings",{ bodyLimit:256*1024 },async req => {
      const secret=ctx.config.ZOOM_RECORDING_WEBHOOK_SECRET, stamp=req.headers["x-zm-request-timestamp"], signature=req.headers["x-zm-signature"]
      if (!secret || typeof stamp!=="string" || !/^\d{10}$/.test(stamp) || Math.abs(Date.now()/1000-Number(stamp))>300 || typeof signature!=="string" || !/^v0=[a-f0-9]{64}$/.test(signature) || !Buffer.isBuffer(req.body)) throw unauthorized("Invalid webhook signature")
      const expected=`v0=${createHmac("sha256",secret).update(`v0:${stamp}:`).update(req.body).digest("hex")}`
      if (!timingSafeEqual(Buffer.from(expected),Buffer.from(signature))) throw unauthorized("Invalid webhook signature")
      let body: unknown
      try { body=JSON.parse(req.body.toString("utf8")) } catch { throw badRequest("Invalid JSON") }
      const envelope=parse(z.object({ event:z.string(),payload:z.unknown() }),body)
      if(envelope.event==="endpoint.url_validation") { const value=parse(z.object({ plainToken:z.string().min(1).max(1000) }),envelope.payload); return { plainToken:value.plainToken,encryptedToken:createHmac("sha256",secret).update(value.plainToken).digest("hex") } }
      if(envelope.event!=="recording.completed") return { accepted:true,ignored:true }
      const payload=parse(z.object({ account_id:z.string().min(1).max(200),object:z.object({ id:z.union([z.string(),z.number()]),uuid:z.string().min(1).max(200),topic:z.string().max(1000).optional(),recording_files:z.array(z.object({ id:z.string().min(1).max(200),file_type:z.string(),status:z.string().optional(),recording_start:z.string().datetime({ offset:true }).optional() })).max(100) }) }),envelope.payload)
      const files=payload.object.recording_files.filter(f=>f.file_type.toUpperCase()==="MP4" && (!f.status || f.status==="completed"))
      if(files.length) await ctx.db.insert(recording_provider_events).values(files.map(f=>({ id:randomUUID(),provider:"zoom",provider_key:createHash("sha256").update(JSON.stringify([payload.account_id,payload.object.uuid,f.id])).digest("hex"),body_hash:createHash("sha256").update(req.body as Buffer).digest("hex"),meeting_id:String(payload.object.id),meeting_uuid:payload.object.uuid,file_id:f.id,title:(payload.object.topic ?? "Zoom recording").slice(0,200),recording_start:f.recording_start?new Date(f.recording_start):null }))).onConflictDoNothing({ target:recording_provider_events.provider_key })
      return { accepted:true,note:"Recording notice saved. An administrator must match the session and explicitly upload the recording for review." }
    })
  })
}
