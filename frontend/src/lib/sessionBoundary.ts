let generation = 0
const listeners = new Set<() => void>()

export function sessionGeneration() { return generation }
export function resetPrivateSession() {
  generation++
  if (typeof window !== "undefined") {
    for (const store of [window.localStorage, window.sessionStorage]) {
      try {
        const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((key): key is string => Boolean(key))
        for (const key of keys) if (/^(qlms_cache_|quantum_(admin_|superadmin_|teacher_|alumni_network))/.test(key)) store.removeItem(key)
      } catch { /* Storage may be unavailable in private browsing. */ }
    }
  }
  for (const listener of listeners) listener()
}
export function onSessionReset(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Results started in a previous account must never reach a new account's UI. */
export function assertCurrentSession(started: number) {
  if (started !== generation) throw new Error("Your session changed. Please try again.")
}
