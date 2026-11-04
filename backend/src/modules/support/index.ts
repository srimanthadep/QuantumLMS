import { asc, desc, eq, inArray, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { profiles, support_tickets, ticket_number_seq, ticket_replies, users } from "../../db/schema.js"
import { notFound } from "../../errors.js"
import { authenticate, me, parse } from "../../http.js"
import { notify } from "../student/notify.js"
import { broadcastToChannel } from "../../ws.js"

export interface TicketStudentInfo {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  batch: string
  roll_number: string
  program: string
}

async function loadTicketWithDetails(tx: Tx, ticketId: string) {
  const cleanId = ticketId.replace(/^#/, "").trim()
  const rows = (
    await tx.execute(sql`
      select
        t.id, t.student_id, t.category, t.subject, t.description, t.priority, t.status,
        t.attachment_name, t.attachment_size, t.attachment_path, t.resolution_notes,
        t.last_update_by, t.created_at, t.updated_at,
        u.full_name as student_name, u.email as student_email, u.avatar_url as student_avatar,
        coalesce(p.batch, 'Class of 2027 · Year 4') as student_batch,
        coalesce(p.roll_number, '') as roll_number,
        coalesce(p.program, 'Bachelor of Science in Artificial Intelligence') as student_program
      from lms.support_tickets t
      join lms.users u on u.id = t.student_id
      left join lms.profiles p on p.id = t.student_id
      where t.id = ${cleanId} or lower(t.id) = lower(${cleanId})
      limit 1
    `)
  ).rows as any[]

  if (!rows.length) throw notFound("Ticket not found.")
  const row = rows[0]

  const replies = await tx
    .select()
    .from(ticket_replies)
    .where(eq(ticket_replies.ticket_id, row.id))
    .orderBy(asc(ticket_replies.created_at))

  const ticket = {
    id: row.id,
    student_id: row.student_id,
    category: row.category,
    subject: row.subject,
    description: row.description,
    priority: row.priority,
    status: row.status,
    attachment_name: row.attachment_name,
    attachment_size: row.attachment_size,
    attachment_path: row.attachment_path,
    resolution_notes: row.resolution_notes,
    last_update_by: row.last_update_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }

  const student: TicketStudentInfo = {
    id: row.student_id,
    full_name: row.student_name,
    email: row.student_email,
    avatar_url: row.student_avatar,
    batch: row.student_batch,
    roll_number: row.roll_number,
    program: row.student_program,
  }

  return { ticket, replies, student }
}

export async function supportModule(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  await app.register(async (scope) => {
    // Only Support, Admin, and Super Admin can access the support desk endpoints
    scope.addHook("preHandler", authenticate(ctx, ["Support", "Admin", "Super Admin"]))

    // List all tickets with joined student profiles & replies
    scope.get("/api/support/tickets", async () => {
      const rows = (
        await db.execute(sql`
          select
            t.id, t.student_id, t.category, t.subject, t.description, t.priority, t.status,
            t.attachment_name, t.attachment_size, t.attachment_path, t.resolution_notes,
            t.last_update_by, t.created_at, t.updated_at,
            u.full_name as student_name, u.email as student_email, u.avatar_url as student_avatar,
            coalesce(p.batch, 'Class of 2027 · Year 4') as student_batch,
            coalesce(p.roll_number, '') as roll_number,
            coalesce(p.program, 'Bachelor of Science in Artificial Intelligence') as student_program
          from lms.support_tickets t
          join lms.users u on u.id = t.student_id
          left join lms.profiles p on p.id = t.student_id
          order by t.created_at desc
        `)
      ).rows as any[]

      const ticketIds = rows.map((r) => r.id)
      const allReplies = ticketIds.length
        ? await db
            .select()
            .from(ticket_replies)
            .where(inArray(ticket_replies.ticket_id, ticketIds))
            .orderBy(asc(ticket_replies.created_at))
        : []

      const repliesByTicket = new Map<string, typeof allReplies>()
      for (const reply of allReplies) {
        const list = repliesByTicket.get(reply.ticket_id) ?? []
        list.push(reply)
        repliesByTicket.set(reply.ticket_id, list)
      }

      const tickets = rows.map((row) => ({
        id: row.id,
        student_id: row.student_id,
        category: row.category,
        subject: row.subject,
        description: row.description,
        priority: row.priority,
        status: row.status,
        attachment_name: row.attachment_name,
        attachment_size: row.attachment_size,
        attachment_path: row.attachment_path,
        resolution_notes: row.resolution_notes,
        last_update_by: row.last_update_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        student: {
          id: row.student_id,
          full_name: row.student_name,
          email: row.student_email,
          avatar_url: row.student_avatar,
          batch: row.student_batch,
          roll_number: row.roll_number,
          program: row.student_program,
        },
        replies: repliesByTicket.get(row.id) ?? [],
      }))

      return { tickets }
    })

    // Fetch single ticket with replies and student profile
    scope.get<{ Params: { id: string } }>("/api/support/tickets/:id", async (req) => {
      return loadTicketWithDetails(db, req.params.id)
    })

    // Update ticket status, priority, resolution notes, and last update by
    scope.patch<{ Params: { id: string } }>("/api/support/tickets/:id", async (req) => {
      const u = me(req)
      const cleanId = req.params.id.replace(/^#/, "").trim()
      const b = parse(
        z.object({
          status: z.enum(["Open", "In Progress", "Resolved", "Closed"]).optional(),
          priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
          resolution_notes: z.string().max(5000).nullable().optional(),
          last_update_by: z.string().max(120).nullable().optional(),
        }),
        req.body,
      )

      return db.transaction(async (tx) => {
        const lockRes = await tx.execute(
          sql`select * from lms.support_tickets where id = ${cleanId} or lower(id) = lower(${cleanId}) for update`,
        )
        const t = lockRes.rows[0] as (typeof support_tickets.$inferSelect) | undefined
        if (!t) throw notFound("Ticket not found.")

        const nextStatus = b.status ?? t.status
        const nextPriority = b.priority ?? t.priority
        const nextNotes = b.resolution_notes !== undefined ? b.resolution_notes : t.resolution_notes
        const nextUpdater = b.last_update_by ?? u.full_name
        const now = new Date()

        await tx
          .update(support_tickets)
          .set({
            status: nextStatus,
            priority: nextPriority,
            resolution_notes: nextNotes,
            last_update_by: nextUpdater,
            updated_at: now,
          })
          .where(eq(support_tickets.id, t.id))

        // If resolution notes are added or updated, record them as a reply from support
        if (b.resolution_notes && b.resolution_notes.trim() !== (t.resolution_notes || "").trim()) {
          await tx.insert(ticket_replies).values({
            ticket_id: t.id,
            author_id: null,
            author_name: u.full_name,
            author_role: "Support Team",
            author_avatar: u.avatar_url,
            content: `[Resolution Note]: ${b.resolution_notes.trim()}`,
          })
        }

        // Notify student if status changed
        if (b.status && b.status !== t.status) {
          await notify(
            tx,
            t.student_id,
            "system",
            `Ticket ${t.id} updated`,
            `Status was updated to ${b.status} by ${nextUpdater}.`,
            "support",
          )
          broadcastToChannel("notifications", "ticket-status", {
            ticketId: t.id,
            status: b.status,
            updatedBy: nextUpdater,
          })
          broadcastToChannel(`chat:${t.id}`, "status-update", {
            ticketId: t.id,
            status: b.status,
            updatedBy: nextUpdater,
          })
        }

        return loadTicketWithDetails(tx, t.id)
      })
    })

    // Add support reply
    scope.post<{ Params: { id: string } }>("/api/support/tickets/:id/replies", async (req) => {
      const u = me(req)
      const cleanId = req.params.id.replace(/^#/, "").trim()
      const b = parse(
        z.object({
          content: z.string().trim().min(1, "Write a reply of up to 5,000 characters.").max(5000),
          attachment_name: z.string().max(400).nullish(),
          attachment_path: z.string().max(400).nullish(),
        }),
        req.body,
      )

      return db.transaction(async (tx) => {
        const lockRes = await tx.execute(
          sql`select * from lms.support_tickets where id = ${cleanId} or lower(id) = lower(${cleanId}) for update`,
        )
        const t = lockRes.rows[0] as (typeof support_tickets.$inferSelect) | undefined
        if (!t) throw notFound("Ticket not found.")

        const [reply] = await tx
          .insert(ticket_replies)
          .values({
            ticket_id: t.id,
            author_id: null,
            author_name: u.full_name,
            author_role: "Support Team",
            author_avatar: u.avatar_url,
            content: b.content,
            attachment_name: (b.attachment_name ?? "").slice(0, 200) || null,
            attachment_path: b.attachment_path || null,
          })
          .returning()

        await tx
          .update(support_tickets)
          .set({
            last_update_by: u.full_name,
            updated_at: new Date(),
          })
          .where(eq(support_tickets.id, t.id))

        await notify(
          tx,
          t.student_id,
          "system",
          `Support replied to ${t.id}`,
          `${u.full_name}: ${b.content.slice(0, 100)}`,
          "support",
        )

        broadcastToChannel(`chat:${t.id}`, "message", {
          id: String(reply.id),
          text: reply.content,
          sender: "agent",
          senderName: u.full_name,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }, {
          id: u.id,
          name: u.full_name,
          role: "Support",
        })

        return reply
      })
    })

    // Create a new support ticket
    scope.post("/api/support/tickets", async (req) => {
      const u = me(req)
      const b = parse(
        z.object({
          student_id: z.string().uuid().optional(),
          category: z.string().trim().max(80).default("Other"),
          subject: z.string().trim().min(8, "Summarise the issue in at least 8 characters.").max(200),
          description: z.string().trim().min(20, "Describe what happened in at least 20 characters.").max(5000),
          priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
          attachment_name: z.string().max(400).nullish(),
          attachment_size: z.string().max(40).nullish(),
          attachment_path: z.string().max(400).nullish(),
        }),
        req.body,
      )

      return db.transaction(async (tx) => {
        let studentId = b.student_id
        if (!studentId) {
          const [defaultStudent] = await tx
            .select({ id: profiles.id })
            .from(profiles)
            .limit(1)
          if (!defaultStudent) throw notFound("No student profile found to assign ticket to.")
          studentId = defaultStudent.id
        }

        const [{ n }] = (
          await tx.execute(sql`select nextval(${sql.raw(`'lms.${ticket_number_seq.seqName}'`)}) as n`)
        ).rows as { n: string }[]

        const [ticket] = await tx
          .insert(support_tickets)
          .values({
            id: `TKT-${n}`,
            student_id: studentId,
            category: b.category.length >= 2 ? b.category : "Other",
            subject: b.subject,
            description: b.description,
            priority: b.priority,
            attachment_name: (b.attachment_name ?? "").slice(0, 200) || null,
            attachment_size: (b.attachment_size ?? "").slice(0, 40) || null,
            attachment_path: b.attachment_path || null,
            last_update_by: u.full_name,
          })
          .returning()

        const [firstReply] = await tx
          .insert(ticket_replies)
          .values({
            ticket_id: ticket.id,
            author_id: null,
            author_name: u.full_name,
            author_role: "Support Team",
            author_avatar: u.avatar_url,
            content: ticket.description,
            attachment_name: ticket.attachment_name,
            attachment_path: ticket.attachment_path,
          })
          .returning()

        await notify(tx, studentId, "system", `Ticket ${ticket.id} created`, `${ticket.subject}`, "support")

        return loadTicketWithDetails(tx, ticket.id)
      })
    })

    // Support stats
    scope.get("/api/support/stats", async () => {
      const statsRes = await db.execute(sql`
        select
          count(*) filter (where status = 'Open')::int as open,
          count(*) filter (where status in ('In Progress', 'Pending'))::int as in_progress,
          count(*) filter (where status = 'Resolved')::int as resolved,
          count(*) filter (where status = 'Closed')::int as closed,
          count(*) filter (where priority = 'Urgent')::int as urgent,
          count(*) filter (where priority = 'High')::int as high,
          count(*) filter (where priority = 'Medium')::int as medium,
          count(*) filter (where priority = 'Low')::int as low,
          count(*)::int as total
        from lms.support_tickets
      `)
      const stats = (statsRes.rows[0] as any) || {}

      return {
        open: stats.open ?? 0,
        inProgress: stats.in_progress ?? 0,
        resolved: stats.resolved ?? 0,
        closed: stats.closed ?? 0,
        urgent: stats.urgent ?? 0,
        high: stats.high ?? 0,
        medium: stats.medium ?? 0,
        low: stats.low ?? 0,
        total: stats.total ?? 0,
      }
    })
  })
}

