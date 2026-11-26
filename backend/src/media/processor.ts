import { spawn } from "node:child_process"
import { createReadStream, createWriteStream } from "node:fs"
import { mkdir, mkdtemp, readFile, readdir, rm, stat, statfs } from "node:fs/promises"
import { availableParallelism, tmpdir } from "node:os"
import path from "node:path"
import { Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { Config } from "../config.js"
import type { Storage } from "../storage/storage.js"
import type { MediaResult } from "./jobs.js"

export function runProcess(command: string, args: string[], signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, signal, stdio: ["ignore", "pipe", "pipe"] })
    let output = "", overflow = false
    child.stdout.on("data", chunk => { output += chunk.toString(); if (output.length > 1024 * 1024) { overflow = true; child.kill() } })
    child.stderr.on("data", () => {}) // consume the stream without retaining unbounded diagnostics or source paths
    child.once("error", reject)
    child.once("close", code => code === 0 && !overflow ? resolve(output) : reject(new Error("Media subprocess failed")))
  })
}

/**
 * Speech-to-text for one job: ffmpeg pulls the audio out as a small 16 kHz mono WAV (a fraction of a second), then the
 * local Whisper model reads that instead of decoding the whole video. Half the cores go to it, the encodes use two threads.
 */
async function transcribe(config: Config, input: string, format: string, dir: string, signal: AbortSignal): Promise<MediaResult["transcript"]> {
  const audio = path.join(dir, "audio.wav")
  const transcriptPath = path.join(dir, "transcript.json")
  try {
    await runProcess(config.MEDIA_FFMPEG, ["-nostdin", "-y", "-v", "error", "-protocol_whitelist", "file,pipe", "-f", format, "-i", input,
      "-map", "0:a:0", "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", audio], signal)
    const threads = Math.max(2, Math.floor(availableParallelism() / 2))
    await runProcess(config.MEDIA_PYTHON, ["worker/transcribe.py", audio, transcriptPath, config.MEDIA_MODEL_PATH, String(threads)], signal)
  } catch { throw Object.assign(new Error("Transcription failed"), { name: "TranscriptionError" }) }
  if ((await stat(transcriptPath)).size > 10 * 1024 * 1024) throw new Error("Transcript too large")
  const transcript = JSON.parse(await readFile(transcriptPath, "utf8")) as MediaResult["transcript"]
  if (!Array.isArray(transcript) || transcript.some(s => typeof s.text !== "string" || !Number.isFinite(s.start) || !Number.isFinite(s.end))) throw new Error("Invalid transcript")
  return transcript
}

/** One job per worker, one encode at a time, with transcription running alongside. Neither input nor variants are held in RAM. */
export async function processMedia(storage: Storage, config: Config, assetId: string, sourceKey: string, attempt: string, signal?: AbortSignal): Promise<MediaResult> {
  if (!storage.stream || !storage.putStream) throw new Error("Streaming storage is required")
  const source = await storage.head(sourceKey)
  if (!source || source.size > config.MEDIA_MAX_UPLOAD_BYTES) throw new Error("Invalid input size")
  const root = path.join(tmpdir(), "quantumlms-media")
  await mkdir(root, { recursive: true })
  const available = await statfs(root)
  if (available.bavail * available.bsize < config.MEDIA_TEMP_BUDGET_BYTES) throw new Error("Insufficient temporary storage")
  const dir = await mkdtemp(path.join(root, "job-"))
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener("abort", abort, { once: true })
  if (signal?.aborted) abort()
  const timeout = setTimeout(abort, config.MEDIA_JOB_TIMEOUT_SECONDS * 1000)
  let diskCheckRunning = false
  const diskCheck = setInterval(async () => {
    if (diskCheckRunning) return
    diskCheckRunning = true
    try {
      let bytes = 0
      for (const entry of await readdir(dir)) bytes += (await stat(path.join(dir, entry))).size
      if (bytes > config.MEDIA_TEMP_BUDGET_BYTES) abort()
    } catch { abort() } finally { diskCheckRunning = false }
  }, 1000)
  // Both run at once; either failing stops the other, and cleanup waits until both have settled.
  let pending: Promise<unknown>[] = []
  try {
    const input = path.join(dir, "input.bin")
    const stream = await storage.stream(sourceKey)
    if (!stream) throw new Error("Source unavailable")
    let seen = 0
    const limit = new Transform({ transform(chunk, _encoding, cb) {
      seen += chunk.length
      cb(seen > source.size || seen > config.MEDIA_MAX_UPLOAD_BYTES ? new Error("Input size limit") : null, chunk)
    } })
    await pipeline(stream.stream, limit, createWriteStream(input), { signal: controller.signal })
    if (seen !== source.size) throw new Error("Incomplete source")
    const header = await storage.read(sourceKey, 16)
    const format = header?.data.subarray(4, 8).toString() === "ftyp" ? "mov"
      : header?.data.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) ? "matroska" : null
    if (!format) throw new Error("Unsupported media container")
    const probe = JSON.parse(await runProcess(config.MEDIA_FFPROBE, ["-v", "error", "-f", format, "-protocol_whitelist", "file,pipe", "-show_format", "-show_streams", "-of", "json", input], controller.signal))
    const duration = Number(probe.format.duration)
    if (!Number.isFinite(duration) || duration <= 0 || duration > config.MEDIA_MAX_DURATION_SECONDS || !probe.streams.some((s: { codec_type: string }) => s.codec_type === "video")) throw new Error("Invalid video")
    const hasAudio = probe.streams.some((s: { codec_type: string }) => s.codec_type === "audio")
    // A video without a sound track has nothing to transcribe; it still gets its variants.
    const transcribing = hasAudio ? transcribe(config, input, format, dir, controller.signal) : Promise.resolve([] as MediaResult["transcript"])
    const encoding = (async () => {
      const variants: MediaResult["variants"] = []
      for (const height of [720, 480]) {
        const output = path.join(dir, `${height}.mp4`)
        await runProcess(config.MEDIA_FFMPEG, ["-nostdin", "-y", "-v", "error", "-protocol_whitelist", "file,pipe", "-f", format, "-i", input,
          "-map", "0:v:0", "-map", "0:a:0?", "-vf", `scale=-2:'min(${height},ih)'`, "-c:v", "libx264", "-threads", "2", "-preset", "fast", "-crf", "24",
          "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", "-fs", String(config.MEDIA_TEMP_BUDGET_BYTES - source.size), output], controller.signal)
        const info = await stat(output)
        const outputProbe = JSON.parse(await runProcess(config.MEDIA_FFPROBE, ["-v", "error", "-show_format", "-show_streams", "-of", "json", output], controller.signal))
        if (Math.abs(Number(outputProbe.format.duration) - duration) > 2) throw new Error("Output was truncated")
        const key = `videos/assets/${assetId}/${attempt}/${height}p.mp4`
        await storage.putStream!(key, createReadStream(output), info.size, "video/mp4") // checked at the top
        variants.push({ quality: `${height}p`, key, bytes: info.size, height: Number(outputProbe.streams.find((s: { codec_type: string }) => s.codec_type === "video").height) })
        await rm(output)
      }
      return variants
    })()
    pending = [transcribing, encoding]
    const [transcript, variants] = await Promise.all([transcribing, encoding].map(p => p.catch(e => { abort(); throw e }))) as [MediaResult["transcript"], MediaResult["variants"]]
    const chapters: MediaResult["chapters"] = []
    for (const segment of transcript) {
      if (!chapters.length || segment.start >= chapters[chapters.length - 1].start + 300) chapters.push({ start: segment.start, title: segment.text.trim().slice(0, 100) || `Chapter ${chapters.length + 1}` })
    }
    return { duration, variants, transcript, chapters }
  } finally {
    await Promise.allSettled(pending)
    clearTimeout(timeout); clearInterval(diskCheck); signal?.removeEventListener("abort", abort)
    // dir comes only from mkdtemp under this worker's own root.
    if (path.resolve(dir).startsWith(path.resolve(root) + path.sep)) await rm(dir, { recursive: true, force: true })
  }
}
