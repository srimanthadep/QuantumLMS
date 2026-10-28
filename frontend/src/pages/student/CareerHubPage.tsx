import React, { useState } from "react"
import { MockInterviewView } from "./career/MockInterviewView"
import { ResumeBuilderView } from "./career/ResumeBuilderView"
import { MentorDetailsView } from "./career/MentorDetailsView"
import type { StudentNavPage } from "./studentTypes"

interface CareerHubPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: any) => void
  onOpenAiModal?: () => void
  initialTab?: "interviews" | "resume" | "mentorship"
}

export function CareerHubPage({
  onToast,
  onNavigate = () => {},
  onOpenAiModal = () => {},
  initialTab = "interviews",
}: CareerHubPageProps) {
  const [activeTab, setActiveTab] = useState<"interviews" | "resume" | "mentorship">(initialTab)

  return (
    <div className="app-card-stack flex flex-col gap-[var(--app-card-gap,14px)] w-full max-w-full min-w-0 box-border text-left">
      {/* 1. Career Hub Header Banner */}
      <section
        className="bg-white/95 border border-purple-100 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        aria-label="Student Career Hub"
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#F0EDFF] border border-purple-100 flex items-center justify-center shrink-0 shadow-xs text-xl">
            🚀
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
                Career Hub & Placement Accelerator
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#F0EDFF] text-[#905FEB]">
                Industry Ready
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Prepare for elite engineering roles with AI-driven interview simulators, ATS-grade resume authoring, and direct 1:1 faculty mentorship.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenAiModal}
            className="px-4 py-2 rounded-xl bg-purple-700 text-white font-bold text-xs hover:bg-purple-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>✦</span>
            <span>Career AI Copilot</span>
          </button>
        </div>
      </section>

      {/* 2. Sub-tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-200/80">
        <button
          type="button"
          onClick={() => setActiveTab("interviews")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "interviews"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>🎙️</span>
          <span>AI Mock Interviews</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("resume")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "resume"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>📄</span>
          <span>Resume Builder (ATS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mentorship")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === "mentorship"
              ? "bg-purple-700 text-white shadow-xs"
              : "bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 border border-zinc-200"
          }`}
        >
          <span>👨‍🏫</span>
          <span>1:1 Faculty Mentorship</span>
        </button>
      </div>

      {/* 3. Sub-Tab Content Views */}
      <div className="w-full">
        {activeTab === "interviews" && (
          <MockInterviewView
            onToast={onToast}
            onNavigate={onNavigate}
            onOpenAiModal={onOpenAiModal}
          />
        )}

        {activeTab === "resume" && (
          <ResumeBuilderView
            onToast={onToast}
            onNavigate={onNavigate}
            onOpenAiModal={onOpenAiModal}
          />
        )}

        {activeTab === "mentorship" && (
          <MentorDetailsView
            onToast={onToast}
            onNavigate={onNavigate as (page: StudentNavPage) => void}
            onOpenAiModal={onOpenAiModal}
          />
        )}
      </div>
    </div>
  )
}

// Backward-compatible named exports
export { CareerHubPage as MockInterviewPage }
export { CareerHubPage as ResumeBuildingPage }
export { CareerHubPage as MentorDetailsPage }
export default CareerHubPage
