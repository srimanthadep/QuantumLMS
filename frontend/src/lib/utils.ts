import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Teach tailwind-merge the custom type scale so `text-h1` is treated as a
// font size (not a colour) and does not drop `text-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["display", "h1", "h2", "h3", "body", "body-lg", "caption"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const inrFormatter = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

/** Formats rupees as ₹1,23,456. */
export function formatINR(rupees: number): string {
  return inrFormatter.format(rupees)
}

/** "2026-11-04" for the device's local day (the format of SQL dates and <input type="date">). */
export function isoDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** The calendar day (YYYY-MM-DD) an instant falls on in an IANA timezone (the device's when left out), not in UTC. */
export function dayInZone(iso: string | null | undefined, timeZone?: string): string {
  if (!iso) return ""
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return ""
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}

/** The last day a batch runs. Its end is often midnight after that day, so look a minute back. */
export function lastDayInZone(iso: string | null | undefined, timeZone: string): string {
  return iso ? dayInZone(new Date(Date.parse(iso) - 60_000).toISOString(), timeZone) : ""
}

/** "just now", "1 min ago", "3 mins ago", "2 hrs ago", "4 days ago". */
export function timeAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return ""
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  if (!Number.isFinite(seconds)) return ""
  if (seconds < 45) return "just now"
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`
  if (seconds < 3600) return plural(Math.max(1, Math.round(seconds / 60)), "min")
  if (seconds < 86_400) return plural(Math.round(seconds / 3600), "hr")
  return plural(Math.round(seconds / 86_400), "day")
}

/** A length of time: "45s", "3m 12s", "1h 4m". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return h ? `${h}h ${m}m` : m ? `${m}m ${s}s` : `${s}s`
}

/** "26 Nov 2026, 3:02 PM" in the viewer's own time zone. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return ""
  const at = new Date(iso)
  return Number.isNaN(at.getTime()) ? "" : at.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\b(am|pm)\b/, (x) => x.toUpperCase())
}
