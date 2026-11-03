import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"
import {
  AlertCircle,
  ArrowRight,
  Filter,
  LifeBuoy,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
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
import {
  getAllTickets,
  createTicket,
  subscribeToTickets,
  type SupportTicket,
} from "@/services/ticketService"
import { SUPPORT_CATEGORIES } from "./supportTicketsData"
import { cn } from "@/lib/utils"

interface TicketsInboxPageProps {
  onToast?: (msg: string) => void
}

export default function TicketsInboxPage({ onToast }: TicketsInboxPageProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters from URL or local state
  const urlFilter = searchParams.get("filter") || searchParams.get("status") || "all"
  const urlSearch = searchParams.get("search") || ""

  const [statusTab, setStatusTab] = useState<string>(urlFilter)
  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Create Ticket Dialog
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSubject, setCreateSubject] = useState("")
  const [createCategory, setCreateCategory] = useState("Technical Support")
  const [createPriority, setCreatePriority] = useState<SupportTicket["priority"]>("Medium")
  const [createDescription, setCreateDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const data = await getAllTickets()
      setTickets(data)
    } catch (err) {
      console.error("Failed to load tickets:", err)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    return subscribeToTickets(loadData)
  }, [loadData])

  useEffect(() => {
    const q = searchParams.get("search")
    if (q !== null) setSearchQuery(q)
    const f = searchParams.get("filter") || searchParams.get("status")
    if (f) setStatusTab(f)
  }, [searchParams])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData()
  }

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError(null)

    if (createSubject.trim().length < 8) {
      setCreateError("Subject must be at least 8 characters.")
      return
    }
    if (createDescription.trim().length < 20) {
      setCreateError("Description must be at least 20 characters.")
      return
    }

    setIsSubmitting(true)
    try {
      const newTicket = await createTicket({
        subject: createSubject.trim(),
        category: createCategory,
        priority: createPriority,
        description: createDescription.trim(),
      })
      setIsCreateOpen(false)
      setCreateSubject("")
      setCreateDescription("")
      setCreateError(null)
      onToast?.(`Ticket ${newTicket.ticketNumber} created successfully.`)
      await loadData()
      navigate(`/support/ticket/${newTicket.id}`)
    } catch (err: any) {
      setCreateError(err.message || "Failed to create support ticket.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Counts
  const openCount = tickets.filter((t) => t.status === "Open").length
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length
  const closedCount = tickets.filter((t) => t.status === "Closed").length
  const urgentCount = tickets.filter((t) => t.priority === "Urgent" || t.priority === "High").length

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Tab filter
      if (statusTab === "open" && t.status !== "Open") return false
      if (statusTab === "in_progress" && t.status !== "In Progress") return false
      if (statusTab === "resolved" && t.status !== "Resolved") return false
      if (statusTab === "closed" && t.status !== "Closed") return false
      if (statusTab === "escalated" && t.priority !== "Urgent" && t.priority !== "High") return false

      // Category filter
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false

      // Priority filter
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matches =
          t.ticketNumber.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.studentName.toLowerCase().includes(q) ||
          t.studentEmail.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [tickets, statusTab, categoryFilter, priorityFilter, searchQuery])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Tickets Inbox"
        description="Filter, triage, and resolve student academic and platform inquiries."
        breadcrumb={[{ label: "Support", href: "/support" }, { label: "Inbox" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh tickets"
            >
              <RefreshCw className={cn("mr-1.5 h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New Ticket
            </Button>
          </div>
        }
      />

      {/* Main Container Card */}
      <Card className="flex flex-col">
        {/* Filter and Tab Strip */}
        <div className="border-b border-border p-4 space-y-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "All Tickets", count: tickets.length },
              { id: "open", label: "Open", count: openCount },
              { id: "in_progress", label: "In Progress", count: inProgressCount },
              { id: "resolved", label: "Resolved", count: resolvedCount },
              { id: "escalated", label: "Urgent Escalations", count: urgentCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusTab(tab.id)
                  setSearchParams({ filter: tab.id })
                }}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
                  statusTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-surface-2 text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.2 rounded-full",
                    statusTab === tab.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-3 text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search and Secondary Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            <div className="sm:col-span-6 relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search ticket #, student name, email, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              )}
            </div>

            <div className="sm:col-span-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {SUPPORT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-3">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary-text" />
              <p>Loading support tickets from database...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<LifeBuoy className="h-5 w-5" />}
                title="No tickets found"
                description={
                  searchQuery || categoryFilter !== "all" || priorityFilter !== "all"
                    ? "Try adjusting your search criteria or resetting filters."
                    : "No tickets in this status category right now."
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusTab("all")
                      setSearchQuery("")
                      setCategoryFilter("all")
                      setPriorityFilter("all")
                      setSearchParams({})
                    }}
                  >
                    Clear All Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTickets.map((tkt) => (
                <Link
                  key={tkt.id}
                  to={`/support/ticket/${tkt.id}`}
                  className="group flex flex-col gap-3 p-4 transition-colors hover:bg-surface-2/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <Avatar
                      name={tkt.studentName}
                      src={tkt.messages[0]?.avatar}
                      className="h-10 w-10 shrink-0 border border-border mt-0.5"
                    />

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary-text">
                          {tkt.ticketNumber}
                        </span>
                        <Badge
                          tone={
                            tkt.priority === "Urgent"
                              ? "danger"
                              : tkt.priority === "High"
                                ? "warning"
                                : tkt.priority === "Medium"
                                  ? "info"
                                  : "neutral"
                          }
                        >
                          {tkt.priority}
                        </Badge>
                        <Badge
                          tone={
                            tkt.status === "Open"
                              ? "danger"
                              : tkt.status === "In Progress"
                                ? "warning"
                                : tkt.status === "Resolved"
                                  ? "success"
                                  : "neutral"
                          }
                        >
                          {tkt.status}
                        </Badge>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
                          {tkt.category}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-foreground group-hover:text-primary-text transition-colors line-clamp-1">
                        {tkt.subject}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{tkt.studentName}</span>
                        <span>·</span>
                        <span className="truncate">{tkt.studentEmail}</span>
                        <span>·</span>
                        <span className="truncate">{tkt.studentBatch}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t border-border sm:border-0">
                    <div className="text-right">
                      <p className="text-xs font-medium text-foreground">
                        {new Date(tkt.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(tkt.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-primary-text inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreateTicket} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
              <DialogDescription>
                File an inquiry on behalf of a learner or student cohort.
              </DialogDescription>
            </DialogHeader>

            {createError && (
              <div className="rounded-md bg-danger-soft p-3 text-xs text-danger flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="space-y-3">
              <Field label="Subject">
                <Input
                  required
                  placeholder="e.g. Docker container failure in Module 4"
                  value={createSubject}
                  onChange={(e) => setCreateSubject(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <Select value={createCategory} onValueChange={setCreateCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Priority">
                  <Select
                    value={createPriority}
                    onValueChange={(val) => setCreatePriority(val as SupportTicket["priority"])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Description (min 20 characters)">
                <Textarea
                  required
                  rows={4}
                  placeholder="Detail the issue, observed error logs, or student request..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                />
              </Field>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
