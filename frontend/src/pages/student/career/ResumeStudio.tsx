import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, CircleDashed, Download, Mail, MapPin, Phone, Plus, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Textarea } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import CopyButton from "@/components/student/CopyButton"
import { downloadTextFile } from "../studentUtils"
import { atsChecks, atsScore, resumeToText, type ResumeEntry, type ResumeState } from "./careerData"

interface ResumeStudioProps {
  resume: ResumeState
  onChange: (r: ResumeState) => void
  onToast: (msg: string) => void
}

type ListKey = "experience" | "projects" | "education"
const LIST_LABEL: Record<ListKey, { title: string; item: string; org: string; points: string }> = {
  experience: { title: "Experience", item: "Role", org: "Company", points: "Highlights, one per line" },
  projects: { title: "Projects", item: "Project", org: "Stack", points: "What it does and the result" },
  education: { title: "Education", item: "Degree", org: "School", points: "GPA, honours" },
}

export default function ResumeStudio({ resume, onChange, onToast }: ResumeStudioProps) {
  const [skill, setSkill] = useState("")
  const checks = atsChecks(resume)
  const score = atsScore(resume)
  const set = <K extends keyof ResumeState>(k: K, v: ResumeState[K]) => onChange({ ...resume, [k]: v })

  const addSkill = () => {
    const s = skill.trim()
    if (!s || resume.skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setSkill("")
      return
    }
    set("skills", [...resume.skills, s])
    setSkill("")
  }
  const updateEntry = (k: ListKey, id: string, patch: Partial<ResumeEntry>) => set(k, resume[k].map((e) => (e.id === id ? { ...e, ...patch } : e)))
  const addEntry = (k: ListKey) => set(k, [...resume[k], { id: `${k}-${Date.now()}`, title: "", org: "", period: "", points: "" }])
  const removeEntry = (k: ListKey, id: string) => set(k, resume[k].filter((e) => e.id !== id))

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-5">
            <ProgressRing value={score} size={76} thickness={7} tone={score >= 80 ? "success" : score >= 55 ? "warning" : "danger"} label="ATS score">
              <span className="text-lg font-semibold tabular-nums text-foreground">{score}</span>
            </ProgressRing>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">ATS readiness</p>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {checks.map((c) => (
                  <li key={c.id} className="flex items-center gap-1.5 text-caption" title={c.passed ? undefined : c.hint}>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span key={String(c.passed)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring.snappy} className="flex">
                        {c.passed ? <Check className="h-3.5 w-3.5 text-success" aria-label="Done" /> : <CircleDashed className="h-3.5 w-3.5 text-subtle-foreground" aria-label="To do" />}
                      </motion.span>
                    </AnimatePresence>
                    <span className={c.passed ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={resume.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Headline">
              <Input value={resume.headline} onChange={(e) => set("headline", e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={resume.email} onChange={(e) => set("email", e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={resume.phone} onChange={(e) => set("phone", e.target.value)} />
            </Field>
            <Field label="Location">
              <Input value={resume.location} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Links">
              <Input value={resume.links} onChange={(e) => set("links", e.target.value)} placeholder="github.com/you · linkedin.com/in/you" />
            </Field>
            <Field label="Summary" className="sm:col-span-2" hint={`${resume.summary.trim().length} characters · aim for 150–600`}>
              <Textarea value={resume.summary} onChange={(e) => set("summary", e.target.value)} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence initial={false}>
                {resume.skills.map((s) => (
                  <motion.span
                    key={s}
                    layout
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0, transition: transition.fast }}
                    transition={spring.snappy}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pl-2.5 pr-1 text-caption font-medium text-foreground"
                  >
                    {s}
                    <button type="button" aria-label={`Remove ${s}`} onClick={() => set("skills", resume.skills.filter((x) => x !== s))} className="flex rounded-full p-0.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground">
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            <Input
              aria-label="Add a skill"
              placeholder="Type a skill and press Enter"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault()
                  addSkill()
                }
              }}
              trailing={
                <button type="button" aria-label="Add skill" onClick={addSkill} className="flex rounded p-1 text-primary-text">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              }
            />
          </CardContent>
        </Card>

        {(Object.keys(LIST_LABEL) as ListKey[]).map((k) => (
          <Card key={k}>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle>{LIST_LABEL[k].title}</CardTitle>
              <Button variant="ghost" size="sm" leftIcon={<Plus aria-hidden="true" />} onClick={() => addEntry(k)}>
                Add
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3">
              <AnimatePresence initial={false}>
                {resume[k].map((e) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: transition.fast }}
                    transition={transition.base}
                    className="grid gap-2 rounded-md border border-border p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
                      <Input aria-label={LIST_LABEL[k].item} placeholder={LIST_LABEL[k].item} value={e.title} onChange={(ev) => updateEntry(k, e.id, { title: ev.target.value })} />
                      <Input aria-label={LIST_LABEL[k].org} placeholder={LIST_LABEL[k].org} value={e.org} onChange={(ev) => updateEntry(k, e.id, { org: ev.target.value })} />
                      <Input aria-label="Period" placeholder="Period" value={e.period} onChange={(ev) => updateEntry(k, e.id, { period: ev.target.value })} />
                      <Button variant="ghost" size="icon" aria-label={`Remove ${e.title || LIST_LABEL[k].item}`} onClick={() => removeEntry(k, e.id)} className="hover:text-danger">
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                    <Textarea aria-label={LIST_LABEL[k].points} placeholder={LIST_LABEL[k].points} value={e.points} onChange={(ev) => updateEntry(k, e.id, { points: ev.target.value })} className="min-h-[64px]" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="min-w-0 xl:sticky xl:top-0 xl:self-start">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Live preview</p>
          <div className="flex gap-1">
            <CopyButton text={resumeToText(resume)} label="Copy text" onCopied={() => onToast("Resume copied as plain text")} />
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download aria-hidden="true" />}
              onClick={() => {
                downloadTextFile(resumeToText(resume), `${resume.name.replace(/\s+/g, "_") || "Resume"}_Resume.txt`)
                onToast("Resume downloaded")
              }}
            >
              Download
            </Button>
          </div>
        </div>
        <Card className="p-7 shadow-[var(--elev-md)]">
          <header className="border-b border-border pb-4">
            <h2 className="text-h3 text-foreground">{resume.name || "Your name"}</h2>
            <p className="text-sm font-medium text-primary-text">{resume.headline}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-foreground">
              {resume.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" aria-hidden="true" /> {resume.email}
                </span>
              )}
              {resume.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" aria-hidden="true" /> {resume.phone}
                </span>
              )}
              {resume.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" /> {resume.location}
                </span>
              )}
            </p>
            {resume.links && <p className="mt-1 text-caption text-muted-foreground">{resume.links}</p>}
          </header>
          {resume.summary && <PreviewSection title="Summary"><p className="text-sm leading-6 text-foreground">{resume.summary}</p></PreviewSection>}
          {resume.skills.length > 0 && (
            <PreviewSection title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {resume.skills.map((s) => (
                  <Badge key={s} tone="neutral">
                    {s}
                  </Badge>
                ))}
              </div>
            </PreviewSection>
          )}
          {(Object.keys(LIST_LABEL) as ListKey[]).map((k) =>
            resume[k].some((e) => e.title) ? (
              <PreviewSection key={k} title={LIST_LABEL[k].title}>
                <div className="grid gap-3">
                  {resume[k]
                    .filter((e) => e.title)
                    .map((e) => (
                      <div key={e.id}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <p className="text-sm font-semibold text-foreground">
                            {e.title}
                            {e.org && <span className="font-normal text-muted-foreground"> · {e.org}</span>}
                          </p>
                          <p className="text-caption tabular-nums text-subtle-foreground">{e.period}</p>
                        </div>
                        {e.points.trim() && (
                          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm leading-6 text-muted-foreground">
                            {e.points
                              .split("\n")
                              .filter(Boolean)
                              .map((p, i) => (
                                <li key={i}>{p}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ))}
                </div>
              </PreviewSection>
            ) : null,
          )}
        </Card>
      </div>
    </div>
  )
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={cn("border-b border-border py-4 last:border-b-0 last:pb-0")}>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">{title}</h3>
      {children}
    </section>
  )
}
