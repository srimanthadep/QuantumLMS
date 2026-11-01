// Integration tests against the live Supabase project: RLS isolation, column privileges and every student RPC.
// Two throwaway students are created through sign-up and deleted afterwards.
//   SUPABASE_ACCESS_TOKEN=... node --test backend/tests/
import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { Client, config, deleteUser, emptyFolder } from "./client.mjs"

const DEMO = { email: "aarav.mehta@learner.ai", password: "demo-student" }
const run = Date.now().toString(36)
let cfg, a, b, anon

before(async () => {
  cfg = await config()
  anon = new Client(cfg)
  a = await new Client(cfg).signUp(`qa-${run}-a@example.com`, `pw-${run}-a!`, { full_name: "Test Student A" })
  b = await new Client(cfg).signUp(`qa-${run}-b@example.com`, `pw-${run}-b!`, { full_name: "Test Student B" })
})

after(async () => {
  for (const c of [a, b]) {
    if (!c?.user?.id) continue
    for (const bucket of ["submissions", "ticket-attachments", "avatars"]) await emptyFolder(cfg, bucket, c.user.id)
    await deleteUser(cfg, c.user.id)
  }
})

const denied = (r) => [401, 403].includes(r.status) || r.data?.code === "42501"

describe("sign-up", () => {
  test("creates a profile, enrolls the starter courses and opens their certificates", async () => {
    const { data: [p] } = await a.select("profiles", "select=*")
    assert.equal(p.full_name, "Test Student A")
    assert.match(p.roll_number, /^QAI-\d{4}-\d{3,}$/)
    assert.equal(p.is_demo, false)
    assert.equal(p.mentor_id, "mentor-1")
    const { data: enr } = await a.select("enrollments", "select=course_id&order=course_id")
    assert.deepEqual(enr.map((e) => e.course_id), ["c-1", "c-2", "c-3", "c-4"])
    const { data: certs } = await a.select("certificates", "select=status,course_id")
    assert.equal(certs.length, 4)
    assert.ok(certs.every((c) => c.status === "In Progress"))
    const { data: notes } = await a.select("notifications", "select=title")
    assert.deepEqual(notes.map((n) => n.title), ["Welcome to Quantum School"])
  })
})

describe("access control", () => {
  test("anonymous visitors can read nothing and call nothing", async () => {
    const courses = await anon.select("courses")
    assert.ok(denied(courses) || (courses.ok && courses.data.length === 0), `anon read courses: ${courses.status}`)
    assert.ok(denied(await anon.rpc("start_quiz", { p_quiz_id: "qz-1" })))
  })

  test("quiz answers are not readable by students", async () => {
    assert.ok(denied(await a.select("quiz_questions")))
  })

  test("students only see their own rows", async () => {
    const note = await a.insert("notes", { title: "A's private note", content: "secret" })
    assert.equal(note.status, 201, JSON.stringify(note.data))
    const id = note.data[0].id
    assert.deepEqual((await b.select("notes", `id=eq.${id}`)).data, [])
    assert.deepEqual((await b.update("notes", `id=eq.${id}`, { title: "hijacked" })).data, [])
    assert.deepEqual((await b.remove("notes", `id=eq.${id}`)).data, [])
    assert.equal((await b.select("profiles", `id=eq.${a.user.id}`)).data.length, 0)
    const forged = await b.insert("notes", { title: "forged", student_id: a.user.id })
    assert.ok(denied(forged), `forged insert: ${forged.status}`)
  })

  test("students can only set the columns they own", async () => {
    assert.ok(denied(await a.update("profiles", `id=eq.${a.user.id}`, { gpa: "4.00 / 4.00" })))
    const ok = await a.update("profiles", `id=eq.${a.user.id}`, { full_name: "Test Student A2", bio: "Hello" })
    assert.equal(ok.data[0].full_name, "Test Student A2")
    assert.ok(denied(await a.insert("leave_requests", { course_code: "AI-401", leave_date: "2026-12-01", reason: "Family function out of town", status: "Approved" })))
    const leave = await a.insert("leave_requests", { course_code: "AI-401", leave_date: "2026-12-01", reason: "Family function out of town" })
    assert.equal(leave.data[0].status, "Pending")
    assert.ok(denied(await a.insert("assignment_submissions", { assignment_id: "asg-1", status: "Graded", score: 100 })))
    assert.ok(denied(await a.insert("grades", { course_code: "X", course_title: "X", credits: 4, midterm: 100, assignments: 100, final_exam: 100, total_score: 100, letter_grade: "A+", status: "Passed", term: "Fall 2026" })))
  })
})

describe("courses", () => {
  test("lesson completion updates progress and today's study time, and can be undone", async () => {
    const done = await a.rpc("set_lesson_complete", { p_lesson_id: "l-1-1" })
    assert.equal(done.status, 200, JSON.stringify(done.data))
    assert.deepEqual([done.data.completed, done.data.total], [1, 29])
    const { data: [day] } = await a.select("study_activity", "select=minutes,lessons&order=day.desc&limit=1")
    assert.deepEqual([day.minutes, day.lessons], [45, 1])
    const undone = await a.rpc("set_lesson_complete", { p_lesson_id: "l-1-1", p_done: false })
    assert.equal(undone.data.completed, 0)
    const { data: [after] } = await a.select("study_activity", "select=minutes,lessons&order=day.desc&limit=1")
    assert.deepEqual([after.minutes, after.lessons], [0, 0])
  })

  test("progress needs an enrollment; finishing a course issues its certificate", async () => {
    assert.ok(denied(await a.rpc("set_lesson_complete", { p_lesson_id: "cat-1-m1-l1" })))
    assert.equal((await a.insert("enrollments", { course_id: "cat-1" })).status, 201)
    const { data: lessons } = await a.select("lessons", "select=id&course_id=eq.cat-1&order=position")
    let last
    for (const l of lessons) last = await a.rpc("set_lesson_complete", { p_lesson_id: l.id })
    assert.equal(last.data.completed, lessons.length)
    assert.equal(last.data.certificate.status, "Earned")
    assert.match(last.data.certificate.credential_id, /^QAI-[0-9A-F]{10}-PE$/)
    const { data: [n] } = await a.select("notifications", "select=title&order=created_at.desc&limit=1")
    assert.equal(n.title, "Certificate earned")
  })

  test("anyone can verify an earned credential, and only that", async () => {
    const { data: [cert] } = await a.select("certificates", "select=credential_id&status=eq.Earned")
    const ok = await anon.rpc("verify_certificate", { p_credential_id: cert.credential_id })
    assert.equal(ok.status, 200, JSON.stringify(ok.data))
    assert.deepEqual([ok.data.recipient, ok.data.title], ["Test Student A2", "Prompt Engineering Practitioner"])
    assert.equal(Object.keys(ok.data).includes("student_id"), false)
    const demo = await anon.rpc("verify_certificate", { p_credential_id: "QAI-88392-PY" })
    assert.equal(demo.data.recipient, "Aarav Mehta")
    assert.equal((await anon.rpc("verify_certificate", { p_credential_id: "QAI-NOT-REAL" })).data, null)
  })
})

describe("quizzes", () => {
  let attempt
  test("start_quiz returns questions without answers and resumes the open attempt", async () => {
    const r = await a.rpc("start_quiz", { p_quiz_id: "qz-1" })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    attempt = r.data
    assert.equal(attempt.questions.length, 10)
    assert.ok(attempt.questions.every((q) => !("correct_index" in q) && !("explanation" in q)))
    assert.ok(new Date(attempt.deadline_at) - new Date(attempt.started_at) <= 20 * 60_000 + 1000)
    const again = await a.rpc("start_quiz", { p_quiz_id: "qz-1" })
    assert.equal(again.data.attempt_id, attempt.attempt_id)
  })

  test("answers autosave, the review only opens after submitting, and grading happens on the server", async () => {
    assert.equal((await a.rpc("get_quiz_review", { p_attempt_id: attempt.attempt_id })).status, 400)
    await a.rpc("save_quiz_answers", { p_attempt_id: attempt.attempt_id, p_answers: { 0: 1, 1: 9, 2: "x", 99: 0 } })
    const { data: [saved] } = await a.select("quiz_attempts", `select=answers&id=eq.${attempt.attempt_id}`)
    assert.deepEqual(saved.answers, { 0: 1 })
    const review = await a.rpc("submit_quiz", { p_attempt_id: attempt.attempt_id, p_answers: { 0: 1, 1: 0, 2: 0 } })
    assert.equal(review.status, 200, JSON.stringify(review.data))
    const correct = review.data.questions.slice(0, 3).filter((q, i) => q.correct_index === [1, 0, 0][i]).length
    assert.equal(review.data.attempt.score, correct)
    assert.equal(review.data.attempt.max_score, 10)
    assert.equal(review.data.attempt.passed, false)
    assert.ok(review.data.questions.every((q) => Number.isInteger(q.correct_index) && q.explanation))
  })

  test("attempt limits, opening times and other students' attempts are enforced", async () => {
    const again = await a.rpc("start_quiz", { p_quiz_id: "qz-1" })
    assert.equal(again.status, 400)
    assert.match(again.data.message, /used all 1 attempt/)
    const early = await a.rpc("start_quiz", { p_quiz_id: "qz-2" })
    assert.match(early.data.message, /opens on/)
    assert.equal((await b.rpc("get_quiz_review", { p_attempt_id: attempt.attempt_id })).status, 404)
    assert.ok(denied(await a.update("quiz_attempts", `id=eq.${attempt.attempt_id}`, { score: 10 })))
  })
})

describe("assignments and storage", () => {
  test("submit_assignment validates the link, accepts resubmissions and keeps the earlier file", async () => {
    const bad = await a.rpc("submit_assignment", { p_assignment_id: "asg-1", p_repo_url: "https://gitlab.com/x/y" })
    assert.match(bad.data.message, /GitHub link/)
    assert.match((await a.rpc("submit_assignment", { p_assignment_id: "asg-1" })).data.message, /repository link or attach a file/)
    const path = `${a.user.id}/asg-1/${run}-solution.txt`
    assert.equal((await a.upload("submissions", path, "print('hello')")).status, 200)
    const first = await a.rpc("submit_assignment", { p_assignment_id: "asg-1", p_repo_url: "https://github.com/qa/rag", p_file_path: path, p_file_name: "solution.txt", p_file_size: "14 B" })
    assert.equal(first.status, 200, JSON.stringify(first.data))
    assert.equal(first.data.status, "Submitted")
    const second = await a.rpc("submit_assignment", { p_assignment_id: "asg-1", p_repo_url: "https://github.com/qa/rag-v2", p_comments: "Fixed the retriever" })
    assert.deepEqual([second.data.repo_url, second.data.file_path, second.data.comments], ["https://github.com/qa/rag-v2", path, "Fixed the retriever"])
  })

  test("files can't be written to another student's folder or claimed by them", async () => {
    assert.ok(!(await b.upload("submissions", `${a.user.id}/asg-2/evil.txt`, "x")).ok)
    const path = `${a.user.id}/asg-1/${run}-solution.txt`
    const claim = await b.rpc("submit_assignment", { p_assignment_id: "asg-2", p_file_path: path })
    assert.match(claim.data.message, /file was not found/)
  })

  test("graded work can't be resubmitted", async () => {
    const demo = await new Client(cfg).signIn(DEMO.email, DEMO.password)
    const r = await demo.rpc("submit_assignment", { p_assignment_id: "asg-4", p_repo_url: "https://github.com/x/y" })
    assert.match(r.data.message, /already been graded/)
  })
})

describe("support", () => {
  let ticket
  test("create_support_ticket validates input and opens the conversation", async () => {
    const short = await a.rpc("create_support_ticket", { p_category: "Technical Support", p_subject: "Help", p_description: "x".repeat(25), p_priority: "Low" })
    assert.match(short.data.message, /at least 8 characters/)
    const r = await a.rpc("create_support_ticket", { p_category: "Technical Support", p_subject: "Cannot open the lab notebook", p_description: "The notebook link returns a 404 since this morning.", p_priority: "High" })
    assert.equal(r.status, 200, JSON.stringify(r.data))
    ticket = r.data
    assert.match(ticket.id, /^TKT-\d{5,}$/)
    assert.equal(ticket.status, "Open")
    const { data: replies } = await a.select("ticket_replies", `ticket_id=eq.${ticket.id}`)
    assert.equal(replies.length, 1)
    assert.equal(replies[0].author_role, "Student")
    assert.deepEqual((await b.select("ticket_replies", `ticket_id=eq.${ticket.id}`)).data, [])
  })

  test("students resolve, reopen and reply; replying reopens a resolved ticket", async () => {
    assert.equal((await a.rpc("set_support_ticket_status", { p_ticket_id: ticket.id, p_status: "Resolved" })).data.status, "Resolved")
    assert.equal((await a.rpc("reply_to_support_ticket", { p_ticket_id: ticket.id, p_content: "It broke again." })).status, 200)
    const { data: [t] } = await a.select("support_tickets", `id=eq.${ticket.id}`)
    assert.deepEqual([t.status, t.last_update_by], ["Open", "You"])
    assert.equal((await a.rpc("set_support_ticket_status", { p_ticket_id: ticket.id, p_status: "In Progress" })).status, 400)
    assert.equal((await b.rpc("reply_to_support_ticket", { p_ticket_id: ticket.id, p_content: "hi" })).status, 404)
  })

  test("live chat stores both sides of the conversation", async () => {
    const r = await a.rpc("send_support_chat_message", { p_body: "My GPU quota ran out" })
    assert.deepEqual(r.data.map((m) => m.sender), ["student", "agent"])
    assert.match(r.data[1].body, /GPU quota/)
  })
})

describe("mentorship", () => {
  // A weekday at least two days out, as YYYY-MM-DD in campus time.
  function nextWeekday() {
    const d = new Date(Date.now() + 2 * 86_400_000)
    while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().slice(0, 10)
  }
  test("booking checks the day and slot, and a slot can't be double-booked", async () => {
    const day = nextWeekday()
    const ok = await a.rpc("book_mentor_meeting", { p_mentor_id: "mentor-2", p_date: day, p_slot: "04:30 PM", p_topic: "Career guidance" })
    assert.equal(ok.status, 200, JSON.stringify(ok.data))
    assert.equal(ok.data.ends_slot, "05:15 PM")
    const clash = await b.rpc("book_mentor_meeting", { p_mentor_id: "mentor-2", p_date: day, p_slot: "04:30 PM", p_topic: "Project review" })
    assert.match(clash.data.message, /just booked/)
    const sat = new Date(day)
    sat.setUTCDate(sat.getUTCDate() + ((6 - sat.getUTCDay() + 7) % 7))
    const weekend = await b.rpc("book_mentor_meeting", { p_mentor_id: "mentor-2", p_date: sat.toISOString().slice(0, 10), p_slot: "04:30 PM", p_topic: "Project review" })
    assert.match(weekend.data.message, /weekdays/)
    await a.rpc("cancel_mentor_meeting", { p_mentor_id: "mentor-2" })
    assert.equal((await b.rpc("book_mentor_meeting", { p_mentor_id: "mentor-2", p_date: day, p_slot: "04:30 PM", p_topic: "Project review" })).status, 200)
  })
})

describe("community", () => {
  let post
  test("posts take their author from the profile and counters follow likes and replies", async () => {
    const r = await a.insert("community_posts", { channel: "General", title: "Anyone up for a mock interview swap?", content: "Weekend slots work." })
    assert.equal(r.status, 201, JSON.stringify(r.data))
    post = r.data[0]
    assert.deepEqual([post.author_id, post.author_name, post.base_likes], [a.user.id, "Test Student A2", 0])
    assert.ok(denied(await a.insert("community_posts", { channel: "General", title: "Forged author", author_name: "Prof. X" })))
    assert.equal((await b.insert("post_likes", { post_id: post.id })).status, 201)
    assert.equal((await b.insert("post_replies", { post_id: post.id, body: "I'm in" })).status, 201)
    const { data: [p] } = await b.select("community_posts", `select=like_count,reply_count&id=eq.${post.id}`)
    assert.deepEqual([p.like_count, p.reply_count], [1, 1])
    assert.equal((await b.remove("post_likes", `post_id=eq.${post.id}`)).status, 200)
    const { data: [p2] } = await b.select("community_posts", `select=like_count&id=eq.${post.id}`)
    assert.equal(p2.like_count, 0)
  })

  test("only the author can delete a post", async () => {
    assert.deepEqual((await b.remove("community_posts", `id=eq.${post.id}`)).data, [])
    assert.equal((await a.remove("community_posts", `id=eq.${post.id}`)).data.length, 1)
  })

  test("squad membership updates the member count", async () => {
    const before = (await a.select("study_squads", "select=member_count&id=eq.sq-3")).data[0].member_count
    await a.insert("squad_members", { squad_id: "sq-3" })
    assert.equal((await a.select("study_squads", "select=member_count&id=eq.sq-3")).data[0].member_count, before + 1)
    await a.remove("squad_members", "squad_id=eq.sq-3")
    assert.equal((await a.select("study_squads", "select=member_count&id=eq.sq-3")).data[0].member_count, before)
  })
})

describe("demo account", () => {
  test("students can add an authenticator, the shared demo account can't", async () => {
    const own = await a.request("/auth/v1/factors", { method: "POST", body: { factor_type: "totp", friendly_name: `qa-${run}` } })
    assert.equal(own.status, 200, JSON.stringify(own.data))
    assert.equal((await a.request(`/auth/v1/factors/${own.data.id}`, { method: "DELETE" })).status, 200)
    const demo = await new Client(cfg).signIn(DEMO.email, DEMO.password)
    const blocked = await demo.request("/auth/v1/factors", { method: "POST", body: { factor_type: "totp", friendly_name: `qa-${run}` } })
    if (blocked.ok) await demo.request(`/auth/v1/factors/${blocked.data.id}`, { method: "DELETE" })
    assert.ok(!blocked.ok, "the demo account must not get a second factor")
  })

  test("only the demo student can reset demo data, and its password is locked", async () => {
    assert.match((await a.rpc("reset_my_demo_data")).data.message, /Only the shared demo account/)
    const demo = await new Client(cfg).signIn(DEMO.email, DEMO.password)
    const pw = await demo.request("/auth/v1/user", { method: "PUT", body: { password: "changed-by-test" } })
    assert.ok(!pw.ok, "the demo password must not change")
    assert.equal((await demo.rpc("reset_my_demo_data")).status, 204)
    const { data: tickets } = await demo.select("support_tickets", "select=id")
    assert.equal(tickets.length, 4)
    await new Client(cfg).signIn(DEMO.email, DEMO.password)
  })
})
