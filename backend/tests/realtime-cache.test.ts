import assert from "node:assert/strict"
import { test } from "node:test"
import { once } from "node:events"
import { createHarness } from "./helpers.js"

test("personalized responses cannot be shared or revalidated across accounts", async () => {
  const h = await createHarness()
  try {
    const u = await h.user()
    const res = await h.app.inject({ method: "GET", url: "/api/student/core", headers: { authorization: `Bearer ${u.token}`, "if-none-match": "*" } })
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers["cache-control"], "private, no-store")
    assert.equal(res.headers.etag, undefined)
    assert.equal((await h.app.inject({ method: "GET", url: "/api/ws/stats" })).statusCode, 401)
    assert.equal((await u.call("GET", "/api/ws/stats")).status, 403)
  } finally { await h.close() }
})

test("WebSocket upgrade and channel subscriptions enforce identity and membership", async () => {
  const h = await createHarness()
  try {
    await h.app.ready()
    await assert.rejects(h.app.injectWS("/api/ws", { socket: { remoteAddress: "127.0.0.1" } as never }), /401/)
    const a = await h.user()
    const b = await h.user()
    const aid = (await a.call("GET", "/api/me")).body.id
    const bid = (await b.call("GET", "/api/me")).body.id
    const ws = await h.app.injectWS("/api/ws", { socket: { remoteAddress: "127.0.0.1" } as never, headers: { authorization: `Bearer ${a.token}` } })
    const command = async (data: unknown) => {
      const next = once(ws, "message")
      ws.send(JSON.stringify(data))
      return JSON.parse(String((await next)[0]))
    }
    try {
      assert.equal((await command({ action: "subscribe", channel: `user:${aid}` })).action, "subscribed")
      assert.equal((await command({ action: "subscribe", channel: `user:${bid}` })).action, "error")
      assert.equal((await command({ action: "publish", channel: `chat:${aid}`, event: "message", sender: { id: bid }, payload: "forged" })).action, "error")
      assert.equal((await command({ action: "subscribe", channel: "notifications" })).action, "error")
    } finally { ws.terminate() }
  } finally { await h.close() }
})
