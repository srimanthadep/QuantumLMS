import { eq } from "drizzle-orm"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import type { AppContext } from "../../context.js"
import { alumni_profiles, placement_stories, recent_placements } from "../../db/schema.js"
import { forbidden, notFound } from "../../errors.js"
import { parse } from "../../http.js"
import {
  getAlumniNetwork,
  mapProfileRow,
  mapRecentPlacementRow,
  mapStoryRow,
  nextTopPosition,
  seedAlumniDefaults,
  updateAlumniMetrics,
} from "../alumni/shared.js"

const ALUMNI_TAGS = ["Career Gap", "Fresher", "Non-Tech to Tech", "Switcher", "Upskiller"] as const

const safeAssetOrUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || v.startsWith("/") || /^https?:\/\//i.test(v), "Enter a valid relative path or http(s) URL.")

const safeExternalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https?:\/\//i.test(v), "Enter a valid http(s) URL.")

const profileCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  avatar: safeAssetOrUrl.default(""),
  tag: z.enum(ALUMNI_TAGS),
  currentCompany: z.string().trim().min(1, "Current company is required.").max(120),
  companyLogo: safeAssetOrUrl.default(""),
  role: z.string().trim().min(2, "Role is required.").max(120),
  hike: z.string().trim().max(60).default(""),
  lmsProgram: z.string().trim().max(120).default("Joined Quantum School"),
  priorRole: z.string().trim().max(120).default(""),
  priorCompany: z.string().trim().max(120).default(""),
  location: z.string().trim().min(1, "Location is required.").max(120),
  degree: z.string().trim().min(1, "Degree is required.").max(120),
  package: z.string().trim().max(60).default(""),
  bio: z.string().trim().max(2000).default(""),
  prepStrategy: z.string().trim().max(2000).default(""),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  linkedInUrl: safeExternalUrl.default(""),
})

const profilePatchSchema = profileCreateSchema.partial()

const storyCreateSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  fullName: z.string().trim().min(2, "Full name is required.").max(120),
  company: z.string().trim().min(1, "Company is required.").max(120),
  role: z.string().trim().min(2, "Role is required.").max(120),
  package: z.string().trim().max(60).default(""),
  head: z.string().trim().min(3, "Headline is required.").max(200),
  quote: z.string().trim().min(5, "Story quote is required.").max(2000),
  highlight: z.string().trim().max(80).default("Featured Offer"),
  accent: z.string().trim().max(40).default("#2563EB"),
  glow: z.string().trim().max(80).default("rgba(37, 99, 235, 0.38)"),
  kickerClass: z.string().trim().max(80).default("text-sky-300"),
  avatarBg: z.string().trim().max(80).default("from-blue-500 to-indigo-600"),
})

const storyPatchSchema = storyCreateSchema.partial()

const placementCreateSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  company: z.string().trim().min(1, "Company is required.").max(120),
  role: z.string().trim().max(120).default(""),
  color: z.string().trim().max(40).default("#2563EB"),
  src: safeAssetOrUrl.default(""),
  offsetY: z.number().int().min(-250).max(250).default(0),
})

const placementPatchSchema = placementCreateSchema.partial()

const metricsPatchSchema = z.object({
  studentsPlaced: z.string().trim().min(1).max(40).optional(),
  highestHike: z.string().trim().min(1).max(40).optional(),
  highestPackage: z.string().trim().min(1).max(40).optional(),
  hiringPartners: z.string().trim().min(1).max(40).optional(),
})

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`
}

/** Admin & Super Admin CRUD endpoints for the Alumni Network. */
export async function adminAlumniRoutes(app: FastifyInstance, ctx: AppContext) {
  const db = ctx.db

  app.get("/alumni", async () => getAlumniNetwork(db))

  // --- Alumni Directory Profiles ---
  app.post("/alumni/profiles", async (req, reply) => {
    const input = parse(profileCreateSchema, req.body)
    const id = newId("alumni")
    const position = await nextTopPosition(db, alumni_profiles)
    const [created] = await db
      .insert(alumni_profiles)
      .values({
        id,
        name: input.name,
        avatar: input.avatar,
        tag: input.tag,
        current_company: input.currentCompany,
        company_logo: input.companyLogo,
        role: input.role,
        hike: input.hike,
        lms_program: input.lmsProgram || "Joined Quantum School",
        prior_role: input.priorRole,
        prior_company: input.priorCompany,
        location: input.location,
        degree: input.degree,
        package: input.package,
        bio: input.bio,
        prep_strategy: input.prepStrategy,
        skills: input.skills,
        linkedin_url: input.linkedInUrl,
        position,
      })
      .returning()

    reply.code(201)
    return { ok: true, profile: mapProfileRow(created) }
  })

  app.patch<{ Params: { id: string } }>("/alumni/profiles/:id", async (req) => {
    const patch = parse(profilePatchSchema, req.body)
    const updates: Partial<typeof alumni_profiles.$inferInsert> = { updated_at: new Date() }
    if (patch.name !== undefined) updates.name = patch.name
    if (patch.avatar !== undefined) updates.avatar = patch.avatar
    if (patch.tag !== undefined) updates.tag = patch.tag
    if (patch.currentCompany !== undefined) updates.current_company = patch.currentCompany
    if (patch.companyLogo !== undefined) updates.company_logo = patch.companyLogo
    if (patch.role !== undefined) updates.role = patch.role
    if (patch.hike !== undefined) updates.hike = patch.hike
    if (patch.lmsProgram !== undefined) updates.lms_program = patch.lmsProgram
    if (patch.priorRole !== undefined) updates.prior_role = patch.priorRole
    if (patch.priorCompany !== undefined) updates.prior_company = patch.priorCompany
    if (patch.location !== undefined) updates.location = patch.location
    if (patch.degree !== undefined) updates.degree = patch.degree
    if (patch.package !== undefined) updates.package = patch.package
    if (patch.bio !== undefined) updates.bio = patch.bio
    if (patch.prepStrategy !== undefined) updates.prep_strategy = patch.prepStrategy
    if (patch.skills !== undefined) updates.skills = patch.skills
    if (patch.linkedInUrl !== undefined) updates.linkedin_url = patch.linkedInUrl

    const [updated] = await db
      .update(alumni_profiles)
      .set(updates)
      .where(eq(alumni_profiles.id, req.params.id))
      .returning()

    if (!updated) throw notFound("Alumni profile not found.")
    return { ok: true, profile: mapProfileRow(updated) }
  })

  app.delete<{ Params: { id: string } }>("/alumni/profiles/:id", async (req) => {
    const [deleted] = await db
      .delete(alumni_profiles)
      .where(eq(alumni_profiles.id, req.params.id))
      .returning({ id: alumni_profiles.id })
    if (!deleted) throw notFound("Alumni profile not found.")
    return { ok: true, deleted: deleted.id }
  })

  // --- Placement Stories ---
  app.post("/alumni/stories", async (req, reply) => {
    const input = parse(storyCreateSchema, req.body)
    const id = newId("story")
    const position = await nextTopPosition(db, placement_stories)
    const firstName = input.firstName || input.fullName.split(/\s+/)[0] || input.fullName
    const [created] = await db
      .insert(placement_stories)
      .values({
        id,
        first_name: firstName,
        full_name: input.fullName,
        company: input.company,
        role: input.role,
        package: input.package,
        head: input.head,
        quote: input.quote,
        highlight: input.highlight || "Featured Offer",
        accent: input.accent,
        glow: input.glow,
        kicker_class: input.kickerClass,
        avatar_bg: input.avatarBg,
        position,
      })
      .returning()

    reply.code(201)
    return { ok: true, story: mapStoryRow(created) }
  })

  app.patch<{ Params: { id: string } }>("/alumni/stories/:id", async (req) => {
    const patch = parse(storyPatchSchema, req.body)
    const updates: Partial<typeof placement_stories.$inferInsert> = { updated_at: new Date() }
    if (patch.firstName !== undefined) updates.first_name = patch.firstName
    if (patch.fullName !== undefined) updates.full_name = patch.fullName
    if (patch.company !== undefined) updates.company = patch.company
    if (patch.role !== undefined) updates.role = patch.role
    if (patch.package !== undefined) updates.package = patch.package
    if (patch.head !== undefined) updates.head = patch.head
    if (patch.quote !== undefined) updates.quote = patch.quote
    if (patch.highlight !== undefined) updates.highlight = patch.highlight
    if (patch.accent !== undefined) updates.accent = patch.accent
    if (patch.glow !== undefined) updates.glow = patch.glow
    if (patch.kickerClass !== undefined) updates.kicker_class = patch.kickerClass
    if (patch.avatarBg !== undefined) updates.avatar_bg = patch.avatarBg

    const [updated] = await db
      .update(placement_stories)
      .set(updates)
      .where(eq(placement_stories.id, req.params.id))
      .returning()

    if (!updated) throw notFound("Placement story not found.")
    return { ok: true, story: mapStoryRow(updated) }
  })

  app.delete<{ Params: { id: string } }>("/alumni/stories/:id", async (req) => {
    const [deleted] = await db
      .delete(placement_stories)
      .where(eq(placement_stories.id, req.params.id))
      .returning({ id: placement_stories.id })
    if (!deleted) throw notFound("Placement story not found.")
    return { ok: true, deleted: deleted.id }
  })

  // --- Recent Placements Carousel ---
  app.post("/alumni/placements", async (req, reply) => {
    const input = parse(placementCreateSchema, req.body)
    const id = newId("placement")
    const position = await nextTopPosition(db, recent_placements)
    const [created] = await db
      .insert(recent_placements)
      .values({
        id,
        name: input.name,
        company: input.company,
        role: input.role,
        color: input.color,
        src: input.src,
        offset_y: input.offsetY,
        position,
      })
      .returning()

    reply.code(201)
    return { ok: true, placement: mapRecentPlacementRow(created) }
  })

  app.patch<{ Params: { id: string } }>("/alumni/placements/:id", async (req) => {
    const patch = parse(placementPatchSchema, req.body)
    const updates: Partial<typeof recent_placements.$inferInsert> = { updated_at: new Date() }
    if (patch.name !== undefined) updates.name = patch.name
    if (patch.company !== undefined) updates.company = patch.company
    if (patch.role !== undefined) updates.role = patch.role
    if (patch.color !== undefined) updates.color = patch.color
    if (patch.src !== undefined) updates.src = patch.src
    if (patch.offsetY !== undefined) updates.offset_y = patch.offsetY

    const [updated] = await db
      .update(recent_placements)
      .set(updates)
      .where(eq(recent_placements.id, req.params.id))
      .returning()

    if (!updated) throw notFound("Recent placement not found.")
    return { ok: true, placement: mapRecentPlacementRow(updated) }
  })

  app.delete<{ Params: { id: string } }>("/alumni/placements/:id", async (req) => {
    const [deleted] = await db
      .delete(recent_placements)
      .where(eq(recent_placements.id, req.params.id))
      .returning({ id: recent_placements.id })
    if (!deleted) throw notFound("Recent placement not found.")
    return { ok: true, deleted: deleted.id }
  })

  // --- Headline Metrics ---
  app.patch("/alumni/metrics", async (req) => {
    const patch = parse(metricsPatchSchema, req.body)
    const metrics = await updateAlumniMetrics(db, patch)
    return { ok: true, metrics }
  })

  // --- Restore Default Alumni Showcase ---
  app.post("/alumni/reset", async () => {
    if (ctx.config.NODE_ENV !== "development" || !ctx.config.DEMO_MODE) throw forbidden("Demo reset is disabled.")
    await db.transaction((tx) => seedAlumniDefaults(tx, { force: true }))
    return { ok: true, ...(await getAlumniNetwork(db)) }
  })
}

