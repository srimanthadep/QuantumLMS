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
