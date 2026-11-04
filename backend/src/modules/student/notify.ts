import { eq } from "drizzle-orm"
import type { Tx } from "../../db/client.js"
import { notifications, profiles } from "../../db/schema.js"
import { broadcastToChannel } from "../../ws.js"

export type NotificationKind = "class" | "doubt" | "grade" | "system" | "payment" | "assessment"

/** Adds a notification unless the student turned that category off (notification_prefs[pref] === false). */
export async function notify(tx: Tx, studentId: string, kind: NotificationKind, title: string, message: string, link?: string | null, pref?: string) {
  if (pref) {
    const [p] = await tx.select({ prefs: profiles.notification_prefs }).from(profiles).where(eq(profiles.id, studentId)).limit(1)
    const prefs = (p?.prefs ?? {}) as Record<string, unknown>
    if (prefs[pref] === false || prefs[pref] === "false") return
  }
  const [row] = await tx.insert(notifications).values({ student_id: studentId, kind, title, message, link: link ?? null }).returning()
  broadcastToChannel(`user:${studentId}`, "notification", row)
  broadcastToChannel("notifications", "notification", row)
}
