import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CloudOff, RotateCcw } from "lucide-react"
import { useSession } from "@/app/session"
import RouteFallback from "@/app/RouteFallback"
import { Button, EmptyState } from "@/components/ui"
import { useToast } from "@/components/ui/toast"
import { DEMO_STUDENT, isDemoStudentEmail, isSupabaseConfigured, supabase, toApiError } from "@/lib/supabase"
import type { CourseItem } from "../studentTypes"
import * as actions from "./actions"
import { deriveCore, loadAttempts, loadCore, type CoreRaw, type CoreView, type Profile } from "./core"
import { loadNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRow } from "./notifications"
import { clearAll, mutate, peek, refresh, useResource, type Resource } from "./resource"

/* ------------------------------ Session gate ------------------------------ */

type GateState = { status: "checking" } | { status: "ready"; uid: string } | { status: "error"; message: string }

function FullPageError({ title, message, onRetry, onBack }: { title: string; message: string; onRetry: () => void; onBack?: () => void }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-6">
      <EmptyState
        icon={<CloudOff aria-hidden="true" />}
        title={title}
        description={message}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={onRetry} leftIcon={<RotateCcw aria-hidden="true" />}>
              Try again
            </Button>
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                Back to sign in
              </Button>
            )}
          </div>
        }
      />
    </div>
  )
}

/**
 * Makes sure a Supabase session exists before the portal renders. Demo sessions (role switcher, quick launch) sign
 * in the shared demo student; a real student whose sign-in expired goes back to the sign-in page.
 */
function SessionGate({ children }: { children: (uid: string) => ReactNode }) {
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [state, setState] = useState<GateState>({ status: "checking" })
  const uidRef = useRef<string | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session
  const hereRef = useRef("")
  hereRef.current = location.pathname + location.search

  const toSignIn = useCallback(() => {
    sessionRef.current.logout()
    navigate(`/auth?redirect=${encodeURIComponent(hereRef.current || "/student")}`, { replace: true })
  }, [navigate])

  const check = useCallback(async () => {
    setState({ status: "checking" })
    if (!isSupabaseConfigured) {
      setState({ status: "error", message: "The student backend isn't configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local." })
      return
    }
    try {
      let current = (await supabase.auth.getSession()).data.session
      if (!current) {
        if (!isDemoStudentEmail(sessionRef.current.user.email)) {
          toSignIn()
          return
        }
        const { data, error } = await supabase.auth.signInWithPassword(DEMO_STUDENT)
        if (error || !data.session) throw error ?? new Error("Sign-in failed")
        current = data.session
      }
      uidRef.current = current.user.id
      setState({ status: "ready", uid: current.user.id })
    } catch (e) {
      setState({ status: "error", message: toApiError(e as { message: string }, "We couldn't sign you in to the student portal.").message })
    }
  }, [toSignIn])

  useEffect(() => {
    void check()
  }, [check])

  // Signing out in another tab, or in as someone else, is reflected here. Deferred: Supabase calls inside the
  // callback would wait on the auth lock that is still held.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setTimeout(() => {
        if (event === "SIGNED_OUT") {
          if (!uidRef.current) return
          uidRef.current = null
          clearAll()
          if (sessionRef.current.isAuthenticated && sessionRef.current.role === "Student") toSignIn()
          return
        }
        if (s && uidRef.current && s.user.id !== uidRef.current) {
          uidRef.current = s.user.id
          setState({ status: "ready", uid: s.user.id })
        }
      }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [toSignIn])

  if (state.status === "checking") return <RouteFallback />
  if (state.status === "error") return <FullPageError title="The student portal can't connect" message={state.message} onRetry={() => void check()} onBack={toSignIn} />
  return <>{children(state.uid)}</>
}

/* ------------------------------ Data context ------------------------------ */

interface StudentActions {
  reloadCore: () => Promise<void>
  enroll: (course: CourseItem) => Promise<void>
  setLessonComplete: (lessonId: string, done: boolean) => Promise<actions.LessonResult>
  submitAssignment: (assignmentId: string, input: actions.SubmissionInput) => Promise<void>
  /** Records a started attempt so leaving and coming back resumes it. */
  quizStarted: (quizId: string, live: actions.LiveQuiz) => void
  quizSubmitted: (review: actions.QuizReview) => void
  updateProfile: (patch: actions.ProfilePatch) => Promise<Profile>
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  /** Asks every cached resource whose name starts with the prefix to reload (e.g. "grades"). */
  refresh: (name: string) => void
}

interface StudentData extends StudentActions {
  uid: string
  profile: Profile
  raw: CoreRaw
  view: CoreView
  isDemo: boolean
  /** Ticks every minute so time-based states (quiz windows, live classes) stay current. */
  now: number
  notifications: NotificationRow[]
}

const StudentDataContext = createContext<StudentData | null>(null)

export function useStudentData(): StudentData {
  const ctx = useContext(StudentDataContext)
  if (!ctx) throw new Error("useStudentData must be used inside <StudentDataProvider>")
  return ctx
}

/** A per-student cached resource (see resource.ts). The name doubles as the refresh prefix. */
export function useStudentResource<T>(name: string | null, loader: () => Promise<T>, staleMs?: number): Resource<T> {
  const { uid } = useStudentData()
  return useResource(name ? `${uid}:${name}` : null, loader, staleMs)
}

function DataLoader({ uid, children }: { uid: string; children: ReactNode }) {
  const { updateUser } = useSession()
  const toast = useToast()
  const coreKey = `${uid}:core`
  const notesKey = `${uid}:notifications`
  const core = useResource(coreKey, () => loadCore(uid), 120_000)
  const notifications = useResource(notesKey, loadNotifications, 30_000)
  const [now, setNow] = useState(() => Date.now())
  const lessonQueue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    const poll = setInterval(() => refresh(notesKey), 60_000)
    const onFocus = () => {
      setNow(Date.now())
      refresh(notesKey)
    }
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [notesKey])

  // Keep the shell's name, avatar and email in step with the backend profile.
  const raw = core.data
  const profile = raw?.profile
  useEffect(() => {
    if (profile) updateUser({ id: profile.id, name: profile.full_name, email: profile.email, avatar: profile.avatar_url ?? undefined, title: profile.headline })
  }, [profile, updateUser])

  const reloadCoreResource = core.reload
  const actionsValue = useMemo<StudentActions>(() => {
    const patch = (fn: (r: CoreRaw) => CoreRaw) => mutate<CoreRaw>(coreKey, fn)
    const refreshName = (name: string) => refresh(`${uid}:${name}`)
    const setNotifications = (fn: (list: NotificationRow[]) => NotificationRow[]) => mutate<NotificationRow[]>(notesKey, fn)
    return {
      refresh: refreshName,
      reloadCore: async () => {
        await reloadCoreResource()
      },
      enroll: async (course) => {
        const at = await actions.enroll(course.id)
        patch((r) => ({ ...r, enrollments: { ...r.enrollments, [course.id]: at } }))
        refreshName("grades")
      },
      // Optimistic: the lesson flips at once and flips back if the server refuses. Calls run one at a time so quick
      // toggles reach the server in order.
      setLessonComplete: (lessonId, done) => {
        const setProgress = (at: string | undefined) =>
          patch((r) => {
            const progress = { ...r.progress }
            if (at) progress[lessonId] = at
            else delete progress[lessonId]
            return { ...r, progress }
          })
        const before = peek<CoreRaw>(coreKey)?.progress[lessonId]
        setProgress(done ? (before ?? new Date().toISOString()) : undefined)
        const run = lessonQueue.current.then(() => actions.setLessonComplete(lessonId, done))
        lessonQueue.current = run.catch(() => undefined)
        return run.then(
          (result) => {
            refreshName("activity")
            if (result.certificate) {
              refreshName("grades")
              refreshName("notifications")
            }
            return result
          },
          (e: unknown) => {
            setProgress(before)
            throw e
          },
        )
      },
      submitAssignment: async (assignmentId, input) => {
        const row = await actions.submitAssignment(uid, assignmentId, input)
        patch((r) => ({ ...r, submissions: { ...r.submissions, [assignmentId]: row } }))
        refreshName("notifications")
      },
      quizStarted: (quizId, live) =>
        patch((r) =>
          r.attempts.some((a) => a.id === live.attemptId)
            ? r
            : {
                ...r,
                attempts: [
                  ...r.attempts,
                  {
                    id: live.attemptId,
                    quiz_id: quizId,
                    attempt_number: live.attemptNumber,
                    started_at: new Date().toISOString(),
                    deadline_at: new Date(live.deadline).toISOString(),
                    submitted_at: null,
                    time_taken_seconds: null,
                    score: null,
                    max_score: null,
                    pct: null,
                    passed: null,
                    feedback: null,
                    answers: {},
                  },
                ],
              },
        ),
      quizSubmitted: (review) => {
        patch((r) => ({ ...r, attempts: [...r.attempts.filter((a) => a.id !== review.row.id), review.row] }))
        refreshName("notifications")
        // Picks up the server's grading of any other attempt that expired meanwhile.
        loadAttempts()
          .then((attempts) => patch((r) => ({ ...r, attempts })))
          .catch(() => undefined)
      },
      updateProfile: async (p) => {
        const next = await actions.updateProfile(uid, p)
        patch((r) => ({ ...r, profile: next }))
        return next
      },
      markNotificationRead: (id) => {
        setNotifications((list) => list.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)))
        markNotificationRead(id).catch((e) => toast.error(toApiError(e).message))
      },
      markAllNotificationsRead: () => {
        const at = new Date().toISOString()
        setNotifications((list) => list.map((n) => (n.read_at ? n : { ...n, read_at: at })))
        markAllNotificationsRead().catch((e) => toast.error(toApiError(e).message))
      },
    }
  }, [uid, coreKey, notesKey, reloadCoreResource, toast])

  const view = useMemo(() => (raw ? deriveCore(raw, now) : null), [raw, now])
  const notificationRows = notifications.data
  const value = useMemo<StudentData | null>(
    () =>
      raw && view
        ? {
            ...actionsValue,
            uid,
            profile: raw.profile,
            raw,
            view,
            isDemo: raw.profile.is_demo || isDemoStudentEmail(raw.profile.email),
            now,
            notifications: notificationRows ?? [],
          }
        : null,
    [actionsValue, uid, raw, view, now, notificationRows],
  )

  if (core.error && !raw) return <FullPageError title="Your student data didn't load" message={core.error.message} onRetry={() => void core.reload()} />
  if (!value) return <RouteFallback />
  return <StudentDataContext.Provider value={value}>{children}</StudentDataContext.Provider>
}

/** Signs the student in (when needed) and loads their data before rendering the portal. */
export default function StudentDataProvider({ children }: { children: ReactNode }) {
  return (
    <SessionGate>
      {(uid) => (
        <DataLoader key={uid} uid={uid}>
          {children}
        </DataLoader>
      )}
    </SessionGate>
  )
}
