import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * Active tab kept in local state (instant) and mirrored to ?tab= (shareable).
 * Router updates commit in a transition, so the URL can lag a fast click; local
 * state stays the source of truth and only external URL changes (back/forward,
 * links) override it.
 */
export function useTabParam<T extends string>(tabs: readonly T[], fallback: T) {
  const [params, setParams] = useSearchParams()
  const raw = params.get("tab")
  const urlTab = (tabs as readonly string[]).includes(raw ?? "") ? (raw as T) : fallback
  const [tab, setTabState] = useState<T>(urlTab)
  const pending = useRef<T[]>([])

  useEffect(() => {
    const i = pending.current.indexOf(urlTab)
    if (i >= 0) {
      // Our own write landing: drop it and anything queued before it.
      pending.current = pending.current.slice(i + 1)
      return
    }
    pending.current = []
    setTabState(urlTab)
  }, [urlTab])

  const setTab = useCallback(
    (next: string) => {
      if (!(tabs as readonly string[]).includes(next)) return
      const value = next as T
      setTabState(value)
      pending.current.push(value)
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (value === fallback) p.delete("tab")
          else p.set("tab", value)
          return p
        },
        { replace: true },
      )
    },
    [tabs, fallback, setParams],
  )

  return [tab, setTab] as const
}
