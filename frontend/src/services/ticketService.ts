import { api, DEMO_SUPPORT } from "@/lib/api"
import { accessToken, isAuthConfigured, signInWithEmail } from "@/lib/auth"

export interface SupportTicket {
  id: string
  student_id: string
  category: string
  subject: string
  description: string
  priority: "Low" | "Medium" | "High" | "Urgent"
  status: "Open" | "In Progress" | "Resolved" | "Closed"
  attachment_name?: string | null
  attachment_size?: string | null
  attachment_path?: string | null
  resolution_notes?: string | null
  last_update_by?: string | null
  created_at: string
  updated_at: string

  // Frontend compatibility & presentation fields
  ticketNumber: string
  studentId: string
  studentName: string
  studentEmail: string
  studentBatch: string
  assignedAgent: string
  messages: Array<{
    id: string
    sender: string
    role: "student" | "agent" | "system"
    message: string
    timestamp: string
    avatar?: string
  }>
}

export interface TicketReply {
  id: string
  ticket_id: string
  author_id?: string | null
  author_name: string
  author_role: "Student" | "Support Team" | "Faculty" | "System" | string
  author_avatar?: string | null
  content: string
  attachment_name?: string | null
  attachment_path?: string | null
  created_at: string
}

export interface CreateTicketInput {
  category: string
  subject: string
  description: string
  priority?: SupportTicket["priority"]
  attachment_name?: string | null
  attachment_size?: string | null
  attachment_path?: string | null
}

export interface TicketStats {
  open: number
  inProgress: number
  resolved: number
  closed: number
  urgent: number
  high: number
  medium: number
  low: number
  total: number
}

// In-memory listener set for real-time reactivity without external polling servers
const ticketListeners = new Set<() => void>()

function notifyTicketListeners() {
  for (const listener of ticketListeners) {
    try {
      listener()
    } catch (e) {
      console.warn("Error in ticket listener callback:", e)
    }
  }
}

/**
 * Ensures an active Cognito authentication session exists.
 * If not signed in and auth is configured, quietly signs in the shared demo support account.
 */
export const ensureAuthSession = async () => {
  const token = await accessToken()
  if (token) return { token }

  if (isAuthConfigured) {
    try {
      await signInWithEmail(DEMO_SUPPORT.email, DEMO_SUPPORT.password)
      const freshToken = await accessToken()
      return freshToken ? { token: freshToken } : null
    } catch (err) {
      console.warn("Could not establish auth session:", err)
    }
  }

  return null
}

/**
 * Maps a database ticket row and associated replies into a UI-friendly SupportTicket object.
 */
export function mapDbTicketToSupportTicket(
  row: any,
  replies: any[] = [],
  profile?: any,
): SupportTicket {
  const ticketReplies = (replies || []).filter((r: any) => r.ticket_id === row.id)

  const messages =
    ticketReplies.length > 0
      ? ticketReplies.map((r: any) => ({
          id: r.id,
          sender: r.author_name || "Support Team",
          role: ((r.author_role || "").toLowerCase().includes("student")
            ? "student"
            : "agent") as "student" | "agent",
          message: r.content,
          timestamp: new Date(r.created_at).toLocaleString(),
          avatar: r.author_avatar || undefined,
        }))
      : [
          {
            id: `msg-${row.id}-init`,
            sender: profile?.full_name || row.student_name || "Aarav Mehta",
            role: "student" as const,
            message: row.description,
            timestamp: new Date(row.created_at).toLocaleString(),
            avatar: profile?.avatar_url || row.student_avatar || undefined,
          },
        ]

  const rawStatus = (row.status || "Open").toString()
  const normalizedStatus = (
    rawStatus.toLowerCase() === "open"
      ? "Open"
      : rawStatus.toLowerCase() === "in progress" || rawStatus.toLowerCase() === "pending"
        ? "In Progress"
        : rawStatus.toLowerCase() === "resolved"
          ? "Resolved"
          : "Closed"
  ) as SupportTicket["status"]

  const rawPriority = (row.priority || "Low").toString()
  const normalizedPriority = (
    rawPriority.toLowerCase() === "urgent"
      ? "Urgent"
      : rawPriority.toLowerCase() === "high"
        ? "High"
        : rawPriority.toLowerCase() === "medium"
          ? "Medium"
          : "Low"
  ) as SupportTicket["priority"]

  return {
    id: row.id,
    student_id: row.student_id,
    category: row.category || "General Help & Feedback",
    subject: row.subject,
    description: row.description,
    priority: normalizedPriority,
    status: normalizedStatus,
    attachment_name: row.attachment_name,
    attachment_size: row.attachment_size,
    attachment_path: row.attachment_path,
    resolution_notes: row.resolution_notes,
    last_update_by: row.last_update_by,
    created_at: typeof row.created_at === "string" ? row.created_at : new Date(row.created_at).toISOString(),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : new Date(row.updated_at).toISOString(),

    // Frontend presentation fields
    ticketNumber: row.id.startsWith("TKT-") ? `#${row.id}` : `#TKT-${row.id}`,
    studentId: row.student_id,
    studentName: profile?.full_name || row.student_name || "Aarav Mehta",
    studentEmail: profile?.email || row.student_email || "aarav.mehta@learner.ai",
    studentBatch: profile?.batch || row.student_batch || "Class of 2027 · AI Engineering Cohort",
    assignedAgent: row.last_update_by || "Support Team",
    messages,
  }
}

// CREATE TICKET
export const createTicket = async (ticketData: CreateTicketInput): Promise<SupportTicket> => {
  await ensureAuthSession()
  const subject = (ticketData.subject || "").trim()
  const description = (ticketData.description || "").trim()
  const priority = ticketData.priority || "Low"
  const category = (ticketData.category || "Technical Support").trim()

  if (subject.length < 8) {
    throw new Error("Summarise the issue in at least 8 characters.")
  }
  if (description.length < 20) {
    throw new Error("Describe what happened in at least 20 characters.")
  }

  // Attempt student ticket creation first; fallback to support endpoint if role is not student
  try {
    const res = await api.post<{ ticket: any; replies: any[] }>("/student/support/tickets", {
      category,
      subject,
      description,
      priority,
      attachment_name: ticketData.attachment_name ?? null,
      attachment_size: ticketData.attachment_size ?? null,
      attachment_key: ticketData.attachment_path ?? null,
    })
    notifyTicketListeners()
    return mapDbTicketToSupportTicket(res.ticket, res.replies || [])
  } catch (err: any) {
    if (err?.status === 403 || err?.status === 401) {
      const res = await api.post<{ ticket: any; replies: any[]; student?: any }>("/support/tickets", {
        category,
        subject,
        description,
        priority,
        attachment_name: ticketData.attachment_name ?? null,
        attachment_size: ticketData.attachment_size ?? null,
        attachment_path: ticketData.attachment_path ?? null,
      })
      notifyTicketListeners()
      return mapDbTicketToSupportTicket(res.ticket, res.replies || [], res.student)
    }
    throw err
  }
}

// FETCH TICKETS FOR CURRENT AUTHENTICATED STUDENT
export const getStudentTickets = async (): Promise<SupportTicket[]> => {
  await ensureAuthSession()
  const res = await api.get<{ tickets: any[]; replies: any[] }>("/student/support", "Unable to load student tickets.")
  const rows = res.tickets || []
  const replies = res.replies || []
  return rows.map((row: any) => mapDbTicketToSupportTicket(row, replies))
}

// FETCH ALL TICKETS (FOR SUPPORT DASHBOARD & INBOX)
export const getAllTickets = async (): Promise<SupportTicket[]> => {
  await ensureAuthSession()
  const res = await api.get<{ tickets: any[] }>("/support/tickets", "Unable to load support tickets.")
  return (res.tickets || []).map((t: any) =>
    mapDbTicketToSupportTicket(t, t.replies || [], t.student),
  )
}

// FETCH SINGLE TICKET BY ID WITH REPLIES
export const getTicketById = async (ticketId: string): Promise<SupportTicket | null> => {
  await ensureAuthSession()
  const cleanId = ticketId.replace(/^#/, "").trim()

  try {
    const res = await api.get<{ ticket: any; replies: any[]; student?: any }>(
      `/support/tickets/${encodeURIComponent(cleanId)}`,
      "Unable to load ticket details.",
    )
    if (!res || !res.ticket) return null
    return mapDbTicketToSupportTicket(res.ticket, res.replies || [], res.student)
  } catch (err: any) {
    if (err?.status === 404) return null
    throw err
  }
}

// UPDATE TICKET STATUS AND DETAILS
export const updateTicketStatus = async (
  ticketId: string,
  status: SupportTicket["status"],
  resolutionNotes?: string,
  lastUpdateBy?: string,
): Promise<SupportTicket> => {
  await ensureAuthSession()
  const cleanId = ticketId.replace(/^#/, "").trim()

  const payload: Record<string, any> = { status }
  if (resolutionNotes !== undefined) payload.resolution_notes = resolutionNotes
  if (lastUpdateBy !== undefined) payload.last_update_by = lastUpdateBy

  const res = await api.patch<{ ticket: any; replies: any[]; student?: any }>(
    `/support/tickets/${encodeURIComponent(cleanId)}`,
    payload,
    "Unable to update ticket status.",
  )

  notifyTicketListeners()
  return mapDbTicketToSupportTicket(res.ticket, res.replies || [], res.student)
}

// ADD A TICKET REPLY
export const addTicketReply = async (
  ticketId: string,
  content: string,
  attachmentName?: string,
  attachmentPath?: string,
): Promise<TicketReply> => {
  await ensureAuthSession()
  const cleanId = ticketId.replace(/^#/, "").trim()

  const res = await api.post<TicketReply>(
    `/support/tickets/${encodeURIComponent(cleanId)}/replies`,
    {
      content: content.trim(),
      attachment_name: attachmentName || undefined,
      attachment_path: attachmentPath || undefined,
    },
    "Unable to send ticket reply.",
  )

  notifyTicketListeners()
  return res
}

// COMPUTE TICKET STATS
export const getTicketStats = async (): Promise<TicketStats> => {
  await ensureAuthSession()
  try {
    return await api.get<TicketStats>("/support/stats")
  } catch {
    const tickets = await getAllTickets()
    const stats: TicketStats = {
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
      total: tickets.length,
    }

    for (const t of tickets) {
      const s = t.status.toLowerCase()
      if (s === "open") stats.open++
      else if (s === "in progress" || s === "pending") stats.inProgress++
      else if (s === "resolved") stats.resolved++
      else if (s === "closed") stats.closed++

      const p = t.priority.toLowerCase()
      if (p === "urgent") stats.urgent++
      else if (p === "high") stats.high++
      else if (p === "medium") stats.medium++
      else if (p === "low") stats.low++
    }

    return stats
  }
}

// REALTIME SUBSCRIPTION FOR TICKET UPDATES
let sharedPollTimer: ReturnType<typeof setInterval> | null = null

export const subscribeToTickets = (callback: () => void): (() => void) => {
  ticketListeners.add(callback)

  // Shared singleton polling interval across all active subscribers
  if (!sharedPollTimer) {
    sharedPollTimer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      notifyTicketListeners()
    }, 15_000)
  }

  return () => {
    ticketListeners.delete(callback)
    if (ticketListeners.size === 0 && sharedPollTimer) {
      clearInterval(sharedPollTimer)
      sharedPollTimer = null
    }
  }
}
