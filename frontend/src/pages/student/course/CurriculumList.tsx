import { motion } from "framer-motion"
import { CheckCircle2, Circle, FileText, FlaskConical, Lock, PlayCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/motion"
import { Accordion } from "@/components/ui"
import type { LessonItem, ModuleItem } from "../studentTypes"

interface CurriculumListProps {
  modules: ModuleItem[]
  activeLessonId: string | null
  completed: Set<string>
  unlocked: Set<string>
  onSelect: (lesson: LessonItem, moduleIndex: number) => void
}

const TYPE_ICON = { video: PlayCircle, reading: FileText, lab: FlaskConical }
const TYPE_LABEL = { video: "Video", reading: "Reading", lab: "Lab" }

/** Module accordion with per-lesson status; the active lesson has a sliding highlight. */
export default function CurriculumList({ modules, activeLessonId, completed, unlocked, onSelect }: CurriculumListProps) {
  const activeModule = modules.find((m) => m.lessons.some((l) => l.id === activeLessonId))
  return (
    <Accordion
      multiple
      defaultOpen={activeModule ? [activeModule.id] : []}
      className="rounded-none border-0 bg-transparent"
      items={modules.map((m, mi) => {
        const done = m.lessons.filter((l) => completed.has(l.id)).length
        const all = done === m.lessons.length
        return {
          id: m.id,
          title: (
            <span className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums ring-1 ring-inset",
                  all ? "bg-success-soft text-success ring-success/20" : done > 0 ? "bg-primary-soft text-primary-text ring-primary-border" : "bg-surface-2 text-muted-foreground ring-border",
                )}
              >
                {all ? <CheckCircle2 className="h-3.5 w-3.5" aria-label="Module complete" /> : mi + 1}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{m.title.replace(/^Module \d+:\s*/, "")}</span>
                <span className="block text-caption font-normal text-muted-foreground">
                  {done}/{m.lessons.length} lessons · {m.duration}
                </span>
              </span>
            </span>
          ),
          content: (
            <ul className="-mx-2 flex flex-col gap-0.5">
              {m.lessons.map((l) => {
                const isDone = completed.has(l.id)
                const isOpen = unlocked.has(l.id)
                const active = l.id === activeLessonId
                const TypeIcon = TYPE_ICON[l.type]
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      disabled={!isOpen}
                      onClick={() => onSelect(l, mi)}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors",
                        isOpen ? "hover:bg-surface-2" : "cursor-not-allowed",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="curriculum-active-lesson"
                          transition={spring.snappy}
                          aria-hidden="true"
                          className="absolute inset-0 rounded-md bg-primary-soft ring-1 ring-inset ring-primary-border"
                        />
                      )}
                      <span className="relative flex shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-success" aria-label="Completed" />
                        ) : !isOpen ? (
                          <Lock className="h-4 w-4 text-subtle-foreground" aria-label="Locked" />
                        ) : active ? (
                          <PlayCircle className="h-4 w-4 text-primary-text" aria-label="Current" />
                        ) : (
                          <Circle className="h-4 w-4 text-subtle-foreground" aria-label="Not started" />
                        )}
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <span className={cn("block truncate text-sm", isOpen ? "text-foreground" : "text-subtle-foreground")}>{l.title}</span>
                        <span className="flex items-center gap-1 text-caption text-subtle-foreground">
                          <TypeIcon className="h-3 w-3" aria-hidden="true" />
                          {TYPE_LABEL[l.type]} · {l.duration}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ),
        }
      })}
    />
  )
}
