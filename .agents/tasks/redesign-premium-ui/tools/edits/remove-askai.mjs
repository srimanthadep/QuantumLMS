import fs from "node:fs"
const file = "c:/Users/srima/Downloads/QuantumLMS/.worktrees/redesign-premium-ui/frontend/src/components/Modals.tsx"
const raw = fs.readFileSync(file, "utf8")
const crlf = raw.includes("\r\n")
let s = raw.replace(/\r\n/g, "\n")
const a = s.indexOf("export function AskAiModal(")
if (a < 0) throw new Error("AskAiModal not found")
const b = s.indexOf("\nexport function ", a + 10)
// Remove up to the next exported function (or to end of file if it was last).
s = b < 0 ? s.slice(0, a) : s.slice(0, a) + s.slice(b + 1)
fs.writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s)
console.log("removed", b < 0 ? "(to end)" : "")
