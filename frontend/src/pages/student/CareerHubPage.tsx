import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Briefcase, CheckCircle2, FileText, Mic, Search, Trophy, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { Badge, Button, Card, CardContent, EmptyState, Input, PageHeader, Progress, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import type { StudentNavPage } from "./studentTypes"
import { atsScore, type ResumeState } from "./career/careerData"
import InterviewStudio from "./career/InterviewStudio"
import ResumeStudio from "./career/ResumeStudio"
import { useStudentData, useStudentResource } from "./data/StudentDataProvider"
import { loadCareer, saveInterview, saveResume, starterResume, type CareerData } from "./data/career"
import CompanyLogo from "@/components/shared/CompanyLogo"
import { RECENT_PLACEMENTS } from "@/components/student/RecentPlacementsCard"
import { COMPANY_BRANDS } from "@/lib/companyLogos"

type CareerTab = "interviews" | "resume" | "placements"

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
  const [placementSearch, setPlacementSearch] = useState("")
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("All")
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

  const filteredPlacements = useMemo(() => {
    return RECENT_PLACEMENTS.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(placementSearch.toLowerCase()) ||
        item.company.toLowerCase().includes(placementSearch.toLowerCase())
      const matchCompany =
        selectedCompanyFilter === "All" || item.company === selectedCompanyFilter
      return matchSearch && matchCompany
    })
  }, [placementSearch, selectedCompanyFilter])

  const placementCompanies = useMemo(() => {
    const list = Array.from(new Set(RECENT_PLACEMENTS.map((p) => p.company)))
    return ["All", ...list]
  }, [])

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

      {/* Hiring Partners Logo Banner */}
      <section aria-label="Alumni hiring partners" className="mb-6 rounded-xl border border-border bg-surface p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary-text font-bold text-xs">
              <Briefcase className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Alumni Hiring Partners
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Our graduates build and deploy AI systems at top engineering organizations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {COMPANY_BRANDS.map((brand) => (
            <button
              key={brand.id}
              type="button"
              onClick={() => {
                setTab("placements")
                setSelectedCompanyFilter(brand.name)
              }}
              className="group flex items-center gap-2 rounded-lg border border-border/70 bg-surface-2/60 px-2.5 py-1.5 transition-all hover:bg-surface-2 hover:border-border-strong hover:scale-[1.02]"
              title={`View ${brand.name} placements`}
            >
              <CompanyLogo name={brand.name} size="xs" />
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                {brand.name}
              </span>
            </button>
          ))}
        </div>
      </section>

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
          <TabsTrigger value="placements">
            <Trophy className="h-4 w-4" aria-hidden="true" />
            Alumni Placements
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
        <TabsContent value="placements" className="mt-5">
          <div className="flex flex-col gap-5">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={placementSearch}
                  onChange={(e) => setPlacementSearch(e.target.value)}
                  placeholder="Search alumni or company..."
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {placementCompanies.slice(0, 10).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCompanyFilter(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-full font-semibold shrink-0 transition-colors",
                      selectedCompanyFilter === c
                        ? "bg-primary text-white"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Placements Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlacements.map((item, idx) => {
                const parts = item.name.trim().split(/\s+/)
                const initials = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
                return (
                  <Card key={`${item.name}-${idx}`} className="overflow-hidden border border-border/80 hover:border-border-strong transition-all hover:shadow-xs">
                    <CardContent className="p-4 flex flex-col justify-between h-full gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-10 w-10 shrink-0 rounded-lg bg-primary-soft text-primary-text font-bold grid place-items-center text-sm shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-foreground truncate">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">Quantum AI Alum</p>
                          </div>
                        </div>

                        {/* Official Company Logo (Clean, no badge background) */}
                        <CompanyLogo name={item.company} size="sm" variant="plain" className="h-6 max-w-[64px] shrink-0" />
                      </div>

                      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 mt-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          <span className="text-xs font-bold" style={{ color: item.color === "#111" ? "var(--foreground)" : item.color }}>
                            {item.company}
                          </span>
                        </div>
                        <Badge tone="success" size="sm" className="text-[10px]">
                          Verified
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
