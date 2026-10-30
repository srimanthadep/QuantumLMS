// One-off: removes the unused symbols reported by `tsc --noUnusedLocals` in the
// student files this redesign touched, and fixes the barrel export.
import fs from "node:fs"

const root = "c:/Users/srima/Downloads/QuantumLMS/frontend/src/pages/student"
let failed = 0
function edit(file, pairs) {
  const p = `${root}/${file}`
  const raw = fs.readFileSync(p, "utf8")
  const crlf = raw.includes("\r\n")
  let t = raw.replace(/\r\n/g, "\n")
  for (const [from, to] of pairs) {
    const n = t.split(from).length - 1
    if (n !== 1) {
      console.log(`FAIL ${file}: ${n} matches for ${JSON.stringify(from).slice(0, 60)}`)
      failed++
      continue
    }
    t = t.replace(from, to)
  }
  return () => fs.writeFileSync(p, crlf ? t.replace(/\n/g, "\r\n") : t)
}

const writes = [
  edit("StudentDashboardPage.tsx", [
    ["  Download,\n", ""],
    ["  Share2,\n", ""],
    ["  Dialog,\n  DialogContent,\n  DialogDescription,\n  DialogFooter,\n  DialogHeader,\n  DialogTitle,\n", ""],
    ["  PageHeader,\n  Progress,\n", "  PageHeader,\n"],
  ]),
  edit("CourseDetailsPage.tsx", [["  PageHeader,\n  Progress,\n", "  PageHeader,\n"]]),
  edit("career/MentorshipPanel.tsx", [['import { spring, transition } from "@/lib/motion"', 'import { spring } from "@/lib/motion"']]),
  edit("StudentPortal.tsx", [['import React, { useState, useEffect, useCallback, lazy, Suspense } from "react"', 'import { useState, useEffect, useCallback, lazy, Suspense } from "react"']]),
  edit("index.ts", [['export { StudentSettingsPage } from "./StudentSettingsPage"', 'export { default as StudentSettingsPage } from "./StudentSettingsPage"']]),
]

// COVER_BADGE is a multi-line const; remove it with a regex.
const dashPath = `${root}/StudentDashboardPage.tsx`
if (failed) {
  console.log(`\n${failed} edits failed; nothing written`)
  process.exit(1)
}
writes.forEach((w) => w())
let dash = fs.readFileSync(dashPath, "utf8")
const before = dash.length
dash = dash.replace(/const COVER_BADGE =\r?\n\s+"[^"]*"\r?\n\r?\n/, "")
console.log(dash.length < before ? "ok   removed COVER_BADGE" : "WARN COVER_BADGE not removed")
fs.writeFileSync(dashPath, dash)
console.log("written")
