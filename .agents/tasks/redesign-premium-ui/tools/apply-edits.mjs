// Applies [{ file, find, replace, all? }] edits from a JSON file, preserving CRLF/LF.
// Usage: node apply-edits.mjs edits.json
import fs from "node:fs"
const edits = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
let failed = 0
const cache = new Map()
for (const e of edits) {
  const raw = cache.get(e.file) ?? fs.readFileSync(e.file, "utf8")
  const crlf = raw.includes("\r\n")
  let text = raw.replace(/\r\n/g, "\n")
  const find = e.find.replace(/\r\n/g, "\n")
  if (!text.includes(find)) {
    console.log(`MISSING in ${e.file}: ${find.slice(0, 100)}`)
    failed++
    continue
  }
  text = e.all ? text.split(find).join(e.replace) : text.replace(find, () => e.replace)
  cache.set(e.file, crlf ? text.replace(/\n/g, "\r\n") : text)
}
for (const [file, text] of cache) fs.writeFileSync(file, text)
console.log(`${edits.length - failed}/${edits.length} edits applied`)
process.exit(failed ? 1 : 0)
