// Lists, and with --delete removes, uploaded files that nothing references any more: files of deleted accounts, and
// files whose submission, ticket or avatar row is gone (for example after the shared demo account is reset, which
// restores database rows only). Files are removed through the Storage API so the stored objects go too.
//
//   SUPABASE_ACCESS_TOKEN=... node backend/scripts/clean-storage.mjs [--delete]
import { apiKeys, PROJECT_URL, sql } from "./lib.mjs"

const orphans = await sql(`
  select o.bucket_id, o.name, coalesce((o.metadata ->> 'size')::bigint, 0) as size,
    not exists (select 1 from auth.users u where u.id::text = (storage.foldername(o.name))[1]) as owner_deleted
  from storage.objects o
  where o.bucket_id in ('submissions', 'ticket-attachments', 'avatars')
    and case o.bucket_id
      when 'submissions' then not exists (select 1 from public.assignment_submissions s where s.file_path = o.name)
      when 'ticket-attachments' then not exists (select 1 from public.support_tickets t where t.attachment_path = o.name)
        and not exists (select 1 from public.ticket_replies r where r.attachment_path = o.name)
      else not exists (select 1 from public.profiles p where p.avatar_url like '%/avatars/' || o.name)
    end
  order by o.bucket_id, o.name`)

const kb = (n) => `${(Number(n) / 1024).toFixed(1)} KB`
console.log(`${orphans.length} unreferenced file(s), ${kb(orphans.reduce((t, o) => t + Number(o.size), 0))} in total`)
for (const o of orphans) console.log(`  ${o.bucket_id}/${o.name} (${kb(o.size)}${o.owner_deleted ? ", account deleted" : ""})`)

if (!process.argv.includes("--delete")) {
  if (orphans.length) console.log("Dry run. Re-run with --delete to remove them.")
  process.exit(0)
}

const { secret, serviceRole } = await apiKeys()
const key = serviceRole ?? secret
const byBucket = Map.groupBy(orphans, (o) => o.bucket_id)
for (const [bucket, files] of byBucket) {
  const res = await fetch(`${PROJECT_URL}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: files.map((f) => f.name) }),
  })
  if (!res.ok) throw new Error(`removing files from ${bucket} failed: ${res.status} ${await res.text()}`)
  console.log(`removed ${(await res.json()).length} file(s) from ${bucket}`)
}
