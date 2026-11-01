import { ApiError, supabase, toApiError, unwrap, type Tables } from "@/lib/supabase"
import type { FaqItem, StudentNavPage, SupportTicket, TicketCategory, TicketPriority, TicketReply, TicketStatus } from "../studentTypes"
import { fmtDateTime, relTime, stamp } from "../studentUtils"
import { fileSize, uploadFile } from "./actions"

export interface SupportData {
  faqs: FaqItem[]
  votes: Record<string, "up" | "down">
  tickets: SupportTicket[]
}

type TicketRow = Tables<"support_tickets">
type ReplyRow = Tables<"ticket_replies">

function toReply(r: ReplyRow): TicketReply {
  return {
    id: r.id,
    author: r.author_name,
    role: r.author_role as TicketReply["role"],
    avatar: r.author_avatar ?? undefined,
    timestamp: stamp(r.created_at),
    content: r.content,
    attachmentName: r.attachment_name ?? undefined,
    attachmentPath: r.attachment_path ?? undefined,
  }
}

export function toTicket(t: TicketRow, replies: ReplyRow[], now = Date.now()): SupportTicket {
  return {
    id: t.id,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    category: t.category as TicketCategory,
    subject: t.subject,
    description: t.description,
    priority: t.priority as TicketPriority,
    status: t.status as TicketStatus,
    createdDate: fmtDateTime(t.created_at),
    lastUpdate: t.last_update_by ? `${relTime(t.updated_at, now)} by ${t.last_update_by}` : "Awaiting staff triage",
    attachmentName: t.attachment_name ?? undefined,
    attachmentSize: t.attachment_size ?? undefined,
    resolutionNotes: t.resolution_notes ?? undefined,
    replies: replies.filter((r) => r.ticket_id === t.id).map(toReply),
  }
}

export async function loadSupport(): Promise<SupportData> {
  const [faqs, votes, tickets, replies] = await Promise.all([
    supabase.from("faqs").select("*").order("position"),
    supabase.from("faq_votes").select("faq_id, vote"),
    supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
    supabase.from("ticket_replies").select("*").order("created_at"),
  ])
  const replyRows = unwrap(replies)
  return {
    faqs: unwrap(faqs).map((f) => ({
      id: f.id,
      category: f.category as FaqItem["category"],
      question: f.question,
      answer: f.answer,
      linkTarget: (f.link_target ?? undefined) as StudentNavPage | undefined,
      linkLabel: f.link_label ?? undefined,
    })),
    votes: Object.fromEntries(unwrap(votes).map((v) => [v.faq_id, v.vote as "up" | "down"])),
    tickets: unwrap(tickets).map((t) => toTicket(t, replyRows)),
  }
}

export async function voteFaq(faqId: string, vote: "up" | "down") {
  unwrap(await supabase.from("faq_votes").upsert({ faq_id: faqId, vote }, { onConflict: "student_id,faq_id" }).select("faq_id"), "Your feedback couldn't be saved.")
}

export interface NewTicket {
  category: string
  priority: TicketPriority
  subject: string
  description: string
  file?: File | null
}

export const MAX_TICKET_FILE_BYTES = 10 * 1024 * 1024

async function attach(uid: string, ticketFolder: string, file?: File | null) {
  if (!file) return {}
  if (file.size > MAX_TICKET_FILE_BYTES) throw new ApiError("Attachments can be up to 10 MB.")
  const path = await uploadFile("ticket-attachments", uid, ticketFolder, file)
  return { path, name: file.name, size: fileSize(file.size) }
}

export async function createTicket(uid: string, t: NewTicket): Promise<SupportTicket> {
  const file = await attach(uid, "new", t.file)
  const row = unwrap(
    await supabase.rpc("create_support_ticket", {
      p_category: t.category,
      p_subject: t.subject,
      p_description: t.description,
      p_priority: t.priority,
      p_attachment_name: file.name,
      p_attachment_size: file.size,
      p_attachment_path: file.path,
    }),
    "The ticket couldn't be created.",
  )
  const replies = unwrap(await supabase.from("ticket_replies").select("*").eq("ticket_id", row.id).order("created_at"))
  return toTicket(row, replies)
}

export async function replyToTicket(uid: string, ticketId: string, content: string, file?: File | null): Promise<TicketReply> {
  const f = await attach(uid, ticketId, file)
  const row = unwrap(
    await supabase.rpc("reply_to_support_ticket", { p_ticket_id: ticketId, p_content: content, p_attachment_name: f.name, p_attachment_path: f.path }),
    "Your reply couldn't be sent.",
  )
  return toReply(row)
}

export async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<TicketRow> {
  return unwrap(await supabase.rpc("set_support_ticket_status", { p_ticket_id: ticketId, p_status: status }), "The ticket couldn't be updated.")
}

export async function attachmentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from("ticket-attachments").createSignedUrl(path, 300)
  if (error || !data) throw toApiError(error ?? undefined, "The attachment couldn't be opened.")
  return data.signedUrl
}

/* -------------------------------- Live chat ------------------------------- */

export type ChatRow = Tables<"support_chat_messages">

export async function loadChat(): Promise<ChatRow[]> {
  return unwrap(await supabase.from("support_chat_messages").select("*").order("created_at").order("id").limit(200))
}

/** Sends a message; resolves to the stored message and the agent's reply. */
export async function sendChat(body: string): Promise<ChatRow[]> {
  return unwrap(await supabase.rpc("send_support_chat_message", { p_body: body }), "Your message couldn't be sent.")
}
