/**
 * Theme service: colour mode (dark | light | system) and accent.
 * Applies `.dark` and `data-accent` to <html> and dispatches
 * `quantum-theme-change` so React (ThemeProvider) can re-render.
 * The pre-paint script in index.html mirrors applyToDocument() so the first
 * paint already has the right theme.
 */

export type ThemeMode = "dark" | "light" | "system"
export type ThemeAccentId = "violet" | "blue" | "emerald" | "amber"

export interface ThemeAccent {
  id: ThemeAccentId
  name: string
  /** Solid swatch colour used by the picker. */
  colorHex: string
}

export const THEME_ACCENTS: ThemeAccent[] = [
  { id: "violet", name: "Violet", colorHex: "#6d4aff" },
  { id: "blue", name: "Blue", colorHex: "#2563eb" },
  { id: "emerald", name: "Emerald", colorHex: "#047857" },
  { id: "amber", name: "Amber", colorHex: "#b45309" },
]

export const THEME_MODES: { id: ThemeMode; name: string }[] = [
  { id: "light", name: "Light" },
  { id: "dark", name: "Dark" },
  { id: "system", name: "System" },
]

export const THEME_CHANGE_EVENT = "quantum-theme-change"
const MODE_STORAGE_KEY = "app_theme_mode"
const ACCENT_STORAGE_KEY = "app_theme_accent"

export interface ThemeState {
  mode: ThemeMode
  accent: ThemeAccentId
  /** The mode actually applied after resolving "system". */
  resolved: "dark" | "light"
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage unavailable (private mode); theme still applies for this session
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
}

class ThemeService {
  getMode(): ThemeMode {
    const saved = read(MODE_STORAGE_KEY)
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "dark"
  }

  getAccent(): ThemeAccentId {
    const saved = read(ACCENT_STORAGE_KEY)
    const found = THEME_ACCENTS.find((a) => a.id === saved)
    if (!found && saved !== null) write(ACCENT_STORAGE_KEY, "violet") // migrate legacy ids (apex-rose, cobalt, ...)
    return found ? found.id : "violet"
  }

  /** Kept for older callers. */
  getActiveAccent(): ThemeAccent {
    const id = this.getAccent()
    return THEME_ACCENTS.find((a) => a.id === id) ?? THEME_ACCENTS[0]
  }

  resolve(mode: ThemeMode = this.getMode()): "dark" | "light" {
    if (mode === "system") return systemPrefersDark() ? "dark" : "light"
    return mode
  }

  getState(): ThemeState {
    const mode = this.getMode()
    return { mode, accent: this.getAccent(), resolved: this.resolve(mode) }
  }

  isDarkMode(): boolean {
    return this.resolve() === "dark"
  }

  setMode(mode: ThemeMode): void {
    write(MODE_STORAGE_KEY, mode)
    this.applyToDocument()
  }

  /** Kept for older callers. */
  setDarkMode(isDark: boolean): void {
    this.setMode(isDark ? "dark" : "light")
  }

  setAccent(accent: ThemeAccentId | string): void {
    const found = THEME_ACCENTS.find((a) => a.id === accent)
    write(ACCENT_STORAGE_KEY, found ? found.id : "violet")
    this.applyToDocument()
  }

  applyToDocument(): void {
    if (typeof document === "undefined") return
    const state = this.getState()
    const root = document.documentElement
    root.classList.toggle("dark", state.resolved === "dark")
    root.setAttribute("data-accent", state.accent)
    root.style.colorScheme = state.resolved
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute("content", state.resolved === "dark" ? "#09090b" : "#fafafa")
    window.dispatchEvent(new CustomEvent<ThemeState>(THEME_CHANGE_EVENT, { detail: state }))
  }

  init(): () => void {
    this.applyToDocument()
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    const onChange = () => {
      if (this.getMode() === "system") this.applyToDocument()
    }
    mq?.addEventListener?.("change", onChange)
    return () => mq?.removeEventListener?.("change", onChange)
  }
}

export const themeService = new ThemeService()
