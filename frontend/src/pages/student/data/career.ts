import { supabase, unwrap, type Json, type Tables } from "@/lib/supabase"
import type { InterviewType, MentorProfile } from "../studentTypes"
import { fmtDate } from "../studentUtils"
import { DEFAULT_RESUME, type InterviewSessionResult, type ResumeState } from "../career/careerData"
import type { Profile } from "./core"

export type MentorRow = Tables<"mentors">
export type MeetingRow = Tables<"mentor_meetings">

export interface CareerData {
  /** Null until the student saves their first resume. */
  resume: ResumeState | null
  sessions: InterviewSessionResult[]
  mentors: MentorRow[]
  meetings: MeetingRow[]
  /** Mentor ids the student asked for mentorship. */
  requested: string[]
}

function toSession(r: Tables<"interview_sessions">): InterviewSessionResult {
  return {
    id: r.id,
    date: fmtDate(r.created_at),
    role: r.role,
    type: r.type as InterviewType,
    level: r.level,
    score: r.score,
    durationSeconds: r.duration_seconds,
    responses: Array.isArray(r.responses) ? (r.responses as unknown as InterviewSessionResult["responses"]) : [],
  }
}

function isResume(v: unknown): v is ResumeState {
  return !!v && typeof v === "object" && Array.isArray((v as ResumeState).skills) && Array.isArray((v as ResumeState).experience)
}

export async function loadCareer(): Promise<CareerData> {
  const [resume, sessions, mentors, meetings, requests] = await Promise.all([
    supabase.from("resumes").select("data").maybeSingle(),
    supabase.from("interview_sessions").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("mentors").select("*").order("position"),
    supabase.from("mentor_meetings").select("*"),
    supabase.from("mentor_requests").select("mentor_id"),
  ])
  const data = unwrap(resume)?.data
  return {
    resume: isResume(data) ? data : null,
    sessions: unwrap(sessions).map(toSession),
    mentors: unwrap(mentors),
    meetings: unwrap(meetings),
    requested: unwrap(requests).map((r) => r.mentor_id),
  }
}

/** A starting resume from the profile (the demo student starts from the sample resume). */
export function starterResume(profile: Profile, isDemo: boolean): ResumeState {
  if (isDemo) return DEFAULT_RESUME
  return {
    name: profile.full_name,
    headline: profile.headline === "Learner" ? "" : profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    links: "",
    summary: profile.bio,
    skills: [],
    experience: [],
    projects: [],
    education: [{ id: "education-1", title: profile.program, org: "Quantum School of AI", period: profile.batch, points: "" }],
  }
}

export async function saveResume(resume: ResumeState) {
  unwrap(await supabase.from("resumes").upsert({ data: resume as unknown as Json }, { onConflict: "student_id" }).select("student_id"), "Your resume couldn't be saved.")
}

export async function saveInterview(s: Omit<InterviewSessionResult, "id" | "date">): Promise<InterviewSessionResult> {
  // Answers are capped so a session stays well under the 64 KB row limit.
  const responses = s.responses.map((r) => ({ ...r, answer: r.answer.slice(0, 4000) }))
  const row = unwrap(
    await supabase
      .from("interview_sessions")
      .insert({ role: s.role, type: s.type, level: s.level, score: s.score, duration_seconds: s.durationSeconds, responses: responses as unknown as Json })
      .select("*")
      .single(),
    "The interview couldn't be saved.",
  )
  return toSession(row)
}

export async function bookMeeting(mentorId: string, date: string, slot: string, topic: string, agenda: string): Promise<MeetingRow> {
  const res = await supabase.rpc("book_mentor_meeting", { p_mentor_id: mentorId, p_date: date, p_slot: slot, p_topic: topic, p_agenda: agenda.trim() || undefined })
  return unwrap(res, "The session couldn't be booked.")
}

export async function cancelMeeting(mentorId: string) {
  const { error } = await supabase.rpc("cancel_mentor_meeting", { p_mentor_id: mentorId })
  if (error) throw new Error(error.message)
}

export async function requestMentor(mentorId: string) {
  unwrap(await supabase.from("mentor_requests").upsert({ mentor_id: mentorId }, { onConflict: "student_id,mentor_id", ignoreDuplicates: true }).select("mentor_id"), "The request couldn't be sent.")
}

export async function withdrawMentorRequest(mentorId: string) {
  unwrap(await supabase.from("mentor_requests").delete().eq("mentor_id", mentorId).select("mentor_id"))
}

export function toMentorProfile(m: MentorRow): MentorProfile {
  return {
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    title: m.title,
    department: m.department,
    email: m.email,
    phone: m.phone,
    office: m.office,
    bio: m.bio,
    specializations: m.specializations,
    officeHours: m.office_hours,
    availabilityStatus: m.availability as MentorProfile["availabilityStatus"],
    assignedStudents: [],
  }
}
