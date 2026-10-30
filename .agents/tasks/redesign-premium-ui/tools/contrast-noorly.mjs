// Contrast of key pairs from the original Noorly design.md (main checkout).
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16))
const lum = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const cr = (a, b) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}
const pairs = [
  ["White text on primary #905FEB (primary buttons)", "#FFFFFF", "#905FEB", 4.5],
  ["Primary #905FEB text on white (links, outlined buttons)", "#905FEB", "#FFFFFF", 4.5],
  ["Primary #905FEB text on lavender #F0EDFF (secondary buttons)", "#905FEB", "#F0EDFF", 4.5],
  ["Lime #AEEB00 text on white", "#AEEB00", "#FFFFFF", 4.5],
  ["Ink #111111 text on lime #AEEB00", "#111111", "#AEEB00", 4.5],
  ["Body #171526 on canvas #F1F0F3", "#171526", "#F1F0F3", 4.5],
  ["Supporting #514B68 on white", "#514B68", "#FFFFFF", 4.5],
  ["Placeholder #716B86 on white", "#716B86", "#FFFFFF", 4.5],
  ["White on destructive #E21D2D", "#FFFFFF", "#E21D2D", 4.5],
]
for (const [label, fg, bg, min] of pairs) {
  const r = cr(fg, bg)
  console.log(`${r >= min ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)}  ${label}`)
}
