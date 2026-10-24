import { useState, useMemo, useRef, useEffect } from "react"
import type {
  SessionRecordingItem,
  TeachingSuggestionItem,
  RecordingStatus,
  WhisperTranscriptEntry,
  RecordingChapterItem,
  CorrectionSubmissionItem,
  RecordingReviewDataset,
} from "../types"
import { Icon } from "./Icon"
import {
  initialRecordingReviews,
  initialCorrectionSubmissions,
} from "../data/mockData"

interface RecordingsSuggestionsSectionProps {
  recordings: SessionRecordingItem[]
  suggestions?: TeachingSuggestionItem[]
  initialSelectedId?: string
  onToast?: (msg: string) => void
  onSelectSession?: (sessionId: string) => void
}

export default function RecordingsSuggestionsSection({
  recordings,
  suggestions = [],
  initialSelectedId,
  onToast,
  onSelectSession,
}: RecordingsSuggestionsSectionProps) {
  // 1. Selected Recording State
  const [selectedRecId, setSelectedRecId] = useState<string>(() => {
    if (initialSelectedId) {
      // Find if initialSelectedId matches a recording ID or session ID
      const byId = recordings.find((r) => r.id === initialSelectedId)
      if (byId) return byId.id
      const bySession = recordings.find((r) => r.sessionId === initialSelectedId)
      if (bySession) return bySession.id
    }
    return recordings[0]?.id || "rec-1"
  })

  // Synchronize when initialSelectedId prop changes (e.g. after ending studio)
  useEffect(() => {
    if (initialSelectedId) {
      const match =
        recordings.find((r) => r.id === initialSelectedId) ||
        recordings.find((r) => r.sessionId === initialSelectedId)
      if (match) {
        setSelectedRecId(match.id)
      }
    }
  }, [initialSelectedId, recordings])

  const currentRecording = useMemo(() => {
    return recordings.find((r) => r.id === selectedRecId) || recordings[0]
  }, [recordings, selectedRecId])

  // 2. Active Review Dataset for Selected Recording
  const reviewDataset: RecordingReviewDataset = useMemo(() => {
    if (currentRecording && initialRecordingReviews[currentRecording.id]) {
      return initialRecordingReviews[currentRecording.id]
    }
    // Fallback if this is a newly completed live session
    return {
      recordingId: currentRecording?.id || "rec-new",
      sessionId: currentRecording?.sessionId || "ls-new",
      title: currentRecording?.title || "Completed Live Class Session",
      courseName: currentRecording?.courseName || "Quantum School of AI",
      courseCode: currentRecording?.courseCode || "QAI-LIVE",
      sessionDate: currentRecording?.sessionDate || "Today",
      duration: currentRecording?.duration || "90 mins",
      status: currentRecording?.status || "Processing",
      videoUrl: currentRecording?.recordingUrl,
      executiveSummary: {
        text: `Lecture recording and automated speech transcription for "${currentRecording?.title || "this session"}" are currently compiling. Transcripts, chapter segment markers, and AI executive summaries will automatically populate once media transcoding is verified.`,
        status: "AI-Generated · Demo Data",
        lastUpdated: "Processing now",
      },
      whisperTranscripts: [],
      chapters: [],
    }
  }, [currentRecording])

  // 3. Submissions State with LocalStorage Persistence
  const [submissions, setSubmissions] = useState<CorrectionSubmissionItem[]>(() => {
    try {
      const saved = localStorage.getItem("quantum_teacher_correction_submissions_v1")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return initialCorrectionSubmissions
  })

  const saveSubmissions = (next: CorrectionSubmissionItem[]) => {
    setSubmissions(next)
    try {
      localStorage.setItem("quantum_teacher_correction_submissions_v1", JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  // Filter submissions relevant to current recording
  const currentSubmissions = useMemo(() => {
    return submissions.filter((s) => s.recordingId === reviewDataset.recordingId)
  }, [submissions, reviewDataset.recordingId])

  // 4. Video Player State & Controls
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [transcriptSearch, setTranscriptSearch] = useState("")
  const [showPedagogicalSuggestions, setShowPedagogicalSuggestions] = useState(false)

  // Modals state
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [summaryProposedText, setSummaryProposedText] = useState("")
  const [summaryReason, setSummaryReason] = useState("")

  const [activeTranscriptCorrection, setActiveTranscriptCorrection] =
    useState<WhisperTranscriptEntry | null>(null)
  const [transcriptProposedText, setTranscriptProposedText] = useState("")
  const [transcriptReason, setTranscriptReason] = useState("")

  const [showProposeMarkerModal, setShowProposeMarkerModal] = useState(false)
  const [proposedMarkerTime, setProposedMarkerTime] = useState("00:15:00")
  const [proposedMarkerTitle, setProposedMarkerTitle] = useState("")
  const [proposedMarkerDesc, setProposedMarkerDesc] = useState("")

  const [editingChapter, setEditingChapter] = useState<RecordingChapterItem | null>(null)
  const [chapterProposedTitle, setChapterProposedTitle] = useState("")
  const [chapterProposedTime, setChapterProposedTime] = useState("")
  const [chapterProposedDesc, setChapterProposedDesc] = useState("")

  // Play / Pause toggle
  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => { })
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  // Handle video seek slider
  const handleSeekSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setCurrentTime(val)
    if (videoRef.current) {
      videoRef.current.currentTime = val
    }
  }

  // Jump to specific seconds in video
  const jumpToSeconds = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
      setCurrentTime(seconds)
      videoRef.current.play().catch(() => { })
      setIsPlaying(true)
      onToast?.(`Seeked player to ${formatSeconds(seconds)}`)
    } else {
      onToast?.(`Seeked timestamp to ${formatSeconds(seconds)} (Playback placeholder)`)
    }
  }

  // Change playback rate
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed)
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
    }
    onToast?.(`Playback speed set to ${speed}x`)
  }

  // Fullscreen
  const handleToggleFullscreen = () => {
    if (!videoRef.current) return
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen()
    }
  }

  // Format seconds to mm:ss or hh:mm:ss
  const formatSeconds = (totalSec: number) => {
    if (isNaN(totalSec) || totalSec < 0) return "00:00"
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = Math.floor(totalSec % 60)
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Identify currently active chapter based on currentTime
  const currentActiveChapter = useMemo(() => {
    if (!reviewDataset.chapters || reviewDataset.chapters.length === 0) return null
    const sorted = [...reviewDataset.chapters].sort((a, b) => a.seconds - b.seconds)
    let match = sorted[0]
    for (const ch of sorted) {
      if (currentTime >= ch.seconds) {
        match = ch
      } else {
        break
      }
    }
    return match
  }, [reviewDataset.chapters, currentTime])

  // Filtered transcripts
  const filteredTranscripts = useMemo(() => {
    if (!transcriptSearch.trim()) return reviewDataset.whisperTranscripts
    const q = transcriptSearch.toLowerCase()
    return reviewDataset.whisperTranscripts.filter(
      (t) => t.text.toLowerCase().includes(q) || t.speaker.toLowerCase().includes(q)
    )
  }, [reviewDataset.whisperTranscripts, transcriptSearch])

  // Recording selector change handler
  const handleSelectRecording = (recId: string) => {
    setSelectedRecId(recId)
    setIsPlaying(false)
    setCurrentTime(0)
    const chosen = recordings.find((r) => r.id === recId)
    if (chosen) {
      onSelectSession?.(chosen.sessionId)
      try {
        window.history.pushState(null, "", `/teacher/live-class/review/${chosen.sessionId || chosen.id}`)
      } catch {
        // ignore
      }
      onToast?.(`Loaded recording review: "${chosen.title}"`)
    }
  }

  // 5. Submit Summary Correction
  const handleSubmitSummaryCorrection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!summaryProposedText.trim()) return

    const now = new Date()
    const submission: CorrectionSubmissionItem = {
      id: `sub-${Date.now()}`,
      recordingId: reviewDataset.recordingId,
      type: "Summary",
      timestamp: "Executive Summary",
      originalContent: reviewDataset.executiveSummary.text,
      proposedChange: summaryProposedText.trim(),
      reason: summaryReason.trim() || undefined,
      submittedDate: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Pending Review",
    }

    saveSubmissions([submission, ...submissions])
    setShowSummaryModal(false)
    setSummaryProposedText("")
    setSummaryReason("")
    onToast?.("Executive Summary edit submitted for review.")
  }

  // 6. Submit Transcript Correction
  const handleSubmitTranscriptCorrection = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeTranscriptCorrection || !transcriptProposedText.trim()) return

    const now = new Date()
    const submission: CorrectionSubmissionItem = {
      id: `sub-${Date.now()}`,
      recordingId: reviewDataset.recordingId,
      type: "Transcript",
      targetId: activeTranscriptCorrection.id,
      timestamp: activeTranscriptCorrection.timestamp,
      originalContent: activeTranscriptCorrection.text,
      proposedChange: transcriptProposedText.trim(),
      reason: transcriptReason.trim() || undefined,
      submittedDate: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Pending Review",
    }

    saveSubmissions([submission, ...submissions])
    setActiveTranscriptCorrection(null)
    setTranscriptProposedText("")
    setTranscriptReason("")
    onToast?.(`Transcript correction for [${activeTranscriptCorrection.timestamp}] submitted.`)
  }

  // 7. Submit Proposed Chapter Marker
  const handleSubmitProposeMarker = (e: React.FormEvent) => {
    e.preventDefault()
    if (!proposedMarkerTitle.trim()) return

    const now = new Date()
    const submission: CorrectionSubmissionItem = {
      id: `sub-${Date.now()}`,
      recordingId: reviewDataset.recordingId,
      type: "Chapter",
      timestamp: proposedMarkerTime.trim() || "00:00",
      originalContent: "New proposed chapter marker",
      proposedChange: `${proposedMarkerTitle.trim()} — ${proposedMarkerDesc.trim()}`,
      reason: "Teacher requested new chapter timestamp division",
      submittedDate: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Pending Review",
    }

    saveSubmissions([submission, ...submissions])
    setShowProposeMarkerModal(false)
    setProposedMarkerTitle("")
    setProposedMarkerDesc("")
    onToast?.(`Chapter marker proposal [${proposedMarkerTime}] submitted.`)
  }

  // 8. Submit Chapter Change
  const handleSubmitChapterChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingChapter || !chapterProposedTitle.trim()) return

    const now = new Date()
    const submission: CorrectionSubmissionItem = {
      id: `sub-${Date.now()}`,
      recordingId: reviewDataset.recordingId,
      type: "Chapter",
      targetId: editingChapter.id,
      timestamp: chapterProposedTime.trim() || editingChapter.timestamp,
      originalContent: `${editingChapter.title} (${editingChapter.timestamp}): ${editingChapter.description}`,
      proposedChange: `${chapterProposedTitle.trim()}: ${chapterProposedDesc.trim()}`,
      reason: "Updated chapter clarity and description",
      submittedDate: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Pending Review",
    }

    saveSubmissions([submission, ...submissions])
    setEditingChapter(null)
    setChapterProposedTitle("")
    setChapterProposedDesc("")
    onToast?.(`Chapter update for "${editingChapter.title}" submitted.`)
  }

  const getStatusBadge = (status: RecordingStatus) => {
    switch (status) {
      case "Available":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Processing":
        return "bg-amber-50 text-amber-800 border-amber-200"
      case "Not Available":
        return "bg-gray-100 text-zinc-600 border-gray-200"
    }
  }

  return (
    <div className="space-y-6 text-zinc-900" aria-label="Lecture Recording & AI Intelligence Review">
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-zinc-150 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
              Lecture Recording
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${getStatusBadge(reviewDataset.status)}`}>
              {reviewDataset.status}
            </span>
            <span className="text-xs text-zinc-400">·</span>
            <span className="text-xs font-semibold text-zinc-600 font-mono">
              {reviewDataset.courseCode}: {reviewDataset.courseName}
            </span>
          </div>

          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            Lecture Recording & AI Intelligence Review
          </h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Review automated Whisper ASR transcripts, video chapter markers, and executive summaries.
          </p>
        </div>

        {/* Recording Selector & Suggest Correction Action */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex flex-col">
            <label htmlFor="recording-selector" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
              Select Recording
            </label>
            <select
              id="recording-selector"
              value={selectedRecId}
              onChange={(e) => handleSelectRecording(e.target.value)}
              className="h-9 px-3 rounded-xl border border-zinc-200 bg-zinc-50/80 hover:bg-white text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer shadow-xs max-w-xs truncate"
              aria-label="Select live lecture recording"
            >
              {recordings.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.title} ({rec.sessionDate} · {rec.status})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => {
                setSummaryProposedText(reviewDataset.executiveSummary.text)
                setShowSummaryModal(true)
              }}
              className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Suggest Correction on this lecture review"
            >
              <Icon name="edit" size={13} />
              <span>Suggest Correction</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================
            LEFT COLUMN (7 cols): Video Player, Summary, Transcripts
           ======================================================== */}
        <div className="lg:col-span-7 space-y-6">
          {/* A. Main Video Recording Player Card */}
          <div className="rounded-2xl bg-zinc-950 text-white overflow-hidden shadow-md border border-zinc-800">
            {/* Player Container */}
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {reviewDataset.status === "Available" && reviewDataset.videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={reviewDataset.videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={() => {
                      if (videoRef.current) {
                        setCurrentTime(videoRef.current.currentTime)
                      }
                    }}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setVideoDuration(videoRef.current.duration)
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={togglePlay}
                  />

                  {/* Play overlay button if paused */}
                  {!isPlaying && (
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-purple-600/90 hover:bg-purple-600 text-white flex items-center justify-center shadow-xl backdrop-blur-xs transition-transform hover:scale-105 cursor-pointer z-10"
                      aria-label="Play recording"
                    >
                      <Icon name="play" size={28} />
                    </button>
                  )}
                </>
              ) : reviewDataset.status === "Processing" ? (
                /* Polished Processing State */
                <div className="p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                    <Icon name="clock" size={26} />
                  </div>
                  <h4 className="text-base font-bold text-zinc-100">
                    Recording Transcoding in Progress
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    Automated multi-pass video rendering and Whisper ASR audio speech transcription are actively running. Estimated availability in 25–40 minutes.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                    <span>Transcoding progress: 78%</span>
                  </div>
                </div>
              ) : (
                /* Polished Unavailable State */
                <div className="p-8 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                    <Icon name="video-off" size={26} />
                  </div>
                  <h4 className="text-base font-bold text-zinc-200">
                    Recording Not Available
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    This session is scheduled for {reviewDataset.sessionDate}. Cloud replay video and AI transcription will be archived once the live broadcast concludes.
                  </p>
                </div>
              )}
            </div>

            {/* Custom Interactive Player Control Bar (when media available) */}
            {reviewDataset.status === "Available" && reviewDataset.videoUrl && (
              <div className="p-3.5 bg-zinc-900 border-t border-zinc-800 space-y-2.5">
                {/* Scrubber slider */}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-zinc-300 w-11 shrink-0">
                    {formatSeconds(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeekSlider}
                    className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    aria-label="Seek recording playback time"
                  />
                  <span className="font-mono text-[11px] text-zinc-400 w-11 shrink-0 text-right">
                    {formatSeconds(videoDuration || 5400)}
                  </span>
                </div>

                {/* Buttons row */}
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Icon name={isPlaying ? "pause" : "play"} size={13} />
                      <span>{isPlaying ? "Pause" : "Play"}</span>
                    </button>

                    {/* Speed selector */}
                    <div className="flex items-center gap-1 bg-zinc-800/80 p-0.5 rounded-lg text-[10.5px]">
                      {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleSpeedChange(spd)}
                          className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${playbackSpeed === spd
                              ? "bg-purple-600 text-white"
                              : "text-zinc-400 hover:text-white"
                            }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleFullscreen}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white cursor-pointer transition-colors"
                      title="Fullscreen"
                      aria-label="Fullscreen player"
                    >
                      <Icon name="maximize" size={14} />
                    </button>
                  </div>
                </div>

                {/* Chapter Synchronization Status Bar */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 text-zinc-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span className="font-semibold text-zinc-400">Current Chapter:</span>
                    <span className="font-bold text-white truncate">
                      {currentActiveChapter ? currentActiveChapter.title : "Introduction"}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider shrink-0">
                    Synced with Whisper ASR
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* B. Executive Lecture Summary (AI-Generated) Card */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-150 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Icon name="sparkles" size={16} />
                <h3 className="text-sm font-bold text-zinc-900">
                  Executive Lecture Summary (AI-Generated)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {reviewDataset.executiveSummary.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] text-zinc-400">
                  Updated: {reviewDataset.executiveSummary.lastUpdated}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSummaryProposedText(reviewDataset.executiveSummary.text)
                    setShowSummaryModal(true)
                  }}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Propose summary edit"
                >
                  <Icon name="edit" size={12} />
                  <span>Suggest Summary Edit</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50/70 p-3.5 rounded-xl border border-zinc-150">
              {reviewDataset.executiveSummary.text}
            </p>
          </div>

          {/* C. Whisper ASR Transcripts Card */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-150 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">
                    Whisper ASR Transcripts
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                    {reviewDataset.whisperTranscripts.length} snippets
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Chronological speech-to-text dialogue powered by Whisper ASR model. Click timestamp to jump playback.
                </p>
              </div>

              {/* Search transcript */}
              <div className="search-box !h-8 !min-w-[180px] max-w-xs">
                <Icon name="search" size={12} />
                <input
                  type="text"
                  value={transcriptSearch}
                  onChange={(e) => setTranscriptSearch(e.target.value)}
                  placeholder="Search dialogue..."
                  className="text-xs"
                  aria-label="Search Whisper transcript dialogue"
                />
                {transcriptSearch && (
                  <button
                    onClick={() => setTranscriptSearch("")}
                    className="text-xs text-zinc-400 hover:text-zinc-700 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Transcripts List */}
            {reviewDataset.whisperTranscripts.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                No automated transcript entries available for this recording session.
              </div>
            ) : filteredTranscripts.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl">
                No transcript lines match "{transcriptSearch}".
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {filteredTranscripts.map((entry) => {
                  const isInstructor = entry.speakerRole === "Instructor" || entry.speaker.includes("Prof")
                  return (
                    <div
                      key={entry.id}
                      className="p-3 rounded-xl bg-zinc-50/70 hover:bg-purple-50/30 border border-zinc-150 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => jumpToSeconds(entry.seconds)}
                            className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors cursor-pointer flex items-center gap-1"
                            title={`Jump video to ${entry.timestamp}`}
                          >
                            <Icon name="play" size={10} />
                            <span>{entry.timestamp}</span>
                          </button>

                          <span className={`text-xs font-bold ${isInstructor ? "text-purple-900" : "text-zinc-800"}`}>
                            {entry.speaker}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTranscriptCorrection(entry)
                            setTranscriptProposedText(entry.text)
                            setTranscriptReason("")
                          }}
                          className="px-2 py-0.5 rounded text-[11px] font-bold text-purple-600 hover:text-purple-800 hover:bg-purple-100/60 transition-colors cursor-pointer flex items-center gap-1"
                          title="Suggest transcript correction"
                        >
                          <Icon name="edit" size={11} />
                          <span>Suggest Correction</span>
                        </button>
                      </div>

                      <p className="text-xs text-zinc-700 leading-relaxed pl-1">
                        "{entry.text}"
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN (5 cols): Chapters & Correction Submissions
           ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* A. Lecture Chapters Panel */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-150 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">Lecture Chapters</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-200">
                  {reviewDataset.chapters.length} markers
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProposedMarkerTime(formatSeconds(currentTime))
                  setShowProposeMarkerModal(true)
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Propose a new chapter marker"
              >
                <Icon name="plus" size={12} />
                <span>Propose Marker</span>
              </button>
            </div>

            {/* Chapters list */}
            {reviewDataset.chapters.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                No chapter markers registered for this recording.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {reviewDataset.chapters.map((ch) => {
                  const isActive = currentActiveChapter?.id === ch.id
                  return (
                    <div
                      key={ch.id}
                      className={`p-3 rounded-xl border transition-all ${isActive
                          ? "bg-purple-50/60 border-purple-300 shadow-xs"
                          : "bg-zinc-50/70 hover:bg-zinc-50 border-zinc-150"
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => jumpToSeconds(ch.seconds)}
                            className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 text-purple-800 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                            title={`Jump to ${ch.timestamp}`}
                          >
                            <Icon name="play" size={10} />
                            <span>{ch.timestamp}</span>
                          </button>
                          <span className="text-xs font-bold text-zinc-900 truncate">
                            {ch.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingChapter(ch)
                            setChapterProposedTitle(ch.title)
                            setChapterProposedTime(ch.timestamp)
                            setChapterProposedDesc(ch.description)
                          }}
                          className="text-[11px] font-bold text-zinc-500 hover:text-purple-700 shrink-0 cursor-pointer p-0.5"
                          title="Suggest change to chapter"
                        >
                          Suggest Change
                        </button>
                      </div>

                      <p className="text-[11.5px] text-zinc-600 leading-relaxed pl-1">
                        {ch.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* B. My Correction Submissions Card */}
          <div className="p-5 rounded-2xl bg-white border border-zinc-150 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900">
                  My Correction Submissions
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {currentSubmissions.length} local proposals
                </span>
              </div>
            </div>

            {currentSubmissions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 space-y-1">
                <p className="font-semibold text-zinc-600">No pending correction requests for this lecture.</p>
                <p className="text-[11px]">Use the buttons above to suggest updates.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {currentSubmissions.map((sub) => {
                  const typeTone =
                    sub.type === "Transcript"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : sub.type === "Chapter"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"

                  const statusTone =
                    sub.status === "Accepted"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : sub.status === "Rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"

                  return (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-zinc-50/80 border border-zinc-150 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${typeTone}`}>
                            {sub.type}
                          </span>
                          {sub.timestamp && (
                            <span className="font-mono text-[10.5px] text-zinc-500 font-bold">
                              [{sub.timestamp}]
                            </span>
                          )}
                        </div>

                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${statusTone}`}>
                          {sub.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-[11.5px]">
                        <div className="text-zinc-500 line-through truncate">
                          <strong>Orig:</strong> "{sub.originalContent}"
                        </div>
                        <div className="text-zinc-800 font-medium">
                          <strong>Proposed:</strong> "{sub.proposedChange}"
                        </div>
                        {sub.reason && (
                          <div className="text-[10.5px] text-purple-700 italic">
                            Reason: {sub.reason}
                          </div>
                        )}
                      </div>

                      <div className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-200/60 flex items-center justify-between">
                        <span>Submitted: {sub.submittedDate}</span>
                        <span>Local Faculty Proposal</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2 text-[10.5px] text-zinc-400 border-t border-zinc-100">
              * Submissions are recorded in local faculty session review. Authoritative recordings are protected from direct mutation.
            </div>
          </div>

          {/* C. Actionable Pedagogical Teaching Suggestions Toggle */}
          {suggestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-zinc-150 shadow-xs space-y-3">
              <button
                type="button"
                onClick={() => setShowPedagogicalSuggestions(!showPedagogicalSuggestions)}
                className="w-full flex items-center justify-between text-xs font-bold text-zinc-800 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Icon name="sparkles" size={14} />
                  <span>AI Teaching Suggestions ({suggestions.length})</span>
                </div>
                <span className="text-purple-600 text-xs">
                  {showPedagogicalSuggestions ? "Hide ▲" : "View Recommendations ▼"}
                </span>
              </button>

              {showPedagogicalSuggestions && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-100 max-h-[300px] overflow-y-auto">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-100 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-purple-900 text-[11px]">
                          {sug.category}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800">
                          {sug.priority} Priority
                        </span>
                      </div>
                      <div className="font-medium text-zinc-800 text-[11px]">{sug.title}</div>
                      <p className="text-[10.5px] text-zinc-600 leading-relaxed">{sug.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          MODAL 1: SUGGEST SUMMARY EDIT MODAL
         ======================================================== */}
      {showSummaryModal && (
        <div className="modal-overlay z-50" role="dialog" aria-modal="true" aria-label="Suggest Executive Summary Edit">
          <div
            className="modal-content text-zinc-900"
            style={{ maxWidth: "540px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">
                Suggest Executive Summary Edit
              </h3>
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSummaryCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Original Summary
                </label>
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600 leading-relaxed max-h-32 overflow-y-auto">
                  {reviewDataset.executiveSummary.text}
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Proposed Summary Text <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={summaryProposedText}
                  onChange={(e) => setSummaryProposedText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs leading-relaxed"
                  placeholder="Enter your proposed revision..."
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Reason for Correction (Optional)
                </label>
                <input
                  type="text"
                  value={summaryReason}
                  onChange={(e) => setSummaryReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                  placeholder="e.g. Added Rubisco enzyme mention discussed at 24:10"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="px-4 h-9 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: SUGGEST TRANSCRIPT CORRECTION MODAL
         ======================================================== */}
      {activeTranscriptCorrection && (
        <div className="modal-overlay z-50" role="dialog" aria-modal="true" aria-label="Suggest Transcript Correction">
          <div
            className="modal-content text-zinc-900"
            style={{ maxWidth: "520px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">
                Suggest Transcript Correction [{activeTranscriptCorrection.timestamp}]
              </h3>
              <button
                type="button"
                onClick={() => setActiveTranscriptCorrection(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTranscriptCorrection} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Original Dialogue ({activeTranscriptCorrection.speaker})
                </label>
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-600">
                  "{activeTranscriptCorrection.text}"
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Proposed Corrected Dialogue <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={transcriptProposedText}
                  onChange={(e) => setTranscriptProposedText(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                  placeholder="Enter corrected transcript text..."
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Reason for Correction (Optional)
                </label>
                <input
                  type="text"
                  value={transcriptReason}
                  onChange={(e) => setTranscriptReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                  placeholder="e.g. Corrected phonetic misspelling of scientific term"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setActiveTranscriptCorrection(null)}
                  className="px-4 h-9 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: PROPOSE CHAPTER MARKER MODAL
         ======================================================== */}
      {showProposeMarkerModal && (
        <div className="modal-overlay z-50" role="dialog" aria-modal="true" aria-label="Propose Chapter Marker">
          <div
            className="modal-content text-zinc-900"
            style={{ maxWidth: "480px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">
                Propose New Chapter Marker
              </h3>
              <button
                type="button"
                onClick={() => setShowProposeMarkerModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitProposeMarker} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-bold mb-1">
                    Timestamp (HH:MM:SS) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={proposedMarkerTime}
                    onChange={(e) => setProposedMarkerTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-zinc-300 font-mono text-xs"
                    placeholder="00:15:00"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <button
                    type="button"
                    onClick={() => setProposedMarkerTime(formatSeconds(currentTime))}
                    className="w-full h-9 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-[11px] cursor-pointer"
                  >
                    Use Current ({formatSeconds(currentTime)})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Chapter Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={proposedMarkerTitle}
                  onChange={(e) => setProposedMarkerTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 text-xs"
                  placeholder="e.g. 03. Live Coding Practical Demo"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Brief Description
                </label>
                <textarea
                  rows={2}
                  value={proposedMarkerDesc}
                  onChange={(e) => setProposedMarkerDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                  placeholder="Short note on topics covered in this chapter..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowProposeMarkerModal(false)}
                  className="px-4 h-9 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Submit Marker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 4: SUGGEST CHAPTER CHANGE MODAL
         ======================================================== */}
      {editingChapter && (
        <div className="modal-overlay z-50" role="dialog" aria-modal="true" aria-label="Suggest Chapter Change">
          <div
            className="modal-content text-zinc-900"
            style={{ maxWidth: "480px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
              <h3 className="text-base font-bold text-zinc-900">
                Suggest Chapter Change: "{editingChapter.title}"
              </h3>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitChapterChange} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Timestamp
                </label>
                <input
                  type="text"
                  value={chapterProposedTime}
                  onChange={(e) => setChapterProposedTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Proposed Chapter Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={chapterProposedTitle}
                  onChange={(e) => setChapterProposedTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-bold mb-1">
                  Proposed Description
                </label>
                <textarea
                  rows={2}
                  value={chapterProposedDesc}
                  onChange={(e) => setChapterProposedDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="px-4 h-9 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Submit Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
