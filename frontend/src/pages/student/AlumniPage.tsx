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
import type { StudentNavPage } from "./studentTypes"
import { CustomSelect } from "@/components/ui/select"
import PageHeader from "@/components/ui/page-header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.39 9.74v-8.37H5.07v8.37h2.78Z" />
    </svg>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const TAG_CONFIG: Record<AlumniProfile["tag"], string> = {
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
    <div className="flex w-full min-w-0 flex-col space-y-6 pb-16">
      {/* =========================================================================
          PAGE HEADER: Standard QuantumLMS PageHeader Component
      ========================================================================= */}
      <PageHeader
        eyebrow="Placement Network"
        title="Alumni Placements"
        description="Connect with Quantum School alumni, discover verified career switch journeys, and learn from their experience."
        actions={
          hasActiveFilters ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResetFilters}
            >
              Reset filters
            </Button>
          ) : undefined
        }
      />

      {/* =========================================================================
          METRICS BANNER: Standard QuantumLMS Surface & Border Design Tokens
      ========================================================================= */}
      <section
        aria-label="Placement Statistics"
        className="rounded-xl border border-border bg-surface shadow-2xs overflow-hidden grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border"
      >
        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            Students placed
          </span>
          <p className="mt-1.5 text-2xl sm:text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            4,500+
          </p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            Highest hike
          </span>
          <p className="mt-1.5 text-2xl sm:text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            500%
          </p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            Highest package
          </span>
          <p className="mt-1.5 text-2xl sm:text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            ₹1.5 Cr
          </p>
        </div>

        <div className="p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-xs font-medium text-muted-foreground">
            Hiring partners
          </span>
          <p className="mt-1.5 text-2xl sm:text-[28px] font-bold tracking-tight text-foreground tabular-nums">
            800+
          </p>
        </div>
      </section>

      {/* =========================================================================
          ALUMNI SECTION: Heading + Filters Row + Quick Filter Pills
      ========================================================================= */}
      <section aria-label="Alumni Directory" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              Alumni Directory
            </h2>
            <span className="text-xs text-muted-foreground font-medium">
              ({filteredAlumni.length} {filteredAlumni.length === 1 ? "journey" : "journeys"})
            </span>
          </div>

          {/* Filter Dropdowns using CustomSelect */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Career Background */}
            <div className="w-[170px]">
              <CustomSelect
                value={backgroundFilter}
                onChange={(val) => {
                  setBackgroundFilter(val)
                  setQuickFilter(val === "all" ? null : val)
                }}
                placeholder="Career Background"
                triggerClassName="h-8.5 text-xs bg-surface border-border text-foreground hover:border-border-strong rounded-lg shadow-2xs"
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

            {/* Location */}
            <div className="w-[145px]">
              <CustomSelect
                value={locationFilter}
                onChange={setLocationFilter}
                placeholder="Location"
                triggerClassName="h-8.5 text-xs bg-surface border-border text-foreground hover:border-border-strong rounded-lg shadow-2xs"
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

            {/* Degree */}
            <div className="w-[145px]">
              <CustomSelect
                value={degreeFilter}
                onChange={setDegreeFilter}
                placeholder="Degree"
                triggerClassName="h-8.5 text-xs bg-surface border-border text-foreground hover:border-border-strong rounded-lg shadow-2xs"
                options={[
                  { value: "all", label: "Degree (All)" },
                  { value: "B.Tech / BE", label: "B.Tech / BE" },
                  { value: "BCA / MCA", label: "BCA / MCA" },
                  { value: "B.Sc / M.Sc", label: "B.Sc / M.Sc" },
                  { value: "Non-Engineering", label: "Non-Engineering" },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Quick Filters Pill Bar using QuantumLMS Button styles */}
        <div className="rounded-xl border border-border bg-surface-2/60 p-2.5 px-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1 select-none">
            Quick Filters:
          </span>
          {QUICK_FILTERS.map((pill) => {
            const isActive = quickFilter === pill || backgroundFilter === pill
            return (
              <Button
                key={pill}
                type="button"
                variant={isActive ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleQuickFilterClick(pill)}
                className="h-7 text-xs px-2.5 shadow-2xs"
              >
                {pill}
              </Button>
            )
          })}
        </div>

        {/* =========================================================================
            ALUMNI CARDS: Standard QuantumLMS Card Component
        ========================================================================= */}
        {filteredAlumni.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <User className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              No alumni found matching your criteria
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Try adjusting your filters or resetting to see all alumni journeys.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4"
            >
              Reset Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAlumni.map((alumni) => (
              <Card
                key={alumni.id}
                interactive
                className="flex flex-col justify-between p-5 rounded-2xl border border-border bg-surface shadow-xs transition-all hover:border-border-strong hover:shadow-sm group overflow-hidden"
              >
                <div>
                  {/* Card Top: Initials Avatar + Name + Lightning Tag */}
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center shadow-2xs shrink-0"
                      aria-label={alumni.name}
                    >
                      {getInitials(alumni.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-[15px] font-bold text-foreground leading-snug truncate">
                        {alumni.name}
                      </h3>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-tight ${
                            TAG_CONFIG[alumni.tag] || "bg-[#EBF3FF] text-[#0066FF]"
                          }`}
                        >
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>{alumni.tag}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Career Ladder Progression Timeline */}
                  <div className="mt-5 relative text-xs">
                    {/* Continuous Spine from Bottom to Top */}
                    <div
                      aria-hidden="true"
                      className="absolute left-[9.5px] top-[14px] bottom-[26px] w-[1.5px] bg-slate-300 dark:bg-slate-700/80 pointer-events-none"
                    />

                    {/* NODE 1 (TOP): Placed Company & Role */}
                    <div className="relative">
                      {/* Arrowhead pointing UP on spine towards Green Halo */}
                      <div
                        aria-hidden="true"
                        className="absolute left-[4px] top-[14px] text-slate-400 dark:text-slate-500 z-10 pointer-events-none"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 10V2.5M2.5 6L6 2.5l3.5 3.5" />
                        </svg>
                      </div>

                      <div className="flex items-center gap-3 relative z-10">
                        {/* Green Halo Dot */}
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 flex items-center justify-center shrink-0 shadow-2xs">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>

                        {/* Company Logo */}
                        <div className="h-6 flex items-center shrink-0">
                          {alumni.companyLogo ? (
                            <img
                              src={alumni.companyLogo}
                              alt={alumni.currentCompany}
                              className={`h-5 w-auto max-w-[85px] object-contain object-left ${
                                alumni.currentCompany.toLowerCase() === "uber"
                                  ? "dark:invert"
                                  : "dark:brightness-110"
                              }`}
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-foreground leading-tight">
                              {alumni.currentCompany}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Curved Branch to Role & Hike */}
                      <div className="relative pl-8 pt-1.5 pb-2">
                        <div
                          aria-hidden="true"
                          className="absolute left-[9.5px] -top-1 bottom-3 w-4 border-l-[1.5px] border-b-[1.5px] border-slate-300 dark:border-slate-700/80 rounded-bl-md pointer-events-none"
                        />
                        <div className="flex items-center flex-wrap gap-x-2 text-[12px] leading-tight">
                          <span className="text-slate-600 dark:text-slate-300 font-normal">
                            {alumni.role}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600 select-none">|</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                            <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
                            {alumni.hike}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* NODE 2 (MIDDLE): Joined Quantum School */}
                    <div className="relative py-2.5">
                      {/* Arrowhead pointing UP into Cyan Dot */}
                      <div
                        aria-hidden="true"
                        className="absolute left-[4px] -top-1.5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none"
                      >
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 12 12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 10V2.5M2.5 6L6 2.5l3.5 3.5" />
                        </svg>
                      </div>

                      <div className="flex items-center gap-3 relative z-10">
                        {/* Quantum School Logo (No background circle) */}
                        <div className="w-5 h-5 flex items-center justify-center shrink-0 bg-surface">
                          <img
                            src="/assets/logo.png"
                            alt="Quantum School"
                            className="h-3.5 w-auto max-w-[18px] object-contain"
                            loading="lazy"
                          />
                        </div>

                        <p className="text-[13px] font-medium text-foreground leading-tight">
                          {alumni.lmsProgram}
                        </p>
                      </div>
                    </div>

                    {/* NODE 3 (BOTTOM): Prior Experience */}
                    <div className="relative pt-1">
                      <div className="flex items-center gap-3 relative z-10">
                        {/* Gray Circle Dot */}
                        <div className="w-5 flex items-center justify-center shrink-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>

                        <p className="text-[13px] font-medium text-foreground leading-tight">
                          {alumni.priorRole}
                        </p>
                      </div>

                      {/* Curved Branch to Prior Company */}
                      <div className="relative pl-8 pt-1.5 pb-1">
                        <div
                          aria-hidden="true"
                          className="absolute left-[9.5px] -top-1 bottom-3 w-4 border-l-[1.5px] border-b-[1.5px] border-slate-300 dark:border-slate-700/80 rounded-bl-md pointer-events-none"
                        />
                        <p className="text-xs text-muted-foreground leading-tight">
                          {alumni.priorCompany}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom: View Profile Button */}
                <div className="mt-5 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    block
                    leftIcon={<User className="w-3.5 h-3.5 text-muted-foreground" />}
                    onClick={() => setSelectedAlumni(alumni)}
                    className="h-9.5 rounded-xl border-border bg-surface hover:bg-surface-2 text-foreground font-medium text-xs shadow-2xs"
                  >
                    View profile
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* =========================================================================
          VIEW PROFILE MODAL: Standard QuantumLMS Dialog Surface
      ========================================================================= */}
      {selectedAlumni && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alumni-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedAlumni(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-xl border border-border bg-surface text-foreground shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="relative bg-surface-2 border-b border-border p-6 pb-5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close profile modal"
                onClick={() => setSelectedAlumni(null)}
                className="absolute top-4 right-4 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>

              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl bg-surface-3 border border-border flex items-center justify-center font-mono font-bold text-base text-primary shadow-xs flex-none"
                  aria-hidden="true"
                >
                  {getInitials(selectedAlumni.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      id="alumni-modal-title"
                      className="text-lg font-bold text-foreground truncate"
                    >
                      {selectedAlumni.name}
                    </h3>
                    <Badge tone="primary" size="sm">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      <span>{selectedAlumni.tag}</span>
                    </Badge>
                  </div>

                  <p className="text-sm text-primary-text font-medium mt-1">
                    {selectedAlumni.role} @ {selectedAlumni.currentCompany}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground/70" />
                      {selectedAlumni.location}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-muted-foreground/70" />
                      {selectedAlumni.degree}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar in Modal */}
            <div className="bg-surface-3 border-b border-border px-6 py-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Salary Hike
                </span>
                <span className="text-sm font-bold text-success inline-flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                  {selectedAlumni.hike}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Package
                </span>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {selectedAlumni.package || "Competitive"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Program
                </span>
                <span className="text-xs font-semibold text-primary-text truncate block mt-0.5">
                  {selectedAlumni.lmsProgram}
                </span>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Transition Story */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  The Transition Journey
                </h4>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed bg-surface-2 rounded-lg border border-border p-3.5">
                  {selectedAlumni.bio}
                </p>
              </div>

              {/* Prep Strategy & Advice */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Award className="w-3.5 h-3.5 text-warning" />
                  Interview Strategy & Practical Tips
                </h4>
                <p className="text-xs sm:text-sm text-warning-text leading-relaxed bg-warning-soft rounded-lg border border-warning/20 p-3.5">
                  {selectedAlumni.prepStrategy}
                </p>
              </div>

              {/* Key Skills */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  Key Skills & Stacks Mastered
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAlumni.skills.map((skill) => (
                    <Badge key={skill} tone="neutral" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 px-6 border-t border-border bg-surface-2/60 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
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
                  className="flex items-center gap-1.5"
                >
                  <LinkedInIcon className="w-3.5 h-3.5 fill-[#0077b5]" />
                  <span>LinkedIn Profile</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </a>
              </Button>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                onClick={() => {
                  onToast(
                    `Mentorship request sent to ${selectedAlumni.name}! They typically respond within 24 hours.`
                  )
                  setSelectedAlumni(null)
                }}
              >
                Request Mentorship
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
