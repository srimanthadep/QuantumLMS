import { useCallback, useEffect, useSyncExternalStore } from "react"
import { ApiError, toApiError } from "@/lib/supabase"

/**
 * A tiny keyed cache for backend data. Pages read through useResource: the first visit loads, later visits show the
 * cached value at once and refresh it in the background. Mutations update the cached value (mutate) or ask for a
 * fresh copy (refresh).
 */
interface Entry {
  data?: unknown
  error?: ApiError
  loadedAt?: number
  promise?: Promise<unknown>
  loader?: () => Promise<unknown>
}

const entries = new Map<string, Entry>()
const listeners = new Map<string, Set<() => void>>()
const EMPTY: Entry = {}

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l())
}

function set(key: string, patch: Partial<Entry>) {
  entries.set(key, { ...(entries.get(key) ?? EMPTY), ...patch })
  emit(key)
}

/** Loads (or reloads) a key. Concurrent calls share one request. */
export function load<T>(key: string, loader: () => Promise<T>, force = false): Promise<T> {
  const cur = entries.get(key)
  if (cur?.promise && !force) return cur.promise as Promise<T>
  const promise: Promise<T> = loader().then(
    (data) => {
      if (entries.get(key)?.promise === promise) set(key, { data, error: undefined, loadedAt: Date.now(), promise: undefined })
      return data
    },
    (e: unknown) => {
      const error = e instanceof ApiError ? e : toApiError(e as { message: string })
      if (entries.get(key)?.promise === promise) set(key, { error, promise: undefined })
      throw error
    },
  )
  set(key, { promise, loader })
  return promise
}

/** Replaces the cached value with fn(current). No-op when the key hasn't loaded. */
export function mutate<T>(key: string, fn: (current: T) => T) {
  const cur = entries.get(key)
  if (!cur || cur.data === undefined) return
  set(key, { data: fn(cur.data as T) })
}

export function peek<T>(key: string): T | undefined {
  return entries.get(key)?.data as T | undefined
}

/** Marks keys starting with the prefix as stale: mounted ones reload in the background, others reload on next use. */
export function refresh(prefix: string) {
  for (const [key, entry] of [...entries.entries()]) {
    if (!key.startsWith(prefix)) continue
    if (listeners.get(key)?.size && entry.loader) load(key, entry.loader, true).catch(() => undefined)
    else entries.set(key, { ...entry, loadedAt: 0 })
  }
}

/** Forgets everything (sign-out or a different account). */
export function clearAll() {
  entries.clear()
  for (const key of listeners.keys()) emit(key)
}

export interface Resource<T> {
  data: T | undefined
  error: ApiError | undefined
  /** True until the first load finishes. */
  loading: boolean
  /** True while any load (including a background refresh) runs. */
  refreshing: boolean
  reload: () => Promise<T | undefined>
  mutate: (fn: (current: T) => T) => void
}

/** Reads a cached resource and loads it on mount; data older than staleMs is refreshed in the background. */
export function useResource<T>(key: string | null, loader: () => Promise<T>, staleMs = 60_000): Resource<T> {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!key) return () => undefined
      let set = listeners.get(key)
      if (!set) listeners.set(key, (set = new Set()))
      set.add(cb)
      return () => {
        set.delete(cb)
      }
    },
    [key],
  )
  const entry = useSyncExternalStore(subscribe, () => (key ? (entries.get(key) ?? EMPTY) : EMPTY))
  const missing = entry === EMPTY

  useEffect(() => {
    if (!key) return
    const cur = entries.get(key)
    if (cur?.promise) return
    if (!cur || (cur.data === undefined && !cur.error) || !cur.loadedAt || Date.now() - cur.loadedAt > staleMs) load(key, loader).catch(() => undefined)
    // The loader is keyed: the same key reuses the cache. `missing` reloads after clearAll().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, missing])

  const reload = useCallback(async () => {
    if (!key) return undefined
    try {
      return await load(key, loader, true)
    } catch {
      return undefined
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  const mutateKey = useCallback((fn: (current: T) => T) => key && mutate(key, fn), [key])

  return {
    data: entry.data as T | undefined,
    error: entry.data === undefined ? entry.error : undefined,
    loading: entry.data === undefined && !entry.error,
    refreshing: !!entry.promise,
    reload,
    mutate: mutateKey,
  }
}
