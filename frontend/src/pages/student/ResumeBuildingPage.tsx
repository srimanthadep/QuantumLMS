import { useState, useEffect, useRef } from "react"
import { Icon } from "../../components/Icon"
import { StudentDropdown } from "../../components/StudentDropdown"
import type {
  ResumeData,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  CertificationEntry,
  AchievementEntry,
} from "./studentTypes"

interface ResumeBuildingPageProps {
  onToast: (msg: string) => void
  onNavigate?: (page: any) => void
  onOpenAiModal?: () => void
}

const STORAGE_KEY = "quantum_student_resume_data"

// Default initial high-quality AI Engineering student resume matching reference image
const defaultResumeData: ResumeData = {
  personalInfo: {
    fullName: "Srimanth Adepu",
    headline: "AI & Machine Learning Engineer | Full Stack Developer",
    email: "srimanth@quantum.ai",
    phone: "+91 98765 43210",
    location: "Hyderabad, Telangana, India",
    linkedin: "linkedin.com/in/srimanthadep",
    github: "github.com/srimanthadep",
    portfolio: "srimanth.dev",
  },
  summary:
    "Motivated and results-driven Computer Science graduate with a strong foundation in AI/ML, full stack development, and problem-solving. Passionate about building real-world solutions, learning new technologies, and contributing to innovative projects.",
  education: [
    {
      id: "edu-1",
      degree: "B.Tech in Artificial Intelligence & Data Science",
      institution: "Quantum School of AI",
      year: "2023 - 2027",
      score: "CGPA: 3.88 / 4.0",
      location: "Hyderabad, India",
    },
    {
      id: "edu-2",
      degree: "Senior Secondary (XII - MPC)",
      institution: "Narayana Junior College",
      year: "2021 - 2023",
      score: "Percentage: 97.8%",
      location: "Hyderabad, India",
    },
  ],
  skills: {
    languages: ["Python", "JavaScript", "Java", "C++", "HTML", "CSS"],
    frameworks: ["Django", "React.js", "Node.js", "TensorFlow", "PyTorch", "MySQL"],
    tools: ["Git", "Docker", "VS Code", "AWS", "Figma"],
    concepts: [
      "Data Structures & Algorithms",
      "Machine Learning",
      "REST APIs",
      "System Design",
    ],
  },
  experience: [
    {
      id: "exp-1",
      company: "XYZ Research Labs",
      role: "AI Research Intern",
      duration: "May 2024 - Aug 2024",
      location: "Hyderabad, India",
      responsibilities:
        "• Worked on machine learning models for image classification.\n• Built data processing pipelines and improved model accuracy by 15%.\n• Collaborated with cross-functional teams to deploy prototypes.",
    },
    {
      id: "exp-2",
      company: "Quantum Core Systems",
      role: "Software Developer Intern",
      duration: "Dec 2023 - Feb 2024",
      location: "Bengaluru, India",
      responsibilities:
        "• Built responsive dashboard interfaces and optimized backend API query latency.\n• Maintained 99.8% uptime across microservice test suites.",
    },
  ],
  projects: [
    {
      id: "proj-1",
      title: "Enterprise RAG Knowledge Assistant",
      role: "Lead Developer",
      technologies: "Python, FastAPI, React.js",
      link: "github.com/srimanthadep/enterprise-rag",
      description:
        "• Built an AI-powered assistant for enterprise document search using RAG.\n• Integrated with vector database and custom knowledge base.\n• Designed a clean and responsive web interface.",
    },
    {
      id: "proj-2",
      title: "Real-Time Object Detection Pipeline",
      role: "CV Engineer",
      technologies: "PyTorch, OpenCV, TensorRT",
      link: "github.com/srimanthadep/quantum-vision",
      description:
        "• Engineered a multi-camera object detection and tracking pipeline achieving 45 FPS on edge devices.\n• Quantized YOLO weights to INT8 precision with minimal mAP degradation.",
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "Deep Learning Specialization",
      issuer: "DeepLearning.AI & Coursera",
      date: "2025",
      link: "coursera.org/verify/dl-spec",
    },
    {
      id: "cert-2",
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services",
      date: "2024",
      link: "aws.amazon.com/verify",
    },
  ],
  achievements: [
    {
      id: "ach-1",
      title: "1st Place Winner — National Inter-University AI Hackathon",
      year: "2024",
      description:
        "Built an offline clinical diagnostics AI triaging application competing against 350+ university teams.",
    },
    {
      id: "ach-2",
      title: "Dean's Honor List (Top 2% of Cohort)",
      year: "2023 - 2024",
      description: "Recognized for academic excellence across consecutive terms.",
    },
  ],
}

type SectionKey =
  | "personal"
  | "summary"
  | "education"
  | "skills"
  | "experience"
  | "projects"
  | "certifications"
  | "achievements"

export function ResumeBuildingPage({
  onToast,
  onOpenAiModal,
}: ResumeBuildingPageProps) {
  const [resume, setResume] = useState<ResumeData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.personalInfo?.fullName) return parsed
      }
    } catch {
      // fallback
    }
    return defaultResumeData
  })

  // Open section in accordion: default is "personal"
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(
    "personal",
  )
  const [mobileView, setMobileView] = useState<"editor" | "preview">("editor")
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [isSaved, setIsSaved] = useState(true)

  // Skill input states
  const [newSkillText, setNewSkillText] = useState("")
  const [selectedSkillCategory, setSelectedSkillCategory] = useState<
    "languages" | "frameworks" | "tools" | "concepts"
  >("languages")

  const previewFrameRef = useRef<HTMLDivElement>(null)

  // Auto-sync persistence to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
    } catch {
      // ignore
    }
  }, [resume])

  const toggleSection = (section: SectionKey) => {
    setExpandedSection((curr) => (curr === section ? null : section))
  }

  const handleUpdatePersonalInfo = (
    field: keyof ResumeData["personalInfo"],
    val: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: val },
    }))
    setIsSaved(false)
  }

  // Education handlers
  const handleAddEducation = () => {
    const newEntry: EducationEntry = {
      id: `edu-${Date.now()}`,
      degree: "",
      institution: "",
      year: "",
      score: "",
      location: "",
    }
    setResume((prev) => ({ ...prev, education: [...prev.education, newEntry] }))
    setIsSaved(false)
  }

  const handleUpdateEducation = (
    id: string,
    field: keyof EducationEntry,
    val: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.map((e) =>
        e.id === id ? { ...e, [field]: val } : e,
      ),
    }))
    setIsSaved(false)
  }

  const handleRemoveEducation = (id: string) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id),
    }))
    setIsSaved(false)
  }

  // Skills handlers
  const handleAddSkill = () => {
    const trimmed = newSkillText.trim()
    if (!trimmed) return
    setResume((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [selectedSkillCategory]: [
          ...prev.skills[selectedSkillCategory].filter((s) => s !== trimmed),
          trimmed,
        ],
      },
    }))
    setNewSkillText("")
    setIsSaved(false)
  }

  const handleRemoveSkill = (
    category: "languages" | "frameworks" | "tools" | "concepts",
    skillName: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((s) => s !== skillName),
      },
    }))
    setIsSaved(false)
  }

  // Project handlers
  const handleAddProject = () => {
    const newEntry: ProjectEntry = {
      id: `proj-${Date.now()}`,
      title: "",
      role: "",
      technologies: "",
      link: "",
      description: "",
    }
    setResume((prev) => ({ ...prev, projects: [...prev.projects, newEntry] }))
    setIsSaved(false)
  }

  const handleUpdateProject = (
    id: string,
    field: keyof ProjectEntry,
    val: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, [field]: val } : p,
      ),
    }))
    setIsSaved(false)
  }

  const handleRemoveProject = (id: string) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }))
    setIsSaved(false)
  }

  // Experience handlers
  const handleAddExperience = () => {
    const newEntry: ExperienceEntry = {
      id: `exp-${Date.now()}`,
      company: "",
      role: "",
      duration: "",
      location: "",
      responsibilities: "",
    }
    setResume((prev) => ({
      ...prev,
      experience: [...prev.experience, newEntry],
    }))
    setIsSaved(false)
  }

  const handleUpdateExperience = (
    id: string,
    field: keyof ExperienceEntry,
    val: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((e) =>
        e.id === id ? { ...e, [field]: val } : e,
      ),
    }))
    setIsSaved(false)
  }

  const handleRemoveExperience = (id: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id),
    }))
    setIsSaved(false)
  }

  // Certifications handlers
  const handleAddCertification = () => {
    const newEntry: CertificationEntry = {
      id: `cert-${Date.now()}`,
      name: "",
      issuer: "",
      date: "",
      link: "",
    }
    setResume((prev) => ({
      ...prev,
      certifications: [...prev.certifications, newEntry],
    }))
    setIsSaved(false)
  }

  const handleUpdateCertification = (
    id: string,
    field: keyof CertificationEntry,
    val: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) =>
        c.id === id ? { ...c, [field]: val } : c,
      ),
    }))
    setIsSaved(false)
  }

  const handleRemoveCertification = (id: string) => {
    setResume((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }))
    setIsSaved(false)
  }

  // Achievements handlers
  const handleAddAchievement = () => {
    const newEntry: AchievementEntry = {
      id: `ach-${Date.now()}`,
      title: "",
      year: "",
      description: "",
    }
    setResume((prev) => ({
      ...prev,
      achievements: [...prev.achievements, newEntry],
    }))
    setIsSaved(false)
  }

  const handleUpdateAchievement = (
    id: string,
    field: keyof AchievementEntry,
    val: string,
  ) => {
    setResume((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a) =>
        a.id === id ? { ...a, [field]: val } : a,
      ),
    }))
    setIsSaved(false)
  }

  const handleRemoveAchievement = (id: string) => {
    setResume((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((a) => a.id !== id),
    }))
    setIsSaved(false)
  }

  // Validation
  const isEmailValid = (email: string) => {
    if (!email) return true
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Save explicitly
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
      setIsSaved(true)
      onToast("Resume saved successfully! 💾")
    } catch {
      onToast("Error saving resume to local storage.")
    }
  }

  // Reset to default
  const handleResetToDefault = () => {
    setResume(defaultResumeData)
    setIsResetConfirmOpen(false)
    setIsSaved(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultResumeData))
    } catch {
      // ignore
    }
    onToast("Resume reset to default template!")
  }

  // Clear all
  const handleClearAll = () => {
    const blankResume: ResumeData = {
      personalInfo: {
        fullName: "",
        headline: "",
        email: "",
        phone: "",
        location: "",
        linkedin: "",
        github: "",
        portfolio: "",
      },
      summary: "",
      education: [],
      skills: {
        languages: [],
        frameworks: [],
        tools: [],
        concepts: [],
      },
      projects: [],
      experience: [],
      certifications: [],
      achievements: [],
    }
    setResume(blankResume)
    setIsResetConfirmOpen(false)
    setIsSaved(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blankResume))
    } catch {
      // ignore
    }
    onToast("Resume fields cleared.")
  }

  // High-fidelity Vector PDF Print / Download
  const handlePrintOrDownload = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      onToast("Pop-up blocked. Please allow pop-ups to download PDF.")
      return
    }

    const docTitle = `${
      resume.personalInfo.fullName.replace(/\s+/g, "_") || "Srimanth_Adepu"
    }_Resume.pdf`

    const printHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${docTitle}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 14mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            font-size: 9.5pt;
            line-height: 1.4;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .resume-sheet {
            width: 100%;
            max-width: 100%;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .name {
            font-size: 20pt;
            font-weight: 800;
            color: #111827;
            letter-spacing: -0.5px;
            line-height: 1.1;
          }
          .headline {
            font-size: 10pt;
            font-weight: 700;
            color: #1f2937;
            margin-top: 3px;
          }
          .contact-row {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 8pt;
            color: #4b5563;
            margin-top: 5px;
          }
          .links-row {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 12px;
            font-size: 8pt;
            color: #4f46e5;
            margin-top: 3px;
          }
          .section {
            margin-bottom: 11px;
          }
          .section-title {
            font-size: 9.5pt;
            font-weight: 800;
            color: #111827;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 2px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .section-title::before {
            content: "";
            display: inline-block;
            width: 3px;
            height: 11pt;
            background: #4f46e5;
            border-radius: 2px;
          }
          .summary-text {
            font-size: 8.5pt;
            color: #374151;
            text-align: justify;
            line-height: 1.45;
          }
          .entry-row {
            margin-bottom: 7px;
          }
          .entry-header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            margin-bottom: 1px;
          }
          .entry-title {
            font-size: 9pt;
            font-weight: 700;
            color: #111827;
          }
          .entry-sub {
            font-size: 8.5pt;
            font-weight: 600;
            color: #4b5563;
          }
          .entry-meta {
            font-size: 8pt;
            font-weight: 500;
            color: #6b7280;
            white-space: nowrap;
          }
          .entry-desc {
            font-size: 8pt;
            color: #374151;
            margin-top: 2px;
            line-height: 1.35;
            white-space: pre-line;
          }
          .skills-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
          }
          .skills-table td {
            padding: 2px 0;
            vertical-align: top;
          }
          .skills-table td.label {
            width: 140px;
            font-weight: 700;
            color: #111827;
          }
          .skills-table td.val {
            color: #4b5563;
          }
          @media print {
            body {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="resume-sheet">
          <!-- Header -->
          <div class="header">
            <h1 class="name">${resume.personalInfo.fullName || "Srimanth Adepu"}</h1>
            ${resume.personalInfo.headline ? `<div class="headline">${resume.personalInfo.headline}</div>` : ""}
            <div class="contact-row">
              ${resume.personalInfo.email ? `<span>✉ ${resume.personalInfo.email}</span>` : ""}
              ${resume.personalInfo.phone ? `<span>☎ ${resume.personalInfo.phone}</span>` : ""}
              ${resume.personalInfo.location ? `<span>📍 ${resume.personalInfo.location}</span>` : ""}
            </div>
            <div class="links-row">
              ${resume.personalInfo.linkedin ? `<span>${resume.personalInfo.linkedin}</span>` : ""}
              ${resume.personalInfo.github ? `<span>${resume.personalInfo.github}</span>` : ""}
              ${resume.personalInfo.portfolio ? `<span>${resume.personalInfo.portfolio}</span>` : ""}
            </div>
          </div>

          <!-- Summary -->
          ${
            resume.summary
              ? `
          <div class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p class="summary-text">${resume.summary}</p>
          </div>
          `
              : ""
          }

          <!-- Technical Skills -->
          <div class="section">
            <h2 class="section-title">Technical Skills</h2>
            <table class="skills-table">
              ${
                resume.skills.languages.length
                  ? `
                <tr>
                  <td class="label">Languages</td>
                  <td class="val">: ${resume.skills.languages.join(", ")}</td>
                </tr>
              `
                  : ""
              }
              ${
                resume.skills.frameworks.length
                  ? `
                <tr>
                  <td class="label">Frameworks & Tools</td>
                  <td class="val">: ${resume.skills.frameworks.join(", ")}</td>
                </tr>
              `
                  : ""
              }
              ${
                resume.skills.tools.length
                  ? `
                <tr>
                  <td class="label">Developer Tools</td>
                  <td class="val">: ${resume.skills.tools.join(", ")}</td>
                </tr>
              `
                  : ""
              }
              ${
                resume.skills.concepts.length
                  ? `
                <tr>
                  <td class="label">Core Concepts</td>
                  <td class="val">: ${resume.skills.concepts.join(", ")}</td>
                </tr>
              `
                  : ""
              }
            </table>
          </div>

          <!-- Experience -->
          ${
            resume.experience.length
              ? `
          <div class="section">
            <h2 class="section-title">Experience & Internships</h2>
            ${resume.experience
              .map(
                (exp) => `
              <div class="entry-row">
                <div class="entry-header">
                  <span class="entry-title">${exp.role}</span>
                  <span class="entry-meta">${exp.duration}</span>
                </div>
                <div class="entry-header">
                  <span class="entry-sub">${exp.company}</span>
                  <span class="entry-meta">${exp.location || ""}</span>
                </div>
                ${exp.responsibilities ? `<div class="entry-desc">${exp.responsibilities}</div>` : ""}
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Projects -->
          ${
            resume.projects.length
              ? `
          <div class="section">
            <h2 class="section-title">Technical Projects</h2>
            ${resume.projects
              .map(
                (proj) => `
              <div class="entry-row">
                <div class="entry-header">
                  <span class="entry-title">${proj.title}</span>
                  <span class="entry-meta">${proj.link || ""}</span>
                </div>
                ${proj.technologies ? `<div style="font-size: 8pt; color: #4b5563; font-weight: 600; margin-bottom: 2px;">${proj.technologies}</div>` : ""}
                ${proj.description ? `<div class="entry-desc">${proj.description}</div>` : ""}
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Education -->
          ${
            resume.education.length
              ? `
          <div class="section">
            <h2 class="section-title">Education</h2>
            ${resume.education
              .map(
                (edu) => `
              <div class="entry-row">
                <div class="entry-header">
                  <span class="entry-title">${edu.degree}</span>
                  <span class="entry-meta">${edu.year}</span>
                </div>
                <div class="entry-header">
                  <span class="entry-sub">${edu.institution}${edu.location ? `, ${edu.location}` : ""}</span>
                  <span class="entry-meta">${edu.score}</span>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Certifications -->
          ${
            resume.certifications.length
              ? `
          <div class="section">
            <h2 class="section-title">Certifications</h2>
            ${resume.certifications
              .map(
                (cert) => `
              <div class="entry-row">
                <div class="entry-header">
                  <span class="entry-title">${cert.name} — ${cert.issuer}</span>
                  <span class="entry-meta">${cert.date}</span>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <!-- Achievements -->
          ${
            resume.achievements.length
              ? `
          <div class="section">
            <h2 class="section-title">Achievements & Leadership</h2>
            ${resume.achievements
              .map(
                (ach) => `
              <div class="entry-row">
                <div class="entry-header">
                  <span class="entry-title">${ach.title}</span>
                  <span class="entry-meta">${ach.year}</span>
                </div>
                ${ach.description ? `<div class="entry-desc">${ach.description}</div>` : ""}
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()
    onToast("Opening print dialogue. Select 'Save as PDF' to download! 📄")
  }

  // Section categories for the top pill row
  const sectionPills: { id: SectionKey; label: string; icon: string }[] = [
    { id: "personal", label: "Personal", icon: "👤" },
    { id: "summary", label: "Summary", icon: "📄" },
    { id: "education", label: "Education", icon: "🎓" },
    { id: "skills", label: "Skills", icon: "⚡" },
    { id: "experience", label: "Experience", icon: "💼" },
    { id: "projects", label: "Projects", icon: "🪄" },
    { id: "certifications", label: "Certifications", icon: "📜" },
    { id: "achievements", label: "Achievements", icon: "🏆" },
  ]

  // Accordion rows configuration matching reference screenshot
  const accordionItems: {
    id: SectionKey
    title: string
    icon: string
    badgeBg: string
    colorClass: string
  }[] = [
    {
      id: "personal",
      title: "Personal Information",
      icon: "👤",
      badgeBg: "bg-purple-100",
      colorClass: "text-[#5c3cd6]",
    },
    {
      id: "summary",
      title: "Professional Summary",
      icon: "📄",
      badgeBg: "bg-emerald-100",
      colorClass: "text-emerald-700",
    },
    {
      id: "education",
      title: "Education",
      icon: "🎓",
      badgeBg: "bg-teal-100",
      colorClass: "text-teal-700",
    },
    {
      id: "skills",
      title: "Technical Skills",
      icon: "</>",
      badgeBg: "bg-purple-100",
      colorClass: "text-[#5c3cd6]",
    },
    {
      id: "experience",
      title: "Experience & Internships",
      icon: "💼",
      badgeBg: "bg-blue-100",
      colorClass: "text-blue-700",
    },
    {
      id: "projects",
      title: "Projects",
      icon: "📁",
      badgeBg: "bg-amber-100",
      colorClass: "text-amber-700",
    },
    {
      id: "certifications",
      title: "Certifications",
      icon: "📜",
      badgeBg: "bg-purple-100",
      colorClass: "text-purple-700",
    },
    {
      id: "achievements",
      title: "Achievements & Leadership",
      icon: "🏆",
      badgeBg: "bg-indigo-100",
      colorClass: "text-indigo-700",
    },
  ]

  return (
    <div className="resume-builder-page flex flex-col gap-3.5 w-full max-w-full min-w-0 box-border pb-12">
      {/* 1. TOP CARD: Title, Subtitle, and Top Action Buttons */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-zinc-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0 border border-purple-100">
            <Icon name="document" size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 leading-tight">
              Resume Building
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              Create and customize your professional resume with live preview and
              download as PDF.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Mobile View Toggle */}
          <div className="lg:hidden flex rounded-full bg-zinc-100 p-0.5 border border-zinc-200">
            <button
              onClick={() => setMobileView("editor")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                mobileView === "editor"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Editor
            </button>
            <button
              onClick={() => setMobileView("preview")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                mobileView === "preview"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Reset Button */}
          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="px-4 h-[38px] rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Reset or Clear Resume"
          >
            <span>↺</span>
            <span>Reset</span>
          </button>

          {/* Save Resume Button */}
          <button
            onClick={handleSave}
            className={`px-5 h-[38px] rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isSaved
                ? "bg-[#905FEB] hover:bg-[#7e4bdc]"
                : "bg-purple-600 hover:bg-purple-700 animate-pulse"
            }`}
          >
            <span>💾</span>
            <span>{isSaved ? "Save Resume" : "Save Resume *"}</span>
          </button>

          {/* Download PDF Button */}
          <button
            onClick={handlePrintOrDownload}
            className="px-5 h-[38px] rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
            title="Download PDF"
          >
            <span>📥</span>
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Reset or Clear Resume?
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Choose whether to restore the default sample template or clear
                all fields.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleResetToDefault}
                className="w-full py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Restore Default Template
              </button>
              <button
                onClick={handleClearAll}
                className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold cursor-pointer transition-colors"
              >
                Clear All Fields (Blank)
              </button>
              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CATEGORY NAV PILLS ROW */}
      <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-sm border border-zinc-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {sectionPills.map((pill) => {
          const isActive = expandedSection === pill.id
          return (
            <button
              key={pill.id}
              onClick={() => setExpandedSection(pill.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-2 shrink-0 ${
                isActive
                  ? "bg-[#5b4fe9] text-white shadow-sm font-bold"
                  : "bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200/90 shadow-2xs"
              }`}
            >
              <span>{pill.icon}</span>
              <span>{pill.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. MAIN 2-COLUMN GRID: Accordion Editor (Left) & Google PDF Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Unified Accordion Card */}
        <div
          className={`lg:col-span-6 ${
            mobileView === "editor" ? "block" : "hidden lg:block"
          }`}
        >
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 overflow-hidden divide-y divide-zinc-100">
            {accordionItems.map((item) => {
              const isExpanded = expandedSection === item.id

              return (
                <div key={item.id} className="transition-all">
                  {/* Accordion Row Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(item.id)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-zinc-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-6 h-6 rounded-md ${item.badgeBg} ${item.colorClass} flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {item.icon}
                      </span>
                      <span className="text-xs font-bold text-zinc-900">
                        {item.title}
                      </span>
                    </div>
                    <span className="text-zinc-400 font-bold text-xs">
                      {isExpanded ? "⌃" : ">"}
                    </span>
                  </button>

                  {/* Expanded Section Body */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-zinc-100 animate-in fade-in space-y-4">
                    {/* A. PERSONAL INFORMATION */}
                    {item.id === "personal" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={resume.personalInfo.fullName}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("fullName", e.target.value)
                            }
                            placeholder="Srimanth Adepu"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Professional Headline
                          </label>
                          <input
                            type="text"
                            value={resume.personalInfo.headline}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("headline", e.target.value)
                            }
                            placeholder="AI & Machine Learning Engineer | Full Stack Developer"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            value={resume.personalInfo.email}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("email", e.target.value)
                            }
                            placeholder="srimanth@quantum.ai"
                            className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none bg-white ${
                              !isEmailValid(resume.personalInfo.email)
                                ? "border-red-400 focus:border-red-500"
                                : "border-zinc-200 focus:border-[#4f46e5]"
                            }`}
                          />
                          {!isEmailValid(resume.personalInfo.email) && (
                            <p className="text-[10px] text-red-500 mt-1">
                              Please enter a valid email format.
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={resume.personalInfo.phone}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("phone", e.target.value)
                            }
                            placeholder="+91 98765 43210"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Location / City
                          </label>
                          <input
                            type="text"
                            value={resume.personalInfo.location}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("location", e.target.value)
                            }
                            placeholder="Hyderabad, Telangana, India"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            LinkedIn Profile
                          </label>
                          <input
                            type="text"
                            value={resume.personalInfo.linkedin}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("linkedin", e.target.value)
                            }
                            placeholder="linkedin.com/in/srimanthadep"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            GitHub Handle / URL
                          </label>
                          <input
                            type="text"
                            value={resume.personalInfo.github}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("github", e.target.value)
                            }
                            placeholder="github.com/srimanthadep"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Portfolio / Personal Website
                          </label>
                          <input
                            type="text"
                            value={resume.personalInfo.portfolio}
                            onChange={(e) =>
                              handleUpdatePersonalInfo("portfolio", e.target.value)
                            }
                            placeholder="srimanth.dev"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                          />
                        </div>
                      </div>
                    )}

                    {/* B. PROFESSIONAL SUMMARY */}
                    {item.id === "summary" && (
                      <div className="space-y-3 pt-2">
                        <textarea
                          rows={5}
                          value={resume.summary}
                          onChange={(e) => {
                            setResume((prev) => ({
                              ...prev,
                              summary: e.target.value,
                            }))
                            setIsSaved(false)
                          }}
                          placeholder="Write a concise overview highlighting your background, core competencies, and career goals..."
                          className="w-full p-3 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5] leading-relaxed"
                        />
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span>
                            Words:{" "}
                            {resume.summary.split(/\s+/).filter(Boolean).length}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setResume((prev) => ({
                                ...prev,
                                summary: defaultResumeData.summary,
                              }))
                              setIsSaved(false)
                            }}
                            className="text-[#4f46e5] hover:underline font-semibold cursor-pointer"
                          >
                            Reset to Recommended Summary
                          </button>
                        </div>
                      </div>
                    )}

                    {/* C. EDUCATION */}
                    {item.id === "education" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddEducation}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>Add Education</span>
                          </button>
                        </div>

                        {resume.education.map((edu, idx) => (
                          <div
                            key={edu.id}
                            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">
                                Degree #{idx + 1}
                              </span>
                              <button
                                onClick={() => handleRemoveEducation(edu.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Degree / Major *
                                </label>
                                <input
                                  type="text"
                                  value={edu.degree}
                                  onChange={(e) =>
                                    handleUpdateEducation(
                                      edu.id,
                                      "degree",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="e.g. B.Tech in Artificial Intelligence"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Institution *
                                </label>
                                <input
                                  type="text"
                                  value={edu.institution}
                                  onChange={(e) =>
                                    handleUpdateEducation(
                                      edu.id,
                                      "institution",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Quantum School of AI"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Duration / Year
                                </label>
                                <input
                                  type="text"
                                  value={edu.year}
                                  onChange={(e) =>
                                    handleUpdateEducation(
                                      edu.id,
                                      "year",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="2023 - 2027"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  CGPA / Score
                                </label>
                                <input
                                  type="text"
                                  value={edu.score}
                                  onChange={(e) =>
                                    handleUpdateEducation(
                                      edu.id,
                                      "score",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="CGPA: 3.88 / 4.0"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Location
                                </label>
                                <input
                                  type="text"
                                  value={edu.location || ""}
                                  onChange={(e) =>
                                    handleUpdateEducation(
                                      edu.id,
                                      "location",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Hyderabad, India"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* D. TECHNICAL SKILLS */}
                    {item.id === "skills" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex flex-wrap items-center gap-2 p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                          <StudentDropdown<"languages" | "frameworks" | "tools" | "concepts">
                            value={selectedSkillCategory}
                            onChange={(val) => setSelectedSkillCategory(val as any)}
                            className="w-44"
                            options={[
                              { value: "languages", label: "Languages" },
                              { value: "frameworks", label: "Frameworks & Tools" },
                              { value: "tools", label: "Developer Tools" },
                              { value: "concepts", label: "Core Concepts" },
                            ]}
                          />
                          <input
                            type="text"
                            value={newSkillText}
                            onChange={(e) => setNewSkillText(e.target.value)}
                            onKeyDown={(e) =>
                              e.key === "Enter" && handleAddSkill()
                            }
                            placeholder="Type a skill and hit Enter..."
                            className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs rounded-lg border border-purple-200 bg-white focus:outline-none"
                          />
                          <button
                            onClick={handleAddSkill}
                            className="px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold cursor-pointer"
                          >
                            + Add Tag
                          </button>
                        </div>

                        {(
                          [
                            { key: "languages", label: "Languages" },
                            { key: "frameworks", label: "Frameworks & Tools" },
                            { key: "tools", label: "Developer Tools" },
                            { key: "concepts", label: "Core Concepts" },
                          ] as const
                        ).map((grp) => (
                          <div key={grp.key} className="space-y-1">
                            <span className="text-[11px] font-bold text-zinc-700">
                              {grp.label}:
                            </span>
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200">
                              {resume.skills[grp.key].map((sk) => (
                                <span
                                  key={sk}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-zinc-200 text-zinc-800 shadow-2xs"
                                >
                                  <span>{sk}</span>
                                  <button
                                    onClick={() => handleRemoveSkill(grp.key, sk)}
                                    className="text-zinc-400 hover:text-red-500 cursor-pointer text-[10px]"
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* E. EXPERIENCE */}
                    {item.id === "experience" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddExperience}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>Add Experience</span>
                          </button>
                        </div>

                        {resume.experience.map((exp, idx) => (
                          <div
                            key={exp.id}
                            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">
                                Role #{idx + 1}
                              </span>
                              <button
                                onClick={() => handleRemoveExperience(exp.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Role / Title *
                                </label>
                                <input
                                  type="text"
                                  value={exp.role}
                                  onChange={(e) =>
                                    handleUpdateExperience(
                                      exp.id,
                                      "role",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="AI Research Intern"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Company / Organization *
                                </label>
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) =>
                                    handleUpdateExperience(
                                      exp.id,
                                      "company",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="XYZ Research Labs"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Duration
                                </label>
                                <input
                                  type="text"
                                  value={exp.duration}
                                  onChange={(e) =>
                                    handleUpdateExperience(
                                      exp.id,
                                      "duration",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="May 2024 - Aug 2024"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Location
                                </label>
                                <input
                                  type="text"
                                  value={exp.location || ""}
                                  onChange={(e) =>
                                    handleUpdateExperience(
                                      exp.id,
                                      "location",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Hyderabad, India"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Responsibilities (Bullet points)
                                </label>
                                <textarea
                                  rows={3}
                                  value={exp.responsibilities}
                                  onChange={(e) =>
                                    handleUpdateExperience(
                                      exp.id,
                                      "responsibilities",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="• Built data processing pipelines..."
                                  className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* F. PROJECTS */}
                    {item.id === "projects" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddProject}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>Add Project</span>
                          </button>
                        </div>

                        {resume.projects.map((proj, idx) => (
                          <div
                            key={proj.id}
                            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">
                                Project #{idx + 1}
                              </span>
                              <button
                                onClick={() => handleRemoveProject(proj.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Project Title *
                                </label>
                                <input
                                  type="text"
                                  value={proj.title}
                                  onChange={(e) =>
                                    handleUpdateProject(
                                      proj.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Enterprise RAG Knowledge Assistant"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Technologies Used
                                </label>
                                <input
                                  type="text"
                                  value={proj.technologies}
                                  onChange={(e) =>
                                    handleUpdateProject(
                                      proj.id,
                                      "technologies",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Python, FastAPI, React.js"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Link / Repo
                                </label>
                                <input
                                  type="text"
                                  value={proj.link || ""}
                                  onChange={(e) =>
                                    handleUpdateProject(
                                      proj.id,
                                      "link",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="github.com/srimanthadep/enterprise-rag"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold text-zinc-600 mb-0.5">
                                  Description (Bullet points)
                                </label>
                                <textarea
                                  rows={3}
                                  value={proj.description}
                                  onChange={(e) =>
                                    handleUpdateProject(
                                      proj.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="• Built an AI-powered assistant..."
                                  className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* G. CERTIFICATIONS */}
                    {item.id === "certifications" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddCertification}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>Add Certificate</span>
                          </button>
                        </div>

                        {resume.certifications.map((cert, idx) => (
                          <div
                            key={cert.id}
                            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">
                                Certificate #{idx + 1}
                              </span>
                              <button
                                onClick={() => handleRemoveCertification(cert.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  value={cert.name}
                                  onChange={(e) =>
                                    handleUpdateCertification(
                                      cert.id,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Deep Learning Specialization"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={cert.issuer}
                                  onChange={(e) =>
                                    handleUpdateCertification(
                                      cert.id,
                                      "issuer",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="DeepLearning.AI & Coursera"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={cert.date}
                                  onChange={(e) =>
                                    handleUpdateCertification(
                                      cert.id,
                                      "date",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="2025"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* H. ACHIEVEMENTS */}
                    {item.id === "achievements" && (
                      <div className="space-y-3 pt-2">
                        <div className="flex justify-end">
                          <button
                            onClick={handleAddAchievement}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <span>+</span>
                            <span>Add Achievement</span>
                          </button>
                        </div>

                        {resume.achievements.map((ach, idx) => (
                          <div
                            key={ach.id}
                            className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-800">
                                Honor #{idx + 1}
                              </span>
                              <button
                                onClick={() => handleRemoveAchievement(ach.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                              >
                                ✕ Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  value={ach.title}
                                  onChange={(e) =>
                                    handleUpdateAchievement(
                                      ach.id,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="1st Place — National AI Hackathon"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  value={ach.year}
                                  onChange={(e) =>
                                    handleUpdateAchievement(
                                      ach.id,
                                      "year",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="2024"
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <textarea
                                  rows={2}
                                  value={ach.description}
                                  onChange={(e) =>
                                    handleUpdateAchievement(
                                      ach.id,
                                      "description",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Description / Context..."
                                  className="w-full p-2 text-xs rounded-lg border border-zinc-200 bg-white focus:outline-none focus:border-[#4f46e5]"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          </div>
        </div>

        {/* RIGHT COLUMN: Google PDF-Style Live Preview */}
        <div
          className={`lg:col-span-6 flex flex-col ${
            mobileView === "preview" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Google PDF Viewer Toolbar */}
          <div className="google-pdf-toolbar flex items-center justify-between px-4 py-2.5 bg-[#323639] text-white rounded-t-2xl shadow-md border-b border-zinc-700">
            {/* Left: Hamburger & Document Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-zinc-400 text-sm cursor-pointer hover:text-white">
                ☰
              </span>
              <span className="text-xs font-semibold truncate text-zinc-100 tracking-tight">
                {resume.personalInfo.fullName
                  ? `${resume.personalInfo.fullName.replace(/\s+/g, "_")}_Resume.pdf`
                  : "Srimanth_Adepu_Resume.pdf"}
              </span>
            </div>

            {/* Center: Page Counter, Divider, Zoom, Fit, Rotate */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-300">
                <span className="font-mono">1 / 2</span>
                <span className="text-zinc-600">|</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                  className="hover:text-white px-1 cursor-pointer"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="font-mono">{zoomLevel}% ▾</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                  className="hover:text-white px-1 cursor-pointer"
                  title="Zoom In"
                >
                  +
                </button>
                <span
                  className="hover:text-white cursor-pointer px-1"
                  title="Fit to Width"
                >
                  [ ]
                </span>
                <button
                  onClick={() => onToast("Document oriented in A4 portrait.")}
                  className="hover:text-white cursor-pointer px-1"
                  title="Rotate"
                >
                  ↻
                </button>
              </div>

              {/* Right: Download, Print, More */}
              <button
                onClick={handlePrintOrDownload}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                title="Download PDF"
              >
                📥
              </button>
              <button
                onClick={handlePrintOrDownload}
                className="p-1 rounded hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                title="Print"
              >
                🖨️
              </button>
              <span className="text-zinc-400 text-xs cursor-pointer hover:text-white">
                ⋮
              </span>
            </div>
          </div>

          {/* Google Drive PDF Canvas Grey Background */}
          <div
            ref={previewFrameRef}
            className="google-pdf-canvas relative w-full overflow-y-auto max-h-[820px] p-4 sm:p-7 bg-[#525659] rounded-b-2xl shadow-inner flex flex-col items-center border border-zinc-700/60"
          >
            {/* A4 Document White Sheet */}
            <div
              className="a4-document-sheet bg-white text-zinc-900 shadow-2xl transition-transform duration-200 origin-top box-border"
              style={{
                width: "100%",
                maxWidth: "560px",
                minHeight: "792px",
                padding: "32px 34px",
                transform: `scale(${zoomLevel / 100})`,
                borderRadius: "2px",
                boxShadow: "0 10px 32px rgba(0, 0, 0, 0.45)",
                fontSize: "9.5px",
                lineHeight: "1.4",
              }}
            >
              {/* Document Header */}
              <div className="text-center pb-2 mb-2.5 border-b border-zinc-200">
                <h1 className="text-[22px] font-serif font-bold text-zinc-950 tracking-tight leading-none">
                  {resume.personalInfo.fullName || "Srimanth Adepu"}
                </h1>
                {resume.personalInfo.headline && (
                  <p className="text-[10px] font-bold text-zinc-800 mt-1">
                    {resume.personalInfo.headline}
                  </p>
                )}
                <div className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-0.5 text-[8.5px] text-zinc-600 mt-1.5">
                  {resume.personalInfo.email && (
                    <span>✉ {resume.personalInfo.email}</span>
                  )}
                  {resume.personalInfo.phone && (
                    <span>☎ {resume.personalInfo.phone}</span>
                  )}
                  {resume.personalInfo.location && (
                    <span>📍 {resume.personalInfo.location}</span>
                  )}
                </div>
                <div className="flex flex-wrap justify-center items-center gap-x-2.5 gap-y-0.5 text-[8.5px] text-[#4f46e5] font-medium mt-0.5">
                  {resume.personalInfo.linkedin && (
                    <span>{resume.personalInfo.linkedin}</span>
                  )}
                  {resume.personalInfo.github && (
                    <span>{resume.personalInfo.github}</span>
                  )}
                  {resume.personalInfo.portfolio && (
                    <span>{resume.personalInfo.portfolio}</span>
                  )}
                </div>
              </div>

              {/* 1. Summary */}
              {resume.summary && (
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>PROFESSIONAL SUMMARY</span>
                  </div>
                  <p className="text-[9px] text-zinc-700 text-justify leading-relaxed">
                    {resume.summary}
                  </p>
                </div>
              )}

              {/* 2. Technical Skills */}
              {(resume.skills.languages.length > 0 ||
                resume.skills.frameworks.length > 0 ||
                resume.skills.tools.length > 0) && (
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>TECHNICAL SKILLS</span>
                  </div>
                  <table className="w-full text-[8.5px] border-collapse">
                    <tbody>
                      {resume.skills.languages.length > 0 && (
                        <tr>
                          <td className="w-28 font-bold text-zinc-900 py-0.5">
                            Languages
                          </td>
                          <td className="text-zinc-700 py-0.5">
                            : {resume.skills.languages.join(", ")}
                          </td>
                        </tr>
                      )}
                      {resume.skills.frameworks.length > 0 && (
                        <tr>
                          <td className="w-28 font-bold text-zinc-900 py-0.5">
                            Frameworks & Tools
                          </td>
                          <td className="text-zinc-700 py-0.5">
                            : {resume.skills.frameworks.join(", ")}
                          </td>
                        </tr>
                      )}
                      {resume.skills.tools.length > 0 && (
                        <tr>
                          <td className="w-28 font-bold text-zinc-900 py-0.5">
                            Developer Tools
                          </td>
                          <td className="text-zinc-700 py-0.5">
                            : {resume.skills.tools.join(", ")}
                          </td>
                        </tr>
                      )}
                      {resume.skills.concepts.length > 0 && (
                        <tr>
                          <td className="w-28 font-bold text-zinc-900 py-0.5">
                            Core Concepts
                          </td>
                          <td className="text-zinc-700 py-0.5">
                            : {resume.skills.concepts.join(", ")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. Experience */}
              {resume.experience.length > 0 && (
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>EXPERIENCE & INTERNSHIPS</span>
                  </div>
                  <div className="space-y-1.5">
                    {resume.experience.map((exp) => (
                      <div key={exp.id}>
                        <div className="flex items-baseline justify-between text-[9px]">
                          <span className="font-bold text-zinc-900">
                            {exp.role}
                          </span>
                          <span className="text-[8px] font-medium text-zinc-500">
                            {exp.duration}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-[8.5px] text-zinc-600">
                          <span className="font-semibold">{exp.company}</span>
                          <span className="text-[8px] text-zinc-400">
                            {exp.location}
                          </span>
                        </div>
                        {exp.responsibilities && (
                          <div className="text-[8.5px] text-zinc-600 mt-0.5 leading-tight whitespace-pre-line">
                            {exp.responsibilities}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. Projects */}
              {resume.projects.length > 0 && (
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>TECHNICAL PROJECTS</span>
                  </div>
                  <div className="space-y-1.5">
                    {resume.projects.map((proj) => (
                      <div key={proj.id}>
                        <div className="flex items-baseline justify-between text-[9px]">
                          <span className="font-bold text-zinc-900">
                            {proj.title}
                          </span>
                          <span className="text-[8px] font-medium text-zinc-500">
                            {proj.link || ""}
                          </span>
                        </div>
                        {proj.technologies && (
                          <div className="text-[8px] font-semibold text-zinc-600">
                            {proj.technologies}
                          </div>
                        )}
                        {proj.description && (
                          <div className="text-[8.5px] text-zinc-600 mt-0.5 leading-tight whitespace-pre-line">
                            {proj.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Education */}
              {resume.education.length > 0 && (
                <div className="mb-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>EDUCATION</span>
                  </div>
                  <div className="space-y-1">
                    {resume.education.map((edu) => (
                      <div key={edu.id}>
                        <div className="flex items-baseline justify-between text-[9px]">
                          <span className="font-bold text-zinc-900">
                            {edu.degree}
                          </span>
                          <span className="text-[8px] font-medium text-zinc-500">
                            {edu.year}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-[8.5px] text-zinc-600">
                          <span>
                            {edu.institution}
                            {edu.location ? `, ${edu.location}` : ""}
                          </span>
                          <span className="font-semibold text-zinc-700">
                            {edu.score}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. Certifications */}
              {resume.certifications.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>CERTIFICATIONS</span>
                  </div>
                  <div className="space-y-0.5 text-[8.5px]">
                    {resume.certifications.map((cert) => (
                      <div
                        key={cert.id}
                        className="flex items-baseline justify-between"
                      >
                        <div>
                          <span className="font-bold text-zinc-900">
                            {cert.name}
                          </span>
                          <span className="text-zinc-600"> — {cert.issuer}</span>
                        </div>
                        <span className="text-[8px] text-zinc-500">
                          {cert.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. Achievements */}
              {resume.achievements.length > 0 && (
                <div className="mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-zinc-900 border-b border-zinc-200 pb-0.5 mb-1">
                    <span className="w-[3px] h-3 bg-[#4f46e5] rounded-full inline-block" />
                    <span>ACHIEVEMENTS & LEADERSHIP</span>
                  </div>
                  <div className="space-y-1 text-[8.5px]">
                    {resume.achievements.map((ach) => (
                      <div key={ach.id}>
                        <div className="flex items-baseline justify-between">
                          <span className="font-bold text-zinc-900">
                            {ach.title}
                          </span>
                          <span className="text-[8px] text-zinc-500">
                            {ach.year}
                          </span>
                        </div>
                        {ach.description && (
                          <p className="text-[8px] text-zinc-600 leading-tight">
                            {ach.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResumeBuildingPage
