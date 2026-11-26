import assert from "node:assert/strict"
import { test } from "node:test"
import { formatDateTime, formatDuration, timeAgo } from "../src/lib/utils"

const NOW = Date.parse("2026-11-26T09:32:00Z")
const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString()

test("relative times read naturally", () => {
  assert.equal(timeAgo(ago(10), NOW), "just now")
  assert.equal(timeAgo(ago(60), NOW), "1 min ago")
  assert.equal(timeAgo(ago(180), NOW), "3 mins ago")
  assert.equal(timeAgo(ago(2 * 3600), NOW), "2 hrs ago")
  assert.equal(timeAgo(ago(3 * 86_400), NOW), "3 days ago")
  assert.equal(timeAgo(null, NOW), "")
})

test("durations are short and exact", () => {
  assert.equal(formatDuration(45_000), "45s")
  assert.equal(formatDuration(192_000), "3m 12s")
  assert.equal(formatDuration(3_840_000), "1h 4m")
  assert.equal(formatDuration(-5), "0s")
})

test("a timestamp shows the date and the time", () => {
  const text = formatDateTime("2026-11-26T09:32:00Z")
  assert.match(text, /26 Nov 2026/)
  assert.match(text, /\d{1,2}:\d{2} (AM|PM)/)
  assert.equal(formatDateTime("not a date"), "")
})
