// Picks AA-safe light-mode text shades per hue and checks dark-mode text shades.
import fs from "node:fs"
import { toRgb, contrast } from "./colormath.mjs"

const wt = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui"
const theme = fs.readFileSync(`${wt}/node_modules/tailwindcss/theme.css`, "utf8")
const tw = {}
for (const m of theme.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) (tw[m[1]] ||= {})[m[2]] = m[3].trim()
const skip = ["zinc", "slate", "gray", "neutral", "stone", "mauve", "olive", "mist", "taupe", "purple", "lime"]
const order = ["500", "600", "700", "800", "900"]
const white = [255, 255, 255]
const lightBg = [250, 250, 250]
const darkSurf = [17, 17, 19]
const darkSurf2 = [24, 24, 27]
for (const h of Object.keys(tw).filter((h) => !skip.includes(h))) {
  const tint50 = toRgb(tw[h]["50"])
  const pick = (from) => {
    for (const s of order.slice(order.indexOf(from))) {
      const c = toRgb(tw[h][s])
      if (contrast(c, white) >= 4.5 && contrast(c, lightBg) >= 4.5 && contrast(c, tint50) >= 4.5) return s
    }
    return "900"
  }
  const p500 = pick("500")
  const p600 = pick(order.indexOf(p500) > order.indexOf("600") ? p500 : "600")
  const d500 = toRgb(tw[h]["500"])
  const d400 = toRgb(tw[h]["400"])
  const darkPick = contrast(d500, darkSurf2) >= 4.5 ? "500" : "400"
  console.log(
    `${h.padEnd(8)} light 500->${p500} 600->${p600}  (500 on white ${contrast(toRgb(tw[h]["500"]), white).toFixed(2)}, 600 ${contrast(toRgb(tw[h]["600"]), white).toFixed(2)})   dark text 500/600 -> hue-${darkPick} (500 on surf-2 ${contrast(d500, darkSurf2).toFixed(2)}, 400 ${contrast(d400, darkSurf2).toFixed(2)})`,
  )
}
