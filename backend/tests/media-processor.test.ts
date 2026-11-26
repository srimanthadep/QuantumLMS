import assert from "node:assert/strict"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
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
    const progress: number[] = []
    const result = await processMedia(h.ctx.storage, { ...h.ctx.config, MEDIA_TEMP_BUDGET_BYTES: 32 * 1024 * 1024,
      MEDIA_PYTHON: path.join(dir, "missing-interpreter"), MEDIA_JOB_TIMEOUT_SECONDS: 30 }, "asset-two", "videos/processor-fixture/silent.mp4", "attempt-one", undefined, p => progress.push(p))
    // Progress only moves forward and ends at 95%; the last 5% is saving the job.
    assert.ok(progress.length >= 2, `progress reports: ${progress.length}`)
    assert.ok(progress.every((p, i) => i === 0 || p >= progress[i - 1]))
    assert.equal(Math.round(progress.at(-1)!), 95)
    assert.deepEqual(result.transcript, [])
    assert.deepEqual(result.chapters, [])
    assert.deepEqual(result.variants.map(v => v.quality), ["720p", "480p"])
    const stored = await h.ctx.storage.list("videos/assets/asset-two/attempt-one/")
    assert.equal(stored.length, 2)
  } finally { await h.close(); await rm(dir, { recursive: true, force: true }) }
})

/** The codec of a stored variant, by reading it back and asking ffprobe. */
async function variantCodec(h: Awaited<ReturnType<typeof createHarness>>, dir: string, key: string) {
  const file = path.join(dir, path.basename(key))
  const stored = await h.ctx.storage.read(key, 64 * 1024 * 1024)
  assert.ok(stored)
  await writeFile(file, stored.data)
  return (await runProcess("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name", "-of", "csv=p=0", file])).trim()
}

test("a web-ready H.264 source is copied for 720p; anything else is encoded to H.264", async () => {
  const h = await createHarness()
  const dir = await mkdtemp(path.join(tmpdir(), "qlms-encoder-test-"))
  try {
    const config = { ...h.ctx.config, MEDIA_TEMP_BUDGET_BYTES: 32 * 1024 * 1024, MEDIA_JOB_TIMEOUT_SECONDS: 30 }
    // MPEG-4 Part 2 is not something browsers play, so both variants must be re-encoded.
    const mpeg4 = path.join(dir, "mpeg4.mp4")
    await runProcess("ffmpeg", ["-nostdin", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=red:s=160x90:r=10", "-t", "1", "-c:v", "mpeg4", mpeg4])
    await h.ctx.storage.put("videos/processor-fixture/mpeg4.mp4", await readFile(mpeg4), "video/mp4")
    const encoded = await processMedia(h.ctx.storage, config, "asset-three", "videos/processor-fixture/mpeg4.mp4", "attempt-one")
    for (const v of encoded.variants) assert.equal(await variantCodec(h, dir, v.key), "h264")

    // An H.264 source keeps its own stream for 720p, and 480p is still produced.
    const source = await fixture(dir, false)
    await h.ctx.storage.put("videos/processor-fixture/h264.mp4", source, "video/mp4")
    const copied = await processMedia(h.ctx.storage, config, "asset-four", "videos/processor-fixture/h264.mp4", "attempt-one")
    assert.deepEqual(copied.variants.map(v => v.quality), ["720p", "480p"])
    for (const v of copied.variants) assert.equal(await variantCodec(h, dir, v.key), "h264")
  } finally { await h.close(); await rm(dir, { recursive: true, force: true }) }
})
