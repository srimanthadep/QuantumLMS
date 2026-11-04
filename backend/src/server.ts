import { buildApp } from "./app.js"
import { createContext } from "./bootstrap.js"
import { loadConfig } from "./config.js"
import { modules, startJobs } from "./modules.js"

const config = loadConfig()
const ctx = createContext(config)
const app = await buildApp(ctx, { modules })
const stopJobs = startJobs(ctx, app.log)

let closing = false
async function shutdown(signal: string) {
  if (closing) return
  closing = true
  app.log.info({ signal }, "shutting down")
  stopJobs()
  await app.close().catch(() => undefined)
  await ctx.pool.end().catch(() => undefined)
  process.exit(0)
}
process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err)
})
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err)
})

await app.listen({ port: config.PORT, host: config.HOST })
