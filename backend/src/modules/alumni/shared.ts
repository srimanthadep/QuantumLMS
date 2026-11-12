import { asc, desc, eq, sql } from "drizzle-orm"
import type { Db, Tx } from "../../db/client.js"
import {
  alumni_profiles,
  app_state,
  placement_stories,
  recent_placements,
} from "../../db/schema.js"
import {
  DEFAULT_ALUMNI_METRICS,
  INITIAL_ALUMNI_PROFILES_SEED,
  INITIAL_PLACEMENT_STORIES_SEED,
  INITIAL_RECENT_PLACEMENTS_SEED,
  type AlumniMetricsData,
} from "../../db/seed/alumni.js"

const ALUMNI_INITIALIZED_KEY = "alumni_initialized"
const ALUMNI_METRICS_KEY = "alumni_metrics"

export type AlumniTag = "Career Gap" | "Fresher" | "Non-Tech to Tech" | "Switcher" | "Upskiller"

export interface AlumniProfileDto {
  id: string
  name: string
  avatar?: string
  tag: AlumniTag
  currentCompany: string
  companyLogo?: string
  role: string
  hike: string
  lmsProgram: string
  priorRole: string
  priorCompany: string
  location: string
  degree: string
  package?: string
  bio: string
  prepStrategy: string
  skills: string[]
  linkedInUrl?: string
}

export interface PlacementStoryDto {
  id: string
  firstName: string
  fullName: string
  company: string
  role: string
  package: string
  head: string
  quote: string
  highlight: string
  accent: string
  glow: string
  kickerClass: string
  avatarBg: string
}

export interface RecentPlacementDto {
  id: string
  name: string
  company: string
  role?: string
  color?: string
  src?: string
  offsetY?: number
}

export interface AlumniNetworkResponse {
  profiles: AlumniProfileDto[]
  stories: PlacementStoryDto[]
  recentPlacements: RecentPlacementDto[]
  metrics: AlumniMetricsData
}

export function mapProfileRow(row: typeof alumni_profiles.$inferSelect): AlumniProfileDto {
  return {
    id: row.id,
    name: row.name,
    ...(row.avatar ? { avatar: row.avatar } : {}),
    tag: row.tag as AlumniTag,
    currentCompany: row.current_company,
    ...(row.company_logo ? { companyLogo: row.company_logo } : {}),
    role: row.role,
    hike: row.hike,
    lmsProgram: row.lms_program,
    priorRole: row.prior_role,
    priorCompany: row.prior_company,
    location: row.location,
    degree: row.degree,
    ...(row.package ? { package: row.package } : {}),
    bio: row.bio,
    prepStrategy: row.prep_strategy,
    skills: row.skills ?? [],
    ...(row.linkedin_url ? { linkedInUrl: row.linkedin_url } : {}),
  }
}

export function mapStoryRow(row: typeof placement_stories.$inferSelect): PlacementStoryDto {
  return {
    id: row.id,
    firstName: row.first_name,
    fullName: row.full_name,
    company: row.company,
    role: row.role,
    package: row.package,
    head: row.head,
    quote: row.quote,
    highlight: row.highlight,
    accent: row.accent,
    glow: row.glow,
    kickerClass: row.kicker_class,
    avatarBg: row.avatar_bg,
  }
}

export function mapRecentPlacementRow(row: typeof recent_placements.$inferSelect): RecentPlacementDto {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    ...(row.role ? { role: row.role } : {}),
    ...(row.color ? { color: row.color } : {}),
    ...(row.src ? { src: row.src } : {}),
    offsetY: row.offset_y,
  }
}

function normalizeMetrics(raw: unknown): AlumniMetricsData {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_ALUMNI_METRICS }
  const obj = raw as Record<string, unknown>
  return {
    studentsPlaced: typeof obj.studentsPlaced === "string" && obj.studentsPlaced.trim() ? obj.studentsPlaced : DEFAULT_ALUMNI_METRICS.studentsPlaced,
    highestHike: typeof obj.highestHike === "string" && obj.highestHike.trim() ? obj.highestHike : DEFAULT_ALUMNI_METRICS.highestHike,
    highestPackage: typeof obj.highestPackage === "string" && obj.highestPackage.trim() ? obj.highestPackage : DEFAULT_ALUMNI_METRICS.highestPackage,
    hiringPartners: typeof obj.hiringPartners === "string" && obj.hiringPartners.trim() ? obj.hiringPartners : DEFAULT_ALUMNI_METRICS.hiringPartners,
  }
}

export async function seedAlumniDefaults(dbOrTx: Db | Tx, opts: { force?: boolean } = {}) {
  if (opts.force) {
    await dbOrTx.delete(alumni_profiles)
    await dbOrTx.delete(placement_stories)
    await dbOrTx.delete(recent_placements)
  } else {
    const [marker] = await dbOrTx
      .select({ key: app_state.key })
      .from(app_state)
      .where(eq(app_state.key, ALUMNI_INITIALIZED_KEY))
      .limit(1)
    if (marker) return
  }

  await dbOrTx
    .insert(alumni_profiles)
    .values(INITIAL_ALUMNI_PROFILES_SEED.map((p) => ({ ...p, skills: [...p.skills] })))
    .onConflictDoNothing()

  await dbOrTx
    .insert(placement_stories)
    .values([...INITIAL_PLACEMENT_STORIES_SEED])
    .onConflictDoNothing()

  await dbOrTx
    .insert(recent_placements)
    .values([...INITIAL_RECENT_PLACEMENTS_SEED])
    .onConflictDoNothing()

  await dbOrTx
    .insert(app_state)
    .values({ key: ALUMNI_METRICS_KEY, value: DEFAULT_ALUMNI_METRICS, updated_at: new Date() })
    .onConflictDoUpdate({
      target: app_state.key,
      set: { value: DEFAULT_ALUMNI_METRICS, updated_at: new Date() },
    })

  await dbOrTx
    .insert(app_state)
    .values({ key: ALUMNI_INITIALIZED_KEY, value: true, updated_at: new Date() })
    .onConflictDoUpdate({
      target: app_state.key,
      set: { value: true, updated_at: new Date() },
    })
}

let seedInFlight: Promise<void> | null = null

export async function ensureAlumniSeeded(db: Db) {
  const [marker] = await db
    .select({ key: app_state.key })
    .from(app_state)
    .where(eq(app_state.key, ALUMNI_INITIALIZED_KEY))
    .limit(1)
  if (marker) return

  if (!seedInFlight) {
    seedInFlight = db
      .transaction((tx: Tx) => seedAlumniDefaults(tx, { force: false }))
      .finally(() => {
        seedInFlight = null
      })
  }
  await seedInFlight
}

export async function getAlumniNetwork(db: Db): Promise<AlumniNetworkResponse> {
  await ensureAlumniSeeded(db)

  const [profileRows, storyRows, placementRows, [metricsRow]] = await Promise.all([
    db.select().from(alumni_profiles).orderBy(asc(alumni_profiles.position), desc(alumni_profiles.created_at)),
    db.select().from(placement_stories).orderBy(asc(placement_stories.position), desc(placement_stories.created_at)),
    db.select().from(recent_placements).orderBy(asc(recent_placements.position), desc(recent_placements.created_at)),
    db.select().from(app_state).where(eq(app_state.key, ALUMNI_METRICS_KEY)).limit(1),
  ])

  return {
    profiles: profileRows.map(mapProfileRow),
    stories: storyRows.map(mapStoryRow),
    recentPlacements: placementRows.map(mapRecentPlacementRow),
    metrics: normalizeMetrics(metricsRow?.value),
  }
}

export async function nextTopPosition(db: Db, table: typeof alumni_profiles | typeof placement_stories | typeof recent_placements): Promise<number> {
  const [row] = await db.select({ min: sql<number>`coalesce(min(${table.position}), 1)` }).from(table)
  return (row?.min ?? 1) - 1
}

export async function updateAlumniMetrics(db: Db, patch: Partial<AlumniMetricsData>): Promise<AlumniMetricsData> {
  await ensureAlumniSeeded(db)
  const [existing] = await db.select().from(app_state).where(eq(app_state.key, ALUMNI_METRICS_KEY)).limit(1)
  const merged = normalizeMetrics({ ...normalizeMetrics(existing?.value), ...patch })
  await db
    .insert(app_state)
    .values({ key: ALUMNI_METRICS_KEY, value: merged, updated_at: new Date() })
    .onConflictDoUpdate({
      target: app_state.key,
      set: { value: merged, updated_at: new Date() },
    })
  return merged
}
