import { useState, useEffect, useRef } from "react"
import type {
  LiveSessionItem,
  StudentItem,
  AIMonitoringData,
  LiveAttendanceRecord,
} from "../../types"
import { Icon } from "../../components/Icon"
import {
  initialAIMonitoringData,
  initialAttendanceRecords,
} from "../../data/mockData"
import AIMonitoringSection from "../../components/AIMonitoringSection"
import AttendanceSection from "../../components/AttendanceSection"

interface LiveStudioProps {
  session: LiveSessionItem
  students: StudentItem[]
  onLeaveStudio: () => void
  onEndClass: (sessionId: string) => void
  onToast?: (msg: string) => void
}

interface ChatMessage {
  id: string
  sender: string
  role: "Teacher" | "Student"
  avatar?: string
  text: string
  timestamp: string
}

export type StudioPanelTab =
  | "chat"
  | "participants"
  | "monitoring"
  | "attendance"
  | "info"
  | null

export default function LiveStudioPage({
  session,
  students,
  onLeaveStudio,
  onEndClass,
  onToast,
}: LiveStudioProps) {
  // Media device state
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  // Drawer / Side panel state
  const [activeSidePanel, setActiveSidePanel] = useState<StudioPanelTab>("chat")

  // AI Monitoring state
  const [monitoringData] = useState<AIMonitoringData>(initialAIMonitoringData)

  // Attendance state
  const [attendanceRecords] = useState<LiveAttendanceRecord[]>(initialAttendanceRecords)

  // Confirmation modal for End Class
  const [showEndModal, setShowEndModal] = useState(false)

  // Elapsed session timer
  const [secondsElapsed, setSecondsElapsed] = useState(0)

  // Media stream references
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

  // Real-time frontend chat composer state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: "cm-1",
      sender: "Aarav Sharma",
      role: "Student",
      avatar: "/assets/student-1.png",
      text: "Good morning Sir! Excited for the decision trees practical.",
      timestamp: "10:01 AM",
    },
    {
      id: "cm-2",
      sender: "Sneha Patel",
      role: "Student",
      avatar: "/assets/student-2.png",
      text: "Audio and video are crisp and clear.",
      timestamp: "10:02 AM",
    },
    {
      id: "cm-3",
      sender: "Rohit Verma",
      role: "Student",
      avatar: "/assets/student-3.png",
      text: "Will the dataset link be shared in the classroom notes?",
      timestamp: "10:03 AM",
    },
  ])
  const [newChatText, setNewChatText] = useState("")
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  // Hand raise toggle simulation for students
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({
    s1: true,
  })

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    if (hrs > 0) {
      return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
    }
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  // Request camera and microphone stream
  useEffect(() => {
    let isCancelled = false

    const initMedia = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Browser mediaDevices API not supported on this device/browser.")
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        cameraStreamRef.current = stream
        setHasPermission(true)
        setMediaError(null)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }
      } catch (err: unknown) {
        if (isCancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        console.warn("LMS Live Studio: Camera/Mic access note:", msg)
        setHasPermission(false)
        setMediaError(
          "Camera & microphone access is unavailable or denied. Showing simulated teacher stage preview."
        )
      }
    }

    initMedia()

    // Cleanup: Stop all camera and mic tracks when component unmounts
    return () => {
      isCancelled = true
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
        cameraStreamRef.current = null
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null
      }
    }
  }, [])

  // Toggle Microphone
  const handleToggleMic = () => {
    if (cameraStreamRef.current) {
      const audioTracks = cameraStreamRef.current.getAudioTracks()
      audioTracks.forEach((track) => {
        track.enabled = !isMicOn
      })
    }
    const next = !isMicOn
    setIsMicOn(next)
    onToast?.(next ? "Microphone unmuted" : "Microphone muted")
  }

  // Toggle Camera
  const handleToggleCamera = () => {
    if (cameraStreamRef.current) {
      const videoTracks = cameraStreamRef.current.getVideoTracks()
      videoTracks.forEach((track) => {
        track.enabled = !isCameraOn
      })
    }
    const next = !isCameraOn
    setIsCameraOn(next)
    onToast?.(next ? "Camera turned on" : "Camera turned off")
  }

  // Toggle Screen Sharing
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop sharing
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null
      }
      setIsScreenSharing(false)
      onToast?.("Stopped screen sharing")
    } else {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          onToast?.("Screen sharing is not supported by your browser.")
          return
        }
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        })
        screenStreamRef.current = screenStream
        setIsScreenSharing(true)
        onToast?.("Screen sharing started")

        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = screenStream
        }

        // Handle user stopping share via browser UI
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false)
          screenStreamRef.current = null
          onToast?.("Screen sharing ended")
        }
      } catch (err: unknown) {
        console.warn("Screen share cancelled or failed:", err)
      }
    }
  }

  // Stop media tracks helper
  const stopAllTracks = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop())
      cameraStreamRef.current = null
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
  }

  // Handle Leave Studio
  const handleLeaveStudio = () => {
    stopAllTracks()
    onLeaveStudio()
  }

  // Handle Confirm End Class
  const handleConfirmEndClass = () => {
    stopAllTracks()
    setShowEndModal(false)
    onEndClass(session.id)
    onToast?.(`Live class "${session.title}" ended.`)
  }

  // Send message in simulated chat
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newChatText.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const msg: ChatMessage = {
      id: `cm-${Date.now()}`,
      sender: session.instructorName || "Srimanth (You)",
      role: "Teacher",
      avatar: session.instructorAvatar || "/assets/srimanth.png",
      text: newChatText.trim(),
      timestamp: timeStr,
    }

    setChatMessages((prev) => [...prev, msg])
    setNewChatText("")

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  // Cohort student roster for participants tab
  const cohortStudents = students.slice(0, session.enrolledCount || 24)

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] min-h-[620px] bg-zinc-950 text-white rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl relative select-none">
      {/* 1. STUDIO HEADER */}
      <header className="h-16 px-4 sm:px-6 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Class Title & Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>LIVE STUDIO</span>
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              <span>⏱</span>
              <span>{formatTimer(secondsElapsed)}</span>
            </span>
          </div>

          <div className="min-w-0 truncate">
            <div className="flex items-center gap-2 truncate">
              <h1 className="text-sm sm:text-base font-bold text-white truncate">
                {session.title}
              </h1>
              <span className="hidden md:inline px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                {session.courseCode}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate flex items-center gap-2">
              <span>{session.courseName}</span>
              {session.batchName && (
                <>
                  <span>·</span>
                  <span>{session.batchName}</span>
                </>
              )}
              <span>·</span>
              <span className="text-zinc-300 font-medium">Instructor: {session.instructorName}</span>
            </div>
          </div>
        </div>

        {/* Right: Studio Status & Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 px-3 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/60 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>HD 1080p · 60fps</span>
          </div>

          <button
            onClick={handleLeaveStudio}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
            title="Leave the live studio and return to the class schedule"
          >
            Leave Studio
          </button>

          <button
            onClick={() => setShowEndModal(true)}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-950 transition-all cursor-pointer flex items-center gap-1.5"
            title="End live class session for all students"
          >
            <span>End Class</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN STAGE & SIDE PANELS */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Presentation Stage */}
        <main className="flex-1 relative bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-5 overflow-hidden">
          {/* Active Screen Sharing Presentation */}
          {isScreenSharing ? (
            <div className="w-full h-full relative rounded-2xl overflow-hidden bg-black border border-purple-500/30 flex items-center justify-center">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-zinc-900/90 backdrop-blur-xs text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-2">
                <Icon name="monitor" size={14} />
                <span>Presenting Screen to Class</span>
              </div>

              {/* Picture-in-picture Teacher Camera */}
              <div className="absolute bottom-4 right-4 w-44 sm:w-56 aspect-video rounded-xl overflow-hidden bg-zinc-900 border-2 border-purple-500/80 shadow-2xl z-10">
                {isCameraOn && hasPermission ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400 p-2 text-center">
                    <img
                      src={session.instructorAvatar || "/assets/srimanth.png"}
                      alt={session.instructorName}
                      className="w-8 h-8 rounded-full mb-1 border border-zinc-700"
                    />
                    <span className="text-[10px] font-bold text-zinc-300">
                      {session.instructorName}
                    </span>
                    <span className="text-[9px] text-zinc-500">Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9.5px] font-bold text-white">
                  You (Host)
                </div>
              </div>
            </div>
          ) : (
            /* Main Teacher Stage */
            <div className="w-full h-full max-w-5xl max-h-[720px] aspect-video relative rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl flex flex-col items-center justify-center">
              {/* Camera Video View or Avatar Placeholder */}
              {isCameraOn && hasPermission ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 max-w-md animate-fade-in">
                  <div className="relative mb-4">
                    <img
                      src={session.instructorAvatar || "/assets/srimanth.png"}
                      alt={session.instructorName}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-purple-500/40 shadow-xl"
                    />
                    <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-zinc-800 border-2 border-zinc-950 flex items-center justify-center text-zinc-400">
                      <Icon name="video-off" size={14} />
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-white mb-1">
                    {session.instructorName}
                  </h2>
                  <p className="text-xs text-zinc-400 mb-3">
                    Course Instructor & Session Host · Quantum LMS
                  </p>

                  <div className="px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 max-w-sm">
                    {mediaError ? (
                      <span className="text-amber-400">
                        Camera preview simulated. Enable webcam permissions in your browser bar for live local feed.
                      </span>
                    ) : (
                      <span>Your camera is currently paused. Click "Start Video" in the control bar below to turn it on.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Stage Overlay Badges */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <span className="px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-xs font-bold border border-white/10 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Host: {session.instructorName}</span>
                </span>
                {!isMicOn && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/80 backdrop-blur-md text-white text-xs font-bold border border-rose-400/30 flex items-center gap-1.5">
                    <Icon name="mic-off" size={12} />
                    <span>Muted</span>
                  </span>
                )}
              </div>

              {/* Truthful Simulated Stage Disclaimer */}
              <div className="absolute bottom-3 left-4 hidden sm:block z-10">
                <span className="px-2.5 py-1 rounded-md bg-black/60 text-[10px] text-zinc-400 border border-zinc-800">
                  LMS Studio Stage · Local preview active
                </span>
              </div>
            </div>
          )}

          {/* FLOATING CONTROL BAR */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-zinc-700/80 shadow-2xl max-w-[95vw] overflow-x-auto">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMic}
              className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${isMicOn
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-950"
                }`}
              title={isMicOn ? "Mute Microphone" : "Unmute Microphone"}
            >
              <Icon name={isMicOn ? "mic" : "mic-off"} size={18} />
              <span className="text-[9px] font-bold mt-0.5">
                {isMicOn ? "Mute" : "Unmute"}
              </span>
            </button>

            {/* Camera Toggle */}
            <button
              onClick={handleToggleCamera}
              className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${isCameraOn
                  ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  : "bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-950"
                }`}
              title={isCameraOn ? "Stop Video" : "Start Video"}
            >
              <Icon name={isCameraOn ? "video" : "video-off"} size={18} />
              <span className="text-[9px] font-bold mt-0.5">
                {isCameraOn ? "Stop Video" : "Start Video"}
              </span>
            </button>

            {/* Screen Share Toggle */}
            <button
              onClick={handleToggleScreenShare}
              className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${isScreenSharing
                  ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-950"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Icon name="monitor" size={18} />
              <span className="text-[9px] font-bold mt-0.5">
                {isScreenSharing ? "Stop Share" : "Share"}
              </span>
            </button>

            <div className="w-[1px] h-8 bg-zinc-700/80 mx-1 hidden sm:block"></div>

            {/* Participants Panel Toggle */}
            <button
              onClick={() =>
                setActiveSidePanel(activeSidePanel === "participants" ? null : "participants")
              }
              className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${activeSidePanel === "participants"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              title="Participants list"
            >
              <Icon name="users" size={18} />
              <span className="text-[9px] font-bold mt-0.5">Roster</span>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-purple-500 text-white">
                {session.enrolledCount || 24}
              </span>
            </button>

            {/* Chat Panel Toggle */}
            <button
              onClick={() =>
                setActiveSidePanel(activeSidePanel === "chat" ? null : "chat")
              }
              className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${activeSidePanel === "chat"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              title="Live Chat"
            >
              <Icon name="message-circle" size={18} />
              <span className="text-[9px] font-bold mt-0.5">Chat</span>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                {chatMessages.length}
              </span>
            </button>

            {/* AI Live Monitoring Toggle */}
            <button
              onClick={() =>
                setActiveSidePanel(activeSidePanel === "monitoring" ? null : "monitoring")
              }
              className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${activeSidePanel === "monitoring"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              title="AI Live Monitoring & Demo Insights"
            >
              <Icon name="sparkles" size={18} />
              <span className="text-[9px] font-bold mt-0.5">AI</span>
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
                92%
              </span>
            </button>

            {/* Attendance Toggle */}
            <button
              onClick={() =>
                setActiveSidePanel(activeSidePanel === "attendance" ? null : "attendance")
              }
              className={`relative flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${activeSidePanel === "attendance"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              title="Class Attendance"
            >
              <Icon name="check" size={18} />
              <span className="text-[9px] font-bold mt-0.5">Attend</span>
            </button>

            {/* Class Info Panel Toggle */}
            <button
              onClick={() =>
                setActiveSidePanel(activeSidePanel === "info" ? null : "info")
              }
              className={`flex flex-col items-center justify-center w-12 sm:w-14 h-12 rounded-xl transition-all cursor-pointer ${activeSidePanel === "info"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                }`}
              title="Class Information & Notes"
            >
              <Icon name="info" size={18} />
              <span className="text-[9px] font-bold mt-0.5">Info</span>
            </button>

            <div className="w-[1px] h-8 bg-zinc-700/80 mx-1"></div>

            {/* End Class Button in Control Bar */}
            <button
              onClick={() => setShowEndModal(true)}
              className="flex flex-col items-center justify-center px-3.5 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all cursor-pointer shadow-lg shadow-rose-950"
              title="End Class"
            >
              <Icon name="phone-off" size={18} />
              <span className="text-[9px] font-bold mt-0.5">End</span>
            </button>
          </div>
        </main>

        {/* 3. SIDE PANELS (Chat / Participants / AI / Attendance / Info) */}
        {activeSidePanel && (
          <aside className="w-full md:w-96 lg:w-[420px] bg-zinc-900 border-l border-zinc-800 flex flex-col shrink-0 z-20 h-auto md:h-full max-h-[50vh] md:max-h-full">
            {/* Panel Header */}
            <div className="p-3 border-b border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeSidePanel === "chat" && (
                    <>
                      <Icon name="message-circle" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Live Classroom Chat
                      </span>
                    </>
                  )}
                  {activeSidePanel === "participants" && (
                    <>
                      <Icon name="users" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Participants ({cohortStudents.length})
                      </span>
                    </>
                  )}
                  {activeSidePanel === "monitoring" && (
                    <>
                      <Icon name="sparkles" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        AI Live Monitoring
                      </span>
                    </>
                  )}
                  {activeSidePanel === "attendance" && (
                    <>
                      <Icon name="check" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Live Attendance
                      </span>
                    </>
                  )}
                  {activeSidePanel === "info" && (
                    <>
                      <Icon name="info" size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                        Session Details
                      </span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => setActiveSidePanel(null)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                  title="Close side panel"
                >
                  ✕
                </button>
              </div>

              {/* Quick Tab Switcher inside side panel */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                {[
                  { id: "chat", label: "Chat", icon: "message-circle" },
                  { id: "participants", label: "Roster", icon: "users" },
                  { id: "monitoring", label: "AI Monitor", icon: "sparkles" },
                  { id: "attendance", label: "Attendance", icon: "check" },
                  { id: "info", label: "Info", icon: "info" },
                ].map((tab) => {
                  const isActive = activeSidePanel === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSidePanel(tab.id as StudioPanelTab)}
                      className={`px-2 py-1 rounded-md text-[10.5px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${isActive
                          ? "bg-purple-600 text-white shadow-sm"
                          : "bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                    >
                      <Icon name={tab.icon as any} size={11} />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Panel Content: CHAT */}
            {activeSidePanel === "chat" && (
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/60">
                {/* Chat Feed */}
                <div className="flex-1 p-3.5 space-y-3 overflow-y-auto min-h-0 text-xs">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-[11px] leading-relaxed">
                    <strong>Notice:</strong> Welcome to the live classroom chat. Questions asked here will be visible to your class cohort.
                  </div>

                  {chatMessages.map((msg) => {
                    const isMe = msg.role === "Teacher"
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <img
                          src={msg.avatar || "/assets/student-1.png"}
                          alt={msg.sender}
                          className="w-7 h-7 rounded-full object-cover border border-zinc-700 shrink-0"
                        />
                        <div
                          className={`max-w-[78%] p-2.5 rounded-2xl ${isMe
                              ? "bg-purple-600 text-white rounded-tr-none"
                              : "bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/60"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`text-[10px] font-bold ${isMe ? "text-purple-200" : "text-purple-400"
                                }`}
                            >
                              {msg.sender} {isMe && "(You)"}
                            </span>
                            <span className="text-[9px] opacity-70 font-mono">
                              {msg.timestamp}
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Composer */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newChatText}
                    onChange={(e) => setNewChatText(e.target.value)}
                    placeholder="Send a message to class..."
                    className="flex-1 h-9 px-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!newChatText.trim()}
                    className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:hover:bg-purple-600 text-white font-bold text-xs transition-all cursor-pointer shrink-0"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* Panel Content: PARTICIPANTS */}
            {activeSidePanel === "participants" && (
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/60 overflow-y-auto p-3 space-y-2 text-xs">
                {/* Host Row */}
                <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={session.instructorAvatar || "/assets/srimanth.png"}
                      alt={session.instructorName}
                      className="w-8 h-8 rounded-full object-cover border border-purple-400"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-white truncate">
                          {session.instructorName}
                        </strong>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500 text-white">
                          Host
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-400">Teacher (You)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    {isMicOn ? (
                      <span className="text-emerald-400 font-bold text-xs" title="Mic active">●</span>
                    ) : (
                      <Icon name="mic-off" size={13} />
                    )}
                  </div>
                </div>

                <div className="text-[10px] uppercase font-bold text-zinc-500 px-1 pt-2">
                  Enrolled Students ({cohortStudents.length})
                </div>

                {/* Students List */}
                {cohortStudents.map((st) => (
                  <div
                    key={st.id}
                    className="p-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={st.image || "/assets/student-1.png"}
                        alt={st.name}
                        className="w-7 h-7 rounded-lg object-cover border border-zinc-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-zinc-200 font-medium truncate text-xs">
                          {st.name}
                        </div>
                        <div className="text-[10px] text-zinc-400">{st.rollNumber}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {raisedHands[st.id] && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                          title="Hand raised"
                        >
                          <span>✋</span>
                          <span>Hand Raised</span>
                        </span>
                      )}
                      <span className="text-zinc-500" title="Muted by host">
                        <Icon name="mic-off" size={13} />
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-2 text-center text-[10.5px] text-zinc-500 border-t border-zinc-800 mt-2">
                  Simulated Cohort Roster · Quantum LMS Class
                </div>
              </div>
            )}

            {/* Panel Content: CLASS INFO */}
            {activeSidePanel === "info" && (
              <div className="flex-1 flex flex-col min-h-0 bg-zinc-900/60 overflow-y-auto p-4 space-y-4 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                    Course & Schedule
                  </span>
                  <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 space-y-1.5">
                    <strong className="text-white block text-sm">{session.title}</strong>
                    <div className="text-zinc-300">
                      {session.courseCode}: {session.courseName}
                    </div>
                    <div className="text-zinc-400 font-mono text-[11px]">
                      {session.scheduledDate} · {session.startTime} – {session.endTime} ({session.durationMinutes} mins)
                    </div>
                  </div>
                </div>

                {session.topicsCovered && session.topicsCovered.length > 0 && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1.5">
                      Curriculum Topics
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {session.topicsCovered.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-medium"
                        >
                          ✓ {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {session.classNotes && (
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1">
                      Instructor Notes & Instructions
                    </span>
                    <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">
                      {session.classNotes}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800">
                  <span className="text-zinc-500 text-[10.5px] block">
                    Quantum LMS In-App Studio. Academic live classes are managed and verified through School Administration.
                  </span>
                </div>
              </div>
            )}

            {/* Panel Content: AI LIVE MONITORING */}
            {activeSidePanel === "monitoring" && (
              <div className="flex-1 overflow-y-auto p-3 min-h-0 bg-zinc-900/60">
                <AIMonitoringSection
                  monitoringData={monitoringData}
                  isStudioMode={true}
                  onToast={onToast}
                />
              </div>
            )}

            {/* Panel Content: ATTENDANCE */}
            {activeSidePanel === "attendance" && (
              <div className="flex-1 overflow-y-auto p-3 min-h-0 bg-zinc-900/60">
                <AttendanceSection
                  sessions={[session]}
                  activeSessionId={session.id}
                  records={attendanceRecords}
                  isStudioMode={true}
                  onToast={onToast}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 4. CONFIRMATION MODAL FOR END CLASS */}
      {showEndModal && (
        <div
          className="modal-overlay z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm End Class"
        >
          <div
            className="modal-content text-zinc-900"
            style={{ maxWidth: "440px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Icon name="phone-off" size={24} />
            </div>

            <h3 className="text-base font-bold text-center text-zinc-900 mb-1">
              End Live Class for Everyone?
            </h3>
            <p className="text-xs text-center text-zinc-500 mb-5 leading-relaxed">
              Are you sure you want to conclude <strong>"{session.title}"</strong>? This will stop your camera and microphone broadcast and navigate directly to the <strong>Lecture Recording & AI Intelligence Review</strong> page.
            </p>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="flex-1 h-9 rounded-xl border border-zinc-300 hover:bg-zinc-100 text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndClass}
                className="flex-1 h-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Yes, End Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
