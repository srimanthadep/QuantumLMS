import { useState } from "react"
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Filter,
  Layers,
  Plus,
  Search,
  Sparkles,
  Tag,
} from "lucide-react"
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui"
import { cn } from "@/lib/utils"

interface KnowledgeBasePageProps {
  onToast?: (msg: string) => void
}

interface KbArticle {
  id: string
  title: string
  category: string
  summary: string
  readTime: string
  updatedAt: string
  views: number
  macroSnippet: string
  checklist: string[]
  content: string[]
}

const ARTICLES: KbArticle[] = [
  {
    id: "kb-1",
    title: "SOP-101: Cohort Shift & Batch Transfer Policy",
    category: "Batch Transfers",
    summary:
      "Criteria, milestone preservation rules, and Admin verification requirements when transferring students between weekday and weekend cohorts.",
    readTime: "3 min read",
    updatedAt: "Oct 2026",
    views: 428,
    macroSnippet:
      "Hello! We reviewed your attendance and verified your transfer eligibility. A cohort shift proposal has been routed for roster synchronization. Your lecture replay milestones and quiz history remain 100% intact.",
    checklist: [
      "Check learner live attendance (>65% required for synchronous transfer)",
      "Verify seat capacity in the target cohort before proposing",
      "Do not edit roster directly — trigger the 'Propose Batch Move' action",
      "Inform student that live timetable updates take up to 2 hours",
    ],
    content: [
      "Students requesting a shift between evening and weekend batches must have completed at least 2 modules in their current cohort.",
      "All assignments submitted and graded under previous modules retain their rubrics and marks without modification.",
      "Support staff should use the Propose Cohort Transfer action from the student ticket workspace.",
    ],
  },
  {
    id: "kb-2",
    title: "SOP-104: Assessment & Milestone Extension Protocol",
    category: "Course Extensions",
    summary:
      "Standard grace period policy for project submissions, rubric appeal deadlines, and medical leave accommodations.",
    readTime: "2 min read",
    updatedAt: "Nov 2026",
    views: 312,
    macroSnippet:
      "Greetings! In accordance with the academic extension policy, a 3-day grace period has been granted for your assignment. Please ensure your submission is uploaded to GitHub before the new deadline.",
    checklist: [
      "Confirm that student has not exceeded 2 extension requests in the current term",
      "Maximum permitted extension without faculty head signoff is 5 days",
      "Ensure the evaluation queue reflects the adjusted due date",
    ],
    content: [
      "Extensions may be approved directly by Tier 1 mentors for up to 3 days when accompanied by prior notice.",
      "Requests exceeding 5 days require escalations lead sign-off in coordination with the lead instructor.",
    ],
  },
  {
    id: "kb-3",
    title: "SOP-202: AI Rubric Evaluation Appeals",
    category: "AI Appeals",
    summary:
      "Step-by-step triage protocol when a student disputes an automated rubric score or evaluator grading decision.",
    readTime: "4 min read",
    updatedAt: "Nov 2026",
    views: 580,
    macroSnippet:
      "Hello! Your grading review request has been logged and assigned to a senior technical evaluator. We will re-evaluate your code submission against the standard rubric benchmarks within 48 hours.",
    checklist: [
      "Inspect submitted code against the public benchmark test suite",
      "Verify the original evaluator's inline notes and rubric points",
      "Tag the ticket under 'AI Evaluation Appeals' category",
    ],
    content: [
      "Learners are entitled to request re-evaluation once per graded assignment with written rationale.",
      "Re-evaluations are performed by independent second evaluators who review the entire criteria breakdown.",
    ],
  },
  {
    id: "kb-4",
    title: "SOP-301: Cloud IDE & Docker Environment Troubleshooting",
    category: "Technical Setup",
    summary:
      "Standard troubleshooting steps for student local workstation setup, port collisions, Docker daemon permissions, and GPU drivers.",
    readTime: "5 min read",
    updatedAt: "Nov 2026",
    views: 740,
    macroSnippet:
      "Hello! If your Docker container fails with port binding errors, ensure no zombie processes hold port 8000/8080. Run `docker ps` and `docker stop $(docker ps -q)` to clean up orphaned containers.",
    checklist: [
      "Confirm student OS (Windows WSL2, macOS Apple Silicon, or Ubuntu Linux)",
      "Check that virtualization is enabled in BIOS for Windows users",
      "Verify minimum RAM allocation in Docker Desktop settings (>4GB recommended)",
    ],
    content: [
      "Most local environment issues stem from Docker Desktop memory limits or port conflicts with existing local web servers.",
      "Direct students to the pre-configured Dev Container workspace when local configuration cannot be quickly resolved.",
    ],
  },
]

export default function KnowledgeBasePage({ onToast }: KnowledgeBasePageProps) {
  const [articles, setArticles] = useState<KbArticle[]>(ARTICLES)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [activeArticle, setActiveArticle] = useState<KbArticle | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // New Article Dialog
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newCategory, setNewCategory] = useState("Technical Setup")
  const [newSummary, setNewSummary] = useState("")
  const [newMacro, setNewMacro] = useState("")

  const handleCopyMacro = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    onToast?.("Macro response copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const article: KbArticle = {
      id: `kb-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      summary: newSummary.trim() || "Standard operating procedure for support staff.",
      readTime: "3 min read",
      updatedAt: "Just now",
      views: 1,
      macroSnippet: newMacro.trim() || "Thank you for reaching out. We have logged your request.",
      checklist: ["Verify student information", "Follow standard escalation guidelines"],
      content: [newSummary.trim()],
    }

    setArticles([article, ...articles])
    setIsNewOpen(false)
    setNewTitle("")
    setNewSummary("")
    setNewMacro("")
    onToast?.("SOP article published to knowledge base.")
  }

  const categories = ["all", "Batch Transfers", "Course Extensions", "AI Appeals", "Technical Setup"]

  const filteredArticles = articles.filter((art) => {
    if (selectedCategory !== "all" && art.category !== selectedCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        art.title.toLowerCase().includes(q) ||
        art.summary.toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Knowledge Base & SOPs"
        description="Standard operating procedures, macro responses, and cohort policies for academic support mentors."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Knowledge Base" }]}
        actions={
          <Button size="sm" onClick={() => setIsNewOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New SOP Article
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search policies, SOP codes, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer capitalize",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {cat === "all" ? "All SOPs" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No SOP articles found"
          description="Try broadening your search term or selecting All SOPs."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((art) => (
            <Card key={art.id} className="flex flex-col justify-between hover:border-border-strong transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge tone="primary">{art.category}</Badge>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {art.readTime} · {art.views} views
                  </span>
                </div>
                <CardTitle className="text-base font-semibold text-foreground line-clamp-1">
                  {art.title}
                </CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {art.summary}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {/* Macro Preview Box */}
                <div className="rounded-md border border-border bg-surface-2 p-2.5 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                    <span className="font-semibold uppercase tracking-wider">Canned Macro Snippet</span>
                    <button
                      type="button"
                      onClick={() => handleCopyMacro(art.macroSnippet, art.id)}
                      className="text-primary-text hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === art.id ? (
                        <>
                          <Check className="h-3 w-3 text-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Macro</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-foreground line-clamp-2 italic">{art.macroSnippet}</p>
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground">Updated {art.updatedAt}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setActiveArticle(art)}
                  >
                    Read Full SOP →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Article Reader Dialog */}
      <Dialog open={!!activeArticle} onOpenChange={(open) => !open && setActiveArticle(null)}>
        {activeArticle && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone="primary">{activeArticle.category}</Badge>
                <span className="text-xs text-muted-foreground">{activeArticle.readTime}</span>
              </div>
              <DialogTitle className="text-lg">{activeArticle.title}</DialogTitle>
              <DialogDescription>{activeArticle.summary}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs sm:text-sm">
              {/* Checklist */}
              <div className="rounded-md border border-border bg-surface-2 p-3 space-y-2">
                <h5 className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="h-4 w-4 text-primary-text" />
                  Staff Compliance Checklist
                </h5>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {activeArticle.checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary-text font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Policy Body */}
              <div className="space-y-2">
                <h5 className="font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                  Policy Directive
                </h5>
                {activeArticle.content.map((p, i) => (
                  <p key={i} className="text-foreground leading-relaxed text-xs sm:text-sm">
                    {p}
                  </p>
                ))}
              </div>

              {/* Canned Macro */}
              <div className="rounded-md border border-border bg-surface-2 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Standard Student Reply</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleCopyMacro(activeArticle.macroSnippet, activeArticle.id)}
                  >
                    <Copy className="mr-1.5 h-3 w-3" />
                    Copy Reply
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground italic bg-surface p-2 rounded border border-border">
                  {activeArticle.macroSnippet}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setActiveArticle(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* New Article Dialog */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreateArticle} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add Standard Operating Procedure</DialogTitle>
              <DialogDescription>
                Document a new policy or reusable macro response for the support staff.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <Field label="SOP Title">
                <Input
                  required
                  placeholder="e.g. SOP-402: Cloud GPU Quota Escalation"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </Field>

              <Field label="Category">
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Batch Transfers">Batch Transfers</SelectItem>
                    <SelectItem value="Course Extensions">Course Extensions</SelectItem>
                    <SelectItem value="AI Appeals">AI Appeals</SelectItem>
                    <SelectItem value="Technical Setup">Technical Setup</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Summary & Purpose">
                <Textarea
                  rows={3}
                  placeholder="Summarize when and why this SOP is applied..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                />
              </Field>

              <Field label="Canned Macro Snippet">
                <Textarea
                  rows={3}
                  placeholder="The standard template message to send to the student..."
                  value={newMacro}
                  onChange={(e) => setNewMacro(e.target.value)}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Publish SOP</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
