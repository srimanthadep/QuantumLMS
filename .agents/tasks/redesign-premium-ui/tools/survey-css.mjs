import fs from "node:fs"
const file = process.argv[2]
const start = Number(process.argv[3] || 0)
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/)
const legacy = lines.slice(start).join("\n")
const count = (re) => {
  const m = {}
  for (const x of legacy.matchAll(re)) m[x[0].toLowerCase()] = (m[x[0].toLowerCase()] || 0) + 1
  return Object.entries(m).sort((a, b) => b[1] - a[1])
}
console.log("VARS", count(/var\(--[a-z0-9-]+/gi).map((e) => e.join(" ")).join("\n"))
console.log("HSL(VAR", (legacy.match(/hsl\(var/g) || []).length)
console.log("HEX", count(/#[0-9a-f]{3,8}\b/gi).slice(0, 80).map((e) => e.join(" ")).join(" | "))
console.log("RGBA", count(/rgba?\([^)]*\)/gi).slice(0, 40).map((e) => e.join(" ")).join(" | "))
console.log("FONT", count(/font-family:[^;]+/gi).map((e) => e.join(" ")).join("\n"))
