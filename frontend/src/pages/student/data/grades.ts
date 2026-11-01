import { supabase, unwrap, type Tables } from "@/lib/supabase"
import type { CertificateItem, CourseItem, GradeItem } from "../studentTypes"

export interface GradesData {
  grades: GradeItem[]
  gpaHistory: { term: string; gpa: number }[]
  certificates: Tables<"certificates">[]
}

export async function loadGrades(): Promise<GradesData> {
  const [grades, gpa, certs] = await Promise.all([
    supabase.from("grades").select("*").order("position"),
    supabase.from("gpa_history").select("term, gpa, position").order("position"),
    supabase.from("certificates").select("*").order("issued_at", { ascending: false, nullsFirst: false }),
  ])
  return {
    grades: unwrap(grades).map((g) => ({
      id: g.id,
      courseCode: g.course_code,
      courseTitle: g.course_title,
      credits: g.credits,
      midterm: Number(g.midterm),
      assignments: Number(g.assignments),
      finalExam: Number(g.final_exam),
      totalScore: Number(g.total_score),
      letterGrade: g.letter_grade as GradeItem["letterGrade"],
      status: g.status as GradeItem["status"],
      term: g.term,
    })),
    gpaHistory: unwrap(gpa).map((r) => ({ term: r.term, gpa: Number(r.gpa) })),
    certificates: unwrap(certs),
  }
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

/** Certificates with live progress for the ones still in progress (from the student's course progress). */
export function toCertificates(rows: Tables<"certificates">[], courses: CourseItem[]): CertificateItem[] {
  const progress = new Map(courses.map((c) => [c.id, c.progress]))
  return rows.map((c) => {
    const earned = c.status === "Earned"
    const pct = c.course_id ? (progress.get(c.course_id) ?? 0) : 0
    return {
      id: c.id,
      courseId: c.course_id,
      title: c.title,
      course: c.course_title,
      issueDate: earned && c.issued_at ? longDate(c.issued_at) : (c.expected_label ?? "In progress"),
      credentialId: c.credential_id ?? "Pending",
      grade: earned ? (c.grade ?? "Completed") : `In Progress (${pct}% Complete)`,
      skills: c.skills,
      status: earned ? "Earned" : "In Progress",
      progress: earned ? 100 : pct,
    }
  })
}

const POINTS: Record<GradeItem["letterGrade"], number> = { "A+": 4, A: 4, "A-": 3.7, "B+": 3.3, B: 3 }

/** Credit-weighted GPA of the given grades on a 4-point scale. */
export function gpaOf(grades: GradeItem[]): number | null {
  const credits = grades.reduce((s, g) => s + g.credits, 0)
  if (!credits) return null
  return Math.round((grades.reduce((s, g) => s + POINTS[g.letterGrade] * g.credits, 0) / credits) * 100) / 100
}

/** The public page that verifies a credential. */
export const verifyUrl = (credentialId: string) => `${window.location.origin}/verify/${encodeURIComponent(credentialId)}`
