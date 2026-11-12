import { useCallback, useEffect, useState } from "react"
import { api, ApiError, invalidateCache } from "@/lib/api"

export const ALUMNI_TAGS = [
  "Career Gap",
  "Fresher",
  "Non-Tech to Tech",
  "Switcher",
  "Upskiller",
] as const

export type AlumniTag = (typeof ALUMNI_TAGS)[number]

export const TAG_CONFIG: Record<AlumniTag, string> = {
  "Career Gap":
    "bg-[#EBF3FF] text-[#0066FF] dark:bg-blue-500/20 dark:text-blue-200 dark:border dark:border-blue-500/30",
  "Fresher":
    "bg-[#ECFDF5] text-[#059669] dark:bg-emerald-500/20 dark:text-emerald-200 dark:border dark:border-emerald-500/30",
  "Non-Tech to Tech":
    "bg-[#F5F3FF] text-[#7C3AED] dark:bg-purple-500/20 dark:text-purple-200 dark:border dark:border-purple-500/30",
  "Switcher":
    "bg-[#EFF6FF] text-[#2563EB] dark:bg-sky-500/20 dark:text-sky-200 dark:border dark:border-sky-500/30",
  "Upskiller":
    "bg-[#FFF7ED] text-[#EA580C] dark:bg-amber-500/20 dark:text-amber-200 dark:border dark:border-amber-500/30",
}

export interface AlumniProfile {
  id: string
  name: string
  avatar?: string
  tag: AlumniTag
  currentCompany: string
  companyLogo?: string
  role: string
  hike: string
  lmsProgram: string
  priorRole: string
  priorCompany: string
  location: string
  degree: string
  package?: string
  bio: string
  prepStrategy: string
  skills: string[]
  linkedInUrl?: string
}

export interface PlacementStory {
  id: string
  firstName: string
  fullName: string
  company: string
  role: string
  package: string
  head: string
  quote: string
  highlight: string
  accent: string
  glow: string
  kickerClass: string
  avatarBg: string
}

export interface PlacementItem {
  id?: string
  name: string
  company: string
  role?: string
  color?: string
  src?: string
  offsetY?: number
}

export interface AlumniMetrics {
  studentsPlaced: string
  highestHike: string
  highestPackage: string
  hiringPartners: string
}

export interface AlumniNetworkState {
  profiles: AlumniProfile[]
  stories: PlacementStory[]
  recentPlacements: PlacementItem[]
  metrics: AlumniMetrics
}

export interface StoryThemePreset {
  id: string
  label: string
  accent: string
  glow: string
  kickerClass: string
  avatarBg: string
}

export const STORY_THEMES: readonly StoryThemePreset[] = [
  {
    id: "blue",
    label: "Royal Blue",
    accent: "#2563EB",
    glow: "rgba(37, 99, 235, 0.38)",
    kickerClass: "text-sky-300",
    avatarBg: "from-blue-500 to-indigo-600",
  },
  {
    id: "teal",
    label: "Emerald Teal",
    accent: "#0D9488",
    glow: "rgba(13, 148, 136, 0.36)",
    kickerClass: "text-teal-300",
    avatarBg: "from-teal-500 to-emerald-600",
  },
  {
    id: "violet",
    label: "Violet",
    accent: "#7C3AED",
    glow: "rgba(124, 58, 237, 0.36)",
    kickerClass: "text-violet-300",
    avatarBg: "from-violet-500 to-purple-600",
  },
  {
    id: "sky",
    label: "Ocean Sky",
    accent: "#0284C7",
    glow: "rgba(2, 132, 199, 0.36)",
    kickerClass: "text-cyan-300",
    avatarBg: "from-sky-500 to-blue-600",
  },
  {
    id: "amber",
    label: "Amber Gold",
    accent: "#D97706",
    glow: "rgba(217, 119, 6, 0.34)",
    kickerClass: "text-amber-300",
    avatarBg: "from-amber-500 to-orange-600",
  },
]

export const KNOWN_COMPANY_LOGOS: { name: string; logo: string }[] = [
  { name: "Meesho", logo: "/logos/meesho.svg" },
  { name: "Uber", logo: "/logos/uber.svg" },
  { name: "ZS", logo: "/logos/zs.svg" },
  { name: "Byborg", logo: "/logos/byborg.svg" },
  { name: "Mr. Cooper", logo: "/logos/mrcooper.svg" },
  { name: "Zepto", logo: "/logos/zepto.svg" },
  { name: "1DS", logo: "/logos/1ds.svg" },
  { name: "Bhanzu", logo: "/logos/bhanzu.svg" },
  { name: "Flipkart", logo: "/logos/flipkart.svg" },
  { name: "Razorpay", logo: "/logos/razorpay.svg" },
  { name: "IBM", logo: "/logos/ibm.svg" },
  { name: "Hexaware", logo: "/logos/hexaware.svg" },
  { name: "Amazon", logo: "/logos/amazon.svg" },
  { name: "Cognizant", logo: "/logos/cognizant.svg" },
  { name: "Curefit", logo: "/logos/curefit.svg" },
  { name: "DP World", logo: "/logos/dpworld.svg" },
  { name: "EY", logo: "/logos/ey.svg" },
  { name: "IndiGo", logo: "/logos/indigo.svg" },
  { name: "LTIMindtree", logo: "/logos/ltimindtree.svg" },
  { name: "Myntra", logo: "/logos/myntra.svg" },
  { name: "Optum", logo: "/logos/optum.svg" },
]

export function resolveCompanyLogo(company: string, explicitLogo?: string): string {
  const trimmed = (explicitLogo ?? "").trim()
  if (trimmed) return trimmed
  const normalized = company.trim().toLowerCase().replace(/[^a-z0-9]/g, "")
  if (!normalized) return ""
  const match = KNOWN_COMPANY_LOGOS.find(
    (entry) => entry.name.toLowerCase().replace(/[^a-z0-9]/g, "") === normalized,
  )
  return match?.logo ?? ""
}

export const DEFAULT_ALUMNI_METRICS: AlumniMetrics = {
  studentsPlaced: "4,500+",
  highestHike: "500%",
  highestPackage: "₹1.5 Cr",
  hiringPartners: "800+",
}

export const INITIAL_ALUMNI_DIRECTORY: AlumniProfile[] = [
  {
    id: "alumni-anuraj",
    name: "Anuraj Satardekar",
    tag: "Career Gap",
    currentCompany: "meesho",
    companyLogo: "/logos/meesho.svg",
    role: "Data Analyst",
    hike: "100% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "Working Professional",
    priorCompany: "Tech Company",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹18 LPA",
    bio: "After taking a 2-year career gap for family commitments, restarting my technical career was daunting. The structured mentorship, intensive SQL sprints, and real-world business case studies at Quantum School gave me the practical edge to clear Meesho's analytics bar.",
    prepStrategy: "Focused on end-to-end data pipelines, product metrics (retention, funnels), and daily timed LeetCode + SQL interview simulations.",
    skills: ["SQL", "Python", "Tableau", "Product Analytics", "A/B Testing", "ETL Pipelines"],
    linkedInUrl: "https://linkedin.com/in/anuraj-satardekar",
  },
  {
    id: "alumni-sandeep",
    name: "Sandeep gowda",
    tag: "Upskiller",
    currentCompany: "Uber",
    companyLogo: "/logos/uber.svg",
    role: "Data Analyst",
    hike: "100% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "Working Professional",
    priorCompany: "Tech Company",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹24 LPA",
    bio: "I had 2 years of traditional backend support experience and wanted to move into high-scale algorithmic analytics. Learning distributed query engines and geospatial data workflows at Quantum School helped me crack Uber's mobility data team.",
    prepStrategy: "Deep-dived into big data indexing, Apache Spark basics, and Uber's open-source case studies around dynamic pricing algorithms.",
    skills: ["Python", "SQL", "Pandas", "Apache Spark", "Machine Learning", "Dashboarding"],
    linkedInUrl: "https://linkedin.com/in/sandeep-gowda",
  },
  {
    id: "alumni-arnav",
    name: "Arnav Bangaria",
    tag: "Switcher",
    currentCompany: "ZS",
    companyLogo: "/logos/zs.svg",
    role: "Decision Analytics Associate",
    hike: "63% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "Working Professional",
    priorCompany: "Tech Company",
    location: "Pune",
    degree: "BCA / MCA",
    package: "₹16.5 LPA",
    bio: "Switching from general IT support to specialized decision analytics required unlearning old habits. The 1:1 mentor mock interviews and healthcare client simulations at Quantum School matched the exact interview format at ZS.",
    prepStrategy: "Solved 40+ client case frameworks, business problem scoping scenarios, and quantitative mental aptitude tests.",
    skills: ["SQL", "Excel & VBA", "Power BI", "Decision Science", "Predictive Analytics"],
    linkedInUrl: "https://linkedin.com/in/arnav-bangaria",
  },
  {
    id: "alumni-rhea",
    name: "Rhea Chawla",
    tag: "Switcher",
    currentCompany: "Byborg",
    companyLogo: "/logos/byborg.svg",
    role: "Cloud Systems Engineer",
    hike: "210% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "College Graduate",
    priorCompany: "Delhi University",
    location: "International",
    degree: "B.Tech / BE",
    package: "₹50 LAKHS+",
    bio: "From Delhi directly to Luxembourg! The distributed systems architecture labs and live microservices debugging modules at Quantum School gave me European enterprise-grade coding competency.",
    prepStrategy: "Built an open-source distributed cache in Go and practiced concurrency patterns, API rate limiting, and Kubernetes cluster deployments.",
    skills: ["Go", "Kubernetes", "AWS", "Distributed Systems", "Docker", "gRPC"],
    linkedInUrl: "https://linkedin.com/in/rhea-chawla",
  },
  {
    id: "alumni-shubhadip",
    name: "Subhadip Das",
    tag: "Non-Tech to Tech",
    currentCompany: "Mr. Cooper",
    companyLogo: "/logos/mrcooper.svg",
    role: "Data Engineer",
    hike: "180% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "State Level Cricketer",
    priorCompany: "Sports Academy",
    location: "Bangalore",
    degree: "B.Sc / M.Sc",
    package: "₹22 LPA",
    bio: "Having dedicated years to competitive professional cricket, switching into core data engineering was a complete career pivot. Discipline from sports translated directly into marathon coding and problem-solving sessions at Quantum School.",
    prepStrategy: "Consistent 8 hours daily coding routine, building 3 full-scale data pipelines from scratch and writing exhaustive unit tests.",
    skills: ["Python", "Apache Spark", "Airflow", "PostgreSQL", "Kafka", "Data Warehousing"],
    linkedInUrl: "https://linkedin.com/in/subhadip-das",
  },
  {
    id: "alumni-nikita",
    name: "Nikita Singh Raghav",
    tag: "Upskiller",
    currentCompany: "Zepto",
    companyLogo: "/logos/zepto.svg",
    role: "Product Analyst",
    hike: "140% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "Business Analyst",
    priorCompany: "Consulting Firm",
    location: "Mumbai",
    degree: "BCA / MCA",
    package: "₹19 LPA",
    bio: "Instead of spending 2 years on an expensive general MBA, I decided to upskill directly in fast-commerce product analytics at Quantum School. Zepto's real-time delivery logistics was the exact domain challenge I trained for.",
    prepStrategy: "Mastered retention curve modeling, SQL window functions, cohort churn forecasting, and live dashboard storytelling.",
    skills: ["SQL", "Product Analytics", "Amplitude", "Mixpanel", "Python", "Retention Modeling"],
    linkedInUrl: "https://linkedin.com/in/nikita-singh-raghav",
  },
  {
    id: "alumni-yoshita",
    name: "Yoshita B Shankar",
    tag: "Fresher",
    currentCompany: "1DS",
    companyLogo: "/logos/1ds.svg",
    role: "Frontend Engineer",
    hike: "120% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "College Fresher",
    priorCompany: "Anna University",
    location: "Chennai",
    degree: "B.Tech / BE",
    package: "₹14 LPA",
    bio: "Coming out of college, off-campus hiring felt impossible. Daily mentor reviews and rebuilding production-grade user interfaces at Quantum School gave me the portfolio required to land an immediate engineering role.",
    prepStrategy: "Built 5 production React + TypeScript apps with complex state machines and accessible component design systems.",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Redux Toolkit", "Web Performance"],
    linkedInUrl: "https://linkedin.com/in/yoshita-shankar",
  },
  {
    id: "alumni-anup",
    name: "Anup Dhangar",
    tag: "Career Gap",
    currentCompany: "Bhanzu",
    companyLogo: "/logos/bhanzu.svg",
    role: "Full Stack Engineer",
    hike: "160% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "1.5 Year Gap",
    priorCompany: "Self-Paced Learner",
    location: "Pune",
    degree: "B.Tech / BE",
    package: "₹17 LPA",
    bio: "After repeated job rejections due to an education gap, I rebooted my entire prep strategy with Quantum School. The daily mock evaluations and structured curriculum turned my weaknesses into strengths.",
    prepStrategy: "Solved 300+ DSA problems on Binary Search and Dynamic Programming while building full-stack Node.js + React microservices.",
    skills: ["Node.js", "React", "PostgreSQL", "Docker", "Algorithms", "System Design"],
    linkedInUrl: "https://linkedin.com/in/anup-dhangar",
  },
  {
    id: "alumni-prathmesh",
    name: "Prathmesh Potdar",
    tag: "Fresher",
    currentCompany: "Flipkart",
    companyLogo: "/logos/flipkart.svg",
    role: "Software Development Engineer",
    hike: "150% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "College Fresher",
    priorCompany: "Pune University",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹26 LPA",
    bio: "Clearing Flipkart's Machine Coding and Problem Solving rounds required high rigor. The live code pair-programming sessions at Quantum School gave me the confidence to write modular clean code under high pressure.",
    prepStrategy: "Focused on Object Oriented Design principles (SOLID), concurrency locks, and in-memory caches.",
    skills: ["Java", "Spring Boot", "Redis", "Kafka", "Design Patterns", "Clean Architecture"],
    linkedInUrl: "https://linkedin.com/in/prathmesh-potdar",
  },
  {
    id: "alumni-sakshi",
    name: "Sakshi Singh",
    tag: "Switcher",
    currentCompany: "Razorpay",
    companyLogo: "/logos/razorpay.svg",
    role: "Backend Engineer",
    hike: "175% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "QA Analyst",
    priorCompany: "Fintech Testing Co.",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹28 LPA",
    bio: "Transitioned from manual and test automation QA into backend fintech payment rails with Quantum School. Gaining hands-on expertise in ACID transactions, distributed idempotency, and high-throughput systems made this leap possible.",
    prepStrategy: "Engineered a mock payment gateway engine with idempotent checkout tokens and webhook retries.",
    skills: ["Go", "PostgreSQL", "Redis", "Fintech Systems", "Distributed Locks", "Payment Protocols"],
    linkedInUrl: "https://linkedin.com/in/sakshi-singh",
  },
  {
    id: "alumni-sai",
    name: "Sai Manikanta",
    tag: "Upskiller",
    currentCompany: "IBM",
    companyLogo: "/logos/ibm.svg",
    role: "AI & ML Specialist",
    hike: "135% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "IT Systems Admin",
    priorCompany: "Enterprise IT Services",
    location: "Hyderabad",
    degree: "B.Tech / BE",
    package: "₹21 LPA",
    bio: "Working as a systems administrator, I saw automation replacing manual provisioning. Upskilling into Agentic AI workflows, LLM fine-tuning, and model monitoring at Quantum School secured my promotion into IBM's AI lab.",
    prepStrategy: "Completed 6 capstone projects spanning RAG with vector search, LangChain agents, and quantized model deployments.",
    skills: ["Python", "PyTorch", "HuggingFace", "FastAPI", "Vector DBs", "MLOps"],
    linkedInUrl: "https://linkedin.com/in/sai-manikanta",
  },
  {
    id: "alumni-tina",
    name: "Tina Digambar Kapadnis",
    tag: "Non-Tech to Tech",
    currentCompany: "Hexaware",
    companyLogo: "/logos/hexaware.svg",
    role: "Software Engineer",
    hike: "110% hike",
    lmsProgram: "Joined Quantum School",
    priorRole: "Operations Specialist",
    priorCompany: "BPO Services",
    location: "Pune",
    degree: "Non-Engineering",
    package: "₹12.5 LPA",
    bio: "Breaking the myth that you need an engineering degree to code. The zero-to-hero fundamentals curriculum at Quantum School took me from writing my first hello world to shipping full-stack enterprise web services.",
    prepStrategy: "Practiced 3 hours every single morning before my job, taking meticulous notes and reviewing foundational JavaScript concepts.",
    skills: ["JavaScript", "React", "Node.js", "Express", "MongoDB", "REST APIs"],
    linkedInUrl: "https://linkedin.com/in/tina-kapadnis",
  },
]

export const INITIAL_PLACEMENT_STORIES: PlacementStory[] = [
  {
    id: "story-rhea",
    firstName: "Rhea",
    fullName: "Rhea Chawla",
    company: "Byborg",
    role: "International Systems Architect",
    package: "₹50 Lakhs+",
    head: "From Delhi to Luxembourg One Code at a Time",
    quote:
      "Transitioning from university to a high-scale European tech team in Luxembourg felt like a massive leap. QuantumLMS's distributed systems tracks and live system design labs gave me the exact domain knowledge to clear all technical evaluation rounds.",
    highlight: "Luxembourg Offer",
    accent: "#2563EB",
    glow: "rgba(37, 99, 235, 0.38)",
    kickerClass: "text-sky-300",
    avatarBg: "from-blue-500 to-indigo-600",
  },
  {
    id: "story-shubhadip",
    firstName: "Subhadip",
    fullName: "Subhadip Das",
    company: "Mr.Cooper",
    role: "Senior Data & Analytics Engineer",
    package: "₹21 LPA",
    head: "From Competitive Cricket to Data Analytics",
    quote:
      "I spent my college years focused entirely on competitive cricket before discovering data engineering. Building real-time analytics pipelines during the cohort bridged the entire gap and made my transition into Mr. Cooper seamless.",
    highlight: "Career Switch",
    accent: "#0D9488",
    glow: "rgba(13, 148, 136, 0.36)",
    kickerClass: "text-teal-300",
    avatarBg: "from-teal-500 to-emerald-600",
  },
  {
    id: "story-nikita",
    firstName: "Nikita",
    fullName: "Nikita Singh Raghav",
    company: "Zepto",
    role: "Product Growth & Operations",
    package: "₹19 LPA",
    head: "Why Nikita Chose Upskilling Over Waiting",
    quote:
      "Instead of waiting a full year for traditional MBA admissions, I chose to upskill in product analytics and modern tech stacks. Joining Zepto's fast-paced engineering team proved it was the right decision.",
    highlight: "Fast-Track Growth",
    accent: "#7C3AED",
    glow: "rgba(124, 58, 237, 0.36)",
    kickerClass: "text-violet-300",
    avatarBg: "from-violet-500 to-purple-600",
  },
  {
    id: "story-yoshita",
    firstName: "Yoshita",
    fullName: "Yoshita B Shankar",
    company: "1DS",
    role: "Full Stack Engineer",
    package: "₹18 LPA",
    head: "Every Late-Night Effort Built Her Tomorrow",
    quote:
      "Balancing college coursework and deep-dive coding was tough, but the consistency built resilience. The mentorship and code reviews transformed my code quality to industry standards.",
    highlight: "Daily Consistency",
    accent: "#0284C7",
    glow: "rgba(2, 132, 199, 0.36)",
    kickerClass: "text-cyan-300",
    avatarBg: "from-sky-500 to-blue-600",
  },
  {
    id: "story-anup",
    firstName: "Anup",
    fullName: "Anup Dhangar",
    company: "Bhanzu",
    role: "Core Platform Engineer",
    package: "₹16 LPA",
    head: "Success Starts When You Refuse to Settle",
    quote:
      "After facing initial rejections, I doubled down on my core algorithms and web infrastructure fundamentals. Committing to structured daily problem solving opened the door to Bhanzu.",
    highlight: "Resilience & Grit",
    accent: "#D97706",
    glow: "rgba(217, 119, 6, 0.34)",
    kickerClass: "text-amber-300",
    avatarBg: "from-amber-500 to-orange-600",
  },
]

export const INITIAL_RECENT_PLACEMENTS: PlacementItem[] = [
  {
    id: "placement-arnav",
    name: "Arnav Bangaria",
    company: "ZS",
    role: "Associate Consultant",
    color: "#e0701a",
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    id: "placement-abhishek",
    name: "Abhishek Ghosh",
    company: "Meesho",
    role: "Software Engineer",
    color: "#e0338a",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    id: "placement-sai",
    name: "Sai Manikanta",
    company: "IBM",
    role: "Cloud Specialist",
    color: "#1f5fbf",
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    id: "placement-anuraj",
    name: "Anuraj Satardekar",
    company: "Meesho",
    role: "Product Analyst",
    color: "#9b1b6e",
    src: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    id: "placement-sandeep",
    name: "Sandeep Gowda",
    company: "Uber",
    role: "Backend Engineer",
    color: "#111111",
    src: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
  {
    id: "placement-rhea",
    name: "Rhea Chawla",
    company: "Byborg",
    role: "Frontend Architect",
    color: "#2a2f9e",
    src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80",
    offsetY: 0,
  },
]

const STORAGE_KEY = "quantum_alumni_network_v1"
const SYNC_EVENT = "quantum:alumni-updated"

function initialState(): AlumniNetworkState {
  return {
    profiles: INITIAL_ALUMNI_DIRECTORY,
    stories: INITIAL_PLACEMENT_STORIES,
    recentPlacements: INITIAL_RECENT_PLACEMENTS,
    metrics: DEFAULT_ALUMNI_METRICS,
  }
}

function readLocalState(): AlumniNetworkState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<AlumniNetworkState>
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : INITIAL_ALUMNI_DIRECTORY,
      stories: Array.isArray(parsed.stories) ? parsed.stories : INITIAL_PLACEMENT_STORIES,
      recentPlacements: Array.isArray(parsed.recentPlacements) ? parsed.recentPlacements : INITIAL_RECENT_PLACEMENTS,
      metrics: parsed.metrics ? { ...DEFAULT_ALUMNI_METRICS, ...parsed.metrics } : DEFAULT_ALUMNI_METRICS,
    }
  } catch {
    return initialState()
  }
}

function writeLocalState(next: AlumniNetworkState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore quota errors
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<AlumniNetworkState>(SYNC_EVENT, { detail: next }))
  }
}

function clearAlumniApiCache() {
  invalidateCache("/admin/alumni")
  invalidateCache("/student/alumni")
}

function isNetworkOrAuthFallback(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true
  return err.code === "network" || err.status === 401 || err.status === 403 || err.status === 404
}

export function useAlumniNetwork(mode: "admin" | "student") {
  const [state, setState] = useState<AlumniNetworkState>(() => readLocalState())
  const [loading, setLoading] = useState(true)

  const commit = useCallback((updater: (prev: AlumniNetworkState) => AlumniNetworkState): AlumniNetworkState => {
    let computed = readLocalState()
    setState((prev) => {
      computed = updater(prev)
      writeLocalState(computed)
      return computed
    })
    return computed
  }, [])

  const refresh = useCallback(async () => {
    const endpoint = mode === "admin" ? "/admin/alumni" : "/student/alumni"
    try {
      const data = await api.get<AlumniNetworkState>(endpoint, { bypassCache: true })
      if (data && Array.isArray(data.profiles)) {
        const synced: AlumniNetworkState = {
          profiles: data.profiles,
          stories: Array.isArray(data.stories) ? data.stories : INITIAL_PLACEMENT_STORIES,
          recentPlacements: Array.isArray(data.recentPlacements) ? data.recentPlacements : INITIAL_RECENT_PLACEMENTS,
          metrics: data.metrics ? { ...DEFAULT_ALUMNI_METRICS, ...data.metrics } : DEFAULT_ALUMNI_METRICS,
        }
        setState(synced)
        writeLocalState(synced)
      }
    } catch {
      // Safe fallback to local snapshot when API is unreachable
    } finally {
      setLoading(false)
    }
  }, [mode])

  useEffect(() => {
    let active = true
    refresh()

    const onSync = (e: Event) => {
      if (!active) return
      const detail = (e as CustomEvent<AlumniNetworkState>).detail
      if (detail) setState(detail)
    }
    const onStorage = (e: StorageEvent) => {
      if (!active || e.key !== STORAGE_KEY) return
      setState(readLocalState())
    }

    window.addEventListener(SYNC_EVENT, onSync)
    window.addEventListener("storage", onStorage)
    return () => {
      active = false
      window.removeEventListener(SYNC_EVENT, onSync)
      window.removeEventListener("storage", onStorage)
    }
  }, [refresh])

  // --- Profiles CRUD ---
  const addProfile = useCallback(async (input: Omit<AlumniProfile, "id">): Promise<AlumniProfile> => {
    const prevSnapshot = readLocalState()
    const tempId = `alumni-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const optimistic: AlumniProfile = {
      ...input,
      id: tempId,
      companyLogo: resolveCompanyLogo(input.currentCompany, input.companyLogo),
    }
    commit((prev) => ({ ...prev, profiles: [optimistic, ...prev.profiles] }))

    try {
      const res = await api.post<{ ok: boolean; profile: AlumniProfile }>("/admin/alumni/profiles", {
        ...input,
        companyLogo: optimistic.companyLogo ?? "",
      })
      clearAlumniApiCache()
      if (res?.profile) {
        commit((prev) => ({
          ...prev,
          profiles: prev.profiles.map((p) => (p.id === tempId ? res.profile : p)),
        }))
        return res.profile
      }
      return optimistic
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return optimistic
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  const updateProfile = useCallback(async (id: string, patch: Partial<Omit<AlumniProfile, "id">>): Promise<void> => {
    const prevSnapshot = readLocalState()
    const nextPatch = {
      ...patch,
      ...(patch.currentCompany !== undefined && patch.companyLogo === undefined
        ? {}
        : patch.companyLogo !== undefined || patch.currentCompany !== undefined
          ? { companyLogo: resolveCompanyLogo(patch.currentCompany ?? "", patch.companyLogo) }
          : {}),
    }
    commit((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === id ? { ...p, ...nextPatch } : p)),
    }))

    try {
      const res = await api.patch<{ ok: boolean; profile: AlumniProfile }>(`/admin/alumni/profiles/${id}`, nextPatch)
      clearAlumniApiCache()
      if (res?.profile) {
        commit((prev) => ({
          ...prev,
          profiles: prev.profiles.map((p) => (p.id === id ? res.profile : p)),
        }))
      }
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  const deleteProfile = useCallback(async (id: string): Promise<void> => {
    const prevSnapshot = readLocalState()
    commit((prev) => ({ ...prev, profiles: prev.profiles.filter((p) => p.id !== id) }))
    try {
      await api.delete(`/admin/alumni/profiles/${id}`)
      clearAlumniApiCache()
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  // --- Stories CRUD ---
  const addStory = useCallback(async (input: Omit<PlacementStory, "id">): Promise<PlacementStory> => {
    const prevSnapshot = readLocalState()
    const tempId = `story-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const optimistic: PlacementStory = { ...input, id: tempId }
    commit((prev) => ({ ...prev, stories: [optimistic, ...prev.stories] }))

    try {
      const res = await api.post<{ ok: boolean; story: PlacementStory }>("/admin/alumni/stories", input)
      clearAlumniApiCache()
      if (res?.story) {
        commit((prev) => ({
          ...prev,
          stories: prev.stories.map((s) => (s.id === tempId ? res.story : s)),
        }))
        return res.story
      }
      return optimistic
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return optimistic
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  const updateStory = useCallback(async (id: string, patch: Partial<Omit<PlacementStory, "id">>): Promise<void> => {
    const prevSnapshot = readLocalState()
    commit((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
    try {
      const res = await api.patch<{ ok: boolean; story: PlacementStory }>(`/admin/alumni/stories/${id}`, patch)
      clearAlumniApiCache()
      if (res?.story) {
        commit((prev) => ({
          ...prev,
          stories: prev.stories.map((s) => (s.id === id ? res.story : s)),
        }))
      }
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  const deleteStory = useCallback(async (id: string): Promise<void> => {
    const prevSnapshot = readLocalState()
    commit((prev) => ({ ...prev, stories: prev.stories.filter((s) => s.id !== id) }))
    try {
      await api.delete(`/admin/alumni/stories/${id}`)
      clearAlumniApiCache()
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  // --- Recent Placements Carousel CRUD ---
  const addPlacement = useCallback(async (input: Omit<PlacementItem, "id">): Promise<PlacementItem> => {
    const prevSnapshot = readLocalState()
    const tempId = `placement-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`
    const optimistic: PlacementItem = { ...input, id: tempId }
    commit((prev) => ({ ...prev, recentPlacements: [optimistic, ...prev.recentPlacements] }))

    try {
      const res = await api.post<{ ok: boolean; placement: PlacementItem }>("/admin/alumni/placements", input)
      clearAlumniApiCache()
      if (res?.placement) {
        commit((prev) => ({
          ...prev,
          recentPlacements: prev.recentPlacements.map((p) => (p.id === tempId ? res.placement : p)),
        }))
        return res.placement
      }
      return optimistic
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return optimistic
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  const updatePlacement = useCallback(async (id: string, patch: Partial<Omit<PlacementItem, "id">>): Promise<void> => {
    const prevSnapshot = readLocalState()
    commit((prev) => ({
      ...prev,
      recentPlacements: prev.recentPlacements.map((p, idx) => ((p.id ?? `idx-${idx}`) === id ? { ...p, ...patch } : p)),
    }))
    try {
      const res = await api.patch<{ ok: boolean; placement: PlacementItem }>(`/admin/alumni/placements/${id}`, patch)
      clearAlumniApiCache()
      if (res?.placement) {
        commit((prev) => ({
          ...prev,
          recentPlacements: prev.recentPlacements.map((p) => (p.id === id ? res.placement : p)),
        }))
      }
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  const deletePlacement = useCallback(async (id: string): Promise<void> => {
    const prevSnapshot = readLocalState()
    commit((prev) => ({
      ...prev,
      recentPlacements: prev.recentPlacements.filter((p, idx) => (p.id ?? `idx-${idx}`) !== id),
    }))
    try {
      await api.delete(`/admin/alumni/placements/${id}`)
      clearAlumniApiCache()
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  // --- Headline Metrics ---
  const updateMetrics = useCallback(async (patch: Partial<AlumniMetrics>): Promise<void> => {
    const prevSnapshot = readLocalState()
    commit((prev) => ({ ...prev, metrics: { ...prev.metrics, ...patch } }))
    try {
      const res = await api.patch<{ ok: boolean; metrics: AlumniMetrics }>("/admin/alumni/metrics", patch)
      clearAlumniApiCache()
      if (res?.metrics) {
        commit((prev) => ({ ...prev, metrics: res.metrics }))
      }
    } catch (err) {
      if (isNetworkOrAuthFallback(err)) return
      commit(() => prevSnapshot)
      throw err
    }
  }, [commit])

  return {
    ...state,
    loading,
    refresh,
    addProfile,
    updateProfile,
    deleteProfile,
    addStory,
    updateStory,
    deleteStory,
    addPlacement,
    updatePlacement,
    deletePlacement,
    updateMetrics,
  }
}

