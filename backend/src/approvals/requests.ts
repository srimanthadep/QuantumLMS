import { and, desc, eq, inArray, isNull } from "drizzle-orm"
import type { AuthUser } from "../auth/users.js"
import type { Tx } from "../db/client.js"
import { approval_requests, audit_events, cohort_batches, recordings, users } from "../db/schema.js"
import { notify } from "../modules/student/notify.js"

export const RECORDING_PUBLISH = "recording.publish"
export type ApprovalRequest = typeof approval_requests.$inferSelect

const MAX_NOTE = 1000
const clean = (note: string | undefined) => (note ?? "").trim().slice(0, MAX_NOTE)

/** The open request for a target, locked. Callers already hold the target's lock, so this never races a second insert. */
async function openFor(tx: Tx, kind: string, targetId: string) {
  return tx.select().from(approval_requests).where(and(eq(approval_requests.kind, kind), eq(approval_requests.target_id, targetId), eq(approval_requests.state, "Pending"))).for("update")
}

/**
 * A teacher asks to publish the current reviewed version. Asking again for the same version returns the open request;
 * asking for a newer version closes the old one first. Every active administrator is notified.
 */
export async function openRecordingRequest(tx: Tx, actor: AuthUser, r: typeof recordings.$inferSelect, batch: typeof cohort_batches.$inferSelect, note?: string): Promise<ApprovalRequest> {
  const open = await openFor(tx, RECORDING_PUBLISH, r.id)
  const same = open.find((o) => o.target_version === r.version)
  if (same) return same
  for (const old of open) {
    await tx.update(approval_requests).set({ state: "Superseded", decided_by: actor.id, decided_at: new Date(), decision_note: "A newer version was submitted.", updated_at: new Date() }).where(eq(approval_requests.id, old.id))
  }
  const [created] = await tx.insert(approval_requests).values({ kind: RECORDING_PUBLISH, target_id: r.id, target_version: r.version, batch_id: batch.id, requested_by: actor.id, note: clean(note) }).returning()
  await tx.insert(audit_events).values({ actor_id: actor.id, actor_role: actor.role, action: "approval.requested", target: created.id, outcome: `recording ${r.id} v${r.version}` })
  const admins = await tx.select({ id: users.id }).from(users).where(and(inArray(users.role, ["Admin", "Super Admin"]), isNull(users.disabled_at)))
  for (const admin of admins) {
    await notify(tx, admin.id, "system", "Recording waiting for approval", `${actor.full_name || "A teacher"} asked to publish "${r.title}" in ${batch.name}.`, "approvals", undefined, { key: `approval:${created.id}` })
  }
  return created
}

/**
 * Closes open requests when the recording changes or an administrator publishes it directly.
 * "Approved" applies only to a request for exactly the version being published; anything else is superseded.
 */
export async function closeRecordingRequests(
  tx: Tx,
  recordingId: string,
  outcome: "Approved" | "Superseded",
  opts: { actor: AuthUser; note: string; version?: number; title?: string; batchName?: string },
) {
  const open = await openFor(tx, RECORDING_PUBLISH, recordingId)
  if (!open.length) return
  let title = opts.title
  if (!title) title = (await tx.select({ title: recordings.title }).from(recordings).where(eq(recordings.id, recordingId)))[0]?.title ?? "your recording"
  for (const req of open) {
    const state = outcome === "Approved" && req.target_version === opts.version ? "Approved" : "Superseded"
    await tx.update(approval_requests).set({ state, decided_by: opts.actor.id, decided_at: new Date(), decision_note: opts.note, updated_at: new Date() }).where(eq(approval_requests.id, req.id))
    await tx.insert(audit_events).values({ actor_id: opts.actor.id, actor_role: opts.actor.role, action: state === "Approved" ? "approval.approved" : "approval.superseded", target: req.id, outcome: opts.note })
    if (req.requested_by && req.requested_by !== opts.actor.id) {
      if (state === "Approved") await notify(tx, req.requested_by, "system", "Recording approved", `"${title}" is now published${opts.batchName ? ` for ${opts.batchName}` : ""}.`, "recordings", undefined, { key: `approval-decision:${req.id}` })
      else await notify(tx, req.requested_by, "system", "Publish request closed", `Your request to publish "${title}" was closed because the recording changed. Submit it again when it's ready.`, "recordings", undefined, { key: `approval-decision:${req.id}` })
    }
  }
}

/** Latest request per recording, for showing its status next to the recording. */
export async function latestRecordingRequest(tx: Tx, recordingId: string) {
  const [row] = await tx
    .select({
      id: approval_requests.id,
      state: approval_requests.state,
      target_version: approval_requests.target_version,
      note: approval_requests.note,
      decision_note: approval_requests.decision_note,
      created_at: approval_requests.created_at,
      decided_at: approval_requests.decided_at,
    })
    .from(approval_requests)
    .where(and(eq(approval_requests.kind, RECORDING_PUBLISH), eq(approval_requests.target_id, recordingId)))
    .orderBy(desc(approval_requests.created_at))
    .limit(1)
  return row ?? null
}
