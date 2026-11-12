import { writeFile } from "node:fs/promises"
import { loadConfig } from "../src/config.js"
import { createPool } from "../src/db/client.js"

const pool = createPool({ ...loadConfig(), DATABASE_POOL_MAX: 1 })
try {
  const { rows } = await pool.query(`select source.kind, source.id, source.instructor,
      array(select u.id from lms.users u where u.role='Teacher' and lower(trim(u.full_name))=lower(trim(source.instructor))) as matches
    from (select 'course' as kind, id, instructor from lms.courses union all select 'batch', id, instructor from lms.cohort_batches) source order by source.kind, source.id`)
  const report = rows.map(row => ({ ...row, resolution: row.matches.length === 1 ? "unambiguous_exact_name_match" : "admin_assignment_required" }))
  await writeFile(process.argv[2] ?? ".data/instructor-reconciliation.json", JSON.stringify({ read_only: true, generated_at: new Date().toISOString(), assignments: report }, null, 2))
  console.log(JSON.stringify({ checked: report.length, requires_admin_assignment: report.filter(r => r.resolution === "admin_assignment_required").map(r => ({ kind: r.kind, id: r.id, instructor: r.instructor })) }))
} finally { await pool.end() }
