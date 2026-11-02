import { api, type Tables } from "@/lib/api"
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
  const r = await api.get<{ resume: unknown; sessions: Tables<"interview_sessions">[]; mentors: MentorRow[]; meetings: MeetingRow[]; requested: string[] }>("/student/career")
  return { resume: isResume(r.resume) ? r.resume : null, sessions: r.sessions.map(toSession), mentors: r.mentors, meetings: r.meetings, requested: r.requested }
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
  await api.put("/student/resume", { data: resume }, "Your resume couldn't be saved.")
}

export async function saveInterview(s: Omit<InterviewSessionResult, "id" | "date">): Promise<InterviewSessionResult> {
  // Answers are capped so a session stays well under the 64 KB row limit.
  const responses = s.responses.map((r) => ({ ...r, answer: r.answer.slice(0, 4000) }))
  const row = await api.post<Tables<"interview_sessions">>(
    "/student/interview-sessions",
    { role: s.role, type: s.type, level: s.level, score: s.score, duration_seconds: s.durationSeconds, responses },
    "The interview couldn't be saved.",
  )
  return toSession(row)
}

export async function bookMeeting(mentorId: string, date: string, slot: string, topic: string, agenda: string): Promise<MeetingRow> {
  return api.post<MeetingRow>(`/student/mentors/${encodeURIComponent(mentorId)}/meeting`, { date, slot, topic, agenda: agenda.trim() || undefined }, "The session couldn't be booked.")
}

export async function cancelMeeting(mentorId: string) {
  await api.del(`/student/mentors/${encodeURIComponent(mentorId)}/meeting`, "The session couldn't be cancelled.")
}

export async function requestMentor(mentorId: string) {
  await api.put(`/student/mentors/${encodeURIComponent(mentorId)}/request`, { on: true }, "The request couldn't be sent.")
}

export async function withdrawMentorRequest(mentorId: string) {
  await api.put(`/student/mentors/${encodeURIComponent(mentorId)}/request`, { on: false })
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
