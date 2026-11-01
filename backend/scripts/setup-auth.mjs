// Configures Supabase Auth for the app and creates the shared demo student.
//   SUPABASE_ACCESS_TOKEN=... node backend/scripts/setup-auth.mjs
// Optional: SITE_URL (default http://localhost:8443), REDIRECT_URLS (comma-separated, added to the allow list).
import { apiKeys, management, PROJECT_URL, sql } from "./lib.mjs"

const SITE_URL = process.env.SITE_URL || "http://localhost:8443"
const DEMO = { email: "aarav.mehta@learner.ai", password: "demo-student", full_name: "Aarav Mehta", avatar_url: "/assets/student-2.png" }

// No SMTP is configured, so sign-ups are confirmed immediately instead of waiting for an email.
const allow = [`${SITE_URL}/**`, ...(process.env.REDIRECT_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean)]
await management("/config/auth", { method: "PATCH", body: { mailer_autoconfirm: true, site_url: SITE_URL, uri_allow_list: allow.join(",") } })
const auth = await management("/config/auth")
console.log(`auth: autoconfirm=${auth.mailer_autoconfirm} site_url=${auth.site_url} allow=${auth.uri_allow_list} min_password=${auth.password_min_length}`)

const { secret, serviceRole } = await apiKeys()
const key = serviceRole ?? secret
const res = await fetch(`${PROJECT_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ email: DEMO.email, password: DEMO.password, email_confirm: true, user_metadata: { full_name: DEMO.full_name, avatar_url: DEMO.avatar_url } }),
})
const body = await res.json().catch(() => ({}))
if (res.ok) console.log(`demo user created: ${body.id}`)
else if (res.status === 422 || /already/i.test(body.msg ?? body.message ?? "")) console.log("demo user already exists")
else throw new Error(`creating the demo user failed: ${res.status} ${JSON.stringify(body)}`)

const [p] = await sql(`
  select p.id, p.full_name, p.roll_number, p.is_demo,
    (select count(*) from public.enrollments e where e.student_id = p.id) as enrollments,
    (select count(*) from public.lesson_progress l where l.student_id = p.id) as lessons_done,
    (select count(*) from public.quiz_attempts a where a.student_id = p.id) as attempts,
    (select count(*) from public.support_tickets t where t.student_id = p.id) as tickets
  from public.profiles p where p.email = '${DEMO.email}'`)
console.log("demo profile:", JSON.stringify(p))
