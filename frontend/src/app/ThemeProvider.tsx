import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  themeService,
  THEME_CHANGE_EVENT,
  type ThemeAccentId,
  type ThemeMode,
  type ThemeState,
} from "@/services/themeService"

interface ThemeContextValue extends ThemeState {
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: ThemeAccentId) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>(() => themeService.getState())

  useEffect(() => {
    const onChange = (e: Event) => setState((e as CustomEvent<ThemeState>).detail ?? themeService.getState())
    window.addEventListener(THEME_CHANGE_EVENT, onChange)
    const dispose = themeService.init()
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, onChange)
      dispose()
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...state,
      setMode: (mode) => themeService.setMode(mode),
      setAccent: (accent) => themeService.setAccent(accent),
      toggleMode: () => themeService.setMode(state.resolved === "dark" ? "light" : "dark"),
    }),
    [state],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Theme state and setters. Works outside the provider by falling back to the service. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  const [fallback, setFallback] = useState<ThemeState>(() => themeService.getState())
  useEffect(() => {
    if (ctx) return
    const onChange = () => setFallback(themeService.getState())
    window.addEventListener(THEME_CHANGE_EVENT, onChange)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange)
  }, [ctx])
  if (ctx) return ctx
  return {
    ...fallback,
    setMode: (mode) => themeService.setMode(mode),
    setAccent: (accent) => themeService.setAccent(accent),
    toggleMode: () => themeService.setMode(fallback.resolved === "dark" ? "light" : "dark"),
  }
}
