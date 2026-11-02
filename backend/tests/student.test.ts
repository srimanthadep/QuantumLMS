// Student API against the real database: isolation between students, server-side rules and every write path.
// Two throwaway students are created through first sign-in and deleted afterwards.
import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { and, eq } from "drizzle-orm"
import { assignment_submissions, quiz_attempts } from "../src/db/schema.js"
import { addDays, isoDow, localDay } from "../src/lib/time.js"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let a: TestUser
let b: TestUser
before(async () => {
  h = await createHarness()
  a = await h.user({ name: "Test Student A" })
  b = await h.user({ name: "Test Student B" })
})
after(async () => {
  await h.close()
})

const anon = (method: "GET" | "POST", url: string) => h.app.inject({ method, url })

async function upload(u: TestUser, folder: string, filename: string, body: string, type = "text/plain") {
  const target = await u.call("POST", "/api/student/uploads", { bucket: "submissions", folder, filename, content_type: type, size: Buffer.byteLength(body) })
  assert.equal(target.status, 200, JSON.stringify(target.body))
  const put = await h.app.inject({ method: "PUT", url: target.body.url, headers: { "content-type": type }, payload: Buffer.from(body) })
  assert.equal(put.statusCode, 200, put.body)
  return target.body.key as string
}

describe("first sign-in", () => {
  test("creates the profile, enrolls the starter courses and opens their certificates", async () => {
    const core = await a.call("GET", "/api/student/core")
    assert.equal(core.status, 200, JSON.stringify(core.body))
    const p = core.body.profile
    assert.equal(p.full_name, "Test Student A")
    assert.match(p.roll_number, /^QAI-\d{4}-\d{3,}$/)
    assert.equal(p.is_demo, false)
    assert.equal(p.mentor_id, "mentor-1")
    assert.deepEqual(core.body.enrollments.map((e: { course_id: string }) => e.course_id).sort(), ["c-1", "c-2", "c-3", "c-4"])
    const grades = await a.call("GET", "/api/student/grades")
    assert.equal(grades.body.certificates.length, 4)
    assert.ok(grades.body.certificates.every((c: { status: string }) => c.status === "In Progress"))
    const notes = await a.call("GET", "/api/student/notifications")
    assert.deepEqual(notes.body.map((n: { title: string }) => n.title), ["Welcome to Quantum School"])
  })
})

describe("access control", () => {
  test("anonymous visitors can't read or call anything", async () => {
    assert.equal((await anon("GET", "/api/student/core")).statusCode, 401)
    assert.equal((await anon("POST", "/api/student/quizzes/qz-1/start")).statusCode, 401)
  })

  test("other roles can't use the student API", async () => {
    const evaluator = await h.user({ groups: ["evaluators"] })
    assert.equal((await evaluator.call("GET", "/api/student/core")).status, 403)
  })

  test("students only see and change their own rows", async () => {
    const note = await a.call("POST", "/api/student/notes", { title: "A's private note", content: "secret" })
    assert.equal(note.status, 200, JSON.stringify(note.body))
    const id = note.body.id
    assert.ok(!(await b.call("GET", "/api/student/notes")).body.some((n: { id: string }) => n.id === id))
    assert.equal((await b.call("PATCH", `/api/student/notes/${id}`, { title: "hijacked" })).status, 404)
    assert.equal((await b.call("DELETE", `/api/student/notes/${id}`)).status, 404)
    // A student_id in the body is ignored: the note belongs to the caller.
    const forged = await b.call("POST", "/api/student/notes", { title: "forged", student_id: (await a.call("GET", "/api/me")).body.id })
    assert.ok((await b.call("GET", "/api/student/notes")).body.some((n: { id: string }) => n.id === forged.body.id))
    assert.ok(!(await a.call("GET", "/api/student/notes")).body.some((n: { id: string }) => n.id === forged.body.id))
  })

  test("students can only set the fields they own", async () => {
    assert.equal((await a.call("PATCH", "/api/student/profile", { gpa: "4.00 / 4.00" })).status, 400)
    const ok = await a.call("PATCH", "/api/student/profile", { full_name: "Test Student A2", bio: "Hello" })
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.deepEqual([ok.body.full_name, ok.body.bio], ["Test Student A2", "Hello"])
    const leave = await a.call("POST", "/api/student/leave-requests", { course_code: "AI-401", leave_date: addDays(localDay(new Date(), "Asia/Kolkata"), 30), reason: "Family function out of town", status: "Approved" })
    assert.equal(leave.status, 200, JSON.stringify(leave.body))
    assert.equal(leave.body.status, "Pending")
  })
})

describe("courses", () => {
  test("lesson completion updates progress and today's study time, and can be undone", async () => {
    const done = await a.call("POST", "/api/student/lessons/l-1-1/complete", { done: true })
    assert.equal(done.status, 200, JSON.stringify(done.body))
    assert.deepEqual([done.body.completed, done.body.total], [1, 29])
    const today = (await a.call("GET", "/api/student/activity")).body.at(-1)
    assert.deepEqual([today.minutes, today.lessons], [45, 1])
    const undone = await a.call("POST", "/api/student/lessons/l-1-1/complete", { done: false })
    assert.equal(undone.body.completed, 0)
    const after = (await a.call("GET", "/api/student/activity")).body.at(-1)
    assert.deepEqual([after.minutes, after.lessons], [0, 0])
  })

  test("progress needs an enrollment; finishing a course issues its certificate", async () => {
    assert.equal((await a.call("POST", "/api/student/lessons/cat-1-m1-l1/complete", { done: true })).status, 403)
    assert.equal((await a.call("POST", "/api/student/enrollments", { course_id: "cat-1" })).status, 200)
    const lessons = (await a.call("GET", "/api/student/core")).body.lessons.filter((l: { course_id: string }) => l.course_id === "cat-1")
    let last
    for (const l of lessons) last = await a.call("POST", `/api/student/lessons/${l.id}/complete`, { done: true })
    assert.equal(last!.body.completed, lessons.length)
    assert.equal(last!.body.certificate.status, "Earned")
    assert.match(last!.body.certificate.credential_id, /^QAI-[0-9A-F]{10}-PE$/)
    assert.equal((await a.call("GET", "/api/student/notifications")).body[0].title, "Certificate earned")
  })

  test("anyone can verify an earned credential, and only that", async () => {
    const cert = (await a.call("GET", "/api/student/grades")).body.certificates.find((c: { status: string }) => c.status === "Earned")
    const ok = await anon("GET", `/api/public/certificates/${cert.credential_id}`)
    assert.equal(ok.statusCode, 200, ok.body)
    assert.deepEqual([ok.json().recipient, ok.json().title], ["Test Student A2", "Prompt Engineering Practitioner"])
    assert.ok(!("student_id" in ok.json()))
    assert.equal((await anon("GET", "/api/public/certificates/QAI-NOT-REAL")).statusCode, 404)
  })
})

describe("quizzes", () => {
  let attempt: { attempt_id: string; started_at: string; deadline_at: string; questions: Record<string, unknown>[] }
  test("starting returns questions without answers and resumes the open attempt", async () => {
    const r = await a.call("POST", "/api/student/quizzes/qz-1/start")
    assert.equal(r.status, 200, JSON.stringify(r.body))
    attempt = r.body
    assert.equal(attempt.questions.length, 10)
    assert.ok(attempt.questions.every((q) => !("correct_index" in q) && !("explanation" in q)))
    assert.ok(Date.parse(attempt.deadline_at) - Date.parse(attempt.started_at) <= 20 * 60_000 + 1000)
    assert.equal((await a.call("POST", "/api/student/quizzes/qz-1/start")).body.attempt_id, attempt.attempt_id)
  })

  test("answers autosave, the review opens only after submitting, and grading happens on the server", async () => {
    assert.equal((await a.call("GET", `/api/student/quiz-attempts/${attempt.attempt_id}/review`)).status, 400)
    assert.equal((await a.call("PUT", `/api/student/quiz-attempts/${attempt.attempt_id}/answers`, { answers: { 0: 1, 1: 9, 2: "x", 99: 0 } })).status, 204)
    const [saved] = await h.ctx.db.select({ answers: quiz_attempts.answers }).from(quiz_attempts).where(eq(quiz_attempts.id, attempt.attempt_id))
    assert.deepEqual(saved.answers, { 0: 1 })
    const review = await a.call("POST", `/api/student/quiz-attempts/${attempt.attempt_id}/submit`, { answers: { 0: 1, 1: 0, 2: 0 } })
    assert.equal(review.status, 200, JSON.stringify(review.body))
    const correct = review.body.questions.slice(0, 3).filter((q: { correct_index: number }, i: number) => q.correct_index === [1, 0, 0][i]).length
    assert.equal(review.body.attempt.score, correct)
    assert.equal(review.body.attempt.max_score, 10)
    assert.equal(review.body.attempt.passed, false)
    assert.ok(review.body.questions.every((q: { correct_index: number; explanation: string }) => Number.isInteger(q.correct_index) && q.explanation))
  })

  test("attempt limits, opening times and other students' attempts are enforced", async () => {
    const again = await a.call("POST", "/api/student/quizzes/qz-1/start")
    assert.equal(again.status, 400)
    assert.match(again.body.error.message, /used all 1 attempt/)
    assert.match((await a.call("POST", "/api/student/quizzes/qz-2/start")).body.error.message, /opens on/)
    assert.equal((await b.call("GET", `/api/student/quiz-attempts/${attempt.attempt_id}/review`)).status, 404)
  })
})

describe("assignments and uploads", () => {
  let key: string
  test("submitting validates the link, accepts resubmissions and keeps the earlier file", async () => {
    assert.match((await a.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://gitlab.com/x/y" })).body.error.message, /GitHub link/)
    assert.match((await a.call("POST", "/api/student/assignments/asg-1/submission", {})).body.error.message, /repository link or attach a file/)
    key = await upload(a, "asg-1", "solution.txt", "print('hello')")
    const first = await a.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://github.com/qa/rag", file_key: key, file_name: "solution.txt", file_size: "14 B" })
    assert.equal(first.status, 200, JSON.stringify(first.body))
    assert.equal(first.body.status, "Submitted")
    const second = await a.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://github.com/qa/rag-v2", comments: "Fixed the retriever" })
    assert.deepEqual([second.body.repo_url, second.body.file_path, second.body.comments], ["https://github.com/qa/rag-v2", key, "Fixed the retriever"])
    const link = await a.call("GET", `/api/student/files?key=${encodeURIComponent(key)}`)
    assert.equal(link.status, 200)
    assert.equal((await h.app.inject({ method: "GET", url: link.body.url })).body, "print('hello')")
  })

  test("files can't be claimed by another student, and upload links can't be forged", async () => {
    assert.match((await b.call("POST", "/api/student/assignments/asg-2/submission", { file_key: key })).body.error.message, /file was not found/)
    assert.equal((await b.call("GET", `/api/student/files?key=${encodeURIComponent(key)}`)).status, 403)
    const target = await b.call("POST", "/api/student/uploads", { bucket: "submissions", folder: "asg-2", filename: "x.txt", content_type: "text/plain", size: 1 })
    const forged = target.body.url.replace(/\.[^.]+$/, ".invalid-signature")
    assert.equal((await h.app.inject({ method: "PUT", url: forged, payload: Buffer.from("x"), headers: { "content-type": "text/plain" } })).statusCode, 400)
    assert.equal((await b.call("POST", "/api/student/uploads", { bucket: "submissions", folder: "asg-2", filename: "big.zip", size: 60 * 1024 * 1024 })).status, 400)
  })

  test("graded work can't be resubmitted", async () => {
    const id = (await a.call("GET", "/api/me")).body.id
    await h.ctx.db.update(assignment_submissions).set({ status: "Graded", score: 90, grade: "A" }).where(and(eq(assignment_submissions.student_id, id), eq(assignment_submissions.assignment_id, "asg-1")))
    assert.match((await a.call("POST", "/api/student/assignments/asg-1/submission", { repo_url: "https://github.com/x/y" })).body.error.message, /already been graded/)
  })
})

describe("support", () => {
  let ticket: { id: string; status: string }
  test("tickets validate their input and open the conversation", async () => {
    const short = await a.call("POST", "/api/student/support/tickets", { category: "Technical Support", subject: "Help", description: "x".repeat(25), priority: "Low" })
    assert.match(short.body.error.message, /at least 8 characters/)
    const r = await a.call("POST", "/api/student/support/tickets", { category: "Technical Support", subject: "Cannot open the lab notebook", description: "The notebook link returns a 404 since this morning.", priority: "High" })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    ticket = r.body.ticket
    assert.match(ticket.id, /^TKT-\d{5,}$/)
    assert.equal(ticket.status, "Open")
    assert.equal(r.body.replies.length, 1)
    assert.equal(r.body.replies[0].author_role, "Student")
    assert.ok(!(await b.call("GET", "/api/student/support")).body.tickets.some((t: { id: string }) => t.id === ticket.id))
  })

  test("students resolve, reopen and reply; replying reopens a resolved ticket", async () => {
    assert.equal((await a.call("PATCH", `/api/student/support/tickets/${ticket.id}`, { status: "Resolved" })).body.status, "Resolved")
    assert.equal((await a.call("POST", `/api/student/support/tickets/${ticket.id}/replies`, { content: "It broke again." })).status, 200)
    const t = (await a.call("GET", "/api/student/support")).body.tickets.find((x: { id: string }) => x.id === ticket.id)
    assert.deepEqual([t.status, t.last_update_by], ["Open", "You"])
    assert.equal((await a.call("PATCH", `/api/student/support/tickets/${ticket.id}`, { status: "In Progress" })).status, 400)
    assert.equal((await b.call("POST", `/api/student/support/tickets/${ticket.id}/replies`, { content: "hi" })).status, 404)
  })

  test("live chat stores both sides of the conversation", async () => {
    const r = await a.call("POST", "/api/student/support/chat", { body: "My GPU quota ran out" })
    assert.deepEqual(r.body.map((m: { sender: string }) => m.sender), ["student", "agent"])
    assert.match(r.body[1].body, /GPU quota/)
  })
})

describe("mentorship", () => {
  // A weekday at least two days out, in campus time.
  function nextWeekday() {
    let day = addDays(localDay(new Date(), "Asia/Kolkata"), 2)
    while (isoDow(day) > 5) day = addDays(day, 1)
    return day
  }
  test("booking checks the day and slot, and a slot can't be double-booked", async () => {
    const day = nextWeekday()
    const ok = await a.call("POST", "/api/student/mentors/mentor-2/meeting", { date: day, slot: "04:30 PM", topic: "Career guidance" })
    assert.equal(ok.status, 200, JSON.stringify(ok.body))
    assert.equal(ok.body.ends_slot, "05:15 PM")
    const clash = await b.call("POST", "/api/student/mentors/mentor-2/meeting", { date: day, slot: "04:30 PM", topic: "Project review" })
    assert.equal(clash.status, 409)
    assert.match(clash.body.error.message, /just booked/)
    let saturday = day
    while (isoDow(saturday) !== 6) saturday = addDays(saturday, 1)
    assert.match((await b.call("POST", "/api/student/mentors/mentor-2/meeting", { date: saturday, slot: "04:30 PM", topic: "Project review" })).body.error.message, /weekdays/)
    assert.equal((await a.call("DELETE", "/api/student/mentors/mentor-2/meeting")).status, 204)
    assert.equal((await b.call("POST", "/api/student/mentors/mentor-2/meeting", { date: day, slot: "04:30 PM", topic: "Project review" })).status, 200)
  })
})

describe("community", () => {
  let post: { id: string }
  const counts = async () => (await b.call("GET", "/api/student/community")).body.posts.find((p: { id: string }) => p.id === post.id)
  test("posts take their author from the account and counters follow likes and replies", async () => {
    const r = await a.call("POST", "/api/student/community/posts", { channel: "General", title: "Anyone up for a mock interview swap?", content: "Weekend slots work.", author_name: "Prof. X" })
    assert.equal(r.status, 200, JSON.stringify(r.body))
    post = r.body
    assert.deepEqual([r.body.author_name, r.body.base_likes], ["Test Student A2", 0])
    assert.equal((await b.call("PUT", `/api/student/community/posts/${post.id}/like`, { on: true })).status, 200)
    assert.equal((await b.call("PUT", `/api/student/community/posts/${post.id}/like`, { on: true })).status, 200)
    assert.equal((await b.call("POST", `/api/student/community/posts/${post.id}/replies`, { body: "I'm in" })).status, 200)
    const p = await counts()
    assert.deepEqual([p.like_count, p.reply_count], [1, 1])
    await b.call("PUT", `/api/student/community/posts/${post.id}/like`, { on: false })
    assert.equal((await counts()).like_count, 0)
  })

  test("only the author can delete a post", async () => {
    assert.equal((await b.call("DELETE", `/api/student/community/posts/${post.id}`)).status, 404)
    assert.equal((await a.call("DELETE", `/api/student/community/posts/${post.id}`)).status, 204)
  })

  test("squad membership updates the member count", async () => {
    const count = async () => (await a.call("GET", "/api/student/community")).body.squads.find((s: { id: string }) => s.id === "sq-3").member_count
    const before = await count()
    await a.call("PUT", "/api/student/squads/sq-3/membership", { on: true })
    assert.equal(await count(), before + 1)
    await a.call("PUT", "/api/student/squads/sq-3/membership", { on: false })
    assert.equal(await count(), before)
  })
})

describe("demo account", () => {
  test("only the shared demo student can reset demo data", async () => {
    const r = await a.call("POST", "/api/student/demo/reset")
    assert.equal(r.status, 403)
    assert.match(r.body.error.message, /Only the shared demo account/)
  })

  test("resetting restores the demo student's history", async () => {
    const demo = await h.user({ email: h.ctx.config.DEMO_STUDENT_EMAIL, name: "Aarav Mehta", keep: true })
    assert.equal((await demo.call("POST", "/api/student/support/tickets", { category: "General", subject: "A ticket added by the test", description: "This ticket should disappear after the reset.", priority: "Low" })).status, 200)
    assert.equal((await demo.call("POST", "/api/student/demo/reset")).status, 204)
    const support = await demo.call("GET", "/api/student/support")
    assert.equal(support.body.tickets.length, 4)
    const core = await demo.call("GET", "/api/student/core")
    assert.equal(core.body.profile.is_demo, true)
    assert.equal(core.body.profile.full_name, "Aarav Mehta")
  })
})
