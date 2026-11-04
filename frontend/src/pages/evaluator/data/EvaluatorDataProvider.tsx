import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import CognitoGate, { FullPageError } from "@/app/CognitoGate"
import RouteFallback from "@/app/RouteFallback"
import { useSession } from "@/app/session"
import { DEMO_EVALUATOR } from "@/lib/api"
import { mutate, prime, refresh, useResource } from "@/lib/resource"
import { useChannel } from "@/lib/ws"
import * as api from "./api"
import { isToMark, sortItems } from "./derive"
import type { EvaluatorProfile, ProfilePatch, QueueData, QueueItem, ReevaluationItem } from "./types"

interface EvaluatorData {
  uid: string
  profile: EvaluatorProfile
  queue: QueueData
  requests: ReevaluationItem[]
  /** Pending work and the evaluator's own drafts, in their preferred order. */
  toMark: QueueItem[]
  /** The evaluator's finished evaluations that students can't see yet. */
  ready: QueueItem[]
  /** Requests nobody has answered yet. */
  openRequests: ReevaluationItem[]
  /** Ticks every minute so relative times stay current. */
  now: number
  isDemo: boolean
  /** Reloads the queue and requests (after saving, finishing, releasing or answering). */
  reload: () => void
  /** Applies a change to one queue row at once, before the reload confirms it. */
  patchItem: (id: string, patch: Partial<QueueItem>) => void
  updateProfile: (patch: ProfilePatch) => Promise<EvaluatorProfile>
}

const Ctx = createContext<EvaluatorData | null>(null)

export function useEvaluator(): EvaluatorData {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useEvaluator must be used inside <EvaluatorDataProvider>")
  return ctx
}

/** A cached evaluator resource scoped to the signed-in account (see lib/resource). */
export function useEvaluatorResource<T>(name: string | null, loader: () => Promise<T>, staleMs?: number) {
  const { uid } = useEvaluator()
  return useResource(name ? `${uid}:ev:${name}` : null, loader, staleMs)
}

function DataLoader({ uid, children }: { uid: string; children: ReactNode }) {
  const { updateUser } = useSession()
  const queueKey = `${uid}:ev:queue`
  const requestsKey = `${uid}:ev:requests`
  const profileKey = `${uid}:ev:profile`
  const queue = useResource(queueKey, api.loadQueue, 30_000)
  const requests = useResource(requestsKey, api.loadReevaluations, 30_000)
  const profile = useResource(profileKey, api.loadProfile, 300_000)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 60_000)
    // New submissions and requests arrive while the desk is open.
    const poll = setInterval(() => {
      refresh(queueKey)
      refresh(requestsKey)
    }, 90_000)
    const onFocus = () => {
      setNow(Date.now())
      refresh(queueKey)
      refresh(requestsKey)
    }
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(tick)
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [queueKey, requestsKey])

  // Instant real-time queue refresh when students submit assignments
  useChannel("evaluators", (event) => {
    if (event === "new-submission" || event === "reevaluation-request") {
      refresh(queueKey)
      refresh(requestsKey)
    }
  })

  const p = profile.data
  useEffect(() => {
    if (p) updateUser({ id: p.id, name: p.full_name, email: p.email, avatar: p.avatar_url ?? undefined, title: p.title })
  }, [p, updateUser])

  const reload = useCallback(() => {
    refresh(queueKey)
    refresh(requestsKey)
    refresh(`${uid}:ev:reports`)
  }, [queueKey, requestsKey, uid])
  const patchItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => mutate<QueueData>(queueKey, (q) => ({ ...q, items: q.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
    [queueKey],
  )
  const updateProfile = useCallback(
    async (patch: ProfilePatch) => {
      const next = await api.updateProfile(patch)
      mutate<EvaluatorProfile>(profileKey, () => next)
      return next
    },
    [profileKey],
  )

  const value = useMemo<EvaluatorData | null>(() => {
    if (!queue.data || !requests.data || !p) return null
    const sort = p.preferences.queue_sort
    return {
      uid,
      profile: p,
      queue: queue.data,
      requests: requests.data,
      toMark: sortItems(queue.data.items.filter(isToMark), sort),
      ready: sortItems(queue.data.items.filter((i) => i.state === "evaluated" && i.mine), sort),
      openRequests: requests.data.filter((r) => r.status === "Pending" || r.status === "In Review"),
      now,
      isDemo: p.is_demo,
      reload,
      patchItem,
      updateProfile,
    }
  }, [queue.data, requests.data, p, uid, now, reload, patchItem, updateProfile])

  const error = (!queue.data && queue.error) || (!requests.data && requests.error) || (!p && profile.error)
  if (error) {
    return (
      <FullPageError
        title="The evaluation desk didn't load"
        message={error.message}
        onRetry={() => {
          void queue.reload()
          void requests.reload()
          void profile.reload()
        }}
      />
    )
  }
  if (!value) return <RouteFallback />
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Signs the evaluator in (the demo account for demo sessions) and loads the desk's data before rendering. */
export default function EvaluatorDataProvider({ children }: { children: ReactNode }) {
  const load = useCallback(async () => {
    const p = await api.loadProfile()
    // The profile doubles as the sign-in check; keep it so the desk doesn't fetch it twice.
    prime(`${p.id}:ev:profile`, p)
    return p
  }, [])
  return (
    <CognitoGate demo={DEMO_EVALUATOR} load={load} errorTitle="The evaluation desk can't connect">
      {(uid) => (
        <DataLoader key={uid} uid={uid}>
          {children}
        </DataLoader>
      )}
    </CognitoGate>
  )
}
