/**
 * Guard for scripts that delete data. They refuse to run in production, and the operator must name the exact
 * database they mean to wipe: `--confirm-wipe=<host>/<database>`. A copied command can't hit another database.
 */
export function confirmDestructiveRun(opts: { script: string; databaseUrl: string | undefined; localCognito?: { endpoint?: string; poolId?: string } }): void {
  const fail = (message: string): never => {
    console.error(`${opts.script}: ${message}`)
    process.exit(1)
  }
  if (process.env.NODE_ENV === "production") fail("refusing to run with NODE_ENV=production.")
  if (!opts.databaseUrl) fail("DATABASE_URL is not set.")

  if (opts.localCognito) {
    const { endpoint, poolId } = opts.localCognito
    let host = ""
    try { host = endpoint ? new URL(endpoint).hostname : "" } catch { /* reported below */ }
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host) || !poolId?.startsWith("local_")) {
      fail("this script only runs against the local Cognito emulator (COGNITO_ENDPOINT on localhost and a local_ pool id).")
    }
  }

  let target: string
  try {
    const url = new URL(opts.databaseUrl!)
    target = `${url.hostname}/${decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres"}`
  } catch {
    return fail("DATABASE_URL is not a valid URL.")
  }
  const confirmed = process.argv.find((a) => a.startsWith("--confirm-wipe="))?.slice("--confirm-wipe=".length)
  if (confirmed !== target) {
    fail(`this permanently deletes data in ${target}.\nIf that is the database you mean, run it again with --confirm-wipe=${target}`)
  }
}
