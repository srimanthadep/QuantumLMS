import { useState } from "react"
import { Icon } from "../components/Icon"
import { HexColorField } from "../components/HexColorField"
import type { StudentNavPage } from "../components/StudentSidebar"

interface StudentPageProps {
  page: StudentNavPage
  onToast: (msg: string) => void
  onSwitchToTeacher: () => void
  hexColor: string
  onChangeHexColor: (c: string) => void
  onOpenAiModal: () => void
}

export function StudentOtherPage({
  page,
  onToast,
  onSwitchToTeacher,
  hexColor,
  onChangeHexColor,
  onOpenAiModal,
}: StudentPageProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const getSub = () => {
    switch (page) {
      case "My Learning":
        return "Continue your ongoing courses, modules, and track completion."
      case "Explore Courses":
        return "Discover industry-recognized AI, Data Science & Robotics tracks."
      case "Live Classes":
        return "Interactive sessions with Srimanth and guest AI researchers."
      case "Schedule":
        return "Upcoming webinars, lecture broadcasts, and assignment milestones."
      case "Assignments":
        return "Coding labs, project submissions, and instructor assessments."
      case "My Progress":
        return "Detailed completion breakdown, quiz scores, and skill milestones."
      case "My Notes":
        return "Course summaries, code snippets, and personalized study guides."
      case "Certificates":
        return "Verified AI credentials and program graduation certificates."
      case "Community":
        return "Join student study groups, Discord forums, and project collabs."
      case "Help & Support":
        return "Technical help desk, student mentoring, and FAQs."
      default:
        return "Quantum School of AI Student Workspace"
    }
  }

  return (
    <div className="student-dashboard-content">
      {/* Shared Dashboard Header */}
      <header className="dashboard-header">
        <div>
          <div className="greeting">
            <span>{page}</span>
          </div>
          <div className="subtitle">{getSub()}</div>
        </div>

        <div className="header-actions">
          <div className="search-box">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${page}...`}
              aria-label={`Search ${page}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-zinc-700 font-medium px-1"
              >
                ×
              </button>
            )}
          </div>

          <button
            onClick={onSwitchToTeacher}
            className="px-3 h-[35px] rounded-full bg-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-purple-700 transition-colors cursor-pointer"
            title="Switch to Teacher View"
          >
            <span>👨‍🏫 Teacher Portal</span>
          </button>

          <HexColorField
            hexColor={hexColor}
            onChangeHex={onChangeHexColor}
          />

          <button
            className="ask-ai"
            onClick={onOpenAiModal}
            aria-label="Ask AI Assistant"
          >
            <span>✦</span>
            Ask AI
          </button>
        </div>
      </header>

      {/* Page Content Panels */}
      {page === "My Learning" && (
        <section className="panel p-6" aria-label="My Learning">
          <div className="card-header mb-4">
            <h3 className="card-title">Enrolled Courses</h3>
            <button
              onClick={() => onToast("Resuming latest lesson: RAG Applications...")}
              className="px-4 py-2 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer"
            >
              ▶ Resume Latest Lesson
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Generative AI Masterclass",
                img: "/assets/course_genai.jpg",
                progress: 64,
                modules: "4 of 8 Modules Completed",
                due: "Next milestone due Oct 22",
              },
              {
                title: "Python for AI",
                img: "/assets/course_python.jpg",
                progress: 42,
                modules: "3 of 7 Modules Completed",
                due: "Next milestone due Oct 28",
              },
              {
                title: "Machine Learning Foundations",
                img: "/assets/course_ml.jpg",
                progress: 28,
                modules: "2 of 6 Modules Completed",
                due: "Next milestone due Nov 02",
              },
              {
                title: "AI Agents Bootcamp",
                img: "/assets/course_agents.jpg",
                progress: 100,
                modules: "8 of 8 Modules Completed · Certificate Earned",
                due: "Completed with Distinction",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-4 border border-zinc-100 shadow-sm flex gap-4 items-center hover:shadow-md transition-shadow"
              >
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-24 h-20 rounded-xl object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-zinc-900 truncate">{item.title}</h4>
                  <div className="text-xs text-zinc-500 mt-1">{item.modules}</div>
                  <div className="w-full bg-zinc-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[11px] text-zinc-400">{item.due}</span>
                    <span className="text-xs font-bold text-purple-700">{item.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {page === "Explore Courses" && (
        <section className="panel p-6" aria-label="Explore Courses">
          <div className="card-header mb-4">
            <h3 className="card-title">Explore Catalog</h3>
            <span className="text-xs text-zinc-500">6 Curated Programs</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "Prompt Engineering Deep Dive", img: "/assets/rec_prompt.jpg", level: "Beginner", rating: "4.8", hours: "14h" },
              { title: "Computer Vision with Python", img: "/assets/rec_cv.jpg", level: "Intermediate", rating: "4.7", hours: "24h" },
              { title: "Autonomous Robotics with ROS2", img: "/assets/student_hero_robot.jpg", level: "Advanced", rating: "4.9", hours: "36h" },
              { title: "Fine-tuning Large Language Models", img: "/assets/course_genai.jpg", level: "Advanced", rating: "4.9", hours: "18h" },
              { title: "Deep Reinforcement Learning", img: "/assets/course_ml.jpg", level: "Advanced", rating: "4.6", hours: "28h" },
              { title: "AI Ethics & Safety Governance", img: "/assets/course_agents.jpg", level: "All Levels", rating: "4.9", hours: "10h" },
            ].map((c) => (
              <div
                key={c.title}
                className="bg-white rounded-2xl overflow-hidden border border-zinc-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <img src={c.img} alt={c.title} className="w-full h-36 object-cover" />
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        {c.level}
                      </span>
                      <span className="text-xs text-zinc-400">⏱ {c.hours}</span>
                    </div>
                    <h4 className="font-bold text-sm text-zinc-900">{c.title}</h4>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-100">
                    <span className="text-xs font-semibold text-amber-500">★ {c.rating}</span>
                    <button
                      onClick={() => onToast(`Enrolled in "${c.title}"!`)}
                      className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Enroll Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {page === "Live Classes" && (
        <section className="panel p-6" aria-label="Live Classes">
          <div className="card-header mb-4">
            <h3 className="card-title">Live Interactive Classes</h3>
            <button
              onClick={() => onToast("Launching live classroom meeting...")}
              className="px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Join Active Stream</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Building AI Agents with LangChain", date: "Today · 6:00 PM", host: "Srimanth", status: "Starting Soon", attendees: 48 },
              { title: "Fine-tuning LLMs on Custom Datasets", date: "Oct 22 · 6:00 PM", host: "Srimanth", status: "Upcoming", attendees: 62 },
              { title: "AI Product Architecture & Deployment", date: "Oct 25 · 6:00 PM", host: "Srimanth", status: "Upcoming", attendees: 39 },
              { title: "Open-Source AI Showcase & Hackathon Prep", date: "Oct 28 · 5:00 PM", host: "Guest Speaker", status: "Upcoming", attendees: 84 },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-purple-700">{item.date}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {item.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-zinc-900">{item.title}</h4>
                  <p className="text-xs text-zinc-500 mt-1">Instructor: {item.host} · {item.attendees} Registered</p>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => onToast(`Launching live classroom for "${item.title}"...`)}
                    className="flex-1 py-2 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer"
                  >
                    Enter Room
                  </button>
                  <button
                    onClick={() => onToast(`Added "${item.title}" to calendar reminder.`)}
                    className="px-4 py-2 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Remind Me
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Generic Panel for remaining pages */}
      {!["My Learning", "Explore Courses", "Live Classes"].includes(page) && (
        <section className="panel p-8 text-center" aria-label={page}>
          <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mx-auto mb-4">
            <Icon name="sparkles" size={28} />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 mb-1">{page} Active</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-6">
            All your coursework, interactive rubrics, notes, and records for {page} are synchronized in real-time with Quantum School of AI.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => onToast(`Syncing ${page} records with cloud server...`)}
              className="px-5 py-2.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors cursor-pointer"
            >
              Refresh & Sync Data
            </button>
            <button
              onClick={() => onToast(`Exporting ${page} report to PDF...`)}
              className="px-5 py-2.5 rounded-full border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Export Records
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
