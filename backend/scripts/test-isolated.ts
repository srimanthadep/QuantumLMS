// Never loads backend/.env. Each test file gets a new database, migrated from zero.
import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { createServer } from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { seedContent } from "../src/db/seed/index.js"
import { createDb } from "../src/db/client.js"

const root = fileURLToPath(new URL("../", import.meta.url))
const parent = path.resolve(root, ".data", "isolated-tests")
mkdirSync(parent, { recursive: true })
const cluster = mkdtempSync(path.join(parent, "run-"))
const cleanEnv: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", DEMO_MODE: "false", DEV_FAKE_LOGIN: "false", DATABASE_SSL: "disable" }
delete cleanEnv.DATABASE_URL
delete cleanEnv.DATABASE_CA_CERT
delete cleanEnv.NODE_OPTIONS

async function run(exe: string, args: string[], env: NodeJS.ProcessEnv = cleanEnv): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(exe, args, { cwd: root, env, stdio: "inherit", windowsHide: true })
    child.once("error", reject)
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${path.basename(exe)} exited with ${code}`)))
  })
}

function binaryDir(): string {
  if (process.env.PG_BIN) return process.env.PG_BIN
  if (process.platform === "win32") {
    const base = path.join(process.env.ProgramFiles ?? "C:/Program Files", "PostgreSQL")
    const version = existsSync(base) ? readdirSync(base).filter((v) => /^\d+$/.test(v)).sort((a, b) => Number(b) - Number(a))[0] : undefined
    if (version) return path.join(base, version, "bin")
  }
  return "" // initdb/pg_ctl on PATH on Linux; CI can set PG_BIN explicitly.
}

async function availablePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve) })
  const port = (server.address() as { port: number }).port
  await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve()))
  return port
}

const bin = binaryDir()
const executable = (name: string) => path.join(bin, `${name}${process.platform === "win32" ? ".exe" : ""}`)
let started = false
let admin: pg.Pool | undefined
let failed = false
try {
  let adminUrl = process.env.TEST_ADMIN_DATABASE_URL
  if (adminUrl) {
    const target = new URL(adminUrl)
    if (!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !["postgres:", "postgresql:"].includes(target.protocol)) {
      throw new Error("TEST_ADMIN_DATABASE_URL must point to a disposable PostgreSQL service on loopback.")
    }
  } else {
    const port = await availablePort()
    const password = randomBytes(24).toString("hex")
    const passwordFile = path.join(cluster, "init-password")
    writeFileSync(passwordFile, password, { mode: 0o600 })
    await run(executable("initdb"), ["-D", path.join(cluster, "data"), "-U", "quantumlms_test", "--pwfile", passwordFile, "-A", "scram-sha-256", "--encoding=UTF8", "--locale=C"])
    rmSync(passwordFile)
    await run(executable("pg_ctl"), ["-D", path.join(cluster, "data"), "-l", path.join(cluster, "postgres.log"), "-o", `-h 127.0.0.1 -p ${port} -c max_connections=20`, "-w", "start"])
    started = true
    adminUrl = `postgresql://quantumlms_test:${password}@127.0.0.1:${port}/postgres`
  }
  admin = new pg.Pool({ connectionString: adminUrl, max: 1 })
  const requested = process.argv.slice(2)
  const files = readdirSync(path.join(root, "tests")).filter((f) => f.endsWith(".test.ts") && (!requested.length || requested.includes(f)))
  if (!files.length) throw new Error("No test files matched.")
  for (const file of files) {
    const name = `quantumlms_test_${randomBytes(12).toString("hex")}`
    const nonce = randomBytes(24).toString("hex")
    const target = new URL(adminUrl); target.pathname = `/${name}`
    await admin.query(`create database "${name}"`)
    const pool = new pg.Pool({ connectionString: target.toString(), max: 2 })
    try {
      await pool.query("create table public.quantumlms_test_guard (nonce text not null)")
      await pool.query("insert into public.quantumlms_test_guard values ($1)", [nonce])
      await migrate(drizzle(pool), { migrationsFolder: path.join(root, "drizzle"), migrationsSchema: "lms", migrationsTable: "__drizzle_migrations" })
      // Explicit known fixtures, never implicit production seeding or production-data copies.
      if (file !== "self-paced.test.ts") {
      await createDb(pool).transaction((tx) => seedContent(tx, new Date(), "Asia/Kolkata"))
      await pool.query("update lms.courses set price = 0, status = 'Published' where is_starter = true or id = 'cat-1'")
      await pool.query("insert into lms.course_offers (id, course_id, title, mode, price, status) select 'fixture:' || id, id, title, 'self_paced', price, status from lms.courses on conflict do nothing")
      }
      await pool.end()
      console.log(`\nIsolated suite: ${file}`)
      await run(process.execPath, ["--import", "tsx", "--test", "--test-timeout=60000", `tests/${file}`], {
        ...cleanEnv, TEST_DATABASE_URL: target.toString(), TEST_RUN_ID: nonce,
      })
    } catch (error) {
      failed = true
      console.error(`${file}: ${(error as Error).message}`)
    } finally {
      if (!pool.ended) await pool.end()
      // Only the random database created above is removed. No existing DB/schema is reused.
      await admin.query(`drop database "${name}" with (force)`)
    }
  }
} finally {
  await admin?.end()
  if (started) await run(executable("pg_ctl"), ["-D", path.join(cluster, "data"), "-m", "fast", "-w", "stop"])
  const resolved = path.resolve(cluster)
  if (!resolved.startsWith(parent + path.sep) || !path.basename(resolved).startsWith("run-")) throw new Error("Unsafe test cleanup path.")
  rmSync(resolved, { recursive: true, force: true })
}
if (failed) process.exitCode = 1
