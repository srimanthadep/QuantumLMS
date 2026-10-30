import { motion } from "framer-motion"
import { CalendarClock, Hand, MessageCircleQuestion, Play, Radio, Users, Video } from "lucide-react"
import { Avatar, Badge, Button } from "@/components/ui"
import ProgressRing from "@/components/charts/ProgressRing"
import AnimatedNumber from "@/components/motion/AnimatedNumber"
import CopyButton from "@/components/student/CopyButton"
import { cn } from "@/lib/utils"
import { ease } from "@/lib/motion"
import type { LiveSessionItem } from "@/types"
import { useTeacherData } from "@/pages/teacher/teacherStore"
import { buildRoster, dayLabel, DEMO_DATE, formatTime, formatTimeRange, relativeTo, sessionElapsed } from "@/pages/teacher/teacherUtils"

interface LiveSessionHeroProps {
  session: LiveSessionItem
  /** Enter the studio (live), start the class (today) or open the schedule. */
  onPrimary: () => void
  primaryLabel?: string
  className?: string
}

/**
 * The teacher portal's focal surface: the class that is live right now, or the next one.
 * Dark in both themes, so its text is white.
 */
export default function LiveSessionHero({ session, onPrimary, primaryLabel, className }: LiveSessionHeroProps) {
  const { monitoring, attendance, students, courses } = useTeacherData()
  const live = session.status === "Live Now"
  const course = courses.find((c) => c.id === session.courseId)
  const { elapsed, total, pct } = sessionElapsed(session)
  const enrolled = session.enrolledCount ?? course?.enrolledStudentsCount ?? 0
  const roster = buildRoster(
    attendance.filter((a) => a.sessionId === session.id),
    students,
  )
  // Learners in the room now, counted the same way as the studio roster.
  const present = roster.length ? roster.filter((r) => r.status === "Present" || r.status === "Late").length : enrolled
  // Raised hands waiting in the studio queue (the three most active learners in the room).
  const hands = Math.min(3, roster.filter((r) => r.status === "Present" && r.handRaises > 0).length)
  const faces = students.filter((s) => s.image).slice(0, 5)
  const today = session.scheduledDate === DEMO_DATE
  const label = primaryLabel ?? (live ? "Enter studio" : today ? "Start class" : "View schedule")

  return (
    <section
      aria-label={live ? "Live class" : "Next class"}
      className={cn("relative isolate overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-[var(--glow-primary)]", className)}
    >
      {course?.thumbnail && (
        <img
          src={course.thumbnail}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-full object-cover opacity-[0.16] [mask-image:linear-gradient(90deg,transparent_8%,black_70%)] lg:w-2/3"
        />
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/35 via-ink-950/80 to-ink-950" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-28 -z-10 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-36 left-1/4 -z-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {live ? (
              <Badge tone="live" dot className="text-ink-950">
                Live now
              </Badge>
            ) : (
              <Badge className="border-white/15 bg-white/10 text-white">
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
                Up next
              </Badge>
            )}
            <span className="text-caption font-medium text-white/85">
              {live ? `${elapsed} min in · ${total - elapsed} min left` : `${dayLabel(session.scheduledDate)} · starts ${relativeTo(session.scheduledDate, session.startTime)}`}
            </span>
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
            {session.courseCode}
            {session.batchName ? ` · ${session.batchName}` : ""}
          </p>
          <h2 className="mt-1 max-w-2xl text-[26px] font-semibold leading-tight tracking-tight text-white sm:text-h2">{session.title}</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/85">
            <span>{formatTimeRange(session.startTime, session.endTime)}</span>
            <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/40" />
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5" aria-hidden="true" />
              {session.platform}
            </span>
          </p>

          {live ? (
            <div className="mt-6 max-w-xl">
              <div className="mb-2 flex items-center justify-between text-caption font-medium text-white">
                <span className="tabular-nums">{formatTime(session.startTime)}</span>
                <span className="text-white/80">Class progress</span>
                <span className="tabular-nums">{formatTime(session.endTime)}</span>
              </div>
              <div
                role="progressbar"
                aria-label="Class progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct * 100)}
                className="h-2 overflow-hidden rounded-full bg-white/15"
              >
                <motion.div
                  className="h-full w-full origin-left rounded-full bg-white"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: pct }}
                  transition={{ duration: 0.9, ease: ease.out, delay: 0.2 }}
                />
              </div>
            </div>
          ) : (
            session.classNotes && <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-6 text-white/80">{session.classNotes}</p>
          )}

          {session.topicsCovered && session.topicsCovered.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Topics">
              {session.topicsCovered.slice(0, 4).map((t) => (
                <li key={t} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  {t}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button
              variant="glass"
              size="lg"
              onClick={onPrimary}
              leftIcon={live ? <Radio aria-hidden="true" /> : <Play className="fill-current" aria-hidden="true" />}
              className="border-white/20 bg-white text-ink-950 hover:bg-white/90 dark:bg-white dark:text-ink-950 dark:hover:bg-white/90"
            >
              {label}
            </Button>
            {session.meetingUrl && <CopyButton variant="glass" size="lg" text={session.meetingUrl} label="Copy join link" copiedLabel="Link copied" />}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
            {live ? (
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={monitoring.engagementScore}
                  size={88}
                  thickness={8}
                  tone="success"
                  label="Live engagement"
                  className="[&_svg>circle:first-child]:stroke-white/15"
                >
                  <div className="text-center">
                    <AnimatedNumber value={monitoring.engagementScore} className="block text-xl font-semibold text-white" />
                    <span className="text-[10px] uppercase tracking-wider text-white/80">Engaged</span>
                  </div>
                </ProgressRing>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Engagement is {monitoring.overallStatus.toLowerCase()}</p>
                  <p className="mt-0.5 text-caption leading-5 text-white/80">Now: {monitoring.currentSegmentTitle}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-success">
                    Participation {monitoring.participationTrend.toLowerCase()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-white/15 bg-white/10 text-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">{formatTime(session.startTime).split(" ")[1]}</span>
                  <span className="text-lg font-semibold tabular-nums leading-5 text-white">{formatTime(session.startTime).split(" ")[0]}</span>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{session.durationMinutes} minute class</p>
                  <p className="mt-0.5 text-caption leading-5 text-white/80">Learners get a reminder 15 minutes before it starts.</p>
                </div>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-2" aria-hidden="true">
                {faces.map((s) => (
                  <Avatar key={s.id} src={s.image} name={s.name} size="sm" className="rounded-full ring-2 ring-ink-950 [&_img]:ring-0" />
                ))}
                <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[10px] font-semibold text-white ring-2 ring-ink-950">
                  +{Math.max(0, (live ? present : enrolled) - faces.length)}
                </span>
              </div>
              <span className="text-caption text-white/80">{live ? "in the room" : "enrolled"}</span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {[
                { icon: Users, label: live ? "Present" : "Learners", value: live ? `${present}/${enrolled}` : String(enrolled) },
                { icon: MessageCircleQuestion, label: "Questions", value: live ? String(monitoring.questionsCount) : "0" },
                { icon: Hand, label: "Hands up", value: live ? String(hands) : "0" },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 border-r border-white/10 pr-2 last:border-r-0">
                  <dt className="flex items-center gap-1 truncate text-[10px] font-medium uppercase tracking-wider text-white/75">
                    <stat.icon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {stat.label}
                  </dt>
                  <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}
