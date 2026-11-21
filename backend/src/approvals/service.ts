import { and, eq, sql } from "drizzle-orm"
import type { AppContext } from "../context.js"
import type { AuthUser } from "../auth/users.js"
import { isAdmin } from "../auth/access.js"
import { approval_requests, audit_events, recordings } from "../db/schema.js"
import { conflict, forbidden, notFound } from "../errors.js"
import { lockBatch } from "../learning/admission.js"
import { batchFor, sessionFor } from "../live/access.js"
import { notify } from "../modules/student/notify.js"
import { applyPublication, assertPublishable } from "../recordings/service.js"
import { RECORDING_PUBLISH } from "./requests.js"

export const APPROVAL_STATES = ["Pending", "Approved", "Rejected", "Withdrawn", "Superseded"] as const
export type ApprovalState = (typeof APPROVAL_STATES)[number]

const clean = (note: string | undefined) => (note ?? "").trim().slice(0, 1000)

async function find(ctx: AppContext, id: string) {
  const [req] = await ctx.db.select().from(approval_requests).where(eq(approval_requests.id, id))
  if (!req) throw notFound("This request no longer exists.")
  return req
}

/**
 * Publishes the exact version the teacher asked for. Locks follow the publish path's order
 * (batch, recording, then request) so an approval can't deadlock with a teacher's edit.
 */
export async function approveRequest(ctx: AppContext, admin: AuthUser, id: string, note?: string) {
  const hint = await find(ctx, id)
  if (hint.kind !== RECORDING_PUBLISH) throw conflict("This request type can't be approved here.")
  const [rec] = await ctx.db.select({ session_id: recordings.session_id, batch_id: recordings.batch_id }).from(recordings).where(eq(recordings.id, hint.target_id))
  if (!rec) throw conflict("The recording for this request was removed.")
  // A recording with no session is a batch video; both kinds are published through the same approval.
  const context = rec.session_id ? await sessionFor(ctx.db, admin, rec.session_id, true) : await batchFor(ctx.db, admin, rec.batch_id, true)
  return ctx.db.transaction(async (tx) => {
    const batch = await lockBatch(tx, context.batch.id)
    const session = rec.session_id ? (await sessionFor(tx, admin, rec.session_id, true)).session : null
    const [r] = await tx.select().from(recordings).where(eq(recordings.id, hint.target_id)).for("update")
    const [req] = await tx.select().from(approval_requests).where(eq(approval_requests.id, id)).for("update")
    if (req.state !== "Pending") throw conflict(`This request was already ${req.state.toLowerCase()}.`)
    if (r.version !== req.target_version) throw conflict("The recording changed after this request. Ask the teacher to submit it again.")
    let recording = r
    if (r.status !== "Published") {
      await assertPublishable(tx, r, batch, session)
      recording = await applyPublication(tx, admin, r, batch, true)
    }
    const decision = clean(note)
    const [updated] = await tx.update(approval_requests).set({ state: "Approved", decided_by: admin.id, decided_at: new Date(), decision_note: decision, updated_at: new Date() }).where(eq(approval_requests.id, id)).returning()
    await tx.insert(audit_events).values({ actor_id: admin.id, actor_role: admin.role, action: "approval.approved", target: id, outcome: `recording ${r.id} v${r.version}` })
    if (req.requested_by && req.requested_by !== admin.id) {
      await notify(tx, req.requested_by, "system", "Recording approved", `"${r.title}" is now published for ${batch.name}.${decision ? ` Note: ${decision}` : ""}`, "recordings", undefined, { key: `approval-decision:${id}` })
    }
    return { approval: updated, recording }
  })
}

export async function rejectRequest(ctx: AppContext, admin: AuthUser, id: string, note?: string) {
  await find(ctx, id)
  return ctx.db.transaction(async (tx) => {
    const [req] = await tx.select().from(approval_requests).where(eq(approval_requests.id, id)).for("update")
    if (req.state !== "Pending") throw conflict(`This request was already ${req.state.toLowerCase()}.`)
    const decision = clean(note)
    const [updated] = await tx.update(approval_requests).set({ state: "Rejected", decided_by: admin.id, decided_at: new Date(), decision_note: decision, updated_at: new Date() }).where(eq(approval_requests.id, id)).returning()
    await tx.insert(audit_events).values({ actor_id: admin.id, actor_role: admin.role, action: "approval.rejected", target: id, outcome: decision || "no reason given" })
    if (req.requested_by && req.requested_by !== admin.id) {
      const [r] = await tx.select({ title: recordings.title }).from(recordings).where(eq(recordings.id, req.target_id))
      await notify(tx, req.requested_by, "system", "Publish request declined", `"${r?.title ?? "Your recording"}" was not published.${decision ? ` Reason: ${decision}` : ""}`, "recordings", undefined, { key: `approval-decision:${id}` })
    }
    return { approval: updated }
  })
}

/** The teacher who asked (or an administrator) can take a pending request back. */
export async function withdrawRequest(ctx: AppContext, actor: AuthUser, id: string) {
  const hint = await find(ctx, id)
  if (!isAdmin(actor) && hint.requested_by !== actor.id) throw forbidden("Only the teacher who asked can withdraw this request.")
  return ctx.db.transaction(async (tx) => {
    const [req] = await tx.select().from(approval_requests).where(eq(approval_requests.id, id)).for("update")
    if (req.state !== "Pending") throw conflict(`This request was already ${req.state.toLowerCase()}.`)
    const [updated] = await tx.update(approval_requests).set({ state: "Withdrawn", decided_by: actor.id, decided_at: new Date(), decision_note: "Withdrawn by the requester.", updated_at: new Date() }).where(eq(approval_requests.id, id)).returning()
    await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "approval.withdrawn", target: id, outcome: "withdrawn" })
    return { approval: updated }
  })
}

/** Queue rows with everything the review page shows. Recording requests only, newest first within a state. */
export async function listRequests(ctx: AppContext, state: ApprovalState | "all", limit: number) {
  const rows = await ctx.db.execute(sql`
    select a.id, a.kind, a.state, a.note, a.decision_note, a.target_id as recording_id, a.target_version, a.created_at, a.decided_at,
      req.id as requested_by_id, req.full_name as requested_by_name, req.email as requested_by_email, req.avatar_url as requested_by_avatar,
      dec.full_name as decided_by_name,
      r.title as recording_title, r.summary as recording_summary, r.status as recording_status, r.version as recording_version,
      r.release_at, r.expires_at,
      s.id as session_id, s.title as session_title, s.starts_at as session_starts_at, s.timezone as session_timezone,
      b.id as batch_id, b.name as batch_name, b.replay_enabled,
      c.id as course_id, c.title as course_title,
      m.state as processing_state, m.duration_seconds,
      (select count(*)::int from lms.recording_chapters rc where rc.recording_id = r.id) as chapter_count
    from lms.approval_requests a
    left join lms.users req on req.id = a.requested_by
    left join lms.users dec on dec.id = a.decided_by
    left join lms.recordings r on r.id = a.target_id
    left join lms.live_sessions s on s.id = r.session_id
    left join lms.cohort_batches b on b.id = r.batch_id
    left join lms.courses c on c.id = b.course_id
    left join lms.media_assets m on m.id = r.asset_id
    where a.kind = ${RECORDING_PUBLISH} ${state === "all" ? sql`` : sql`and a.state = ${state}`}
    order by case when a.state = 'Pending' then 0 else 1 end, case when a.state = 'Pending' then a.created_at end asc, coalesce(a.decided_at, a.created_at) desc
    limit ${limit}`)
  const counts = await ctx.db.execute(sql`select state, count(*)::int as n from lms.approval_requests where kind = ${RECORDING_PUBLISH} group by state`)
  const byState: Record<string, number> = Object.fromEntries(APPROVAL_STATES.map((s) => [s, 0]))
  for (const row of counts.rows as { state: string; n: number }[]) byState[row.state] = row.n
  return { approvals: rows.rows, counts: byState }
}

export async function pendingCount(ctx: AppContext) {
  const [row] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(approval_requests).where(and(eq(approval_requests.kind, RECORDING_PUBLISH), eq(approval_requests.state, "Pending")))
  return row?.n ?? 0
}
