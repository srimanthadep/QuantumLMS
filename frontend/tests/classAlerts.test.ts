import assert from "node:assert/strict"
import { test } from "node:test"
import { classAlertCopy, classAlerts, parseTime, soonWindowMinutes, type AlertSession } from "../src/pages/student/data/classAlerts"

const START = Date.parse("2030-03-04T10:00:00Z")
const MIN = 60_000
const session = (patch: Partial<AlertSession> = {}): AlertSession => ({
  id: "s1",
  title: "RAG deep dive",
  batch_name: "GenAI Cohort",
  starts_at: new Date(START).toISOString(),
  ends_at: new Date(START + 90 * MIN).toISOString(),
  timezone: "Asia/Kolkata",
  status: "Scheduled",
  join_before_minutes: 15,
  ...patch,
})

test("a class alerts once joining opens, not before", () => {
  assert.deepEqual(classAlerts([session()], START - 16 * MIN), [])
  const [alert] = classAlerts([session()], START - 14 * MIN)
  assert.equal(alert!.phase, "soon")
  assert.equal(alert!.minutes, 14)
  assert.equal(classAlerts([session()], START - 15 * MIN)[0]!.phase, "soon")
})

test("the last minute still rounds up to one minute, never zero", () => {
  assert.equal(classAlerts([session()], START - 5_000)[0]!.minutes, 1)
})

test("a class that is live, or past its start time, alerts as started", () => {
  assert.equal(classAlerts([session({ status: "Live" })], START - 2 * MIN)[0]!.phase, "started")
  assert.equal(classAlerts([session()], START + 10 * MIN)[0]!.phase, "started")
  assert.equal(classAlerts([session()], START + 91 * MIN).length, 0)
})

test("ended and cancelled classes never alert", () => {
  assert.deepEqual(classAlerts([session({ status: "Cancelled" })], START - 5 * MIN), [])
  assert.deepEqual(classAlerts([session({ status: "Ended" })], START + 5 * MIN), [])
})

test("the alert key changes when a class is rescheduled, so learners hear about the new time", () => {
  const before = classAlerts([session()], START - 5 * MIN)[0]!.key
  const later = Date.parse("2030-03-05T10:00:00Z")
  const after = classAlerts([session({ starts_at: new Date(later).toISOString(), ends_at: new Date(later + 90 * MIN).toISOString() })], later - 5 * MIN)[0]!.key
  assert.notEqual(before, after)
  assert.ok(before.includes(":soon:") && classAlerts([session()], START + MIN)[0]!.key.includes(":started:"))
})

test("the join window follows the batch setting, kept between 5 and 30 minutes", () => {
  assert.equal(soonWindowMinutes({ join_before_minutes: 15 }), 15)
  assert.equal(soonWindowMinutes({ join_before_minutes: 0 }), 15)
  assert.equal(soonWindowMinutes({ join_before_minutes: 1 }), 5)
  assert.equal(soonWindowMinutes({ join_before_minutes: 600 }), 30)
  assert.equal(classAlerts([session({ join_before_minutes: 5 })], START - 8 * MIN).length, 0)
})

test("classes are listed in start order", () => {
  const second = session({ id: "s2", starts_at: new Date(START + 5 * MIN).toISOString(), ends_at: new Date(START + 95 * MIN).toISOString() })
  assert.deepEqual(classAlerts([second, session()], START - 4 * MIN).map((a) => a.session.id), ["s1", "s2"])
})

test("the toast words say live when the teacher has started, and the start time when it just ran on schedule", () => {
  const soon = classAlertCopy(classAlerts([session()], START - 3 * MIN)[0]!)
  assert.equal(soon.title, "Class starting soon")
  assert.equal(soon.message, "RAG deep dive starts in 3 minutes")
  const live = classAlertCopy(classAlerts([session({ status: "Live" })], START + MIN)[0]!)
  assert.equal(live.title, "Your class is live")
  assert.equal(live.live, true)
  const started = classAlertCopy(classAlerts([session()], START + MIN)[0]!)
  assert.equal(started.title, "Your class has started")
  assert.match(started.message, /^RAG deep dive started at /)
  assert.equal(started.live, false)
})

test("database-style times are understood", () => {
  assert.equal(parseTime("2030-03-04 10:00:00+00"), START)
  assert.equal(parseTime("2030-03-04 15:30:00+05:30"), START)
  assert.equal(parseTime("2030-03-04T10:00:00.000Z"), START)
  const raw = session({ starts_at: "2030-03-04 10:00:00+00", ends_at: "2030-03-04 11:30:00+00" })
  assert.equal(classAlerts([raw], START - 4 * MIN)[0]!.phase, "soon")
  assert.equal(classAlerts([raw], START + MIN)[0]!.phase, "started")
  assert.deepEqual(classAlerts([session({ starts_at: "not a time" })], START), [])
})

test("the toast only says joining is open once the server lets the learner join", () => {
  const open = classAlertCopy(classAlerts([session()], START - 10 * MIN)[0]!)
  assert.match(open.description, /Joining is open$/)
  const notYet = classAlertCopy(classAlerts([session({ join_before_minutes: 0 })], START - 10 * MIN)[0]!)
  assert.doesNotMatch(notYet.description, /Joining is open/)
  const early = classAlertCopy(classAlerts([session({ join_before_minutes: 2 })], START - 4 * MIN)[0]!)
  assert.doesNotMatch(early.description, /Joining is open/)
})
