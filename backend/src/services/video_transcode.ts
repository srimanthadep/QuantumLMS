import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import type { Storage } from "../storage/storage.js"

export interface QualityProfile {
  label: string
  height: number
  bitrate: string
  maxrate: string
  bufsize: string
  audioBitrate: string
  crf: string
}

export const QUALITY_PROFILES: Record<string, QualityProfile> = {
  "1080p": {
    label: "1080p (Full HD)",
    height: 1080,
    bitrate: "2600k",
    maxrate: "3200k",
    bufsize: "5000k",
    audioBitrate: "128k",
    crf: "23",
  },
  "720p": {
    label: "720p (HD)",
    height: 720,
    bitrate: "1300k",
    maxrate: "1600k",
    bufsize: "2500k",
    audioBitrate: "128k",
    crf: "24",
  },
  "480p": {
    label: "480p (SD)",
    height: 480,
    bitrate: "650k",
    maxrate: "800k",
    bufsize: "1200k",
    audioBitrate: "96k",
    crf: "26",
  },
  "144p": {
    label: "144p (Data Saver)",
    height: 144,
    bitrate: "150k",
    maxrate: "200k",
    bufsize: "350k",
    audioBitrate: "64k",
    crf: "28",
  },
}

export interface TranscodeResult {
  label: string
  height: number
  url: string
  key: string
  size: number
}

/**
 * Transcodes a video file into multiple YouTube-style quality profiles:
 * 1080p, 720p, 480p, and 144p in parallel, uploads each to storage,
 * and returns their streaming URLs.
 */
export async function transcodeMultiQuality(
  inputVideoPath: string,
  courseId: string,
  storage: Storage,
  onProgress?: (msg: string) => void
): Promise<Record<string, TranscodeResult>> {
  const tempDir = os.tmpdir()
  const timestamp = Date.now()

  const outputs: { key: string; profile: QualityProfile; tempFile: string; r2Key: string }[] = [
    {
      key: "1080p",
      profile: QUALITY_PROFILES["1080p"],
      tempFile: path.join(tempDir, `transcode_${timestamp}_1080p.mp4`),
      r2Key: `videos/${courseId}/qualities/1080p.mp4`,
    },
    {
      key: "720p",
      profile: QUALITY_PROFILES["720p"],
      tempFile: path.join(tempDir, `transcode_${timestamp}_720p.mp4`),
      r2Key: `videos/${courseId}/qualities/720p.mp4`,
    },
    {
      key: "480p",
      profile: QUALITY_PROFILES["480p"],
      tempFile: path.join(tempDir, `transcode_${timestamp}_480p.mp4`),
      r2Key: `videos/${courseId}/qualities/480p.mp4`,
    },
    {
      key: "144p",
      profile: QUALITY_PROFILES["144p"],
      tempFile: path.join(tempDir, `transcode_${timestamp}_144p.mp4`),
      r2Key: `videos/${courseId}/qualities/144p.mp4`,
    },
  ]

  // Construct FFmpeg multi-output filter graph
  const filterComplex =
    "[0:v]split=4[v1080][v720][v480][v144]; " +
    "[v1080]scale=trunc(oh*a/2)*2:1080[out1080]; " +
    "[v720]scale=trunc(oh*a/2)*2:720[out720]; " +
    "[v480]scale=trunc(oh*a/2)*2:480[out480]; " +
    "[v144]scale=trunc(oh*a/2)*2:144[out144]"

  const args: string[] = ["-y", "-i", inputVideoPath, "-filter_complex", filterComplex]

  outputs.forEach((item, index) => {
    args.push(
      "-map",
      `[out${item.key}]`,
      "-map",
      "0:a?",
      `-c:v:${index}`,
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      item.profile.crf,
      `-b:v:${index}`,
      item.profile.bitrate,
      `-maxrate:${index}`,
      item.profile.maxrate,
      `-bufsize:${index}`,
      item.profile.bufsize,
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      item.profile.audioBitrate,
      "-movflags",
      "+faststart",
      item.tempFile
    )
  })

  // Spawn ffmpeg and stream output to avoid maxBuffer limits
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args)

    child.stderr.on("data", (chunk: Buffer) => {
      const line = chunk.toString()
      if (onProgress && line.includes("time=")) {
        const timeMatch = /time=([0-9:.]+)/.exec(line)
        if (timeMatch) onProgress(`Transcoding qualities: ${timeMatch[1]}`)
      }
    })

    child.on("error", (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`))
    })

    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg exited with error code ${code}`))
    })
  })

  // Upload each generated quality to storage in parallel
  const results: Record<string, TranscodeResult> = {}
  await Promise.all(
    outputs.map(async (item) => {
      if (fs.existsSync(item.tempFile)) {
        const stat = await fs.promises.stat(item.tempFile)
        if (stat.size > 0) {
          const buffer = await fs.promises.readFile(item.tempFile)
          await storage.put(item.r2Key, buffer, "video/mp4")
          results[item.key] = {
            label: item.profile.label,
            height: item.profile.height,
            key: item.r2Key,
            url: `/api/files/videos/${item.r2Key}`,
            size: stat.size,
          }
        }
        await fs.promises.unlink(item.tempFile).catch(() => {})
      }
    })
  )

  return results
}
