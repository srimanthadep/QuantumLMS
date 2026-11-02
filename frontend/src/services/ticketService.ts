import { supabase, DEMO_STUDENT } from "../lib/supabase";

export interface SupportTicket {
  id: string;
  student_id: string;
  category: string;
  subject: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  attachment_name?: string | null;
  attachment_size?: string | null;
  attachment_path?: string | null;
  resolution_notes?: string | null;
  last_update_by?: string | null;
  created_at: string;
  updated_at: string;

  // Frontend compatibility & presentation fields
  ticketNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentBatch: string;
  assignedAgent: string;
  messages: Array<{
    id: string;
    sender: string;
    role: "student" | "agent" | "system";
    message: string;
    timestamp: string;
    avatar?: string;
  }>;
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  author_id?: string | null;
  author_name: string;
  author_role: "Student" | "Support Team" | "Faculty" | "System" | string;
  author_avatar?: string | null;
  content: string;
  attachment_name?: string | null;
  attachment_path?: string | null;
  created_at: string;
}

export interface CreateTicketInput {
  category: string;
  subject: string;
  description: string;
  priority?: SupportTicket["priority"];
  attachment_name?: string | null;
  attachment_size?: string | null;
  attachment_path?: string | null;
}

export interface TicketStats {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgent: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

/**
 * Ensures a valid Supabase authentication session exists.
 * If not authenticated, silently signs in the shared demo student.
 */
export const ensureAuthSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  // Sign in using the shared demo student credentials
  try {
    const { data, error } = await supabase.auth.signInWithPassword(DEMO_STUDENT);
    if (!error && data?.user) return data.user;
  } catch (err) {
    console.warn("Could not establish auth session:", err);
  }

  return null;
};

/**
 * Helper to map a raw database row and associated replies into a UI-friendly SupportTicket object.
 */
export function mapDbTicketToSupportTicket(
  row: any,
  replies: any[] = [],
  profile?: any
): SupportTicket {
  const ticketReplies = (replies || []).filter((r) => r.ticket_id === row.id);

  const messages =
    ticketReplies.length > 0
      ? ticketReplies.map((r) => ({
        id: r.id,
        sender: r.author_name || "Support Team",
        role: (r.author_role?.toLowerCase().includes("student")
          ? "student"
          : "agent") as "student" | "agent",
        message: r.content,
        timestamp: new Date(r.created_at).toLocaleString(),
        avatar: r.author_avatar || undefined,
      }))
      : [
        {
          id: `msg-${row.id}-init`,
          sender: profile?.full_name || "Aarav Mehta",
          role: "student" as const,
          message: row.description,
          timestamp: new Date(row.created_at).toLocaleString(),
          avatar: profile?.avatar_url || "/assets/student-2.png",
        },
      ];

  const rawStatus = (row.status || "Open").toString();
  const normalizedStatus = (
    rawStatus.toLowerCase() === "open"
      ? "Open"
      : rawStatus.toLowerCase() === "in progress" || rawStatus.toLowerCase() === "pending"
        ? "In Progress"
        : rawStatus.toLowerCase() === "resolved"
          ? "Resolved"
          : "Closed"
  ) as SupportTicket["status"];

  const rawPriority = (row.priority || "Low").toString();
  const normalizedPriority = (
    rawPriority.toLowerCase() === "urgent"
      ? "Urgent"
      : rawPriority.toLowerCase() === "high"
        ? "High"
        : rawPriority.toLowerCase() === "medium"
          ? "Medium"
          : "Low"
  ) as SupportTicket["priority"];

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
    created_at: row.created_at,
    updated_at: row.updated_at,

    // Frontend presentation fields
    ticketNumber: row.id.startsWith("TKT-") ? `#${row.id}` : `#TKT-${row.id}`,
    studentId: row.student_id,
    studentName: profile?.full_name || "Aarav Mehta",
    studentEmail: profile?.email || "aarav.mehta@learner.ai",
    studentBatch: profile?.batch || "Class of 2027 · Year 4",
    assignedAgent: row.last_update_by || "Support Team",
    messages,
  };
}

// CREATE TICKET
export const createTicket = async (
  ticketData: CreateTicketInput
): Promise<SupportTicket> => {
  const user = await ensureAuthSession();
  if (!user) {
    throw new Error("Please log in before creating a ticket.");
  }

  const subject = (ticketData.subject || "").trim();
  const description = (ticketData.description || "").trim();
  const priority = ticketData.priority || "Low";
  const category = (ticketData.category || "Technical Support").trim();

  if (subject.length < 8) {
    throw new Error("Summarise the issue in at least 8 characters.");
  }
  if (description.length < 20) {
    throw new Error("Describe what happened in at least 20 characters.");
  }

  // Use the verified SECURITY DEFINER RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_support_ticket",
    {
      p_category: category,
      p_subject: subject,
      p_description: description,
      p_priority: priority,
      p_attachment_name: ticketData.attachment_name || undefined,
      p_attachment_size: ticketData.attachment_size || undefined,
      p_attachment_path: ticketData.attachment_path || undefined,
    }
  );

  let createdRow = rpcData;

  if (rpcError) {
    // Fallback: direct insert if authorized
    const fallbackId = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data: insertData, error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        id: fallbackId,
        student_id: user.id,
        category,
        subject,
        description,
        priority,
        status: "Open",
        attachment_name: ticketData.attachment_name ?? null,
        attachment_size: ticketData.attachment_size ?? null,
        attachment_path: ticketData.attachment_path ?? null,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(rpcError.message || insertError.message);
    }
    createdRow = insertData;
  }

  return mapDbTicketToSupportTicket(createdRow, []);
};

// FETCH TICKETS FOR CURRENT AUTHENTICATED STUDENT
export const getStudentTickets = async (): Promise<SupportTicket[]> => {
  const user = await ensureAuthSession();
  if (!user) {
    throw new Error("User is not authenticated.");
  }

  const [ticketsRes, repliesRes, profileRes] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ticket_replies")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  if (ticketsRes.error) {
    throw new Error(ticketsRes.error.message);
  }

  const rows = ticketsRes.data || [];
  const replies = repliesRes.data || [];
  const profile = profileRes.data || null;

  return rows.map((row) => mapDbTicketToSupportTicket(row, replies, profile));
};

// FETCH ALL TICKETS (FOR SUPPORT DASHBOARD & INBOX)
export const getAllTickets = async (): Promise<SupportTicket[]> => {
  await ensureAuthSession();

  const [ticketsRes, repliesRes, profileRes] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("ticket_replies")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("profiles").select("*").limit(1).maybeSingle(),
  ]);

  if (ticketsRes.error) {
    throw new Error(ticketsRes.error.message);
  }

  const rows = ticketsRes.data || [];
  const replies = repliesRes.data || [];
  const profile = profileRes.data || null;

  return rows.map((row) => mapDbTicketToSupportTicket(row, replies, profile));
};

// FETCH SINGLE TICKET BY ID WITH REPLIES
export const getTicketById = async (
  ticketId: string
): Promise<SupportTicket | null> => {
  await ensureAuthSession();
  const cleanId = ticketId.replace(/^#/, "").trim();

  const [ticketRes, repliesRes] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*")
      .or(`id.eq.${cleanId},id.ilike.%${cleanId}%`)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("ticket_replies")
      .select("*")
      .eq("ticket_id", cleanId)
      .order("created_at", { ascending: true }),
  ]);

  if (ticketRes.error) {
    throw new Error(ticketRes.error.message);
  }

  if (!ticketRes.data) {
    return null;
  }

  const profileRes = await supabase
    .from("profiles")
    .select("*")
    .eq("id", ticketRes.data.student_id)
    .maybeSingle();

  return mapDbTicketToSupportTicket(
    ticketRes.data,
    repliesRes.data || [],
    profileRes.data || null
  );
};

// UPDATE TICKET STATUS AND DETAILS
export const updateTicketStatus = async (
  ticketId: string,
  status: SupportTicket["status"],
  resolutionNotes?: string,
  lastUpdateBy?: string
): Promise<SupportTicket> => {
  await ensureAuthSession();
  const cleanId = ticketId.replace(/^#/, "").trim();

  // Try set_support_ticket_status RPC for Open or Resolved transitions
  if (status === "Resolved" || status === "Open") {
    try {
      await supabase.rpc("set_support_ticket_status", {
        p_ticket_id: cleanId,
        p_status: status,
      });
    } catch (e) {
      console.warn("set_support_ticket_status notice:", e);
    }
  }

  // Try direct update for status, resolution_notes, and last_update_by
  const updatePayload: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (resolutionNotes !== undefined) updatePayload.resolution_notes = resolutionNotes;
  if (lastUpdateBy !== undefined) updatePayload.last_update_by = lastUpdateBy;

  try {
    await (supabase.from("support_tickets") as any).update(updatePayload).eq("id", cleanId);
  } catch (e) {
    console.warn("Direct update error:", e);
  }

  // If resolution notes are provided, also record them as a reply
  if (resolutionNotes) {
    try {
      await supabase.rpc("reply_to_support_ticket", {
        p_ticket_id: cleanId,
        p_content: `[Resolution Note]: ${resolutionNotes}`,
      });
    } catch {
      // reply is optional
    }
  }

  const refreshed = await getTicketById(cleanId);
  if (!refreshed) {
    throw new Error("Ticket updated but could not be refreshed from database.");
  }

  return refreshed;
};

// ADD A TICKET REPLY
export const addTicketReply = async (
  ticketId: string,
  content: string,
  attachmentName?: string,
  attachmentPath?: string
): Promise<TicketReply> => {
  await ensureAuthSession();
  const cleanId = ticketId.replace(/^#/, "").trim();

  const { data, error } = await supabase.rpc("reply_to_support_ticket", {
    p_ticket_id: cleanId,
    p_content: content.trim(),
    p_attachment_name: attachmentName || undefined,
    p_attachment_path: attachmentPath || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as TicketReply;
};

// COMPUTE TICKET STATS DIRECTLY FROM LIVE DATABASE RECORDS
export const getTicketStats = async (): Promise<TicketStats> => {
  const tickets = await getAllTickets();

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
  };

  for (const t of tickets) {
    const s = t.status.toLowerCase();
    if (s === "open") stats.open++;
    else if (s === "in progress" || s === "pending") stats.inProgress++;
    else if (s === "resolved") stats.resolved++;
    else if (s === "closed") stats.closed++;

    const p = t.priority.toLowerCase();
    if (p === "urgent") stats.urgent++;
    else if (p === "high") stats.high++;
    else if (p === "medium") stats.medium++;
    else if (p === "low") stats.low++;
  }

  return stats;
};

// REALTIME SUBSCRIPTION FOR TICKET UPDATES
export const subscribeToTickets = (callback: () => void) => {
  const channelName = `support-tickets-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "support_tickets" },
      () => {
        callback();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ticket_replies" },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      // safe cleanup
    }
  };
};
