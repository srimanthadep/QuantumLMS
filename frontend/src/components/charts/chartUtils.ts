export interface Point {
  x: number
  y: number
}

/** Maps values onto a w×h box (y inverted) with vertical padding. */
export function scalePoints(values: number[], w: number, h: number, pad = 4, min?: number, max?: number): Point[] {
  if (values.length === 0) return []
  const lo = min ?? Math.min(...values)
  const hi = max ?? Math.max(...values)
  const span = hi - lo || 1
  const step = values.length > 1 ? w / (values.length - 1) : 0
  return values.map((v, i) => ({ x: i * step, y: pad + (1 - (v - lo) / span) * (h - pad * 2) }))
}

/** Smooth path through points (monotone-ish cubic using midpoints). */
export function buildPath(pts: Point[]): string {
  if (pts.length === 0) return ""
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1]
    const p1 = pts[i]
    const cx = (p0.x + p1.x) / 2
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`
  }
  return d
}

/** "Nice" rounded max for axis ticks. */
export function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  const f = v / exp
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * exp
}

export const compactNumber = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 })
