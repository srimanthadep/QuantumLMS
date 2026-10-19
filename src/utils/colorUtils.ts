export const DEFAULT_BG_HEX = "#9860e9"

export function isValidHexColor(str: string): boolean {
  if (!str) return false
  let s = str.trim()
  if (!s.startsWith("#")) s = "#" + s
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(s)
}

export function normalizeHexColor(str: string): string {
  let s = str.trim()
  if (!s.startsWith("#")) s = "#" + s
  return s
}

export function getHexContrast(hex: string): { isLight: boolean } {
  let clean = hex.replace("#", "").trim()
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("")
  } else if (clean.length === 8) {
    clean = clean.substring(0, 6)
  }
  if (clean.length !== 6) return { isLight: false }
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { isLight: false }
  // YIQ luminance formula
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return { isLight: yiq > 165 }
}
