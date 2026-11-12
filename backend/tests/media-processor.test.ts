import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"
import { createHarness } from "./helpers.js"
import { processMedia, runProcess } from "../src/media/processor.js"

test("real FFmpeg streams separate variants and a missing transcription dependency fails instead of fabricating a transcript", async () => {
  const h = await createHarness()
  const dir = await mkdtemp(path.join(tmpdir(), "qlms-encoder-test-"))
  try {
    const input = path.join(dir, "test.mp4")
    await runProcess("ffmpeg", ["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=160x90:r=10", "-t", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p", input])
    const data = await readFile(input)
    await h.ctx.storage.put("videos/processor-fixture/source.mp4", data, "video/mp4")
    await assert.rejects(processMedia(h.ctx.storage, { ...h.ctx.config, MEDIA_TEMP_BUDGET_BYTES: 32 * 1024 * 1024,
      MEDIA_PYTHON: path.join(dir, "missing-interpreter"), MEDIA_JOB_TIMEOUT_SECONDS: 30 }, "asset-one", "videos/processor-fixture/source.mp4", "attempt-one"), { name: "TranscriptionError" })
    const variants = await h.ctx.storage.list("videos/assets/asset-one/attempt-one/")
    assert.equal(variants.length, 2)
    assert.ok(variants.every(k => k.includes("asset-one/attempt-one/")))
  } finally { await h.close(); await rm(dir, { recursive: true, force: true }) }
})
