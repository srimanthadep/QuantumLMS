/** "55 mins" -> 55, "1.5 hours" -> 90. */
export function parseMinutes(duration: string): number {
  const n = Number.parseFloat(duration) || 0
  return /hour/i.test(duration) ? Math.round(n * 60) : Math.round(n)
}
