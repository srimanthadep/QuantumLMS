import { SupportTicket as BaseSupportTicket } from "@/types/lms";
import {
  getAllTickets,
  getTicketById,
  type SupportTicket as ServiceSupportTicket,
} from "@/services/ticketService";

export type SupportCategory =
  | "Login & Account"
  | "Live Class"
  | "Assignments & Exams"
  | "Course Content"
  | "Technical Problem"
  | "Payments & Certificates"
  | "Notifications"
  | "Others"
  | "Account & Access Management"
  | "Course & Content Management"
  | "Assignments & Assessments"
  | "Live Classes & Attendance"
  | "Technical Support"
  | "Communication & Notifications"
  | "General Help & Feedback";

export type SupportPriority = "urgent" | "high" | "medium" | "low";

export interface SupportCategoryInfo {
  id: SupportCategory;
  label: string;
  badgeClass: string;
}

export const SUPPORT_CATEGORIES: SupportCategoryInfo[] = [
  {
    id: "Login & Account",
    label: "Login & Account",
    badgeClass: "bg-primary-soft text-primary-text border-primary/30 rounded-full",
  },
  {
    id: "Live Class",
    label: "Live Class",
    badgeClass: "bg-primary-soft text-primary-text border-primary/30 rounded-full",
  },
  {
    id: "Assignments & Exams",
    label: "Assignments & Exams",
    badgeClass: "bg-success-soft text-success border-success/40 rounded-full",
  },
  {
    id: "Course Content",
    label: "Course Content",
    badgeClass: "bg-warning-soft text-warning border-[#FDBA74]/40 rounded-full",
  },
  {
    id: "Technical Problem",
    label: "Technical Problem",
    badgeClass: "bg-danger-soft text-danger border-danger/30 rounded-full",
  },
  {
    id: "Payments & Certificates",
    label: "Payments & Certificates",
    badgeClass: "bg-warning-soft text-warning border-[#FDBA74]/40 rounded-full",
  },
  {
    id: "Notifications",
    label: "Notifications",
    badgeClass: "bg-primary-soft text-primary-text border-primary/30 rounded-full",
  },
  {
    id: "Others",
    label: "Others",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200 rounded-full",
  },
  {
    id: "Account & Access Management",
    label: "Account & Access Management",
    badgeClass: "bg-primary-soft text-primary-text border-primary/30 rounded-full",
  },
  {
    id: "Course & Content Management",
    label: "Course & Content Management",
    badgeClass: "bg-warning-soft text-warning border-[#FDBA74]/40 rounded-full",
  },
  {
    id: "Assignments & Assessments",
    label: "Assignments & Assessments",
    badgeClass: "bg-success-soft text-success border-success/40 rounded-full",
  },
  {
    id: "Live Classes & Attendance",
    label: "Live Classes & Attendance",
    badgeClass: "bg-primary-soft text-primary-text border-primary/30 rounded-full",
  },
  {
    id: "Technical Support",
    label: "Technical Support",
    badgeClass: "bg-danger-soft text-danger border-danger/30 rounded-full",
  },
  {
    id: "Communication & Notifications",
    label: "Communication & Notifications",
    badgeClass: "bg-primary-soft text-primary-text border-primary/30 rounded-full",
  },
  {
    id: "General Help & Feedback",
    label: "General Help & Feedback",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200 rounded-full",
  },
];

// Unified support ticket interface extending the service ticket
export type SupportTicket = ServiceSupportTicket;

// In-memory cache populated from live Supabase queries
let cachedTickets: SupportTicket[] = [];

/**
 * Synchronous accessor for backwards-compatibility.
 * Returns cached records from live database or empty array.
 */
export function getAllSupportTickets(): SupportTicket[] {
  return cachedTickets;
}

/**
 * Synchronous accessor by ID for backwards-compatibility.
 */
export function getSupportTicketById(id?: string): SupportTicket | undefined {
  if (!id) return undefined;
  const cleanId = id.trim().toLowerCase().replace(/^#/, "");
  return cachedTickets.find(
    (t) =>
      t.id.toLowerCase() === cleanId ||
      t.ticketNumber.toLowerCase().replace(/^#/, "") === cleanId ||
      t.id.toLowerCase().includes(cleanId)
  );
}

/**
 * Asynchronous loader that fetches real tickets from Supabase and caches them in memory.
 */
export async function getAllSupportTicketsAsync(): Promise<SupportTicket[]> {
  try {
    const data = await getAllTickets();
    cachedTickets = data;
    return data;
  } catch (err) {
    console.error("Failed to fetch tickets from Supabase:", err);
    return cachedTickets;
  }
}

/**
 * Asynchronous loader for a single ticket by ID.
 */
export async function getSupportTicketByIdAsync(
  id?: string
): Promise<SupportTicket | null> {
  if (!id) return null;
  try {
    const ticket = await getTicketById(id);
    if (ticket) {
      // update cache
      const idx = cachedTickets.findIndex((t) => t.id === ticket.id);
      if (idx >= 0) cachedTickets[idx] = ticket;
      else cachedTickets.push(ticket);
    }
    return ticket;
  } catch (err) {
    console.error("Failed to fetch ticket from Supabase:", err);
    return getSupportTicketById(id) || null;
  }
}
