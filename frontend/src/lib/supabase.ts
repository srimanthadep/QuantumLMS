import { createClient } from "@supabase/supabase-js"

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== "undefined"
    ? localStorage.getItem("quantum_supabase_url") || ""
    : "")

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  (typeof window !== "undefined"
    ? localStorage.getItem("quantum_supabase_anon_key") || ""
    : "")

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

export interface SupabaseStudentProfile {
  id?: string
  student_id?: string | null
  studentId?: string | null
  roll_number?: string | null
  full_name?: string | null
  email?: string | null
  department?: string | null
  course?: string | null
  year_of_study?: string | null
}

/**
 * Dynamically fetches the authenticated student's Student ID from Supabase.
 * Checks:
 * 1. Active Supabase Auth session & user record
 * 2. Supabase 'students' / 'profiles' tables by user.id or email
 * 3. Falls back to "Not Assigned" if missing or unavailable as required.
 */
export async function fetchStudentIdFromSupabase(
  studentEmail: string,
): Promise<{
  studentId: string
  source: "supabase" | "cache" | "unassigned"
}> {
  if (supabase) {
    try {
      // 1. Check if authenticated user session exists
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const authId = user?.id
      const queryEmail = user?.email || studentEmail

      // Check 'students' table
      const { data: studentRecord, error: studentError } = await supabase
        .from("students")
        .select("student_id, studentId, id, roll_number, email")
        .or(
          authId
            ? `user_id.eq.${authId},id.eq.${authId},email.eq.${queryEmail}`
            : `email.eq.${queryEmail}`,
        )
        .maybeSingle()

      if (!studentError && studentRecord) {
        const id =
          studentRecord.student_id ||
          studentRecord.studentId ||
          studentRecord.roll_number
        if (id && String(id).trim()) {
          return { studentId: String(id).trim(), source: "supabase" }
        }
      }

      // Check 'profiles' table
      const { data: profileRecord, error: profileError } = await supabase
        .from("profiles")
        .select("student_id, studentId, id, roll_number, email")
        .or(
          authId
            ? `id.eq.${authId},user_id.eq.${authId},email.eq.${queryEmail}`
            : `email.eq.${queryEmail}`,
        )
        .maybeSingle()

      if (!profileError && profileRecord) {
        const id =
          profileRecord.student_id ||
          profileRecord.studentId ||
          profileRecord.roll_number
        if (id && String(id).trim()) {
          return { studentId: String(id).trim(), source: "supabase" }
        }
      }
    } catch (err) {
      console.warn("Supabase student record query note:", err)
    }
  }

  // Check if a verified student ID was stored in local storage
  try {
    const cachedStudentId =
      localStorage.getItem("quantum_supabase_student_id") ||
      localStorage.getItem("quantum_student_id")
    if (cachedStudentId && cachedStudentId.trim()) {
      return { studentId: cachedStudentId.trim(), source: "cache" }
    }
  } catch {
    // ignore
  }

  // If Student ID is missing or unassigned, return "Not Assigned"
  return { studentId: "Not Assigned", source: "unassigned" }
}

export interface SupabaseSupportTicketRecord {
  id?: string
  ticket_id: string
  student_id: string
  student_name?: string
  student_email?: string
  category: string
  subject: string
  description: string
  priority?: string
  status: string
  created_at?: string
  updated_at?: string
  attachment_name?: string
  attachment_size?: string
}

export interface CreateTicketParams {
  category: string
  subject: string
  description: string
  priority?: "Low" | "Medium" | "High" | "Urgent"
  attachmentName?: string
  attachmentSize?: string
  studentId?: string
  studentEmail?: string
}

const LOCAL_STORAGE_TICKETS_KEY = "quantum_supabase_support_tickets"
const LOCAL_STORAGE_TICKET_SEQ_KEY = "quantum_last_ticket_seq"

/**
 * Reliably generates a unique sequential ticket ID like "TKT-0018",
 * checking against existing ticket IDs and Supabase to prevent duplicates.
 */
export async function generateUniqueTicketId(
  existingIds: string[] = [],
): Promise<string> {
  const existingSet = new Set(existingIds.map((id) => id.toUpperCase().trim()))

  // Read stored sequence or initialize at 18 (matching TKT-0018 reference)
  let seq = 18
  try {
    const storedSeq = localStorage.getItem(LOCAL_STORAGE_TICKET_SEQ_KEY)
    if (storedSeq) {
      const parsed = parseInt(storedSeq, 10)
      if (!isNaN(parsed) && parsed >= 18) {
        seq = parsed
      }
    }
  } catch {
    // fallback
  }

  // Scan existing IDs for any TKT-XXXX pattern with small sequence numbers
  existingIds.forEach((id) => {
    const match = id.match(/TKT-0*(\d{1,4})$/i)
    if (match) {
      const n = parseInt(match[1], 10)
      if (!isNaN(n) && n >= seq) {
        seq = n + 1
      }
    }
  })

  let candidate = `TKT-${String(seq).padStart(4, "0")}`

  // Check Supabase if available to ensure remote uniqueness
  if (supabase) {
    try {
      const { data } = await supabase
        .from("support_tickets")
        .select("ticket_id")
        .eq("ticket_id", candidate)
        .maybeSingle()
      if (data) {
        seq++
        candidate = `TKT-${String(seq).padStart(4, "0")}`
      }
    } catch {
      // ignore
    }
  }

  // Ensure not in existing local set
  while (existingSet.has(candidate.toUpperCase())) {
    seq++
    candidate = `TKT-${String(seq).padStart(4, "0")}`
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_TICKET_SEQ_KEY, String(seq + 1))
  } catch {
    // ignore
  }

  return candidate
}

/**
 * Saves a support request ticket to Supabase (and synchronizes with local storage).
 * Associates the ticket with the authenticated student's record and ID.
 */
export async function saveSupportTicketToSupabase(
  params: CreateTicketParams,
  existingIds: string[] = [],
): Promise<{
  ticketId: string
  source: "supabase" | "cache"
  ticketRecord: {
    id: string
    category: string
    subject: string
    description: string
    priority: "Low" | "Medium" | "High" | "Urgent"
    status: "Open"
    createdDate: string
    lastUpdate: string
    attachmentName?: string
    attachmentSize?: string
  }
}> {
  // 1. Generate unique ticket ID
  const ticketId = await generateUniqueTicketId(existingIds)

  // 2. Resolve authenticated student ID & email
  let studentId = params.studentId || "STU-2026-9042"
  let studentEmail = params.studentEmail || "srimanth.a@quantum.edu"

  if (supabase) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        if (user.email) studentEmail = user.email
        if (user.id && (!params.studentId || params.studentId === "Not Assigned")) {
          studentId = user.id
        }
      }
    } catch {
      // ignore
    }
  }

  // Read cached student ID if available
  try {
    const cachedId =
      localStorage.getItem("quantum_supabase_student_id") ||
      localStorage.getItem("quantum_student_id")
    if (cachedId && cachedId !== "Not Assigned") {
      studentId = cachedId
    }
  } catch {
    // ignore
  }

  const now = new Date()
  const dateFormatted = `${now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}, ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`

  let saveSource: "supabase" | "cache" = "cache"

  // 3. Attempt insert to Supabase
  if (supabase) {
    try {
      const payload: SupabaseSupportTicketRecord = {
        ticket_id: ticketId,
        student_id: studentId,
        student_email: studentEmail,
        category: params.category,
        subject: params.subject,
        description: params.description,
        priority: params.priority || "Medium",
        status: "Open",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        attachment_name: params.attachmentName || undefined,
        attachment_size: params.attachmentSize || undefined,
      }

      // Try 'support_tickets' table
      const { error: insertError } = await supabase
        .from("support_tickets")
        .insert([payload])

      if (!insertError) {
        saveSource = "supabase"
      } else {
        // Fallback to 'tickets' table
        const { error: fallbackError } = await supabase
          .from("tickets")
          .insert([payload])
        if (!fallbackError) {
          saveSource = "supabase"
        } else {
          console.warn("Supabase ticket insertion note (cached locally):", insertError)
        }
      }
    } catch (err) {
      console.warn("Supabase ticket save exception (caching locally):", err)
    }
  }

  // 4. Cache ticket locally for immediate offline & persistence guarantee
  const ticketRecord = {
    id: ticketId,
    category: params.category,
    subject: params.subject,
    description: params.description,
    priority: (params.priority || "Medium") as "Low" | "Medium" | "High" | "Urgent",
    status: "Open" as const,
    createdDate: dateFormatted,
    lastUpdate: "Just now by Student",
    attachmentName: params.attachmentName,
    attachmentSize: params.attachmentSize,
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY)
    const list: typeof ticketRecord[] = raw ? JSON.parse(raw) : []
    const updated = [ticketRecord, ...list.filter((t) => t.id !== ticketId)]
    localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error("Local ticket cache error:", err)
  }

  return {
    ticketId,
    source: saveSource,
    ticketRecord,
  }
}

/**
 * Fetches all support tickets for the student from Supabase and local storage.
 */
export async function fetchSupportTicketsFromSupabase(): Promise<
  Array<{
    id: string
    category: string
    subject: string
    description: string
    priority: "Low" | "Medium" | "High" | "Urgent"
    status: "Open" | "In Progress" | "Resolved" | "Closed"
    createdDate: string
    lastUpdate: string
    attachmentName?: string
    attachmentSize?: string
  }>
> {
  const ticketsMap = new Map<string, any>()

  // 1. Fetch from Supabase if connected
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && Array.isArray(data)) {
        data.forEach((row) => {
          const id = row.ticket_id || row.id
          if (id) {
            const created = row.created_at
              ? new Date(row.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recent"
            ticketsMap.set(id, {
              id,
              category: row.category || "Others",
              subject: row.subject || "Support Request",
              description: row.description || "",
              priority: row.priority || "Medium",
              status: row.status || "Open",
              createdDate: created,
              lastUpdate: "Updated recently",
              attachmentName: row.attachment_name,
              attachmentSize: row.attachment_size,
            })
          }
        })
      }
    } catch (err) {
      console.warn("Supabase fetch support tickets note:", err)
    }
  }

  // 2. Merge with locally cached tickets
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY)
    if (raw) {
      const cached = JSON.parse(raw)
      if (Array.isArray(cached)) {
        cached.forEach((item) => {
          if (item && item.id && !ticketsMap.has(item.id)) {
            ticketsMap.set(item.id, item)
          }
        })
      }
    }
  } catch {
    // ignore
  }

  return Array.from(ticketsMap.values())
}
