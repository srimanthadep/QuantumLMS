import { useState, useRef, useEffect } from "react"
import {
  Upload,
  Video,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Languages,
  Loader2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { extractAndChunkAudio, type AudioChunk, type ExtractionResult } from "@/lib/audioExtractor"
import { api } from "@/lib/api"
import { accessToken } from "@/lib/auth"
import type { AdminCourse } from "@/data/adminStore"

interface VideoCourseUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCourseCreated?: (course: AdminCourse) => void
  onToast: (msg: string) => void
  initialCourseId?: string
  initialModuleId?: string
  existingCourses?: AdminCourse[]
  onSuccess?: () => void
}

type ModelChoice = "parakeet" | "whisper-multilingual"

interface TranscriptChunkResult {
  chunkIndex: number
  startTime: number
  endTime: number
  timestampLabel: string
  text: string
  confidence: number
  isSilent: boolean
  skipped: boolean
  modelUsed: string
  status: "pending" | "processing" | "done" | "skipped"
}

export default function VideoCourseUploadModal({
  open,
  onOpenChange,
  onCourseCreated,
  onToast,
  initialCourseId,
  initialModuleId,
  existingCourses,
  onSuccess,
}: VideoCourseUploadModalProps) {
  // Step state: 1 = Form & Model selection, 2 = Live Pipeline, 3 = Completed
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Target Mode & Course Selection
  const [uploadMode, setUploadMode] = useState<"new" | "existing">(
    initialCourseId ? "existing" : "new"
  )
  const [targetCourseId, setTargetCourseId] = useState<string>(initialCourseId || "")
  const [targetModuleId, setTargetModuleId] = useState<string>(initialModuleId || "")
  const [newChapterTitle, setNewChapterTitle] = useState("")

  // Course metadata
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("LLM Engineering")
  const [instructor, setInstructor] = useState("Srimanth (AI Systems Lead)")
  const [level, setLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate")
  const [language, setLanguage] = useState<"en" | "te" | "hi" | "multi">("en")
  const [modelChoice, setModelChoice] = useState<ModelChoice>("parakeet")

  useEffect(() => {
    if (initialCourseId) {
      setTargetCourseId(initialCourseId)
      setUploadMode("existing")
    }
    if (initialModuleId) {
      setTargetModuleId(initialModuleId)
    }
  }, [initialCourseId, initialModuleId, open])

  useEffect(() => {
    if (uploadMode === "existing" && targetCourseId && existingCourses) {
      const selected = existingCourses.find((c) => c.id === targetCourseId)
      if (selected) {
        setCategory(selected.category)
        setInstructor(selected.instructor)
      }
    }
  }, [uploadMode, targetCourseId, existingCourses])

  // Selected file
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live Pipeline Progress States
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoUploadPct, setVideoUploadPct] = useState(0)
  const [videoUploadStatus, setVideoUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [audioExtractPct, setAudioExtractPct] = useState(0)
  const [audioExtractMessage, setAudioExtractMessage] = useState("")
  const [audioExtractStatus, setAudioExtractStatus] = useState<"idle" | "extracting" | "done">("idle")

  // Chunks & Transcripts
  const [chunks, setChunks] = useState<TranscriptChunkResult[]>([])
  const [activeChunkIndex, setActiveChunkIndex] = useState<number>(-1)
  const [fullTranscript, setFullTranscript] = useState("")
  const [silenceCount, setSilenceCount] = useState(0)
  const [speechCount, setSpeechCount] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)

  // Multi-Quality Processing States (YouTube 1080p, 720p, 480p, 144p)
  const [transcodeStatus, setTranscodeStatus] = useState<"idle" | "processing" | "done" | "skipped">("idle")
  const [transcodeMessage, setTranscodeMessage] = useState("")
  const [processedQualities, setProcessedQualities] = useState<Record<string, { label: string; height: number; url: string; size: number }>>({})

  // Finalized Course Info
  const [createdCourse, setCreatedCourse] = useState<AdminCourse | null>(null)
  const [r2Key, setR2Key] = useState("")

  // Auto-select recommended model when language changes
  useEffect(() => {
    if (language === "en") {
      setModelChoice("parakeet")
    } else {
      setModelChoice("whisper-multilingual")
    }
  }, [language])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      if (!title) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1))
      }
    }
  }

  const resetAll = () => {
    setStep(1)
    setTitle("")
    setFile(null)
    setIsProcessing(false)
    setVideoUploadPct(0)
    setVideoUploadStatus("idle")
    setAudioExtractPct(0)
    setAudioExtractMessage("")
    setAudioExtractStatus("idle")
    setChunks([])
    setActiveChunkIndex(-1)
    setFullTranscript("")
    setSilenceCount(0)
    setSpeechCount(0)
    setTranscodeStatus("idle")
    setTranscodeMessage("")
    setProcessedQualities({})
    setCreatedCourse(null)
    setR2Key("")
  }

  // Upload Video directly to Cloudflare R2 bucket quantumlms via backend streaming (bypasses browser CORS)
  const uploadVideoToR2 = async (fileToUpload: File, courseId: string): Promise<string> => {
    setVideoUploadStatus("uploading")
    setVideoUploadPct(5)

    const key = `videos/${courseId}/video/${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    setR2Key(key)

    const token = await accessToken().catch(() => null)

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const uploadUrl = `/api/admin/courses/video-upload?courseId=${encodeURIComponent(courseId)}&key=${encodeURIComponent(key)}&filename=${encodeURIComponent(fileToUpload.name)}`
      xhr.open("POST", uploadUrl, true)
      xhr.setRequestHeader("Content-Type", fileToUpload.type || "video/mp4")
      xhr.setRequestHeader("x-filename", fileToUpload.name)
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100)
          setVideoUploadPct(pct)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setVideoUploadPct(100)
          setVideoUploadStatus("done")
          resolve()
        } else {
          setVideoUploadStatus("error")
          reject(new Error(`Video upload failed with HTTP ${xhr.status}`))
        }
      }

      xhr.onerror = () => {
        setVideoUploadStatus("error")
        reject(new Error("Network error during video upload"))
      }

      xhr.send(fileToUpload)
    })

    return key
  }

  // Main Pipeline Execution: Video Upload + In-Browser Audio Extraction + VAD + Streamed Transcription
  const startPipeline = async () => {
    if (!file || !title.trim()) return
    if (uploadMode === "existing" && !targetCourseId) {
      onToast("Please select a target course to upload into")
      return
    }
    setIsProcessing(true)
    setStep(2)

    const isExisting = uploadMode === "existing" && !!targetCourseId
    const courseId = isExisting ? targetCourseId : `c-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`

    try {
      // 1. Start Video Upload to Cloudflare R2 in parallel
      const uploadPromise = uploadVideoToR2(file, courseId)

      // 2. Extract Audio in the browser via Web Audio API & VAD Chunker
      setAudioExtractStatus("extracting")
      const extraction: ExtractionResult = await extractAndChunkAudio(file, {
        chunkDurationSec: 30,
        onProgress: (prog) => {
          setAudioExtractPct(prog.percent)
          setAudioExtractMessage(prog.message)
        },
      })

      setAudioExtractStatus("done")
      setTotalDuration(extraction.durationSeconds)
      setSilenceCount(extraction.silentChunksCount)
      setSpeechCount(extraction.speechChunksCount)

      // Initialize chunk state grid
      const initialChunkStates: TranscriptChunkResult[] = extraction.chunks.map((c) => ({
        chunkIndex: c.chunkIndex,
        startTime: c.startTime,
        endTime: c.endTime,
        timestampLabel: `[${Math.floor(c.startTime / 60)}:${Math.floor(c.startTime % 60).toString().padStart(2, "0")} - ${Math.floor(c.endTime / 60)}:${Math.floor(c.endTime % 60).toString().padStart(2, "0")}]`,
        text: c.isSilent ? "[Silence skipped by VAD]" : "",
        confidence: 1.0,
        isSilent: c.isSilent,
        skipped: c.isSilent,
        modelUsed: modelChoice === "parakeet" ? "NVIDIA Parakeet-TDT" : "Faster-Whisper int8",
        status: c.isSilent ? "skipped" : "pending",
      }))
      setChunks(initialChunkStates)

      // 3. Process each chunk sequentially / in parallel chunks and transcribe
      let assembledTranscript = ""
      for (let i = 0; i < extraction.chunks.length; i++) {
        const chunk = extraction.chunks[i]
        setActiveChunkIndex(i)

        if (chunk.isSilent) {
          // Skip ASR call, save compute
          assembledTranscript += `${initialChunkStates[i].timestampLabel} (Silence skipped)\n\n`
          setFullTranscript(assembledTranscript)
          continue
        }

        // Mark as processing
        setChunks((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item))
        )

        // Call backend audio chunk transcription endpoint
        const res = await api.post<{
          chunkIndex: number
          startTime: number
          endTime: number
          timestampLabel: string
          text: string
          confidence: number
          isSilent: boolean
          modelUsed: string
          segments?: { start: number; end: number; text: string }[]
        }>("/admin/courses/audio-chunk", {
          courseId,
          chunkIndex: chunk.chunkIndex,
          totalChunks: extraction.totalChunks,
          startTime: chunk.startTime,
          endTime: chunk.endTime,
          isSilent: false,
          audioData: chunk.base64,
          modelChoice,
          language,
          title,
        })

        const chunkText = res.text || ""
        if (res.segments && res.segments.length > 0) {
          for (const s of res.segments) {
            const absStart = chunk.startTime + s.start
            const absEnd = chunk.startTime + s.end
            const sm = Math.floor(absStart / 60)
            const ss = (absStart % 60).toFixed(1).padStart(4, "0")
            const em = Math.floor(absEnd / 60)
            const es = (absEnd % 60).toFixed(1).padStart(4, "0")
            assembledTranscript += `[${sm}:${ss} - ${em}:${es}] ${s.text}\n`
          }
          assembledTranscript += "\n"
        } else {
          assembledTranscript += `${res.timestampLabel} ${chunkText}\n\n`
        }
        setFullTranscript(assembledTranscript)

        setChunks((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  text: chunkText,
                  confidence: res.confidence,
                  status: "done",
                }
              : item
          )
        )
      }

      // 4. Await video upload to finish if still uploading
      const videoKey = await uploadPromise

      // 5. Trigger Multi-Quality Video Processing (1080p, 720p, 480p, 144p)
      setTranscodeStatus("processing")
      setTranscodeMessage("Encoding 1080p, 720p, 480p & 144p qualities via FFmpeg...")
      let qualitiesMap: Record<string, any> = {}
      try {
        const transRes = await api.post<{
          ok: boolean
          courseId: string
          qualities: Record<string, { label: string; height: number; url: string; size: number }>
        }>("/admin/courses/video-transcode", {
          courseId,
          videoKey,
        })
        qualitiesMap = transRes.qualities || {}
        setProcessedQualities(qualitiesMap)
        setTranscodeStatus("done")
        setTranscodeMessage("All 4 qualities (1080p, 720p, 480p, 144p) processed and uploaded to R2!")
      } catch (transErr: any) {
        console.warn("Quality transcode notice:", transErr)
        setTranscodeStatus("skipped")
        setTranscodeMessage("Qualities generated or deferred to background.")
      }

      // 6. Finalize Course with Cloudflare R2 Key + Multi-Quality URLs + Full Neural Transcript
      const effectiveTitle = newChapterTitle.trim() ? `${newChapterTitle.trim()} - ${title.trim()}` : title.trim()
      const finalized = await api.post<{
        ok: boolean
        course: any
        videoStreamUrl: string
      }>("/admin/courses/video-finalize", {
        courseId,
        moduleId: targetModuleId || undefined,
        title: effectiveTitle,
        category,
        instructor,
        level,
        videoKey,
        qualities: qualitiesMap,
        modelUsed: modelChoice === "parakeet" ? "NVIDIA Parakeet-TDT-0.6B" : "Faster-Whisper int8",
        chunks: extraction.chunks.map((c, idx) => ({
          chunkIndex: c.chunkIndex,
          startTime: c.startTime,
          endTime: c.endTime,
          text: initialChunkStates[idx]?.text || "",
          isSilent: c.isSilent,
        })),
        fullTranscript: assembledTranscript,
        totalDurationSeconds: extraction.durationSeconds,
      })

      if (isExisting) {
        const found = existingCourses?.find((c) => c.id === courseId)
        const updatedCourse: AdminCourse = found
          ? { ...found, updatedAt: new Date().toISOString().split("T")[0] }
          : {
              id: courseId,
              title: effectiveTitle,
              slug: effectiveTitle.toLowerCase().replace(/[^a-z0-9]/g, "-"),
              category,
              instructor,
              instructorAvatar: "/assets/student-1.png",
              capacity: 100,
              price: 9999,
              status: "Published",
              enrolledStudents: 0,
              revenue: 0,
              rating: 5.0,
              completionRate: 0,
              cohortCount: 1,
              updatedAt: new Date().toISOString().split("T")[0],
              videoUrl: finalized.videoStreamUrl,
              videoKey,
            }
        setCreatedCourse(updatedCourse)
        onCourseCreated?.(updatedCourse)
        onToast(`Added video lecture to course "${found?.title || courseId}" successfully!`)
      } else {
        const newAdminCourse: AdminCourse = {
          id: courseId,
          title,
          slug: title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          category,
          instructor,
          instructorAvatar: "/assets/student-1.png",
          capacity: 100,
          price: 9999,
          status: "Published",
          enrolledStudents: 0,
          revenue: 0,
          rating: 5.0,
          completionRate: 0,
          cohortCount: 1,
          updatedAt: new Date().toISOString().split("T")[0],
          videoUrl: finalized.videoStreamUrl,
          videoKey,
        }
        setCreatedCourse(newAdminCourse)
        onCourseCreated?.(newAdminCourse)
        onToast(`Successfully uploaded "${title}" to Cloudflare R2 with neural transcripts!`)
      }
      onSuccess?.()
      setStep(3)
    } catch (err: any) {
      console.error(err)
      onToast(`Error during pipeline: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !isProcessing && onOpenChange(v)}>
      <DialogContent className="max-w-3xl h-[90vh] max-h-[850px] flex flex-col p-0 overflow-hidden border border-border bg-surface text-foreground shadow-2xl gap-0">
        {/* Header */}
        <div className="shrink-0 border-b border-border bg-surface-2 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Video className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Upload Video Course & Real-Time Audio Extraction
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Cloudflare R2 Storage (`videos/`) · In-Browser 16kHz Audio Extraction · Silero VAD Silence Skipping
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary-soft">
              Cloudflare R2 Active
            </Badge>
          </div>

          {/* Stepper Dots */}
          <div className="mt-5 flex items-center gap-2">
            {[
              { num: 1, label: "Course & Model Setup" },
              { num: 2, label: "Live Extraction & Upload" },
              { num: 3, label: "Ready & Segregated" },
            ].map((s) => (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num === 2 && file && title.trim() && step === 1) {
                    startPipeline()
                  }
                }}
                className={`flex items-center gap-2 flex-1 ${s.num === 2 && file && title.trim() && step === 1 ? "cursor-pointer" : ""}`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    step === s.num
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : step > s.num
                      ? "bg-success text-white"
                      : "bg-surface-3 text-muted-foreground border border-border"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                </div>
                <span className={`text-xs font-medium ${step === s.num ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {s.num < 3 && <div className="h-px flex-1 bg-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
          {/* STEP 1: FORM & MODEL SELECTION */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Video File Dropzone */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  1. Video Course File (MP4, WebM, MOV, MKV)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                    file
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-surface-2"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                    className="hidden"
                  />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                        <Video className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(file.size / (1024 * 1024)).toFixed(1)} MB · Ready for Cloudflare R2 & browser audio extraction
                      </p>
                      <Button size="sm" variant="outline" className="mt-3 text-xs h-7">
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground mb-2">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">Click or Drag & Drop Video File</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Audio will be extracted directly in your browser without uploading heavy raw video first!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Course Mode Selector (New Course vs Add to Existing Course) */}
              {existingCourses && existingCourses.length > 0 && (
                <div className="space-y-3 p-3.5 rounded-xl border border-border bg-surface-2/60">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadMode("new")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                        uploadMode === "new"
                          ? "bg-surface text-primary shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Create Brand-New Course
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("existing")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                        uploadMode === "existing"
                          ? "bg-surface text-primary shadow-xs border border-border"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Add Chapter / Video to Existing Course
                    </button>
                  </div>

                  {uploadMode === "existing" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border/60">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">Target Course *</label>
                        <select
                          value={targetCourseId}
                          onChange={(e) => setTargetCourseId(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">-- Choose Existing Course --</option>
                          {existingCourses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title} ({c.category})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground">
                          New Chapter Name (Optional)
                        </label>
                        <Input
                          placeholder="e.g. Chapter 2: Deep Dive into Attention"
                          value={newChapterTitle}
                          onChange={(e) => setNewChapterTitle(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Course Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {uploadMode === "existing" ? "Lecture / Video Title *" : "Course Title *"}
                  </label>
                  <Input
                    placeholder={
                      uploadMode === "existing"
                        ? "e.g. Scaled Dot-Product Attention Implementation"
                        : "e.g. Masterclass in Autonomous Agents"
                    }
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="LLM Engineering">LLM Engineering</option>
                    <option value="Agentic Systems">Agentic Systems</option>
                    <option value="Computer Vision">Computer Vision</option>
                    <option value="MLOps">MLOps</option>
                    <option value="AI Foundations">AI Foundations</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Lead Instructor</label>
                  <Input
                    placeholder="Instructor Name"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Language</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as any)}
                      className="w-full h-9 rounded-md border border-input bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="en">English (US / UK / Global)</option>
                      <option value="te">Telugu (తెలుగు)</option>
                      <option value="hi">Hindi (हिन्दी)</option>
                      <option value="multi">Multilingual Mixed / Code-switching</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Hardware & Fast Model Selector */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                  2. GPU-Optimized Speech Model Selection
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Model 1: NVIDIA Parakeet */}
                  <div
                    onClick={() => setModelChoice("parakeet")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative ${
                      modelChoice === "parakeet"
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border bg-surface-2 hover:bg-surface-3"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-warning" />
                        <h4 className="text-xs font-bold text-foreground">NVIDIA Parakeet-TDT 0.6B</h4>
                      </div>
                      {modelChoice === "parakeet" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      <strong>English Only</strong>. 50x+ real-time speed on GPU. Fits easily in 4 GB VRAM via NeMo or ONNX. Ideal for lightning fast course uploads.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
                        ⚡ 50x Realtime
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        4 GB VRAM
                      </Badge>
                    </div>
                  </div>

                  {/* Model 2: Faster-Whisper int8 */}
                  <div
                    onClick={() => setModelChoice("whisper-multilingual")}
                    className={`cursor-pointer rounded-xl border p-4 transition-all relative ${
                      modelChoice === "whisper-multilingual"
                        ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                        : "border-border bg-surface-2 hover:bg-surface-3"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-secondary" />
                        <h4 className="text-xs font-bold text-foreground">Faster-Whisper int8</h4>
                      </div>
                      {modelChoice === "whisper-multilingual" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                      <strong>Telugu / Hindi / Multilingual</strong>. Distil-Whisper & int8 quantized Whisper small/medium for multi-language lectures.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-secondary/10 text-secondary border-secondary/20">
                        🌐 Telugu & Indic
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        int8 Quantized
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Quick Action Bar */}
              <div className="rounded-xl border border-border/80 bg-surface-2 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="text-xs">
                  {!file ? (
                    <span className="text-warning font-medium flex items-center gap-1.5">
                      ⚠️ Please select a video file above to proceed.
                    </span>
                  ) : !title.trim() ? (
                    <span className="text-warning font-medium flex items-center gap-1.5">
                      ⚠️ Please enter a {uploadMode === "existing" ? "lesson/lecture" : "course"} title above to proceed.
                    </span>
                  ) : uploadMode === "existing" && !targetCourseId ? (
                    <span className="text-warning font-medium flex items-center gap-1.5">
                      ⚠️ Please select a target course to add this video chapter into.
                    </span>
                  ) : (
                    <span className="text-success font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Ready to upload & extract audio with {modelChoice === "parakeet" ? "NVIDIA Parakeet-TDT 0.6B" : "Faster-Whisper int8"}.
                    </span>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="default"
                  disabled={!file || !title.trim() || (uploadMode === "existing" && !targetCourseId)}
                  onClick={startPipeline}
                  leftIcon={<Upload className="h-4 w-4" />}
                  className="w-full sm:w-auto font-semibold shadow-sm"
                >
                  Proceed to Extraction & Upload →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: LIVE EXTRACTION, VAD, AND PARALLEL UPLOAD */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Dual Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Cloudflare R2 Video Upload */}
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Video className="h-4 w-4 text-primary" />
                      Cloudflare R2 Video Upload
                    </span>
                    <span className="font-mono text-primary">{videoUploadPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${videoUploadPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 flex items-center justify-between">
                    <span>Target: `quantumlms/videos/`</span>
                    <span>{videoUploadStatus === "done" ? "Uploaded ✓" : "Streaming..."}</span>
                  </p>
                </div>

                {/* 2. Web Audio Extraction & VAD */}
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold mb-2">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <FileAudio className="h-4 w-4 text-secondary" />
                      16kHz Audio & VAD Extraction
                    </span>
                    <span className="font-mono text-secondary">{audioExtractPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full bg-secondary transition-all duration-300 rounded-full"
                      style={{ width: `${audioExtractPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 truncate">
                    {audioExtractMessage || "Preparing Web Audio decoder..."}
                  </p>
                </div>
              </div>

              {/* 3. Multi-Quality Video Transcoding (YouTube 1080p, 720p, 480p, 144p) */}
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5 text-foreground">
                    <Video className="h-4 w-4 text-primary" />
                    YouTube Multi-Quality Ladder Processing
                  </span>
                  <span className="font-mono text-primary text-[11px]">
                    {transcodeStatus === "done"
                      ? "4/4 Qualities Ready ✓"
                      : transcodeStatus === "processing"
                      ? "Encoding 1080p · 720p · 480p · 144p..."
                      : "Waiting for upload"}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {[
                    { key: "1080p", label: "1080p Full HD" },
                    { key: "720p", label: "720p HD" },
                    { key: "480p", label: "480p SD" },
                    { key: "144p", label: "144p Data Saver" },
                  ].map((q) => {
                    const isDone = transcodeStatus === "done" || Boolean(processedQualities[q.key])
                    const isProc = transcodeStatus === "processing"
                    return (
                      <div
                        key={q.key}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs ${
                          isDone
                            ? "border-success/30 bg-success/10 text-success"
                            : isProc
                            ? "border-primary/40 bg-primary/10 text-primary animate-pulse"
                            : "border-border bg-surface-3 text-muted-foreground"
                        }`}
                      >
                        <span className="font-semibold">{q.label}</span>
                        {isDone ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : isProc ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Queued</span>
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {transcodeMessage || "FFmpeg multi-stream transcode with faststart byte-range seeking."}
                </p>
              </div>

              {/* VAD & Stats Bar */}
              <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center">
                <div>
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Duration</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{formatSec(totalDuration)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-success flex items-center justify-center gap-1">
                    <Volume2 className="h-3 w-3" /> Active Speech
                  </p>
                  <p className="text-sm font-bold text-success mt-0.5">{speechCount} chunks</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-warning flex items-center justify-center gap-1">
                    <VolumeX className="h-3 w-3" /> VAD Silence Skipped
                  </p>
                  <p className="text-sm font-bold text-warning mt-0.5">{silenceCount} chunks</p>
                </div>
              </div>

              {/* 30-Second Chunk Timeline Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-foreground">
                    30s Audio Chunks Processing Pipeline ({chunks.length} chunks)
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Model: {modelChoice === "parakeet" ? "NVIDIA Parakeet TDT" : "Faster-Whisper"}
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1 rounded-lg border border-border bg-surface-3">
                  {chunks.map((c) => (
                    <div
                      key={c.chunkIndex}
                      className={`flex flex-col items-center justify-center p-2 rounded-md text-[10px] font-mono border transition-all ${
                        activeChunkIndex === c.chunkIndex
                          ? "ring-2 ring-primary border-primary bg-primary/20 text-primary font-bold animate-pulse"
                          : c.status === "done"
                          ? "border-success/30 bg-success/10 text-success"
                          : c.status === "skipped"
                          ? "border-border bg-surface-2 text-muted-foreground opacity-60"
                          : "border-border bg-surface-2 text-muted-foreground"
                      }`}
                      title={`${c.timestampLabel}: ${c.status}`}
                    >
                      <span>#{c.chunkIndex + 1}</span>
                      <span className="text-[9px] mt-0.5">
                        {c.status === "skipped" ? "Silent" : c.status === "done" ? "Done ✓" : "Queue"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-Time Live Transcript Stream */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-2">
                  Streaming Neural Transcript
                </label>
                <div className="rounded-xl border border-border bg-ink-950 p-4 font-mono text-xs text-white/90 max-h-48 overflow-y-auto space-y-2 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {fullTranscript || (
                    <span className="text-white/40 italic">
                      Transcribing audio chunks as they arrive from the browser...
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: COMPLETED */}
          {step === 3 && createdCourse && (
            <div className="text-center py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success border border-success/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Course Successfully Created!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Video uploaded to Cloudflare R2 bucket <strong>quantumlms</strong>, audio extracted in 16kHz mono, and neural transcript generated.
                </p>
              </div>

              {/* Course Card Preview */}
              <div className="max-w-md mx-auto text-left rounded-xl border border-border bg-surface-2 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary text-white">{createdCourse.category}</Badge>
                  <span className="text-xs text-muted-foreground">Status: {createdCourse.status}</span>
                </div>
                <h4 className="text-sm font-bold text-foreground">{createdCourse.title}</h4>
                <p className="text-xs text-muted-foreground">Instructor: {createdCourse.instructor}</p>
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">R2 Key: {r2Key}</span>
                  <span className="font-semibold text-success">{formatSec(totalDuration)} Lecture</span>
                </div>
                {Object.keys(processedQualities).length > 0 && (
                  <div className="pt-2 border-t border-border flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] text-muted-foreground mr-1">Qualities:</span>
                    {Object.keys(processedQualities).map((q) => (
                      <Badge key={q} variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/5">
                        {q}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 max-w-md mx-auto text-xs text-primary text-left flex items-start gap-2">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Lesson Segregation Ready:</strong> Your video and transcript are now ready for automated chaptering and lesson breakdown in the next step.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Always Sticky at Bottom */}
        <div className="shrink-0 border-t border-border bg-surface-2 p-4 flex items-center justify-between z-10">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="default"
                disabled={!file || !title.trim() || (uploadMode === "existing" && !targetCourseId)}
                onClick={startPipeline}
                leftIcon={<Upload className="h-4 w-4" />}
                className="font-semibold"
              >
                Upload to R2 & Extract Audio →
              </Button>
            </>
          )}

          {step === 2 && (
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary animate-ping" />
                Processing audio chunks & R2 upload...
              </span>
              <Button variant="outline" size="sm" disabled>
                Processing...
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="w-full flex items-center justify-end gap-2">
              <Button variant="outline" onClick={resetAll}>
                Upload Another Video
              </Button>
              <Button variant="primary" onClick={() => onOpenChange(false)}>
                Done & View Courses
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
