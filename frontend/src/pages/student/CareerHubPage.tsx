import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, FileText, Mic, Users } from "lucide-react"
import { transition } from "@/lib/motion"
import { Button, EmptyState, PageHeader, Progress, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import type { StudentNavPage } from "./studentTypes"
import { atsScore, type ResumeState } from "./career/careerData"
import InterviewStudio from "./career/InterviewStudio"
import ResumeStudio from "./career/ResumeStudio"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import { loadCareer, saveInterview, saveResume, starterResume, type CareerData } from "./data/career"

type CareerTab = "interviews" | "resume"

interface CareerHubPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  onOpenAiModal?: () => void
  initialTab?: CareerTab
}

export default function CareerHubPage({ onToast, initialTab = "interviews" }: CareerHubPageProps) {
  const { profile, isDemo } = useStudentData()
  const res = useStudentResource<CareerData>("career", loadCareer, 120_000)
  const [tab, setTab] = useState<CareerTab>(initialTab)
  const patternId = `career-grid-${useId().replace(/:/g, "")}`
  const { mutate } = res

  // The resume edits locally and saves a moment after typing stops.
  const [draft, setDraft] = useState<ResumeState | null>(null)
  const [resumeState, setResumeState] = useState<"saved" | "saving" | "error">("saved")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<ResumeState | null>(null)
  const resume = draft ?? res.data?.resume ?? starterResume(profile, isDemo)
  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    const next = pending.current
    if (!next) return
    pending.current = null
    setResumeState("saving")
    try {
      await saveResume(next)
      mutate((d) => ({ ...d, resume: next }))
      setResumeState(pending.current ? "saving" : "saved")
    } catch {
      pending.current ??= next
      setResumeState("error")
    }
  }, [mutate])
  const changeResume = (r: ResumeState) => {
    setDraft(r)
    pending.current = r
    setResumeState("saving")
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void flush(), 900)
  }
  // Leaving the page saves what's pending.
  useEffect(() => () => void flush(), [flush])

  const history = useMemo(() => res.data?.sessions ?? [], [res.data])

  const metrics = useMemo(() => {
    const recent = history.slice(0, 3)
    const interview = recent.length ? Math.round(recent.reduce((s, h) => s + h.score, 0) / recent.length) : 0
    const ats = atsScore(resume)
    return [
      { id: "interviews" as const, label: "Interview practice", value: interview, icon: Mic, action: "Practise an interview" },
      { id: "resume" as const, label: "Resume strength", value: ats, icon: FileText, action: "Improve your resume" },
    ]
  }, [history, resume])
  const readiness = Math.round(metrics[0].value * 0.5 + metrics[1].value * 0.5)
  const weakest = [...metrics].sort((a, b) => a.value - b.value)[0]

  if (res.error && !res.data) {
    return (
      <div className="flex flex-col">
        <PageHeader eyebrow="Career" title="Career Hub" description="Practise interviews and polish your resume." />
        <EmptyState
          icon={<Users aria-hidden="true" />}
          title="The Career Hub didn't load"
          description={res.error.message}
          action={
            <Button variant="secondary" onClick={() => void res.reload()}>
              Try again
            </Button>
          }
        />
      </div>
    )
  }
  if (!res.data) {
    return (
      <div className="flex flex-col gap-5" role="status" aria-label="Loading the Career Hub">
        <Skeleton className="h-16 w-1/3" />
        <Skeleton className="h-48" />
        <Skeleton className="h-80" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader eyebrow="Career" title="Career Hub" description="Practise interviews and polish your resume." />

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
              <p className="text-sm text-white/80">Based on your last 3 interviews and your resume's ATS checks.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
        </TabsList>
        <TabsContent value="interviews" className="mt-5">
          <InterviewStudio
            history={history}
            onSaveSession={async (s) => {
              const saved = await saveInterview(s)
              mutate((d) => ({ ...d, sessions: [saved, ...d.sessions] }))
              return saved
            }}
            onToast={onToast}
          />
        </TabsContent>
        <TabsContent value="resume" className="mt-5">
          <p className="mb-3 text-caption text-muted-foreground" aria-live="polite">
            {resumeState === "saving" ? "Saving…" : resumeState === "error" ? "Not saved yet. We'll retry when you make the next change." : "All changes saved to your account."}
          </p>
          <ResumeStudio resume={resume} onChange={changeResume} onToast={onToast} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
