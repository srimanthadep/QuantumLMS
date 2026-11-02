import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import {
  community_posts, interview_sessions, mentor_meetings, mentor_requests, mentors, post_likes, post_replies, post_saves,
  resumes, squad_members, study_squads,
} from "../../db/schema.js"
import { badRequest, conflict, notFound } from "../../errors.js"
import { me, parse } from "../../http.js"
import { addDays, fmtWeekdayDate, isoDow, localDay, localToInstant, slotLabel, slotMinutes, hhmm } from "../../lib/time.js"
import { notify } from "./notify.js"

/** Community feed, squads, career hub (resume, interview practice) and mentorship. */
export async function socialRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  /* --------------------------------- Community -------------------------------- */
  app.get("/api/student/community", async (req) => {
    const s = me(req)
    const [posts, likes, saves, squads, members] = await Promise.all([
      db.select().from(community_posts).orderBy(desc(community_posts.created_at)).limit(100),
      db.select({ post_id: post_likes.post_id }).from(post_likes).where(eq(post_likes.student_id, s.id)),
      db.select({ post_id: post_saves.post_id }).from(post_saves).where(eq(post_saves.student_id, s.id)),
      db.select().from(study_squads).orderBy(asc(study_squads.position)),
      db.select({ squad_id: squad_members.squad_id }).from(squad_members).where(eq(squad_members.student_id, s.id)),
    ])
    const replies = posts.length
      ? await db.select().from(post_replies).where(inArray(post_replies.post_id, posts.map((p) => p.id))).orderBy(asc(post_replies.created_at)).limit(1000)
      : []
    return { posts, replies, liked: likes.map((l) => l.post_id), saved: saves.map((x) => x.post_id), squads, joined: members.map((m) => m.squad_id) }
  })

  app.post("/api/student/community/posts", async (req) => {
    const s = me(req)
    const b = parse(
      z.object({
        channel: z.enum(["Hackathons", "Research & Labs", "Study Groups", "General", "Career"], { message: "Pick a channel." }),
        title: z.string().trim().min(6, "Write a title of at least 6 characters.").max(160),
        content: z.string().trim().max(5000, "Posts can be up to 5,000 characters.").default(""),
      }),
      req.body,
    )
    // The author comes from the account, so it can't be forged.
    const [row] = await db.insert(community_posts).values({ ...b, author_id: s.id, author_name: s.full_name, author_avatar: s.avatar_url }).returning()
    return row
  })

  app.delete<{ Params: { id: string } }>("/api/student/community/posts/:id", async (req, reply) => {
    const [gone] = await db.delete(community_posts).where(and(eq(community_posts.id, req.params.id), eq(community_posts.author_id, me(req).id))).returning({ id: community_posts.id })
    if (!gone) throw notFound("Post not found.")
    return reply.code(204).send()
  })

  app.post<{ Params: { id: string } }>("/api/student/community/posts/:id/replies", async (req) => {
    const s = me(req)
    const { body } = parse(z.object({ body: z.string().trim().min(1, "Write a reply.").max(2000) }), req.body)
    return db.transaction(async (tx) => {
      const post = await tx.query.community_posts.findFirst({ where: eq(community_posts.id, req.params.id) })
      if (!post) throw notFound("Post not found.")
      const [row] = await tx.insert(post_replies).values({ post_id: post.id, body, author_id: s.id, author_name: s.full_name, author_avatar: s.avatar_url }).returning()
      await tx.update(community_posts).set({ reply_count: sql`${community_posts.reply_count} + 1` }).where(eq(community_posts.id, post.id))
      return row
    })
  })

  app.delete<{ Params: { id: string } }>("/api/student/community/replies/:id", async (req, reply) => {
    const s = me(req)
    await db.transaction(async (tx) => {
      const [gone] = await tx.delete(post_replies).where(and(eq(post_replies.id, req.params.id), eq(post_replies.author_id, s.id))).returning()
      if (!gone) throw notFound("Reply not found.")
      await tx.update(community_posts).set({ reply_count: sql`greatest(0, ${community_posts.reply_count} - 1)` }).where(eq(community_posts.id, gone.post_id))
    })
    return reply.code(204).send()
  })

  async function toggleOnPost(tx: Tx, table: typeof post_likes | typeof post_saves, studentId: string, postId: string, on: boolean) {
    const post = await tx.query.community_posts.findFirst({ where: eq(community_posts.id, postId) })
    if (!post) throw notFound("Post not found.")
    if (on) {
      const [added] = await tx.insert(table).values({ post_id: postId, student_id: studentId }).onConflictDoNothing().returning()
      if (added && table === post_likes) await tx.update(community_posts).set({ like_count: sql`${community_posts.like_count} + 1` }).where(eq(community_posts.id, postId))
    } else {
      const [removed] = await tx.delete(table).where(and(eq(table.post_id, postId), eq(table.student_id, studentId))).returning()
      if (removed && table === post_likes) await tx.update(community_posts).set({ like_count: sql`greatest(0, ${community_posts.like_count} - 1)` }).where(eq(community_posts.id, postId))
    }
  }
  app.put<{ Params: { id: string } }>("/api/student/community/posts/:id/like", async (req) => {
    const { on } = parse(z.object({ on: z.boolean() }), req.body)
    await db.transaction((tx) => toggleOnPost(tx, post_likes, me(req).id, req.params.id, on))
    return { on }
  })
  app.put<{ Params: { id: string } }>("/api/student/community/posts/:id/save", async (req) => {
    const { on } = parse(z.object({ on: z.boolean() }), req.body)
    await db.transaction((tx) => toggleOnPost(tx, post_saves, me(req).id, req.params.id, on))
    return { on }
  })

  app.put<{ Params: { id: string } }>("/api/student/squads/:id/membership", async (req) => {
    const s = me(req)
    const { on } = parse(z.object({ on: z.boolean() }), req.body)
    await db.transaction(async (tx) => {
      const squad = await tx.query.study_squads.findFirst({ where: eq(study_squads.id, req.params.id) })
      if (!squad) throw notFound("Squad not found.")
      if (on) {
        const [added] = await tx.insert(squad_members).values({ squad_id: squad.id, student_id: s.id }).onConflictDoNothing().returning()
        if (added) await tx.update(study_squads).set({ member_count: sql`${study_squads.member_count} + 1` }).where(eq(study_squads.id, squad.id))
      } else {
        const [removed] = await tx.delete(squad_members).where(and(eq(squad_members.squad_id, squad.id), eq(squad_members.student_id, s.id))).returning()
        if (removed) await tx.update(study_squads).set({ member_count: sql`greatest(0, ${study_squads.member_count} - 1)` }).where(eq(study_squads.id, squad.id))
      }
    })
    return { on }
  })

  /* --------------------------------- Career hub ------------------------------- */
  app.get("/api/student/career", async (req) => {
    const s = me(req)
    const [resume, sessions, mentorRows, meetings, requests] = await Promise.all([
      db.query.resumes.findFirst({ where: eq(resumes.student_id, s.id) }),
      db.select().from(interview_sessions).where(eq(interview_sessions.student_id, s.id)).orderBy(desc(interview_sessions.created_at)).limit(50),
      db.select().from(mentors).orderBy(asc(mentors.position)),
      db.select().from(mentor_meetings).where(eq(mentor_meetings.student_id, s.id)),
      db.select({ mentor_id: mentor_requests.mentor_id }).from(mentor_requests).where(eq(mentor_requests.student_id, s.id)),
    ])
    return { resume: resume?.data ?? null, sessions, mentors: mentorRows, meetings, requested: requests.map((r) => r.mentor_id) }
  })

  app.put("/api/student/resume", async (req, reply) => {
    const s = me(req)
    const { data } = parse(z.object({ data: z.record(z.string(), z.unknown()) }), req.body)
    if (JSON.stringify(data).length > 60_000) throw badRequest("The resume is too long to save.")
    await db.insert(resumes).values({ student_id: s.id, data }).onConflictDoUpdate({ target: resumes.student_id, set: { data, updated_at: new Date() } })
    return reply.code(204).send()
  })

  app.post("/api/student/interview-sessions", async (req) => {
    const s = me(req)
    const b = parse(
      z.object({
        role: z.string().trim().min(2).max(80),
        type: z.enum(["Technical", "HR", "Behavioral", "Coding", "Aptitude"]),
        level: z.string().trim().min(2).max(40),
        score: z.number().int().min(0).max(100),
        duration_seconds: z.number().int().min(0).max(24 * 3600),
        responses: z.array(z.record(z.string(), z.unknown())).max(50),
      }),
      req.body,
    )
    if (JSON.stringify(b.responses).length > 60_000) throw badRequest("The session is too long to save.")
    const [row] = await db.insert(interview_sessions).values({ ...b, student_id: s.id }).returning()
    return row
  })

  /* --------------------------------- Mentorship ------------------------------- */
  app.put<{ Params: { id: string } }>("/api/student/mentors/:id/request", async (req) => {
    const s = me(req)
    const { on } = parse(z.object({ on: z.boolean() }), req.body)
    const m = await db.query.mentors.findFirst({ where: eq(mentors.id, req.params.id) })
    if (!m) throw notFound("Mentor not found.")
    if (on) await db.insert(mentor_requests).values({ student_id: s.id, mentor_id: m.id }).onConflictDoNothing()
    else await db.delete(mentor_requests).where(and(eq(mentor_requests.student_id, s.id), eq(mentor_requests.mentor_id, m.id)))
    return { on }
  })

  // Books (or moves) the caller's meeting with a mentor: weekdays in the next 60 days, 45 minutes from the chosen slot.
  app.post<{ Params: { id: string } }>("/api/student/mentors/:id/meeting", async (req) => {
    const s = me(req)
    const b = parse(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
        slot: z.string(),
        topic: z.string().trim().min(2, "Add a topic.").max(80, "Keep the topic under 80 characters."),
        agenda: z.string().max(2000, "Keep the agenda under 2,000 characters.").nullish(),
      }),
      req.body,
    )
    const tz = ctx.config.CAMPUS_TZ
    const today = localDay(new Date(), tz)
    if (b.date < today || b.date > addDays(today, 60)) throw badRequest("Pick a date within the next 60 days.")
    if (isoDow(b.date) > 5) throw badRequest("Mentors meet on weekdays only.")
    const start = slotMinutes(b.slot)
    if (start === null) throw badRequest("Pick a time slot.")
    if (localToInstant(b.date, hhmm(start), tz) < new Date()) throw badRequest("That time has already passed.")
    const m = await db.query.mentors.findFirst({ where: eq(mentors.id, req.params.id) })
    if (!m) throw notFound("Mentor not found.")
    const agenda = (b.agenda ?? "").trim() || null
    try {
      return await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(mentor_meetings)
          .values({ student_id: s.id, mentor_id: m.id, meeting_date: b.date, slot: b.slot, ends_slot: slotLabel(start + 45), topic: b.topic, agenda, zoom_url: m.zoom_url, status: "Scheduled" })
          .onConflictDoUpdate({
            target: [mentor_meetings.student_id, mentor_meetings.mentor_id],
            set: { meeting_date: b.date, slot: b.slot, ends_slot: slotLabel(start + 45), topic: b.topic, agenda, zoom_url: m.zoom_url, status: "Scheduled", updated_at: new Date() },
          })
          .returning()
        await notify(tx, s.id, "class", "Mentor meeting booked", `${row.topic} with ${m.name} on ${fmtWeekdayDate(b.date)} at ${b.slot}`, "mentorship", "live")
        return row
      })
    } catch (e) {
      const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code
      if (code === "23505") throw conflict("That slot was just booked by another student. Pick another time.", "slot_taken")
      throw e
    }
  })

  app.delete<{ Params: { id: string } }>("/api/student/mentors/:id/meeting", async (req, reply) => {
    await db
      .update(mentor_meetings)
      .set({ status: "Cancelled", updated_at: new Date() })
      .where(and(eq(mentor_meetings.student_id, me(req).id), eq(mentor_meetings.mentor_id, req.params.id), eq(mentor_meetings.status, "Scheduled")))
    return reply.code(204).send()
  })
}
