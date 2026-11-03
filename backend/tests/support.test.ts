import assert from "node:assert/strict"
import { after, before, describe, test } from "node:test"
import { createHarness, type TestHarness, type TestUser } from "./helpers.js"

let h: TestHarness
let student: TestUser
let support: TestUser

before(async () => {
  h = await createHarness()
  student = await h.user({ name: "Support Test Student" })
  await student.call("GET", "/api/student/profile")
  support = await h.user({ name: "Support Agent Neha", groups: ["support"] })
})

after(async () => {
  await h.close()
})

describe("support API access control", () => {
  test("unauthenticated requests are refused with 401", async () => {
    const res = await h.app.inject({ method: "GET", url: "/api/support/tickets" })
    assert.equal(res.statusCode, 401)
  })

  test("students cannot access support staff endpoints", async () => {
    const res = await student.call("GET", "/api/support/tickets")
    assert.equal(res.status, 403)
  })
})

describe("support tickets workflow", () => {
  let createdTicketId: string

  test("support staff can view ticket stats", async () => {
    const res = await support.call("GET", "/api/support/stats")
    assert.equal(res.status, 200)
    assert.ok(typeof res.body.total === "number")
    assert.ok(typeof res.body.open === "number")
    assert.ok(typeof res.body.inProgress === "number")
    assert.ok(typeof res.body.resolved === "number")
    assert.ok(typeof res.body.closed === "number")
  })

  test("support staff can list all tickets with student info and replies", async () => {
    const res = await support.call("GET", "/api/support/tickets")
    assert.equal(res.status, 200)
    assert.ok(Array.isArray(res.body.tickets))
    assert.ok(res.body.tickets.length > 0)

    const first = res.body.tickets[0]
    assert.ok(first.id)
    assert.ok(first.subject)
    assert.ok(first.student)
    assert.ok(first.student.full_name)
    assert.ok(Array.isArray(first.replies))
  })

  test("support staff can create a new ticket", async () => {
    const res = await support.call("POST", "/api/support/tickets", {
      category: "Technical Support",
      subject: "Test Issue with Sandbox Container Timeout",
      description: "Learner reported sandbox container timing out after 10 minutes of active inference running.",
      priority: "High",
    })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.ok(res.body.ticket)
    assert.ok(res.body.ticket.id.startsWith("TKT-"))
    assert.equal(res.body.ticket.priority, "High")
    assert.equal(res.body.ticket.status, "Open")
    assert.ok(Array.isArray(res.body.replies))
    assert.ok(res.body.replies.length >= 1)

    createdTicketId = res.body.ticket.id
  })

  test("support staff can fetch single ticket by id with # prefix handling", async () => {
    const res = await support.call("GET", `/api/support/tickets/${encodeURIComponent("#" + createdTicketId)}`)
    assert.equal(res.status, 200, JSON.stringify(res.body))
    assert.equal(res.body.ticket.id, createdTicketId)
    assert.ok(res.body.student)
    assert.ok(Array.isArray(res.body.replies))
  })

  test("support staff can add a reply to the ticket", async () => {
    const res = await support.call("POST", `/api/support/tickets/${createdTicketId}/replies`, {
      content: "We have provisioned higher RAM quota on your inference pod. Please restart your kernel.",
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.ticket_id, createdTicketId)
    assert.equal(res.body.author_name, "Support Agent Neha")
    assert.equal(res.body.author_role, "Support Team")
  })

  test("support staff can update ticket status, priority, and resolution notes", async () => {
    const res = await support.call("PATCH", `/api/support/tickets/${createdTicketId}`, {
      status: "Resolved",
      priority: "Medium",
      resolution_notes: "Sandbox node restarted and memory limit raised to 16GB.",
      last_update_by: "Support Lead",
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.ticket.status, "Resolved")
    assert.equal(res.body.ticket.priority, "Medium")
    assert.equal(res.body.ticket.resolution_notes, "Sandbox node restarted and memory limit raised to 16GB.")

    // Verify resolution notes created a reply in the ticket
    const replies = res.body.replies
    const resolutionReply = replies.find((r: { content: string }) => r.content.includes("[Resolution Note]"))
    assert.ok(resolutionReply, "Resolution note reply was created")
  })
})

