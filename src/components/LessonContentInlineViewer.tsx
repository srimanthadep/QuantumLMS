import React, { useState } from "react"
import type { LessonItem, LessonMaterial } from "../types"
import { Icon } from "./Icon"

export function LessonContentInlineViewer({
  lesson,
  moduleIndex,
  lessonIndex,
  onToast,
}: {
  lesson: LessonItem
  moduleIndex: number
  lessonIndex: number
  onToast?: (msg: string) => void
}) {
  const [activeMaterialPreview, setActiveMaterialPreview] = useState<LessonMaterial | null>(null)
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)

  // Detect resource type if not explicitly set
  const detectedType =
    lesson.resourceType ||
    (lesson.videoUrl || lesson.type === "Video Lecture"
      ? "video"
      : lesson.pdfUrl || lesson.type === "Reading & Theory"
        ? "pdf"
        : lesson.audioUrl || lesson.type === "Audio Lecture"
          ? "audio"
          : lesson.externalUrl
            ? "external"
            : "document")

  const handleDownloadMaterial = (mat: LessonMaterial) => {
    onToast?.(`Downloading admin asset: ${mat.title}`)
  }

  const handleOpenExternal = (url?: string) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer")
    } else {
      onToast?.("External URL not configured by School Administration.")
    }
  }

  return (
    <div
      className="mt-3 p-4 sm:p-5 rounded-2xl bg-white border border-purple-200/90 shadow-sm space-y-4 animate-in fade-in duration-200"
      aria-label={`Inline content viewer for ${lesson.title}`}
    >
      {/* Top Banner: Lesson Meta & Teacher Read-Only Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-150">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-100 text-purple-800">
            Module {moduleIndex + 1} · Lesson {lessonIndex + 1}
          </span>
          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-gray-100 text-zinc-700">
            {lesson.type}
          </span>
          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-gray-100 text-zinc-700">
            ⏱ {lesson.duration}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${lesson.completed
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
              }`}
          >
            {lesson.completed ? "✓ Completed" : "In Progress"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 shrink-0">
          <Icon name="sparkles" size={13} />
          <span>Curriculum Read Only · Admin Verified</span>
        </div>
      </div>

      {/* Lesson Heading and Description */}
      <div>
        <h3 className="text-base sm:text-lg font-bold text-zinc-900 leading-snug">
          {lesson.title}
        </h3>
        {lesson.description && (
          <p className="text-xs sm:text-sm text-zinc-600 mt-1 leading-relaxed max-w-3xl">
            {lesson.description}
          </p>
        )}
      </div>

      {/* 1. RESOURCE TYPE: VIDEO LESSON */}
      {detectedType === "video" && (
        <div className="space-y-3">
          {lesson.videoUrl ? (
            <div className="rounded-xl overflow-hidden bg-black border border-zinc-800 shadow-xs relative">
              <video
                src={lesson.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[380px] object-contain mx-auto bg-black"
                onPlay={() => setIsPlayingVideo(true)}
                onPause={() => setIsPlayingVideo(false)}
              >
                <p className="text-white text-xs p-4">
                  Your browser does not support HTML5 video playback.
                </p>
              </video>
              <div className="px-3.5 py-2 bg-zinc-900/90 text-[11px] text-zinc-300 flex items-center justify-between border-t border-zinc-800">
                <span className="flex items-center gap-1.5 text-zinc-200 font-medium">
                  <Icon name="video" size={14} />
                  <span>Interactive High-Definition Lecture Stream</span>
                </span>
                <span className="font-mono text-zinc-400">Duration: {lesson.duration}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200 text-xs text-zinc-500">
              <div className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-600 grid place-items-center mx-auto mb-2">
                <Icon name="video-off" size={20} />
              </div>
              <strong className="text-zinc-800 block mb-0.5">Video Resource Unavailable</strong>
              <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                No active video stream URL has been published by the administration for this lesson yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. RESOURCE TYPE: PDF LESSON */}
      {detectedType === "pdf" && (
        <div className="space-y-3">
          {lesson.pdfUrl ? (
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 grid place-items-center shrink-0">
                    <Icon name="document" size={20} />
                  </div>
                  <div>
                    <strong className="text-xs sm:text-sm font-bold text-zinc-900 block">
                      {lesson.title} — Verified PDF Curriculum Document
                    </strong>
                    <span className="text-[11px] text-zinc-500">
                      Standardized classroom reader & printable laboratory sheet · Formatted for tablet & print
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={lesson.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 h-8 rounded-lg bg-white border border-gray-200 hover:border-purple-300 text-purple-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Icon name="maximize" size={13} />
                    <span>Open in New Tab</span>
                  </a>
                  <a
                    href={lesson.pdfUrl}
                    download={`${lesson.title.replace(/\s+/g, "_")}.pdf`}
                    className="px-3 h-8 rounded-lg btn-primary text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Icon name="download" size={13} />
                    <span>Download PDF</span>
                  </a>
                </div>
              </div>

              {/* Embedded PDF iframe viewer */}
              <div className="w-full h-80 rounded-lg overflow-hidden border border-purple-200 bg-white">
                <iframe
                  src={`${lesson.pdfUrl}#toolbar=0`}
                  title={`PDF Preview: ${lesson.title}`}
                  className="w-full h-full border-none"
                  loading="lazy"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 text-center bg-gray-50 rounded-xl border border-gray-200 text-xs text-zinc-500">
              <div className="w-10 h-10 rounded-full bg-zinc-200 text-zinc-600 grid place-items-center mx-auto mb-2">
                <Icon name="document" size={20} />
              </div>
              <strong className="text-zinc-800 block mb-0.5">PDF Document Unavailable</strong>
              <p className="text-[11px] text-zinc-400 max-w-md mx-auto">
                The school administrator has not attached a downloadable PDF source for this lesson.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. RESOURCE TYPE: AUDIO LESSON */}
      {detectedType === "audio" && (
        <div className="p-4 rounded-xl bg-lime-50/50 border border-lime-200 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-lime-200 text-lime-900 grid place-items-center">
                <Icon name="mic" size={18} />
              </div>
              <div>
                <strong className="text-xs font-bold text-zinc-900 block">
                  Audio Lecture & Discussion Podcast
                </strong>
                <span className="text-[10.5px] text-zinc-500">
                  Audio narration of foundational concepts · {lesson.duration}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-lime-100 text-lime-900 border border-lime-200">
              Mastery Audio
            </span>
          </div>

          {lesson.audioUrl ? (
            <div className="bg-white p-3 rounded-lg border border-lime-200 shadow-xs">
              <audio controls src={lesson.audioUrl} className="w-full h-10" preload="metadata">
                Your browser does not support HTML5 audio playback.
              </audio>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">No audio recording available for this lesson.</p>
          )}
        </div>
      )}

      {/* 4. RESOURCE TYPE: EXTERNAL LEARNING RESOURCE */}
      {detectedType === "external" && (
        <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 grid place-items-center shrink-0">
              <Icon name="compass" size={18} />
            </div>
            <div>
              <strong className="text-xs sm:text-sm font-bold text-zinc-900 block">
                Official External Learning Companion
              </strong>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                Curated educational external resource approved by Super Admin. Safe student exploration link.
              </p>
              {lesson.externalUrl && (
                <span className="text-[10.5px] font-mono text-indigo-700 truncate block mt-0.5">
                  {lesson.externalUrl}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleOpenExternal(lesson.externalUrl)}
            className="px-4 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Launch External Resource ↗</span>
          </button>
        </div>
      )}

      {/* Curriculum Summary & Learning Objectives */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
        {/* Objectives */}
        {lesson.objectives && lesson.objectives.length > 0 && (
          <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
            <h4 className="text-xs font-bold text-purple-950 flex items-center gap-1.5 mb-2">
              <Icon name="sparkles" size={13} />
              <span>Core Learning Objectives</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-purple-900/90 pl-0.5">
              {lesson.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-purple-600 font-bold shrink-0">✓</span>
                  <span className="leading-relaxed">{obj}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Summary Notes */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
          <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 mb-2">
            <Icon name="document" size={13} />
            <span>Curriculum Notes & Key Concepts</span>
          </h4>
          <p className="text-xs text-zinc-700 leading-relaxed">
            {lesson.contentSummary ||
              "Standardized Year 4 curriculum lesson material. Reviewed and verified by Quantum School of AI Academic Council."}
          </p>
          {lesson.adminNotes && (
            <div className="mt-2.5 pt-2 border-t border-zinc-200 text-[10.5px] text-amber-800">
              <strong>Admin Directive:</strong> {lesson.adminNotes}
            </div>
          )}
        </div>
      </div>

      {/* Supporting Materials & Slide Decks */}
      {lesson.materials && lesson.materials.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-zinc-900">
              Attached Learning Materials ({lesson.materials.length})
            </span>
            <span className="text-[10.5px] text-zinc-400">Read-Only Classroom Assets</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lesson.materials.map((mat) => (
              <div
                key={mat.id}
                className="p-2.5 rounded-xl bg-gray-50/90 hover:bg-purple-50/40 border border-gray-200 hover:border-purple-300 transition-all flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wide">
                    {mat.type}
                  </span>
                  <strong className="block text-xs text-zinc-800 truncate mt-0.5">
                    {mat.title}
                  </strong>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {mat.sizeOrDuration}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {mat.url && (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:border-purple-300 grid place-items-center text-purple-700 text-xs transition-colors"
                      title="Open asset in new tab"
                    >
                      <Icon name="maximize" size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadMaterial(mat)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:border-purple-300 grid place-items-center text-purple-700 text-xs transition-colors cursor-pointer"
                    title="Download asset"
                  >
                    <Icon name="download" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
