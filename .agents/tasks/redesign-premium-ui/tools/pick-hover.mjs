// For each accent, find the lightest colour between the solid and its Tailwind
// 500 tone that still gives white text >= 4.6:1 (dark-mode hover state).
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16))
const toHex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const cr = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const white = [255, 255, 255]
const accents = {
  violet: { solid: "#6d4aff", toward: "#8b7cff", current: "#7c5cff" },
  blue: { solid: "#2563eb", toward: "#3b82f6", current: "#3b82f6" },
  emerald: { solid: "#047857", toward: "#10b981", current: "#059669" },
  amber: { solid: "#b45309", toward: "#d97706", current: "#d97706" },
}
for (const [name, a] of Object.entries(accents)) {
  const s = hex(a.solid)
  const t = hex(a.toward)
  let best = a.solid
  for (let p = 0; p <= 100; p++) {
    const c = s.map((v, i) => v + ((t[i] - v) * p) / 100)
    if (cr(white, c) >= 4.6) best = toHex(c)
    else break
  }
  console.log(`${name.padEnd(8)} solid ${a.solid} (${cr(white, hex(a.solid)).toFixed(2)})  current hover ${a.current} (${cr(white, hex(a.current)).toFixed(2)})  -> pick ${best} (${cr(white, hex(best)).toFixed(2)})`)
}
// Candidate light neutral 400/500 on light backgrounds.
for (const [label, fg] of [["n-400 #6b6b76", "#6b6b76"], ["n-500 #5f5f69", "#5f5f69"], ["zinc-500 #71717b", "#71717b"]]) {
  const bgs = { white: "#ffffff", background: "#fafafa", "surface-2": "#f4f4f5", "lavender #f3f1ff": "#f3f1ff" }
  console.log(label.padEnd(18), Object.entries(bgs).map(([k, v]) => `${k} ${cr(hex(fg), hex(v)).toFixed(2)}`).join(", "))
}
