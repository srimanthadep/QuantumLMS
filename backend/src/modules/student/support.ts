import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { faq_votes, faqs, support_chat_messages, support_tickets, ticket_number_seq, ticket_replies } from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { notify } from "./notify.js"
import { ownObject } from "./shared.js"
import { broadcastToChannel } from "../../ws.js"

/** Live-chat replies from Learner Success (keyword routing, as before). */
export function agentReply(text: string): string {
  if (/(gpu|cluster|quota)/i.test(text)) return "For GPU quota, I can raise a priority request with DevOps. Could you share your namespace and the hours you need?"
  if (/(attend|leave|absent)/i.test(text)) return "You can request leave from Schedule → Attendance. If it's medical, attach the slip and Academic Affairs will mark it excused."
  if (/(assign|submit|deadline)/i.test(text)) return "Submissions can be updated until the deadline from the Assessments page. Want me to check an extension for you?"
  if (/(certificate|transcript)/i.test(text)) return "Certificates and the PDF transcript are under Grades & Certificates. Each has a verification link you can share."
  return "Thanks! I'm looking into it now. Could you share a little more detail so I can route this to the right team?"
}

async function ownTicket(tx: Tx, studentId: string, id: string) {
  const r = await tx.execute(sql`select * from lms.support_tickets where id = ${id} and student_id = ${studentId}::uuid for update`)
  const t = r.rows[0] as (typeof support_tickets.$inferSelect) | undefined
  if (!t) throw notFound("Ticket not found.")
  return t
}

export async function supportRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  app.get("/api/student/support", async (req) => {
    const s = me(req)
    const [faqRows, votes, tickets] = await Promise.all([
      db.select().from(faqs).orderBy(asc(faqs.position)),
      db.select({ faq_id: faq_votes.faq_id, vote: faq_votes.vote }).from(faq_votes).where(eq(faq_votes.student_id, s.id)),
      db.select().from(support_tickets).where(eq(support_tickets.student_id, s.id)).orderBy(desc(support_tickets.created_at)),
    ])
    const replies = tickets.length
      ? await db.select().from(ticket_replies).where(inArray(ticket_replies.ticket_id, tickets.map((t) => t.id))).orderBy(asc(ticket_replies.created_at))
      : []
    return { faqs: faqRows, votes, tickets, replies }
  })

  app.put<{ Params: { id: string } }>("/api/student/faqs/:id/vote", async (req) => {
    const s = me(req)
    const { vote } = parse(z.object({ vote: z.enum(["up", "down"]) }), req.body)
    const f = await db.query.faqs.findFirst({ where: eq(faqs.id, req.params.id) })
    if (!f) throw notFound("Question not found.")
    await db.insert(faq_votes).values({ student_id: s.id, faq_id: f.id, vote }).onConflictDoUpdate({ target: [faq_votes.student_id, faq_votes.faq_id], set: { vote } })
    return { vote }
  })

  const attachment = { attachment_key: z.string().max(400).nullish(), attachment_name: z.string().max(400).nullish(), attachment_size: z.string().max(40).nullish() }

  app.post("/api/student/support/tickets", async (req) => {
    const s = me(req)
    const b = parse(
      z.object({
        category: z.string().trim().max(80).default("Other"),
        subject: z.string().trim().min(8, "Summarise the issue in at least 8 characters.").max(200),
        description: z.string().trim().min(20, "Describe what happened in at least 20 characters.").max(5000),
        priority: z.enum(["Low", "Medium", "High", "Urgent"], { message: "Choose a priority." }),
        ...attachment,
      }),
      req.body,
    )
    const key = await ownObject(ctx, s, "ticket-attachments", b.attachment_key)
    const name = key ? (b.attachment_name ?? "").slice(0, 200) || null : null
    const size = key ? (b.attachment_size ?? "").slice(0, 40) || null : null
    return db.transaction(async (tx) => {
      const [{ n }] = (await tx.execute(sql`select nextval(${sql.raw(`'lms.${ticket_number_seq.seqName}'`)}) as n`)).rows as { n: string }[]
      const [ticket] = await tx
        .insert(support_tickets)
        .values({ id: `TKT-${n}`, student_id: s.id, category: b.category.length >= 2 ? b.category : "Other", subject: b.subject, description: b.description, priority: b.priority, attachment_name: name, attachment_size: size, attachment_path: key })
        .returning()
      // The description opens the conversation, as the first message from the student.
      await tx.insert(ticket_replies).values({ ticket_id: ticket.id, author_id: s.id, author_name: s.full_name, author_role: "Student", author_avatar: s.avatar_url, content: ticket.description, attachment_name: name, attachment_path: key })
      await notify(tx, s.id, "system", `Ticket ${ticket.id} created`, `${ticket.subject}. We'll reply soon.`, "support")
      const replies = await tx.select().from(ticket_replies).where(eq(ticket_replies.ticket_id, ticket.id)).orderBy(asc(ticket_replies.created_at))
      return { ticket, replies }
    })
  })

  // A reply on a resolved or closed ticket reopens it.
  app.post<{ Params: { id: string } }>("/api/student/support/tickets/:id/replies", async (req) => {
    const s = me(req)
    const b = parse(z.object({ content: z.string().trim().min(1, "Write a reply of up to 5,000 characters.").max(5000, "Write a reply of up to 5,000 characters."), ...attachment }), req.body)
    const key = await ownObject(ctx, s, "ticket-attachments", b.attachment_key)
    return db.transaction(async (tx) => {
      const t = await ownTicket(tx, s.id, req.params.id)
      const [reply] = await tx
        .insert(ticket_replies)
        .values({ ticket_id: t.id, author_id: s.id, author_name: s.full_name, author_role: "Student", author_avatar: s.avatar_url, content: b.content, attachment_name: key ? (b.attachment_name ?? "").slice(0, 200) || null : null, attachment_path: key })
        .returning()
      await tx
        .update(support_tickets)
        .set({ status: sql`case when ${support_tickets.status} in ('Resolved', 'Closed') then 'Open' else ${support_tickets.status} end`, last_update_by: "You", updated_at: new Date() })
        .where(eq(support_tickets.id, t.id))
      return reply
    })
  })

  // Students can mark their ticket resolved, or reopen a resolved or closed one. Staff statuses are not theirs to set.
  app.patch<{ Params: { id: string } }>("/api/student/support/tickets/:id", async (req) => {
    const s = me(req)
    const { status } = parse(z.object({ status: z.enum(["Open", "In Progress", "Resolved", "Closed"]) }), req.body)
    return db.transaction(async (tx) => {
      const t = await ownTicket(tx, s.id, req.params.id)
      const allowed = (status === "Resolved" && ["Open", "In Progress"].includes(t.status)) || (status === "Open" && ["Resolved", "Closed"].includes(t.status))
      if (allowed) {
        const [row] = await tx.update(support_tickets).set({ status, last_update_by: "You", updated_at: new Date() }).where(eq(support_tickets.id, t.id)).returning()
        return row
      }
      if (status !== t.status) throw badRequest(`A ${t.status.toLowerCase()} ticket can't be set to ${status.toLowerCase()}.`)
      return t
    })
  })

  /* --------------------------------- Live chat -------------------------------- */
  app.get("/api/student/support/chat", async (req) =>
    db.select().from(support_chat_messages).where(eq(support_chat_messages.student_id, me(req).id)).orderBy(asc(support_chat_messages.created_at), asc(support_chat_messages.id)).limit(200),
  )

  app.post("/api/student/support/chat", async (req) => {
    const s = me(req)
    const { body } = parse(z.object({ body: z.string().trim().min(1, "Write a message of up to 2,000 characters.").max(2000, "Write a message of up to 2,000 characters.") }), req.body)
    const rows = await db
      .insert(support_chat_messages)
      .values([
        { student_id: s.id, sender: "student", body },
        { student_id: s.id, sender: "agent", body: agentReply(body) },
      ])
      .returning()

    broadcastToChannel(`chat:${s.id}`, "message", {
      id: String(rows[0].id),
      text: rows[0].body,
      sender: "student",
      senderName: s.full_name,
    })
    broadcastToChannel(`chat:${s.id}`, "message", {
      id: String(rows[1].id),
      text: rows[1].body,
      sender: "agent",
      senderName: "Learner Success",
    })

    return rows
  })
}
