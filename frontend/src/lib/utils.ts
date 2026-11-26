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
