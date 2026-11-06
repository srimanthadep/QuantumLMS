import { useState, useMemo } from "react"
import {
  TrendingUp,
  User,
  Zap,
  ExternalLink,
  MessageSquare,
  Award,
  Sparkles,
  MapPin,
  GraduationCap,
  Briefcase,
  X,
  RotateCcw,
} from "lucide-react"

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78Z" />
    </svg>
  )
}
import type { StudentNavPage } from "./studentTypes"
import { CustomSelect } from "@/components/ui/select"

export interface AlumniProfile {
  id: string
  name: string
  avatar: string
  tag: "Career Gap" | "Fresher" | "Non-Tech to Tech" | "Switcher" | "Upskiller"
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

export const ALUMNI_DIRECTORY: readonly AlumniProfile[] = [
  {
    id: "alumni-anuraj",
    name: "Anuraj Satardekar",
    avatar: "/alumni/anuraj.png",
    tag: "Career Gap",
    currentCompany: "meesho",
    companyLogo: "/logos/meesho.png",
    role: "Data Analyst",
    hike: "100% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "Working Professional",
    priorCompany: "Tech Company",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹18 LPA",
    bio: "After taking a 2-year career gap for family commitments, restarting my technical career was daunting. The structured mentorship, intensive SQL sprints, and real-world business case studies gave me the practical edge to clear Meesho's analytics bar.",
    prepStrategy: "Focused on end-to-end data pipelines, product metrics (retention, funnels), and daily timed LeetCode + SQL interview simulations.",
    skills: ["SQL", "Python", "Tableau", "Product Analytics", "A/B Testing", "ETL Pipelines"],
    linkedInUrl: "https://linkedin.com/in/anuraj-satardekar",
  },
  {
    id: "alumni-sandeep",
    name: "Sandeep gowda",
    avatar: "/alumni/sandeep.png",
    tag: "Upskiller",
    currentCompany: "Uber",
    companyLogo: "/logos/uber.svg",
    role: "Data Analyst",
    hike: "100% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "Working Professional",
    priorCompany: "Tech Company",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹24 LPA",
    bio: "I had 2 years of traditional backend support experience and wanted to move into high-scale algorithmic analytics. Learning distributed query engines and geospatial data workflows helped me crack Uber's mobility data team.",
    prepStrategy: "Deep-dived into big data indexing, Apache Spark basics, and Uber's open-source case studies around dynamic pricing algorithms.",
    skills: ["Python", "SQL", "Pandas", "Apache Spark", "Machine Learning", "Dashboarding"],
    linkedInUrl: "https://linkedin.com/in/sandeep-gowda",
  },
  {
    id: "alumni-arnav",
    name: "Arnav Bangaria",
    avatar: "/alumni/arnav.png",
    tag: "Switcher",
    currentCompany: "ZS",
    companyLogo: "/logos/zs.svg",
    role: "Decision Analytics Associate",
    hike: "63% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "Working Professional",
    priorCompany: "Tech Company",
    location: "Pune",
    degree: "BCA / MCA",
    package: "₹16.5 LPA",
    bio: "Switching from general IT support to specialized decision analytics required unlearning old habits. The 1:1 mentor mock interviews and healthcare client simulations matched the exact interview format at ZS.",
    prepStrategy: "Solved 40+ client case frameworks, business problem scoping scenarios, and quantitative mental aptitude tests.",
    skills: ["SQL", "Excel & VBA", "Power BI", "Decision Science", "Predictive Analytics"],
    linkedInUrl: "https://linkedin.com/in/arnav-bangaria",
  },
  {
    id: "alumni-rhea",
    name: "Rhea Chawla",
    avatar: "/placements/rhea_portrait.png",
    tag: "Switcher",
    currentCompany: "Byborg",
    companyLogo: "/logos/byborg.png",
    role: "Cloud Systems Engineer",
    hike: "210% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "College Graduate",
    priorCompany: "Delhi University",
    location: "International",
    degree: "B.Tech / BE",
    package: "₹50 LAKHS+",
    bio: "From Delhi directly to Luxembourg! The distributed systems architecture labs and live microservices debugging modules gave me European enterprise-grade coding competency.",
    prepStrategy: "Built an open-source distributed cache in Go and practiced concurrency patterns, API rate limiting, and Kubernetes cluster deployments.",
    skills: ["Go", "Kubernetes", "AWS", "Distributed Systems", "Docker", "gRPC"],
    linkedInUrl: "https://linkedin.com/in/rhea-chawla",
  },
  {
    id: "alumni-shubhadip",
    name: "Subhadip Das",
    avatar: "/placements/shubhadip_portrait.png",
    tag: "Non-Tech to Tech",
    currentCompany: "Mr. Cooper",
    companyLogo: "/logos/mrcooper.svg",
    role: "Data Engineer",
    hike: "180% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "State Level Cricketer",
    priorCompany: "Sports Academy",
    location: "Bangalore",
    degree: "B.Sc / M.Sc",
    package: "₹22 LPA",
    bio: "Having dedicated years to competitive professional cricket, switching into core data engineering was a complete career pivot. Discipline from sports translated directly into marathon coding and problem-solving sessions.",
    prepStrategy: "Consistent 8 hours daily coding routine, building 3 full-scale data pipelines from scratch and writing exhaustive unit tests.",
    skills: ["Python", "Apache Spark", "Airflow", "PostgreSQL", "Kafka", "Data Warehousing"],
    linkedInUrl: "https://linkedin.com/in/subhadip-das",
  },
  {
    id: "alumni-nikita",
    name: "Nikita Singh Raghav",
    avatar: "/placements/nikita_portrait.png",
    tag: "Upskiller",
    currentCompany: "Zepto",
    role: "Product Analyst",
    hike: "140% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "Business Analyst",
    priorCompany: "Consulting Firm",
    location: "Mumbai",
    degree: "BCA / MCA",
    package: "₹19 LPA",
    bio: "Instead of spending 2 years on an expensive general MBA, I decided to upskill directly in fast-commerce product analytics. Zepto's real-time delivery logistics was the exact domain challenge I trained for.",
    prepStrategy: "Mastered retention curve modeling, SQL window functions, cohort churn forecasting, and live dashboard storytelling.",
    skills: ["SQL", "Product Analytics", "Amplitude", "Mixpanel", "Python", "Retention Modeling"],
    linkedInUrl: "https://linkedin.com/in/nikita-singh-raghav",
  },
  {
    id: "alumni-yoshita",
    name: "Yoshita B Shankar",
    avatar: "/placements/yoshita_portrait.png",
    tag: "Fresher",
    currentCompany: "1DS",
    role: "Frontend Engineer",
    hike: "120% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "College Fresher",
    priorCompany: "Anna University",
    location: "Chennai",
    degree: "B.Tech / BE",
    package: "₹14 LPA",
    bio: "Coming out of college, off-campus hiring felt impossible. Daily mentor reviews and rebuilding production-grade user interfaces gave me the portfolio required to land an immediate engineering role.",
    prepStrategy: "Built 5 production React + TypeScript apps with complex state machines and accessible component design systems.",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Redux Toolkit", "Web Performance"],
    linkedInUrl: "https://linkedin.com/in/yoshita-shankar",
  },
  {
    id: "alumni-anup",
    name: "Anup Dhangar",
    avatar: "/placements/anup_portrait.png",
    tag: "Career Gap",
    currentCompany: "Bhanzu",
    role: "Full Stack Engineer",
    hike: "160% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "1.5 Year Gap",
    priorCompany: "Self-Paced Learner",
    location: "Pune",
    degree: "B.Tech / BE",
    package: "₹17 LPA",
    bio: "After repeated job rejections due to an education gap, I rebooted my entire prep strategy. The daily mock evaluations and structured curriculum turned my weaknesses into strengths.",
    prepStrategy: "Solved 300+ DSA problems on Binary Search and Dynamic Programming while building full-stack Node.js + React microservices.",
    skills: ["Node.js", "React", "PostgreSQL", "Docker", "Algorithms", "System Design"],
    linkedInUrl: "https://linkedin.com/in/anup-dhangar",
  },
  {
    id: "alumni-prathmesh",
    name: "Prathmesh Potdar",
    avatar: "/assets/student-7.png",
    tag: "Fresher",
    currentCompany: "Flipkart",
    companyLogo: "/logos/flipkart.svg",
    role: "Software Development Engineer",
    hike: "150% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "College Fresher",
    priorCompany: "Pune University",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹26 LPA",
    bio: "Clearing Flipkart's Machine Coding and Problem Solving rounds required high rigor. The live code pair-programming sessions gave me the confidence to write modular clean code under high pressure.",
    prepStrategy: "Focused on Object Oriented Design principles (SOLID), concurrency locks, and in-memory caches.",
    skills: ["Java", "Spring Boot", "Redis", "Kafka", "Design Patterns", "Clean Architecture"],
    linkedInUrl: "https://linkedin.com/in/prathmesh-potdar",
  },
  {
    id: "alumni-sakshi",
    name: "Sakshi Singh",
    avatar: "/assets/student-4.png",
    tag: "Switcher",
    currentCompany: "Razorpay",
    companyLogo: "/logos/razorpay.svg",
    role: "Backend Engineer",
    hike: "175% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "QA Analyst",
    priorCompany: "Fintech Testing Co.",
    location: "Bangalore",
    degree: "B.Tech / BE",
    package: "₹28 LPA",
    bio: "Transitioned from manual and test automation QA into backend fintech payment rails. Gaining hands-on expertise in ACID transactions, distributed idempotency, and high-throughput systems made this leap possible.",
    prepStrategy: "Engineered a mock payment gateway engine with idempotent checkout tokens and webhook retries.",
    skills: ["Go", "PostgreSQL", "Redis", "Fintech Systems", "Distributed Locks", "Payment Protocols"],
    linkedInUrl: "https://linkedin.com/in/sakshi-singh",
  },
  {
    id: "alumni-sai",
    name: "Sai Manikanta",
    avatar: "/assets/student-2.png",
    tag: "Upskiller",
    currentCompany: "IBM",
    companyLogo: "/logos/ibm.svg",
    role: "AI & ML Specialist",
    hike: "135% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "IT Systems Admin",
    priorCompany: "Enterprise IT Services",
    location: "Hyderabad",
    degree: "B.Tech / BE",
    package: "₹21 LPA",
    bio: "Working as a systems administrator, I saw automation replacing manual provisioning. Upskilling into Agentic AI workflows, LLM fine-tuning, and model monitoring secured my promotion into IBM's AI lab.",
    prepStrategy: "Completed 6 capstone projects spanning RAG with vector search, LangChain agents, and quantized model deployments.",
    skills: ["Python", "PyTorch", "HuggingFace", "FastAPI", "Vector DBs", "MLOps"],
    linkedInUrl: "https://linkedin.com/in/sai-manikanta",
  },
  {
    id: "alumni-tina",
    name: "Tina Digambar Kapadnis",
    avatar: "/assets/student-5.png",
    tag: "Non-Tech to Tech",
    currentCompany: "Hexaware",
    companyLogo: "/logos/hexaware.png",
    role: "Software Engineer",
    hike: "110% hike",
    lmsProgram: "Joined Newton School",
    priorRole: "Operations Specialist",
    priorCompany: "BPO Services",
    location: "Pune",
    degree: "Non-Engineering",
    package: "₹12.5 LPA",
    bio: "Breaking the myth that you need an engineering degree to code. The zero-to-hero fundamentals curriculum took me from writing my first hello world to shipping full-stack enterprise web services.",
    prepStrategy: "Practiced 3 hours every single morning before my job, taking meticulous notes and reviewing foundational JavaScript concepts.",
    skills: ["JavaScript", "React", "Node.js", "Express", "MongoDB", "REST APIs"],
    linkedInUrl: "https://linkedin.com/in/tina-kapadnis",
  },
] as const

const QUICK_FILTERS = [
  "Career Gap",
  "Fresher",
  "Non-Tech to Tech",
  "Switcher",
  "Upskiller",
] as const

interface AlumniPageProps {
  onNavigate?: (page: StudentNavPage, courseId?: string) => void
  onToast: (msg: string) => void
}

export default function AlumniPage({ onNavigate, onToast }: AlumniPageProps) {
  const [backgroundFilter, setBackgroundFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [degreeFilter, setDegreeFilter] = useState<string>("all")
  const [quickFilter, setQuickFilter] = useState<string | null>(null)
  const [selectedAlumni, setSelectedAlumni] = useState<AlumniProfile | null>(null)

  const handleQuickFilterClick = (filter: string) => {
    if (quickFilter === filter) {
      setQuickFilter(null)
      setBackgroundFilter("all")
    } else {
      setQuickFilter(filter)
      setBackgroundFilter(filter)
    }
  }

  const handleResetFilters = () => {
    setBackgroundFilter("all")
    setLocationFilter("all")
    setDegreeFilter("all")
    setQuickFilter(null)
  }

  const filteredAlumni = useMemo(() => {
    return ALUMNI_DIRECTORY.filter((item) => {
      // Career Background filter
      if (backgroundFilter !== "all" && item.tag !== backgroundFilter) {
        return false
      }
      // Location filter
      if (locationFilter !== "all" && item.location !== locationFilter) {
        return false
      }
      // Degree filter
      if (degreeFilter !== "all" && item.degree !== degreeFilter) {
        return false
      }
      return true
    })
  }, [backgroundFilter, locationFilter, degreeFilter])

  const hasActiveFilters = backgroundFilter !== "all" || locationFilter !== "all" || degreeFilter !== "all" || quickFilter !== null

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 px-3 sm:px-6 pt-2">
      {/* =========================================================================
          HERO HEADER: Matching Screenshot
          "Alumni Placements" + "Connect with our alumni and learn from their journey"
          Dual avatar line-art graphic watermark on the top-right
      ========================================================================= */}
      <section
        aria-label="Alumni Placements Overview"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-white via-[#f7faff] to-[#edf4fe] border border-slate-200/80 p-6 sm:p-8 shadow-xs"
      >
        {/* Top-Right Decorative Line Art Silhouette from Screenshot */}
        <div
          aria-hidden="true"
          className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-85 hidden sm:block"
        >
          <svg
            className="w-40 h-28 text-blue-200/80"
            viewBox="0 0 160 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Main Primary Avatar Outline */}
            <circle cx="68" cy="40" r="26" stroke="#93c5fd" strokeWidth="2.5" />
            <path
              d="M20 112 C22 78, 46 68, 68 68 C90 68, 114 78, 116 112"
              stroke="#93c5fd"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Secondary Overlapping Avatar Outline */}
            <circle cx="118" cy="52" r="20" stroke="#bfdbfe" strokeWidth="2.2" />
            <path
              d="M96 112 C98 86, 110 80, 118 80 C126 80, 142 86, 150 112"
              stroke="#bfdbfe"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Alumni Placements
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-500 font-normal">
            Connect with our alumni and learn from their journey
          </p>
        </div>
      </section>

      {/* =========================================================================
          METRICS BANNER: 4 Columns with Clean Vertical Dividers
          Students placed (4500+) | Highest Hike (500%) | Highest package (₹1.5Cr) | Hiring Partners (800+)
      ========================================================================= */}
      <section
        aria-label="Placement Statistics"
        className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100"
      >
        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[12px] sm:text-[13px] font-medium text-slate-500 leading-none">
            Students placed
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-[#0066cc] tracking-tight">
            4500+
          </p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[12px] sm:text-[13px] font-medium text-slate-500 leading-none">
            Highest Hike
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-[#0066cc] tracking-tight">
            500%
          </p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[12px] sm:text-[13px] font-medium text-slate-500 leading-none">
            Highest package
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-[#0066cc] tracking-tight">
            ₹1.5Cr
          </p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[12px] sm:text-[13px] font-medium text-slate-500 leading-none">
            Hiring Partners
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-bold text-[#0066cc] tracking-tight">
            800+
          </p>
        </div>
      </section>

      {/* =========================================================================
          ALUMNI SECTION: Heading + Dropdowns + Quick Filter Pills
      ========================================================================= */}
      <section aria-label="Alumni Directory" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Alumni
          </h2>

          {/* Filter Dropdowns Matching Screenshot */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Dropdown 1: Career Background */}
            <div className="w-[170px]">
              <CustomSelect
                value={backgroundFilter}
                onChange={(val) => {
                  setBackgroundFilter(val)
                  setQuickFilter(val === "all" ? null : val)
                }}
                placeholder="Career Background"
                triggerClassName="h-8 text-xs font-medium bg-white border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 w-full shadow-2xs hover:border-slate-300"
                options={[
                  { value: "all", label: "Career Background (All)" },
                  { value: "Career Gap", label: "Career Gap" },
                  { value: "Fresher", label: "Fresher" },
                  { value: "Non-Tech to Tech", label: "Non-Tech to Tech" },
                  { value: "Switcher", label: "Switcher" },
                  { value: "Upskiller", label: "Upskiller" },
                ]}
              />
            </div>

            {/* Dropdown 2: Location */}
            <div className="w-[145px]">
              <CustomSelect
                value={locationFilter}
                onChange={setLocationFilter}
                placeholder="Location"
                triggerClassName="h-8 text-xs font-medium bg-white border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 w-full shadow-2xs hover:border-slate-300"
                options={[
                  { value: "all", label: "Location (All)" },
                  { value: "Bangalore", label: "Bangalore" },
                  { value: "Pune", label: "Pune" },
                  { value: "Mumbai", label: "Mumbai" },
                  { value: "Hyderabad", label: "Hyderabad" },
                  { value: "Chennai", label: "Chennai" },
                  { value: "International", label: "International" },
                ]}
              />
            </div>

            {/* Dropdown 3: Degree */}
            <div className="w-[145px]">
              <CustomSelect
                value={degreeFilter}
                onChange={setDegreeFilter}
                placeholder="Degree"
                triggerClassName="h-8 text-xs font-medium bg-white border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 w-full shadow-2xs hover:border-slate-300"
                options={[
                  { value: "all", label: "Degree (All)" },
                  { value: "B.Tech / BE", label: "B.Tech / BE" },
                  { value: "BCA / MCA", label: "BCA / MCA" },
                  { value: "B.Sc / M.Sc", label: "B.Sc / M.Sc" },
                  { value: "Non-Engineering", label: "Non-Engineering" },
                ]}
              />
            </div>

            {/* Reset Button (visible when filters are applied) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 text-xs font-medium flex items-center gap-1 shadow-2xs transition-colors"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters Row Matching Screenshot */}
        <div className="bg-[#f8f9fa] border border-slate-200/70 rounded-xl p-2.5 px-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-1 select-none">
            Quick Filters:
          </span>
          {QUICK_FILTERS.map((pill) => {
            const isActive = quickFilter === pill || backgroundFilter === pill
            return (
              <button
                key={pill}
                type="button"
                onClick={() => handleQuickFilterClick(pill)}
                className={`text-xs px-3 py-1 rounded-md transition-all font-medium border shadow-2xs ${
                  isActive
                    ? "bg-[#0066cc] text-white border-[#0066cc] font-semibold"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {pill}
              </button>
            )
          })}
        </div>

        {/* =========================================================================
            ALUMNI CARDS GRID: 3 Columns Desktop Matching Screenshot Cards
        ========================================================================= */}
        {filteredAlumni.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800">
              No alumni found matching your criteria
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your filters or resetting to see all alumni journeys.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-1.5 rounded-lg bg-[#0066cc] text-white text-xs font-medium hover:bg-blue-700 transition-colors shadow-2xs"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAlumni.map((alumni) => (
              <article
                key={alumni.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top: Photo + Name + Lightning Tag */}
                <div className="p-5 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={alumni.avatar}
                      alt={alumni.name}
                      className="w-11 h-11 rounded-lg object-cover border border-slate-100 shadow-2xs flex-none bg-slate-50"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[14px] font-bold text-slate-900 leading-tight truncate">
                        {alumni.name}
                      </h3>
                      {/* Lightning Badge Matching Screenshot */}
                      <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-[#1e5be0] bg-[#eef4ff] border border-[#d6e4ff] px-2 py-0.5 rounded-full leading-none">
                        <Zap className="w-2.5 h-2.5 fill-[#1e5be0] text-[#1e5be0]" />
                        <span>{alumni.tag}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="border-t border-slate-100 mx-5" />

                {/* Card Middle: Vertical Transition Timeline Nodes */}
                <div className="px-5 py-4 flex-1">
                  <div className="relative flex flex-col gap-3">
                    {/* Vertical Line Connector */}
                    <div
                      aria-hidden="true"
                      className="absolute left-[5px] top-[14px] bottom-[14px] w-[1.5px] bg-slate-200"
                    />

                    {/* Node 1 (Green Bullet): Current Company + Role + Hike */}
                    <div className="relative flex items-start gap-3 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-3 ring-emerald-50 flex-none mt-1 shadow-2xs" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {alumni.companyLogo ? (
                            <img
                              src={alumni.companyLogo}
                              alt={alumni.currentCompany}
                              className="h-4 max-w-[75px] object-contain object-left"
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-900 leading-tight">
                              {alumni.currentCompany}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 text-xs text-slate-600 mt-0.5">
                          <span>{alumni.role}</span>
                          <span className="text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                            {alumni.hike}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Node 2 (Sky Blue Bullet): Joined Newton School */}
                    <div className="relative flex items-start gap-3 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-3 ring-sky-50 flex-none mt-1 shadow-2xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 leading-tight">
                          {alumni.lmsProgram}
                        </p>
                      </div>
                    </div>

                    {/* Node 3 (Grey Bullet): Prior Background */}
                    <div className="relative flex items-start gap-3 z-10">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-3 ring-slate-100 flex-none mt-1 shadow-2xs" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-800 leading-tight">
                          {alumni.priorRole}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {alumni.priorCompany}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: View Profile Button Matching Screenshot */}
                <div className="p-3 px-5 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={() => setSelectedAlumni(alumni)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:text-[#0066cc] hover:border-blue-300 hover:bg-blue-50/30 transition-colors flex items-center justify-center gap-1.5 shadow-2xs group-hover:border-slate-300"
                  >
                    <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#0066cc]" />
                    <span>View profile</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          VIEW PROFILE MODAL: Detailed Transition Journey & Mentorship
      ========================================================================= */}
      {selectedAlumni && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alumni-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedAlumni(null)}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-slate-900 via-[#0a2569] to-[#041a54] text-white p-6 pb-5">
              <button
                type="button"
                onClick={() => setSelectedAlumni(null)}
                aria-label="Close profile modal"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <img
                  src={selectedAlumni.avatar}
                  alt={selectedAlumni.name}
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white/30 shadow-md bg-white/10 flex-none"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      id="alumni-modal-title"
                      className="text-lg font-bold text-white truncate"
                    >
                      {selectedAlumni.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-blue-200 bg-white/15 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 fill-blue-300 text-blue-300" />
                      {selectedAlumni.tag}
                    </span>
                  </div>

                  <p className="text-sm text-blue-100 font-medium mt-1">
                    {selectedAlumni.role} @ {selectedAlumni.currentCompany}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-white/70">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-white/60" />
                      {selectedAlumni.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-white/60" />
                      {selectedAlumni.degree}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar in Modal */}
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">
                  Salary Hike
                </span>
                <span className="text-sm font-bold text-emerald-600 inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                  {selectedAlumni.hike}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">
                  Package
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {selectedAlumni.package || "Competitive"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">
                  Program
                </span>
                <span className="text-xs font-bold text-slate-700 truncate block">
                  {selectedAlumni.lmsProgram}
                </span>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Transition Story */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#0066cc]" />
                  The Transition Journey
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  {selectedAlumni.bio}
                </p>
              </div>

              {/* Prep Strategy & Advice */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Interview Strategy & Practical Tips
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-amber-50/40 p-3.5 rounded-xl border border-amber-100/70">
                  {selectedAlumni.prepStrategy}
                </p>
              </div>

              {/* Key Skills */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  Key Skills & Stacks Mastered
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAlumni.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <a
                href={selectedAlumni.linkedInUrl || "#"}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  if (!selectedAlumni.linkedInUrl) {
                    e.preventDefault()
                    onToast(`Opening LinkedIn profile for ${selectedAlumni.name}`)
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-[#0077b5] text-white hover:bg-[#005f93] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <LinkedInIcon className="w-3.5 h-3.5 fill-white" />
                <span>LinkedIn Profile</span>
                <ExternalLink className="w-3 h-3 text-white/80" />
              </a>

              <button
                type="button"
                onClick={() => {
                  onToast(
                    `Mentorship request sent to ${selectedAlumni.name}! They typically respond within 24 hours.`
                  )
                  setSelectedAlumni(null)
                }}
                className="px-4 py-2 rounded-lg bg-[#0066cc] text-white hover:bg-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Request Mentorship</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
