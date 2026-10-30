// Prints a slice of a file between two markers. Usage: node show.mjs <file> <start> [end] [maxChars]
import fs from "node:fs"
const [file, start, end, max] = process.argv.slice(2)
const s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")
const i = s.indexOf(start)
if (i < 0) {
  console.log("start not found")
  process.exit(1)
}
const j = end ? s.indexOf(end, i + start.length) : -1
console.log(s.slice(i, j >= 0 ? j + end.length : i + Number(max || 4000)))
