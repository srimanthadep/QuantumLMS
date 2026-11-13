import { randomUUID } from "node:crypto"
import type { Tx } from "../../db/client.js"
import { notification_outbox } from "../../db/schema.js"
export type NotificationKind = "class" | "doubt" | "grade" | "system" | "payment" | "assessment"
export interface DeliveryOptions { key?:string; availableAt?:Date; guard?:Record<string,unknown>; link?:string }
/** Caller supplies its domain transaction. Delivery and preference checks happen in the retrying worker. */
export async function notify(tx:Tx,studentId:string,kind:NotificationKind,title:string,message:string,link?:string|null,pref?:string,options:DeliveryOptions={}) {
  await tx.insert(notification_outbox).values({event_key:`${options.key??randomUUID()}:${studentId}`,recipient_id:studentId,kind,title,message,link:options.link??link??null,preference:pref,available_at:options.availableAt,guard:options.guard??{}}).onConflictDoNothing()
}
