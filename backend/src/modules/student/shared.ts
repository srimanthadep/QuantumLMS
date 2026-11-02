import { eq } from "drizzle-orm"
import type { AuthUser } from "../../auth/users.js"
import type { AppContext } from "../../context.js"
import type { Tx } from "../../db/client.js"
import { profiles, users } from "../../db/schema.js"
import { badRequest, notFound } from "../../errors.js"
import { keyOwner, type Bucket } from "../../storage/storage.js"

/** The student profile the pages read: account fields (name, email, photo) merged with the student details. */
export async function studentProfile(tx: Tx, id: string) {
  const [row] = await tx
    .select({ u: users, p: profiles })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.id))
    .where(eq(profiles.id, id))
    .limit(1)
  if (!row) throw notFound("Your student profile wasn't found.")
  const { u, p } = row
  return {
    ...p,
    email: u.email,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    is_demo: u.is_demo,
    created_at: u.created_at,
    updated_at: p.updated_at > u.updated_at ? p.updated_at : u.updated_at,
  }
}
export type StudentProfile = Awaited<ReturnType<typeof studentProfile>>

/**
 * A storage key the student sends back after uploading: it must sit in their own folder of the given bucket and the
 * object must exist. Returns the key, or null when none was sent.
 */
export async function ownObject(ctx: AppContext, user: AuthUser, bucket: Bucket, key: string | null | undefined): Promise<string | null> {
  if (!key) return null
  const o = keyOwner(key)
  if (!o || o.bucket !== bucket || o.owner !== user.id || !(await ctx.storage.head(key))) {
    throw badRequest("The attached file was not found. Upload it again.", "missing_file")
  }
  return key
}

export const trimmed = (s: string | null | undefined) => {
  const v = (s ?? "").trim()
  return v.length ? v : null
}
