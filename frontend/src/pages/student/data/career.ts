import { api, type Tables } from "@/lib/api"
import type { InterviewType } from "../studentTypes"
import { fmtDate } from "../studentUtils"
import { DEFAULT_RESUME, type InterviewSessionResult, type ResumeState } from "../career/careerData"
import type { Profile } from "./core"

export interface CareerData {
  /** Null until the student saves their first resume. */
  resume: ResumeState | null
  sessions: InterviewSessionResult[]
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
  const r = await api.get<{ resume: unknown; sessions: Tables<"interview_sessions">[] }>("/student/career")
  return { resume: isResume(r.resume) ? r.resume : null, sessions: r.sessions.map(toSession) }
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
