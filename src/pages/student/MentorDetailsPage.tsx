import { useState } from "react"
import { Icon } from "../../components/Icon"
import type { MentorProfile, StudentNavPage } from "./studentTypes"
import { assignedMentorData, secondaryMentorData } from "./studentMockData"

interface MentorDetailsPageProps {
  onToast: (msg: string) => void
  onNavigate: (page: StudentNavPage) => void
  onOpenAiModal: () => void
}

export function MentorDetailsPage({
  onToast,
  onNavigate,
  onOpenAiModal,
}: MentorDetailsPageProps) {
  const [selectedMentor, setSelectedMentor] =
    useState<MentorProfile>(assignedMentorData)

  const isPrimary = selectedMentor.id === assignedMentorData.id
  const meeting = selectedMentor.meeting
  const isMeetingScheduled = meeting?.status === "Scheduled" && !!meeting?.zoomUrl

  const handleJoinZoomMeeting = () => {
    if (meeting?.zoomUrl) {
      window.open(meeting.zoomUrl, "_blank", "noopener,noreferrer")
      onToast(`Launching Zoom meeting with ${selectedMentor.name}...`)
    } else {
      onToast("No active Zoom meeting link is available for this session.")
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Banner & Mentor Switcher */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Mentor Details Banner"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                👨‍🏫
              </span>
              <h2 className="text-xl font-black text-zinc-900">
                Faculty Mentorship & 1:1 Mentor Meeting
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                School of Computing
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-2xl">
              Connect with your assigned faculty mentor for research
              supervision, career advising, and 1:1 Zoom sessions.
            </p>
          </div>

          {/* Mentor Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200">
            <button
              onClick={() => setSelectedMentor(assignedMentorData)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedMentor.id === assignedMentorData.id
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <img
                src={assignedMentorData.avatar}
                alt={assignedMentorData.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>{assignedMentorData.name} (Primary)</span>
            </button>

            <button
              onClick={() => setSelectedMentor(secondaryMentorData)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedMentor.id === secondaryMentorData.id
                  ? "bg-purple-700 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <img
                src={secondaryMentorData.avatar}
                alt={secondaryMentorData.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span>{secondaryMentorData.name} (Co-Mentor)</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Mentor Hero Card */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="Mentor Profile Card"
      >
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative">
              <img
                src={selectedMentor.avatar}
                alt={selectedMentor.name}
                className="w-28 h-28 rounded-3xl object-cover border-4 border-purple-100 shadow-md"
              />
              <span
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow ${
                  selectedMentor.availabilityStatus === "Available Now"
                    ? "bg-emerald-600"
                    : selectedMentor.availabilityStatus === "In Lecture"
                      ? "bg-amber-600"
                      : "bg-zinc-600"
                }`}
              >
                ● {selectedMentor.availabilityStatus}
              </span>
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-zinc-900">
                  {selectedMentor.name}
                </h3>
                {isPrimary && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                    Your Assigned Faculty Advisor
                  </span>
                )}
              </div>

              <div className="text-zinc-700 font-semibold">
                {selectedMentor.title}
              </div>
              <div className="text-zinc-500">{selectedMentor.department}</div>

              <div className="flex flex-wrap items-center gap-4 text-zinc-500 mt-2">
                <span>
                  📍 <strong>Office:</strong> {selectedMentor.office}
                </span>
                <span>•</span>
                <span>
                  📧 <strong>Email:</strong> {selectedMentor.email}
                </span>
                <span>•</span>
                <span>
                  📞 <strong>Direct:</strong> {selectedMentor.phone}
                </span>
              </div>

              <div className="mt-2 p-2.5 bg-purple-50/60 rounded-xl border border-purple-100 text-purple-900 font-medium">
                🕒 <strong>Weekly Office Hours:</strong>{" "}
                {selectedMentor.officeHours}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full lg:w-auto">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(selectedMentor.email)
                onToast(`Copied ${selectedMentor.email} to clipboard!`)
              }}
              className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="mail" size={13} />
              <span>Copy Faculty Email</span>
            </button>
            <button
              onClick={() => onNavigate("Timetable")}
              className="px-4 py-2 rounded-full border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Icon name="calendar" size={13} />
              <span>View In Timetable</span>
            </button>
            <button
              onClick={onOpenAiModal}
              className="px-4 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>✦ AI Research Prep</span>
            </button>
          </div>
        </div>

        {/* Bio & Research Specializations */}
        <div className="mt-5 pt-4 border-t border-zinc-100 flex flex-col gap-3 text-xs">
          <div>
            <strong className="text-zinc-900 block font-bold mb-1">
              Academic Background & Focus:
            </strong>
            <p className="text-zinc-600 leading-relaxed">
              {selectedMentor.bio}
            </p>
          </div>

          <div>
            <strong className="text-zinc-900 block font-bold mb-1.5">
              Core Research & Teaching Specializations:
            </strong>
            <div className="flex flex-wrap gap-1.5">
              {selectedMentor.specializations.map((spec) => (
                <span
                  key={spec}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-700 border border-zinc-200"
                >
                  ⚡ {spec}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 1:1 Mentor Meeting Section (Clean, Mentor-Provided Zoom Session) */}
      <section
        className="panel p-6 bg-white border border-zinc-100 shadow-sm"
        aria-label="1:1 Mentor Meeting"
      >
        <div className="card-header mb-5 pb-3 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
              📹
            </div>
            <div>
              <h3 className="card-title text-base sm:text-lg font-bold text-zinc-900">
                1:1 Mentor Meeting
              </h3>
              <span className="text-xs text-zinc-500 font-medium">
                Individual faculty advisement session hosted via Zoom
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Meeting Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                isMeetingScheduled
                  ? "bg-[#E7FF9C] text-[#385000] border border-[#AEEB00]"
                  : "bg-zinc-100 text-zinc-600 border border-zinc-200"
              }`}
            >
              {isMeetingScheduled ? "● Scheduled" : "○ Not Scheduled"}
            </span>
          </div>
        </div>

        {isMeetingScheduled && meeting ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 8 cols: Meeting details card */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-gradient-to-br from-purple-50/60 via-white to-purple-50/30 border border-purple-100 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                    Confirmed Session
                  </span>
                  <span className="text-xs text-zinc-600 font-medium">
                    Mentor: <strong className="text-zinc-900">{selectedMentor.name}</strong> ({selectedMentor.title})
                  </span>
                </div>

                {meeting.topic && (
                  <h4 className="text-lg font-bold text-zinc-900">
                    {meeting.topic}
                  </h4>
                )}

                {meeting.agenda && (
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {meeting.agenda}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-base">
                      📅
                    </span>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">
                        Scheduled Date & Time
                      </span>
                      <strong className="text-xs text-zinc-900 font-bold block">
                        {meeting.scheduledDate}
                      </strong>
                      <span className="text-[11px] text-purple-700 font-semibold">
                        {meeting.scheduledTime}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                      🎥
                    </span>
                    <div className="min-w-0">
                      <span className="text-[10px] text-zinc-400 font-bold block uppercase tracking-wider">
                        Meeting Platform
                      </span>
                      <strong className="text-xs text-zinc-900 font-bold block truncate">
                        Zoom Video Meeting
                      </strong>
                      <span className="text-[11px] text-zinc-500 truncate block">
                        Host: {selectedMentor.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Meeting link active and provided by {selectedMentor.name}
                </span>
                <span className="text-[11px] text-zinc-400">
                  Please join on time with your microphone and webcam ready
                </span>
              </div>
            </div>

            {/* Right 4 cols: Join Action Card */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-white border border-purple-200/80 shadow-xs flex flex-col justify-between gap-4 text-center">
              <div className="space-y-3 pt-2">
                <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center text-2xl font-bold shadow-xs">
                  📹
                </div>
                <div>
                  <h4 className="text-base font-bold text-zinc-900 mb-1">
                    Ready to Connect?
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Launch your scheduled 1:1 session with {selectedMentor.name} directly in Zoom.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleJoinZoomMeeting}
                  className="w-full py-3 px-5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-all cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <span>Join Zoom Meeting</span>
                  <span className="text-sm">↗</span>
                </button>
                <span className="text-[10px] text-zinc-400 block">
                  Encrypted end-to-end · High Definition Video
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Not Scheduled State */
          <div className="p-8 rounded-2xl bg-zinc-50/80 border border-dashed border-zinc-200 text-center max-w-xl mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-zinc-400 mx-auto flex items-center justify-center text-xl">
              🕒
            </div>
            <div>
              <h4 className="text-base font-bold text-zinc-900 mb-1">
                No 1:1 Session Currently Scheduled
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-md mx-auto">
                Your mentor will share the Zoom meeting link when the session is scheduled.
              </p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-zinc-200 text-[11px] text-zinc-600 max-w-md mx-auto text-left flex items-start gap-2.5">
              <span className="text-purple-700 text-sm mt-0.5">ℹ️</span>
              <div>
                <strong>Regular Office Hours:</strong> {selectedMentor.officeHours}.
                You may also reach out during faculty consulting sessions at {selectedMentor.office}.
              </div>
            </div>
          </div>
        )}
      </section>


    </div>
  )
}
