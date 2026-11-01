// Proves the migration files rebuild the live database from scratch, without changing it.
//
// One transaction: reset the demo (so both sides start from fresh seed data), fingerprint the schema and data, drop
// every object the migrations own, delete the demo auth user, run the three migration files, re-insert the demo user
// (its signup trigger seeds it again), fingerprint again, then raise an error carrying the differences. The error
// rolls the whole transaction back, so the live project is untouched.
//
//   SUPABASE_ACCESS_TOKEN=... node rehearse-migrations.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { sql } from "../../../../backend/scripts/lib.mjs"

const DIR = fileURLToPath(new URL("../../../../backend/supabase/migrations/", import.meta.url))
const files = readdirSync(DIR).filter((f) => /^\d{14}_.+\.sql$/.test(f)).sort()
const DEMO_EMAIL = "aarav.mehta@learner.ai"

const acl = (expr) => `coalesce((select string_agg(acl_item::text, ',' order by acl_item::text) from unnest(${expr}) acl_item), '-')`
const OURS = `('public'::regnamespace, 'app_private'::regnamespace)`

const snapshot = (phase) => `
insert into pg_temp._fp (phase, kind, name, def)
select '${phase}', 'function', p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid)) || ' acl=' || ${acl("p.proacl")}
  from pg_proc p where p.pronamespace in ${OURS} and p.prokind in ('f', 'p')
union all
select '${phase}', 'relation', c.relnamespace::regnamespace::text || '.' || c.relname,
  c.relkind::text || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity || ' acl=' || ${acl("c.relacl")}
  from pg_class c where c.relnamespace in ${OURS} and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
union all
select '${phase}', 'column', c.relnamespace::regnamespace::text || '.' || c.relname || '.' || a.attname,
  format_type(a.atttypid, a.atttypmod) || ' notnull=' || a.attnotnull || ' default=' || coalesce(pg_get_expr(d.adbin, d.adrelid), '-')
    || ' gen=' || a.attgenerated::text || ' ident=' || a.attidentity::text || ' acl=' || ${acl("a.attacl")}
  from pg_attribute a join pg_class c on c.oid = a.attrelid
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where c.relnamespace in ${OURS} and c.relkind in ('r', 'p', 'v', 'm') and a.attnum > 0 and not a.attisdropped
union all
select '${phase}', 'constraint', conrelid::regclass::text || '.' || conname, pg_get_constraintdef(oid)
  from pg_constraint where connamespace in ${OURS}
union all
select '${phase}', 'index', schemaname || '.' || indexname, indexdef from pg_indexes where schemaname in ('public', 'app_private')
union all
select '${phase}', 'policy', schemaname || '.' || tablename || '.' || policyname,
  concat_ws(' | ', permissive, roles::text, cmd, qual, with_check)
  from pg_policies where schemaname in ('public', 'app_private', 'storage')
union all
select '${phase}', 'trigger', t.tgrelid::regclass::text || '.' || t.tgname, pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid
  where not t.tgisinternal and (c.relnamespace in ${OURS} or c.relnamespace in ('auth'::regnamespace, 'storage'::regnamespace))
union all
select '${phase}', 'sequence', schemaname || '.' || sequencename, concat_ws(' ', data_type, start_value, increment_by, min_value, max_value, cycle)
  from pg_sequences where schemaname in ('public', 'app_private')
union all
select '${phase}', 'type', t.typnamespace::regnamespace::text || '.' || t.typname, t.typtype::text
  from pg_type t where t.typnamespace in ${OURS} and t.typtype in ('e', 'd', 'c')
  and not exists (select 1 from pg_class c where c.reltype = t.oid)
union all
select '${phase}', 'schema', nspname, ${acl("nspacl")} from pg_namespace where nspname in ('public', 'app_private')
union all
select '${phase}', 'cron', jobname, concat_ws(' | ', schedule, command, active) from cron.job
union all
select '${phase}', 'bucket', id, concat_ws(' | ', name, public, file_size_limit, allowed_mime_types::text) from storage.buckets
union all
select '${phase}', 'publication', pubname || ':' || schemaname || '.' || tablename, '' from pg_publication_tables where schemaname in ('public', 'app_private')
union all
select '${phase}', 'setting', key, value::text from app_private.settings;

-- Row counts and content hashes per table. Generated keys and timestamps differ between the two sides by design.
do $snap$
declare
  r record;
  v_count bigint;
  v_hash text;
begin
  for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') order by 1 loop
    execute format(
      'select count(*), md5(coalesce(string_agg(x, %L order by x), %L)) from (select (to_jsonb(t) - array[%L, %L, %L, %L, %L])::text as x from public.%I t) s',
      '|', '', 'id', 'credential_id', 'roll_number', 'created_at', 'updated_at', r.relname) into v_count, v_hash;
    insert into pg_temp._fp (phase, kind, name, def) values ('${phase}', 'rowcount', 'public.' || r.relname, v_count::text);
    insert into pg_temp._fp (phase, kind, name, def) values ('${phase}', 'rowhash', 'public.' || r.relname, v_hash);
  end loop;
end $snap$;
`

const drop = `
select cron.unschedule(jobid) from cron.job where jobname = 'finalize-quiz-attempts';
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_email_changed on auth.users;
drop trigger if exists protect_demo_user on auth.users;
drop trigger if exists protect_demo_mfa on auth.mfa_factors;
do $drop$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'Students %' loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
  for r in select c.relname, c.relkind from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm') loop
    execute format(case r.relkind when 'v' then 'drop view if exists public.%I cascade' else 'drop materialized view if exists public.%I cascade' end, r.relname);
  end loop;
  for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') loop
    execute format('drop table if exists public.%I cascade', r.relname);
  end loop;
  for r in select p.oid::regprocedure::text as sig from pg_proc p where p.pronamespace = 'public'::regnamespace loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
  for r in select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'S' loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;
  for r in select t.typname from pg_type t where t.typnamespace = 'public'::regnamespace and t.typtype in ('e', 'd', 'c')
           and not exists (select 1 from pg_class c where c.reltype = t.oid) loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $drop$;
drop schema app_private cascade;
delete from auth.users where id = (select id from pg_temp._demo_user);
`

const reinsertDemo = `
do $demo$
declare cols text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum) into cols
  from pg_attribute where attrelid = 'auth.users'::regclass and attnum > 0 and not attisdropped and attgenerated not in ('s', 'v');
  execute format('insert into auth.users (%s) select %s from pg_temp._demo_user', cols, cols);
end $demo$;
`

const report = `
do $report$
declare v text;
begin
  select json_build_object(
    'before', (select count(*) from pg_temp._fp where phase = 'before'),
    'after', (select count(*) from pg_temp._fp where phase = 'after'),
    'demo_profile', (select count(*) from public.profiles p where p.id = (select id from pg_temp._demo_user) and p.is_demo),
    'diff', coalesce((select json_agg(json_build_object('side', side, 'kind', kind, 'name', name, 'def', left(def, 240)) order by kind, name, side) from (
      select 'before-only' as side, * from (select kind, name, def from pg_temp._fp where phase = 'before'
                                            except select kind, name, def from pg_temp._fp where phase = 'after') a
      union all
      select 'after-only', * from (select kind, name, def from pg_temp._fp where phase = 'after'
                                   except select kind, name, def from pg_temp._fp where phase = 'before') b
    ) d), '[]'::json)
  )::text into v;
  raise exception 'REHEARSAL_RESULT:%', v;
end $report$;
`

const migrations = files.map((f) => `-- ===== ${f}\n${readFileSync(DIR + f, "utf8")}\n;\n`).join("\n")

// --tamper changes a policy, a grant and a row after the migrations, to prove the comparison catches drift.
const TAMPER = process.argv.includes("--tamper")
  ? `drop policy "Students read their own profile" on public.profiles;
     revoke select on public.faqs from authenticated;
     update public.courses set title = title || ' (tampered)' where id = 'c-1';`
  : ""

const script = `
create temp table _fp (phase text, kind text, name text, def text) on commit drop;
create temp table _demo_user on commit drop as select * from auth.users where email = '${DEMO_EMAIL}';
do $chk$ begin
  if (select count(*) from pg_temp._demo_user) <> 1 then raise exception 'demo user % not found', '${DEMO_EMAIL}'; end if;
end $chk$;

-- Fresh demo data on the live side, exactly what reset_my_demo_data does.
select app_private.seed_content(now());
select app_private.seed_student_demo((select id from pg_temp._demo_user));
${snapshot("before")}
${drop}
${migrations}
${reinsertDemo}
${TAMPER}
${snapshot("after")}
${report}
`

// Kept for reading error positions ("LINE 22: ...") against the exact script that ran.
const scriptFile = path.join(tmpdir(), "quantum-rehearse-migrations.sql")
writeFileSync(scriptFile, script)
console.log(`rehearsal script: ${(script.length / 1024).toFixed(0)} KB, ${files.length} migration files (${scriptFile})`)

const started = Date.now()
try {
  await sql(script)
  console.log("unexpected: the rehearsal committed")
  process.exit(1)
} catch (e) {
  const m = /REHEARSAL_RESULT:(\{[\s\S]*\})/.exec(e.message)
  if (!m) {
    console.error(`rehearsal failed before the comparison (${Date.now() - started} ms):\n${e.message}`)
    process.exit(1)
  }
  const result = JSON.parse(m[1])
  console.log(`rolled back after ${Date.now() - started} ms`)
  console.log(`fingerprint items: before=${result.before} after=${result.after}; demo profile recreated: ${result.demo_profile === 1}`)
  if (!result.diff.length) console.log("no differences: the migrations reproduce the live database")
  for (const d of result.diff) console.log(`  ${d.side.padEnd(11)} ${d.kind.padEnd(10)} ${d.name}  ${d.def ?? ""}`)
}

const [state] = await sql(`select (select count(*) from cron.job where jobname = 'finalize-quiz-attempts') as cron_jobs,
  (select count(*) from public.profiles) as profiles, to_regclass('app_private.settings') is not null as settings_exist`)
console.log("live project after the rehearsal:", JSON.stringify(state))
