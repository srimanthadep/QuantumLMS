// Extra contrast checks for design.md: text on surface-3 (floating layers)
// and status text on its own soft tint (badges). Values mirror tokens.css.
const hex = (h) => {
  h = h.replace("#", "")
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}
const over = (fg, a, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)))
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return ((x + 0.05) / (y + 0.05)).toFixed(2)
}

const T = {
  light: {
    surface: "#ffffff", s3: "#ffffff",
    text: { fg: "#09090b", muted: "#52525b", subtle: "#6b6b76", "primary-text": "#5b3df5", success: "#047857", warning: "#a14a07", danger: "#c81e1e", info: "#2563eb", "secondary-text": "#0e7490" },
    // [soft base colour, alpha] exactly as declared in tokens.css :root
    soft: { "primary-text": ["#6d4aff", 0.08], success: ["#047857", 0.1], warning: ["#b45309", 0.1], danger: ["#dc2626", 0.08], info: ["#2563eb", 0.08], "secondary-text": ["#0891b2", 0.08] },
  },
  dark: {
    surface: "#111113", s3: "#202024",
    text: { fg: "#ededef", muted: "#a1a1aa", subtle: "#8a8a93", "primary-text": "#a397ff", success: "#34d399", warning: "#fbbf24", danger: "#f87171", info: "#60a5fa", "secondary-text": "#67e8f9" },
    soft: { "primary-text": ["#6d4aff", 0.14], success: ["#34d399", 0.12], warning: ["#fbbf24", 0.12], danger: ["#f87171", 0.12], info: ["#60a5fa", 0.12], "secondary-text": ["#22d3ee", 0.12] },
  },
}

let fail = 0
for (const [mode, t] of Object.entries(T)) {
  const s3 = hex(t.s3)
  const surf = hex(t.surface)
  const a = Object.entries(t.text).map(([k, v]) => {
    const r = cr(hex(v), s3)
    if (r < 4.5) fail++
    return `${k} ${r}`
  })
  console.log(`${mode} on surface-3: ${a.join(", ")}`)
  const b = Object.entries(t.soft).map(([k, [base, alpha]]) => {
    const r = cr(hex(t.text[k]), over(hex(base), alpha, surf))
    if (r < 4.5) fail++
    return `${k} ${r}`
  })
  console.log(`${mode} text on own soft tint (over surface): ${b.join(", ")}`)
}
console.log(fail ? `${fail} pairs below 4.5:1` : "all pairs >= 4.5:1")
