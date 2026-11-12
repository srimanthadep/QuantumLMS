import assert from "node:assert/strict"
import { test } from "node:test"
import path from "node:path"
import { build } from "esbuild"

test("actual frontend API cache isolates account A/logout/B and rejects old in-flight responses", async () => {
  const compiled = await build({
    stdin: { contents: 'export { api } from "../frontend/src/lib/api.ts"; export { resetPrivateSession } from "../frontend/src/lib/sessionBoundary.ts";', resolveDir: process.cwd() },
    bundle: true, write: false, format: "esm", platform: "browser",
    define: { "import.meta.env": '{"DEV":false}' },
    plugins: [{ name: "fake-cognito-session", setup(builder) {
      builder.onResolve({ filter: /^\.\/auth$/ }, (args) => args.importer.endsWith(`${path.sep}api.ts`) || args.importer.endsWith("/api.ts") ? { path: "test-auth", namespace: "fake" } : undefined)
      builder.onLoad({ filter: /.*/, namespace: "fake" }, () => ({ contents: "export async function accessToken() { return globalThis.__testToken }", loader: "js" }))
    } }],
  })
  const g = globalThis as typeof globalThis & { __testToken?: string; window?: unknown; sessionStorage?: unknown }
  const originalFetch = globalThis.fetch
  const originalWindow = g.window
  const originalStorage = g.sessionStorage
  const map = new Map<string, string>()
  const storage = { get length() { return map.size }, key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) }
  Object.assign(g, { window: { sessionStorage: storage, localStorage: storage }, sessionStorage: storage })
  let delayed: ((value: Response) => void) | undefined
  let requested: (() => void) | undefined
  const reachedNetwork = new Promise<void>((resolve) => { requested = resolve })
  globalThis.fetch = (async (url: string, init: { headers?: Record<string, string> }) => {
    const identity = init.headers?.Authorization === "Bearer token-A" ? "A" : "B"
    if (url.endsWith("/me")) return Response.json({ id: identity })
    if (url.endsWith("/slow")) { requested?.(); return new Promise<Response>((resolve) => { delayed = resolve }) }
    return Response.json({ privateAccount: identity })
  }) as typeof fetch
  try {
    const client = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`)
    g.__testToken = "token-A"
    assert.equal((await client.api.get("/profile")).privateAccount, "A")
    const old = client.api.get("/slow").then(() => "unexpected success", (e: Error) => e.message)
    await reachedNetwork
    client.resetPrivateSession()
    assert.equal(map.size, 0)
    g.__testToken = "token-B"
    assert.equal((await client.api.get("/profile")).privateAccount, "B")
    delayed!(Response.json({ privateAccount: "A" }))
    assert.match(await old, /session changed/i)
    assert.equal((await client.api.get("/profile")).privateAccount, "B")
  } finally {
    globalThis.fetch = originalFetch
    Object.assign(g, { window: originalWindow, sessionStorage: originalStorage })
    delete g.__testToken
  }
})
