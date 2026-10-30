import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Captions, Check, FileText, FlaskConical, Maximize2, Pause, Play, RotateCcw, RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui"
import type { LessonItem } from "../studentTypes"
import { formatClock } from "../studentUtils"
import { parseMinutes } from "./courseData"

interface LessonPlayerProps {
  lesson: LessonItem
  moduleTitle: string
  poster: string
  completed: boolean
  onComplete: () => void
}

const SPEEDS = ["0.75", "1", "1.25", "1.5", "2"]

/** Lesson stage: a simulated video player for video lessons, a launch panel for readings and labs. */
export default function LessonPlayer({ lesson, moduleTitle, poster, completed, onComplete }: LessonPlayerProps) {
  const total = Math.max(60, parseMinutes(lesson.duration) * 60)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [speed, setSpeed] = useState("1")
  const [captions, setCaptions] = useState(true)
  const stage = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPlaying(false)
    setPosition(completed ? total : 0)
    // reset only when the lesson changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setPosition((p) => Math.min(total, p + Number(speed))), 1000)
    return () => clearInterval(t)
  }, [playing, speed, total])

  useEffect(() => {
    if (playing && position >= total) {
      setPlaying(false)
      if (!completed) onComplete()
    }
  }, [playing, position, total, completed, onComplete])

  const seek = (e: React.PointerEvent) => {
    const rect = track.current?.getBoundingClientRect()
    if (!rect) return
    setPosition(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * total))
  }
  const skip = (s: number) => setPosition((p) => Math.max(0, Math.min(total, p + s)))
  const pct = position / total

  if (lesson.type !== "video") {
    const Icon = lesson.type === "lab" ? FlaskConical : FileText
    return (
      <div className="relative isolate flex aspect-video w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-ink-950 p-6 text-center">
        <img src={poster} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-25 blur-sm" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />
        <motion.span
          key={lesson.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.soft}
          className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white"
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </motion.span>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-white/80">
          {moduleTitle} · {lesson.type === "lab" ? "Lab" : "Reading"} · {lesson.duration}
        </p>
        <h2 className="mt-1 max-w-lg text-lg font-semibold text-white sm:text-xl">{lesson.title}</h2>
        <p className="mt-1 max-w-md text-sm text-white/80">{lesson.summary}</p>
        <div className="mt-5">
          {completed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white">
              <Check className="h-4 w-4" aria-hidden="true" /> Completed
            </span>
          ) : (
            <Button variant="glass" onClick={onComplete} leftIcon={<Check aria-hidden="true" />}>
              {lesson.type === "lab" ? "I've finished the lab" : "Mark as read"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={stage}
      className={cn(
        "group/player relative isolate aspect-video w-full overflow-hidden rounded-xl border border-border bg-ink-950 transition-shadow duration-300",
        playing && "shadow-[var(--glow-primary)]",
      )}
    >
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className={cn("absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-500", playing ? "opacity-45" : "opacity-60")}
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

      <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/80">{moduleTitle}</p>
          <p className="truncate text-sm font-semibold text-white sm:text-base">{lesson.title}</p>
        </div>
        {completed && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            <Check className="h-3 w-3" aria-hidden="true" /> Watched
          </span>
        )}
      </div>

      <AnimatePresence>
        {!playing && (
          <motion.button
            type="button"
            key="big-play"
            aria-label={position > 0 && position < total ? "Resume lesson" : "Play lesson"}
            onClick={() => {
              if (position >= total) setPosition(0)
              setPlaying(true)
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.15, opacity: 0, transition: transition.fast }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            transition={spring.snappy}
            className="absolute left-1/2 top-1/2 -ml-8 -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink-950 shadow-[0_8px_32px_rgb(0_0_0/0.45)]"
          >
            <Play className="ml-1 h-6 w-6 fill-current" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {playing && captions && (
          <motion.p
            key="captions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={transition.base}
            className="absolute inset-x-6 bottom-20 mx-auto w-fit max-w-[90%] rounded-md bg-black/75 px-3 py-1.5 text-center text-sm text-white"
          >
            {lesson.summary}
          </motion.p>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 transition-opacity duration-200",
          playing ? "opacity-0 focus-within:opacity-100 group-hover/player:opacity-100" : "opacity-100",
        )}
      >
        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`${formatClock(position)} of ${formatClock(total)}`}
          onPointerDown={seek}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") skip(10)
            if (e.key === "ArrowLeft") skip(-10)
          }}
          className="group/track relative h-4 cursor-pointer"
        >
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-1000 ease-linear" style={{ transform: `scaleX(${pct})` }} />
          </div>
          <div
            aria-hidden="true"
            className="absolute top-1/2 -ml-1.5 h-3 w-3 -translate-y-1/2 scale-0 rounded-full bg-white shadow transition-[scale] duration-150 group-hover/track:scale-100"
            style={{ left: `${pct * 100}%` }}
          />
        </div>
        <div className="mt-1 flex items-center gap-1 text-white">
          <PlayerButton label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
          </PlayerButton>
          <PlayerButton label="Back 10 seconds" onClick={() => skip(-10)}>
            <RotateCcw className="h-4 w-4" />
          </PlayerButton>
          <PlayerButton label="Forward 10 seconds" onClick={() => skip(10)}>
            <RotateCw className="h-4 w-4" />
          </PlayerButton>
          <span className="ml-1 text-caption tabular-nums text-white/90">
            {formatClock(position)} / {formatClock(total)}
          </span>
          <span className="flex-1" />
          <PlayerButton label={captions ? "Turn captions off" : "Turn captions on"} onClick={() => setCaptions((c) => !c)} pressed={captions}>
            <Captions className="h-4 w-4" />
          </PlayerButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Playback speed ${speed}x`} className="h-8 rounded-md px-2 text-caption font-semibold tabular-nums text-white transition-colors hover:bg-white/15">
                {speed}x
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[8rem]">
              <DropdownMenuLabel>Speed</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={speed} onValueChange={setSpeed}>
                {SPEEDS.map((s) => (
                  <DropdownMenuRadioItem key={s} value={s}>
                    {s === "1" ? "Normal" : `${s}x`}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <PlayerButton label="Full screen" onClick={() => stage.current?.requestFullscreen?.().catch(() => undefined)}>
            <Maximize2 className="h-4 w-4" />
          </PlayerButton>
        </div>
      </div>
    </div>
  )
}

function PlayerButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      className={cn("flex h-8 w-8 items-center justify-center rounded-md text-white transition-colors hover:bg-white/15", pressed && "bg-white/15")}
    >
      {children}
    </motion.button>
  )
}
