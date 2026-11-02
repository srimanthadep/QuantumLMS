// Counts legacy colour usage in frontend/src TS/TSX for design.md's "Remaining legacy usage" table.
// Usage: node count-legacy.mjs [<git-rev>]   (no rev = working tree, including untracked files)
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const rev = process.argv[2]
const repo = fileURLToPath(new URL("../../../../", import.meta.url))
const grep = (pattern) => {
  const args = ["-C", repo, "grep", "-o", "-h", "-E"]
  if (!rev) args.push("--untracked")
  args.push("-e", pattern)
  if (rev) args.push(rev)
  args.push("--", "frontend/src/*.ts", "frontend/src/*.tsx")
  try {
    return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter(Boolean).length
  } catch (e) {
    if (e.status === 1) return 0
    throw e
  }
}
const palette = (name) => grep(`\\b[a-z]+(-[a-z]+)?-${name}-[0-9]{2,3}\\b`)
const out = {
  zinc: palette("zinc"),
  purple: palette("purple"),
  gray: palette("gray"),
  slate: palette("slate"),
  lime: palette("lime"),
  hex: grep("-\\[#[0-9a-fA-F]{3,8}\\]"),
  semantic: grep("\\b(bg|text|border|ring|fill|stroke|divide|outline)-(background|surface|surface-2|surface-3|border|border-strong|foreground|muted-foreground|subtle-foreground|primary|primary-hover|primary-foreground|primary-text|primary-soft|primary-border|secondary|secondary-text|secondary-soft|success|success-soft|warning|warning-soft|danger|danger-soft|info|info-soft|ring|overlay)\\b"),
}
console.log(rev ?? "working tree", JSON.stringify(out))
