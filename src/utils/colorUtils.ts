export const DEFAULT_BG_HEX = "#F8FAFC"

// Quantum LMS Colour Palette & Design System
// Palette: Midnight Navy (#172033) + Brand Orange-Red (#F0442E) + Soft White (#F8FAFC) + Pure White (#FFFFFF) + Cool Gray (#64748B) + Learning Teal (#0F766E)
// Signature Brand Gradient: #FF5A24 → #F0442E → #C8102E
export const DESIGN_SYSTEM = {
  brand: {
    midnightNavy: "#172033",
    orangeRed: "#F0442E",
    orangeHover: "#D73823",
    orangeLight: "#FFF1EE",
    gradientStart: "#FF5A24",
    gradientEnd: "#C8102E",
  },
  neutral: {
    background: "#F8FAFC",
    surface: "#FFFFFF",
    mutedSurface: "#F1F5F9",
    border: "#E2E8F0",
    textPrimary: "#172033",
    textSecondary: "#64748B",
  },
  semantic: {
    success: "#0F766E",
    successLight: "#CCFBF1",
    warning: "#F59E0B",
    warningLight: "#FEF3C7",
    error: "#DC2626",
    errorLight: "#FEE2E2",
    info: "#0284C7",
    infoLight: "#E0F2FE",
  },
  gradients: {
    signature: "linear-gradient(135deg, #FF5A24 0%, #F0442E 50%, #C8102E 100%)",
    primary: "linear-gradient(135deg, #FF5A24 0%, #F0442E 50%, #C8102E 100%)",
    navy: "linear-gradient(135deg, #172033 0%, #253350 100%)",
    teal: "linear-gradient(135deg, #0F766E 0%, #0D9488 100%)",
  },
  ui: {
    primaryBtn: { bg: "#F0442E", text: "#FFFFFF" },
    secondaryBtn: { bg: "#FFF1EE", text: "#F0442E" },
    outlineBtn: { bg: "#FFFFFF", border: "#E2E8F0", text: "#172033" },
    dangerBtn: { bg: "#FEE2E2", text: "#DC2626" },
    navActive: { bg: "#FFF1EE", text: "#F0442E" },
  },
  dataViz: [
    "#F0442E",
    "#FF5A24",
    "#172033",
    "#0F766E",
    "#F59E0B",
    "#C8102E",
    "#64748B",
  ],
} as const

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
