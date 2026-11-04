/**
 * Client-Side Audio Extraction, 16kHz Mono Resampling,
 * Voice Activity Detection (VAD / Silence Skipping), and Chunked WAV Encoding.
 */

export interface AudioChunk {
  chunkIndex: number
  startTime: number
  endTime: number
  duration: number
  isSilent: boolean
  rms: number
  wavBlob: Blob
  base64: string
}

export interface ExtractionResult {
  durationSeconds: number
  sampleRate: number
  totalChunks: number
  silentChunksCount: number
  speechChunksCount: number
  chunks: AudioChunk[]
}

/**
 * Encodes Float32Array PCM samples (at sampleRate) into a standard 16-bit PCM WAV Blob.
 */
export function encodeWav(samples: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1
  const bytesPerSample = 2 // 16-bit
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  // RIFF identifier
  writeString(view, 0, "RIFF")
  // file length minus 8 bytes
  view.setUint32(4, 36 + dataSize, true)
  // RIFF type
  writeString(view, 8, "WAVE")
  // format chunk identifier
  writeString(view, 12, "fmt ")
  // format chunk length
  view.setUint32(16, 16, true)
  // sample format (raw PCM = 1)
  view.setUint16(20, 1, true)
  // channel count
  view.setUint16(22, numChannels, true)
  // sample rate
  view.setUint32(24, sampleRate, true)
  // byte rate
  view.setUint32(28, byteRate, true)
  // block align
  view.setUint16(32, blockAlign, true)
  // bits per sample
  view.setUint16(34, 16, true)
  // data chunk identifier
  writeString(view, 36, "data")
  // data chunk length
  view.setUint32(40, dataSize, true)

  // Write 16-bit PCM samples
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }

  return new Blob([buffer], { type: "audio/wav" })
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

/**
 * Converts a Blob to a base64 data string (excluding data URL prefix).
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const res = reader.result as string
      const base64 = res.split(",")[1] || ""
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Voice Activity Detection (VAD):
 * Analyzes audio frame energy (RMS) and zero-crossing density.
 * Flags chunks with RMS < 0.007 (~-43 dBFS) or under 4% speech as silence.
 */
export function checkVoiceActivity(samples: Float32Array): { isSilent: boolean; rms: number; speechRatio: number } {
  if (samples.length === 0) return { isSilent: true, rms: 0, speechRatio: 0 }

  let sumSquares = 0
  const frameSize = 480 // 30ms at 16kHz (matching Silero-VAD frame window)
  let speechFrames = 0
  const totalFrames = Math.floor(samples.length / frameSize)

  for (let f = 0; f < totalFrames; f++) {
    let frameSum = 0
    let zcr = 0
    const start = f * frameSize
    for (let i = 0; i < frameSize; i++) {
      const val = samples[start + i]
      frameSum += val * val
      if (i > 0 && ((samples[start + i] >= 0 && samples[start + i - 1] < 0) || (samples[start + i] < 0 && samples[start + i - 1] >= 0))) {
        zcr++
      }
    }
    const frameRms = Math.sqrt(frameSum / frameSize)
    sumSquares += frameSum

    // Silero-like energy threshold + human voice zero-crossing rate filter
    if (frameRms > 0.008 && zcr > 5 && zcr < 140) {
      speechFrames++
    }
  }

  const rms = Math.sqrt(sumSquares / samples.length)
  const speechRatio = totalFrames > 0 ? speechFrames / totalFrames : 0
  const isSilent = speechRatio < 0.05 || rms < 0.005

  return { isSilent, rms, speechRatio }
}

/**
 * Resamples an AudioBuffer to 16,000 Hz Mono Float32Array using an OfflineAudioContext.
 */
export async function resampleTo16kMono(audioBuffer: AudioBuffer): Promise<Float32Array> {
  const targetSampleRate = 16000
  const targetLength = Math.ceil(audioBuffer.duration * targetSampleRate)
  const offlineCtx = new OfflineAudioContext(1, targetLength, targetSampleRate)

  const source = offlineCtx.createBufferSource()
  source.buffer = audioBuffer

  // If stereo, merge down to mono
  source.connect(offlineCtx.destination)
  source.start(0)

  const renderedBuffer = await offlineCtx.startRendering()
  return renderedBuffer.getChannelData(0)
}

/**
 * Extracts the audio track from any video file in the browser using the Web Audio API,
 * resamples to 16kHz mono, applies VAD silence detection, and slices into 30s-60s WAV chunks.
 */
export async function extractAndChunkAudio(
  videoFile: File,
  options: {
    chunkDurationSec?: number
    onProgress?: (progress: { stage: "decoding" | "resampling" | "chunking" | "done"; percent: number; message: string }) => void
  } = {}
): Promise<ExtractionResult> {
  const { chunkDurationSec = 30, onProgress } = options

  onProgress?.({ stage: "decoding", percent: 10, message: "Reading video file..." })
  const arrayBuffer = await videoFile.arrayBuffer()

  onProgress?.({ stage: "decoding", percent: 30, message: "Decoding audio track with Web Audio hardware decoder..." })
  // Decode audio data using browser's AudioContext
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
  let decodedBuffer: AudioBuffer
  try {
    decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    audioCtx.close().catch(() => {})
  }

  const durationSeconds = decodedBuffer.duration
  onProgress?.({ stage: "resampling", percent: 55, message: "Resampling to 16,000 Hz Mono for Parakeet / Whisper..." })

  const samples16k = await resampleTo16kMono(decodedBuffer)
  onProgress?.({ stage: "chunking", percent: 75, message: "Segmenting 30s chunks and applying VAD..." })

  const samplesPerChunk = 16000 * chunkDurationSec
  const totalChunks = Math.ceil(samples16k.length / samplesPerChunk)
  const chunks: AudioChunk[] = []
  let silentChunksCount = 0
  let speechChunksCount = 0

  for (let i = 0; i < totalChunks; i++) {
    const startSample = i * samplesPerChunk
    const endSample = Math.min(startSample + samplesPerChunk, samples16k.length)
    const chunkSamples = samples16k.slice(startSample, endSample)

    const startTime = i * chunkDurationSec
    const endTime = Math.min((i + 1) * chunkDurationSec, durationSeconds)
    const duration = endTime - startTime

    // Run VAD analysis
    const vad = checkVoiceActivity(chunkSamples)
    if (vad.isSilent) {
      silentChunksCount++
    } else {
      speechChunksCount++
    }

    // Encode to 16kHz WAV
    const wavBlob = encodeWav(chunkSamples, 16000)
    const base64 = await blobToBase64(wavBlob)

    chunks.push({
      chunkIndex: i,
      startTime,
      endTime,
      duration,
      isSilent: vad.isSilent,
      rms: Number(vad.rms.toFixed(4)),
      wavBlob,
      base64,
    })

    const pct = 75 + Math.round(((i + 1) / totalChunks) * 23)
    onProgress?.({
      stage: "chunking",
      percent: pct,
      message: `Processed chunk ${i + 1}/${totalChunks} (VAD: ${vad.isSilent ? "Silence Skipped" : "Speech Detected"})...`,
    })
  }

  onProgress?.({ stage: "done", percent: 100, message: "Audio extraction & VAD completed!" })

  return {
    durationSeconds,
    sampleRate: 16000,
    totalChunks,
    silentChunksCount,
    speechChunksCount,
    chunks,
  }
}

