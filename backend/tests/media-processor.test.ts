import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"
import { createHarness } from "./helpers.js"
import { processMedia, runProcess } from "../src/media/processor.js"

/** A one-second blue clip, with a tone when `withAudio`. */
async function fixture(dir: string, withAudio: boolean) {
  const input = path.join(dir, withAudio ? "with-audio.mp4" : "silent.mp4")
  await runProcess("ffmpeg", ["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=160x90:r=10",
    ...(withAudio ? ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=16000"] : []),
    "-t", "1", "-c:v", "libx264", "-pix_fmt", "yuv420p", ...(withAudio ? ["-c:a", "aac", "-shortest"] : []), input])
  return readFile(input)
}

test("a video with sound and a missing transcription dependency fails instead of fabricating a transcript", async () => {
  const h = await createHarness()
  const dir = await mkdtemp(path.join(tmpdir(), "qlms-encoder-test-"))
  try {
    await h.ctx.storage.put("videos/processor-fixture/with-audio.mp4", await fixture(dir, true), "video/mp4")
    await assert.rejects(processMedia(h.ctx.storage, { ...h.ctx.config, MEDIA_TEMP_BUDGET_BYTES: 32 * 1024 * 1024,
      MEDIA_PYTHON: path.join(dir, "missing-interpreter"), MEDIA_JOB_TIMEOUT_SECONDS: 30 }, "asset-one", "videos/processor-fixture/with-audio.mp4", "attempt-one"), { name: "TranscriptionError" })
  } finally { await h.close(); await rm(dir, { recursive: true, force: true }) }
})

test("real FFmpeg streams separate variants, and a silent video finishes with an empty transcript without running the transcriber", async () => {
  const h = await createHarness()
  const dir = await mkdtemp(path.join(tmpdir(), "qlms-encoder-test-"))
  try {
    await h.ctx.storage.put("videos/processor-fixture/silent.mp4", await fixture(dir, false), "video/mp4")
    // The interpreter does not exist, so a call to it would fail the job.
    const result = await processMedia(h.ctx.storage, { ...h.ctx.config, MEDIA_TEMP_BUDGET_BYTES: 32 * 1024 * 1024,
      MEDIA_PYTHON: path.join(dir, "missing-interpreter"), MEDIA_JOB_TIMEOUT_SECONDS: 30 }, "asset-two", "videos/processor-fixture/silent.mp4", "attempt-one")
    assert.deepEqual(result.transcript, [])
    assert.deepEqual(result.chapters, [])
    assert.deepEqual(result.variants.map(v => v.quality), ["720p", "480p"])
    const stored = await h.ctx.storage.list("videos/assets/asset-two/attempt-one/")
    assert.equal(stored.length, 2)
  } finally { await h.close(); await rm(dir, { recursive: true, force: true }) }
})
