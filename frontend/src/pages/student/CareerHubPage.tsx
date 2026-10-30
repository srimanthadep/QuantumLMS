import { useEffect, useId, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, FileText, Mic, Users } from "lucide-react"
import { transition } from "@/lib/motion"
import { Button, PageHeader, Progress, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import type { MentorMeetingInfo, StudentNavPage } from "./studentTypes"
import { assignedMentorData } from "./studentMockData"
import { DEFAULT_RESUME, SEED_HISTORY, atsScore, type InterviewSessionResult, type ResumeState } from "./career/careerData"
import InterviewStudio from "./career/InterviewStudio"
import ResumeStudio from "./career/ResumeStudio"
import MentorshipPanel from "./career/MentorshipPanel"

type CareerTab = "interviews" | "resume" | "mentorship"

interface CareerHubPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  onOpenAiModal?: () => void
  initialTab?: CareerTab
}

const RESUME_KEY = "quantum_resume_v2"
const HISTORY_KEY = "quantum_interview_history_v2"

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    // ignore and use the fallback
  }
  return fallback
}

export default function CareerHubPage({ onToast, initialTab = "interviews" }: CareerHubPageProps) {
  const [tab, setTab] = useState<CareerTab>(initialTab)
  const [history, setHistory] = useState<InterviewSessionResult[]>(() => load(HISTORY_KEY, SEED_HISTORY))
  const [resume, setResume] = useState<ResumeState>(() => load(RESUME_KEY, DEFAULT_RESUME))
  const [meeting, setMeeting] = useState<MentorMeetingInfo>(assignedMentorData.meeting ?? { status: "Not Scheduled" })
  const patternId = `career-grid-${useId().replace(/:/g, "")}`

  useEffect(() => {
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify(resume))
    } catch {
      // storage unavailable
    }
  }, [resume])
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)))
    } catch {
      // storage unavailable
    }
  }, [history])

  const metrics = useMemo(() => {
    const recent = history.slice(0, 3)
    const interview = recent.length ? Math.round(recent.reduce((s, h) => s + h.score, 0) / recent.length) : 0
    const ats = atsScore(resume)
    const mentorship = meeting.status === "Scheduled" ? 100 : 40
    return [
      { id: "interviews" as const, label: "Interview practice", value: interview, icon: Mic, action: "Practise an interview" },
      { id: "resume" as const, label: "Resume strength", value: ats, icon: FileText, action: "Improve your resume" },
      { id: "mentorship" as const, label: "Mentorship", value: mentorship, icon: Users, action: "Book a mentor session" },
    ]
  }, [history, resume, meeting])
  const readiness = Math.round(metrics[0].value * 0.4 + metrics[1].value * 0.4 + metrics[2].value * 0.2)
  const weakest = [...metrics].sort((a, b) => a.value - b.value)[0]

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Career" title="Career Hub" description="Practise interviews, polish your resume and meet your mentor." />

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition.base}
        aria-label="Career readiness"
        className="relative mb-6 overflow-hidden rounded-xl border border-border bg-ink-950 p-6 sm:p-8"
      >
        <svg className="absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
          <defs>
            <pattern id={patternId} width="28" height="28" patternUnits="userSpaceOnUse">
              <path d="M 28 0 L 0 0 0 28" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
        <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-primary/35 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 right-10 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
          <div className="flex items-center gap-5">
            <ProgressRing value={readiness} size={120} thickness={10} label="Career readiness" className="[&_svg>circle:first-child]:stroke-white/15">
              <div className="text-center">
                <p className="text-3xl font-semibold tabular-nums text-white">{readiness}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/80">Readiness</p>
              </div>
            </ProgressRing>
            <div className="lg:hidden">
              <p className="text-lg font-semibold text-white">{readiness >= 75 ? "You're nearly placement-ready" : "Let's build your readiness"}</p>
              <p className="text-sm text-white/80">Weakest area: {weakest.label.toLowerCase()}</p>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="hidden lg:block">
              <p className="text-lg font-semibold text-white">{readiness >= 75 ? "You're nearly placement-ready" : "Let's build your readiness"}</p>
              <p className="text-sm text-white/80">Based on your last 3 interviews, your resume's ATS checks and mentor contact.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTab(m.id)}
                  className="group rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-white/25 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between text-caption text-white/80">
                    <span className="flex items-center gap-1.5">
                      <m.icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {m.label}
                    </span>
                    <span className="font-semibold tabular-nums text-white">{m.value}</span>
                  </div>
                  <Progress value={m.value} size="xs" className="mt-2 bg-white/10 ring-white/10" label={m.label} />
                </button>
              ))}
            </div>
          </div>
          <Button variant="glass" size="lg" rightIcon={<ArrowRight aria-hidden="true" />} onClick={() => setTab(weakest.id)}>
            {weakest.action}
          </Button>
        </div>
      </motion.section>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CareerTab)}>
        <TabsList aria-label="Career tools">
          <TabsTrigger value="interviews">
            <Mic className="h-4 w-4" aria-hidden="true" />
            Mock interviews
          </TabsTrigger>
          <TabsTrigger value="resume">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Resume
          </TabsTrigger>
          <TabsTrigger value="mentorship">
            <Users className="h-4 w-4" aria-hidden="true" />
            Mentorship
          </TabsTrigger>
        </TabsList>
        <TabsContent value="interviews" className="mt-5">
          <InterviewStudio history={history} onSaveSession={(s) => setHistory((h) => [s, ...h])} onToast={onToast} />
        </TabsContent>
        <TabsContent value="resume" className="mt-5">
          <ResumeStudio resume={resume} onChange={setResume} onToast={onToast} />
        </TabsContent>
        <TabsContent value="mentorship" className="mt-5">
          <MentorshipPanel meeting={meeting} onMeetingChange={setMeeting} onToast={onToast} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
