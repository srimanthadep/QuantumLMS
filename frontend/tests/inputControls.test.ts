import assert from "node:assert/strict"
import { test } from "node:test"
import { stripLeadingNumberZeros, toNumberDraft } from "../src/components/ui/input"
import {
  formatDateDisplay,
  formatDateTimeDisplay,
  formatIsoDate,
  formatTimeDisplay,
  parseIsoDate,
  parseTime,
} from "../src/components/ui/date-picker"

test("number input helpers avoid sticky leading zeros and preserve clearable drafts", () => {
  assert.equal(toNumberDraft(0, 1), "")
  assert.equal(toNumberDraft(0, 10), "")
  assert.equal(toNumberDraft(Number.NaN, 0), "")
  assert.equal(toNumberDraft(Number.NaN, undefined), "")
  assert.equal(toNumberDraft("", 0), "")
  assert.equal(toNumberDraft(undefined, 1), "")
  assert.equal(toNumberDraft(0, 0), "0")
  assert.equal(toNumberDraft(4999, 1), "4999")

  assert.equal(stripLeadingNumberZeros("05"), "5")
  assert.equal(stripLeadingNumberZeros("007"), "7")
  assert.equal(stripLeadingNumberZeros("-05"), "-5")
  assert.equal(stripLeadingNumberZeros("0.5"), "0.5")
  assert.equal(stripLeadingNumberZeros("-0.25"), "-0.25")
  assert.equal(stripLeadingNumberZeros("00"), "0")
  assert.equal(stripLeadingNumberZeros("0"), "0")
  assert.equal(stripLeadingNumberZeros(""), "")
})

test("custom date, time, and datetime format/parse helpers handle 12h/24h values accurately", () => {
  assert.equal(formatIsoDate(2026, 10, 18), "2026-11-18")
  assert.deepEqual(parseIsoDate("2026-11-18"), { year: 2026, month: 10, day: 18 })
  assert.equal(parseIsoDate("invalid"), null)
  assert.equal(formatDateDisplay("2026-11-18"), "Nov 18, 2026")

  assert.deepEqual(parseTime("19:30"), { hour: 19, minute: 30 })
  assert.deepEqual(parseTime("99:99"), { hour: 23, minute: 59 })
  assert.equal(parseTime("bad"), null)
  assert.equal(formatTimeDisplay("00:00"), "12:00 AM")
  assert.equal(formatTimeDisplay("09:05"), "9:05 AM")
  assert.equal(formatTimeDisplay("19:30"), "7:30 PM")
  assert.equal(formatDateTimeDisplay("2026-11-18T19:30"), "Nov 18, 2026 · 7:30 PM")
  assert.equal(formatDateTimeDisplay(""), "")
})
