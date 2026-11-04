import assert from "node:assert/strict"
import test, { describe } from "node:test"
import { createHarness, type TestHarness } from "./helpers.js"

describe("HTTP browser caching and ETags", () => {
  let h: TestHarness

  test("GET endpoints return ETag and Cache-Control headers", async () => {
    h = await createHarness()
    try {
      const res1 = await h.app.inject({
        method: "GET",
        url: "/api/ws/stats",
      })
      assert.equal(res1.statusCode, 200)
      const etag = res1.headers["etag"]
      assert.ok(etag, "Response must include an ETag header")
      assert.ok(res1.headers["cache-control"], "Response must include Cache-Control header")

      // Second request with If-None-Match should return 304 Not Modified
      const res2 = await h.app.inject({
        method: "GET",
        url: "/api/ws/stats",
        headers: {
          "if-none-match": etag as string,
        },
      })
      assert.equal(res2.statusCode, 304, "Server must reply with 304 Not Modified when ETag matches")
      assert.equal(res2.payload, "", "304 response payload must be empty")
    } finally {
      await h.close()
    }
  })

  test("WebSocket gateway status and telemetry endpoint", async () => {
    h = await createHarness()
    try {
      const res = await h.app.inject({
        method: "GET",
        url: "/api/ws/stats",
      })
      assert.equal(res.statusCode, 200)
      const body = JSON.parse(res.payload)
      assert.ok(typeof body.activeSockets === "number")
      assert.ok(typeof body.totalChannels === "number")
      assert.ok(Array.isArray(body.channelList))
    } finally {
      await h.close()
    }
  })
})
