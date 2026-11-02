import { api, ApiError, fileUrl, uploadFile, type Tables } from "@/lib/api"
import type { FaqItem, StudentNavPage, SupportTicket, TicketCategory, TicketPriority, TicketReply, TicketStatus } from "../studentTypes"
import { fmtDateTime, relTime, stamp } from "../studentUtils"
import { fileSize } from "./actions"

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
  const { faqs, votes, tickets, replies: replyRows } = await api.get<{ faqs: Tables<"faqs">[]; votes: { faq_id: string; vote: string }[]; tickets: TicketRow[]; replies: ReplyRow[] }>("/student/support")
  return {
    faqs: faqs.map((f) => ({
      id: f.id,
      category: f.category as FaqItem["category"],
      question: f.question,
      answer: f.answer,
      linkTarget: (f.link_target ?? undefined) as StudentNavPage | undefined,
      linkLabel: f.link_label ?? undefined,
    })),
    votes: Object.fromEntries(votes.map((v) => [v.faq_id, v.vote as "up" | "down"])),
    tickets: tickets.map((t) => toTicket(t, replyRows)),
  }
}

export async function voteFaq(faqId: string, vote: "up" | "down") {
  await api.put(`/student/faqs/${encodeURIComponent(faqId)}/vote`, { vote }, "Your feedback couldn't be saved.")
}

export interface NewTicket {
  category: string
  priority: TicketPriority
  subject: string
  description: string
  file?: File | null
}

export const MAX_TICKET_FILE_BYTES = 10 * 1024 * 1024

async function attach(ticketFolder: string, file?: File | null) {
  if (!file) return {}
  if (file.size > MAX_TICKET_FILE_BYTES) throw new ApiError("Attachments can be up to 10 MB.")
  const key = await uploadFile("ticket-attachments", ticketFolder, file)
  return { attachment_key: key, attachment_name: file.name, attachment_size: fileSize(file.size) }
}

export async function createTicket(_uid: string, t: NewTicket): Promise<SupportTicket> {
  const file = await attach("new", t.file)
  const r = await api.post<{ ticket: TicketRow; replies: ReplyRow[] }>(
    "/student/support/tickets",
    { category: t.category, subject: t.subject, description: t.description, priority: t.priority, ...file },
    "The ticket couldn't be created.",
  )
  return toTicket(r.ticket, r.replies)
}

export async function replyToTicket(_uid: string, ticketId: string, content: string, file?: File | null): Promise<TicketReply> {
  const f = await attach(ticketId, file)
  const row = await api.post<ReplyRow>(`/student/support/tickets/${encodeURIComponent(ticketId)}/replies`, { content, ...f }, "Your reply couldn't be sent.")
  return toReply(row)
}

export async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<TicketRow> {
  return api.patch<TicketRow>(`/student/support/tickets/${encodeURIComponent(ticketId)}`, { status }, "The ticket couldn't be updated.")
}

export async function attachmentUrl(path: string): Promise<string> {
  return fileUrl(path)
}

/* -------------------------------- Live chat ------------------------------- */

export type ChatRow = Tables<"support_chat_messages">

export async function loadChat(): Promise<ChatRow[]> {
  return api.get<ChatRow[]>("/student/support/chat")
}

/** Sends a message; resolves to the stored message and the agent's reply. */
export async function sendChat(body: string): Promise<ChatRow[]> {
  return api.post<ChatRow[]>("/student/support/chat", { body }, "Your message couldn't be sent.")
}
