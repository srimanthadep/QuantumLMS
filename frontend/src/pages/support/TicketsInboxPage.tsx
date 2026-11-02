import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  LifeBuoy,
  Search,
  Clock,
  ArrowRight,
  MessageSquare,
  ArrowUp,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { SUPPORT_CATEGORIES } from "./supportTicketsData";
import {
  getAllTickets,
  subscribeToTickets,
  type SupportTicket,
} from "@/services/ticketService";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/StatCard";
import type { MetricItem } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TicketsInboxPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const urlFilter = searchParams.get("filter") || searchParams.get("status") || "all";
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState(urlFilter === "escalated" ? "escalated" : "all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAllTickets();
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets from Supabase.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToTickets(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearchQuery(q);
    }
    const f = searchParams.get("filter") || searchParams.get("status");
    if (f) {
      setStatusFilter(f);
    }
  }, [searchParams]);

  const openCount = tickets.filter((t) => t.status.toLowerCase() === "open").length;
  const pendingCount = tickets.filter(
    (t) => t.status.toLowerCase() === "in progress" || t.status.toLowerCase() === "pending"
  ).length;
  const resolvedCount = tickets.filter((t) => t.status.toLowerCase() === "resolved").length;
  const escalatedCount = tickets.filter(
    (t) =>
      t.priority.toLowerCase() === "urgent" ||
      t.priority.toLowerCase() === "high" ||
      t.status.toLowerCase() === "open"
  ).length;

  const filteredTickets = tickets.filter((tkt) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      tkt.subject.toLowerCase().includes(query) ||
      tkt.studentName.toLowerCase().includes(query) ||
      tkt.ticketNumber.toLowerCase().includes(query) ||
      tkt.id.toLowerCase().includes(query) ||
      tkt.studentBatch.toLowerCase().includes(query) ||
      (tkt.assignedAgent && tkt.assignedAgent.toLowerCase().includes(query)) ||
      tkt.description.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    const s = tkt.status.toLowerCase();
    const p = tkt.priority.toLowerCase();

    if (statusFilter === "escalated") {
      if (p !== "urgent" && p !== "high") return false;
    } else if (statusFilter === "open") {
      if (s !== "open") return false;
    } else if (statusFilter === "pending") {
      if (s !== "in progress" && s !== "pending") return false;
    } else if (statusFilter === "resolved") {
      if (s !== "resolved" && s !== "closed") return false;
    }

    if (categoryFilter !== "all" && tkt.category !== categoryFilter) return false;

    if (priorityFilter !== "all") {
      if (p !== priorityFilter.toLowerCase()) return false;
    }

    return true;
  });

  const checkScrollState = () => {
    if (listRef.current) {
      const { scrollTop } = listRef.current;
      setCanScrollUp(scrollTop > 20);
    }
  };

  useEffect(() => {
    checkScrollState();
  }, [filteredTickets]);

  const handleScrollToTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(checkScrollState, 350);
  };

  const getPriorityBadge = (priority: SupportTicket["priority"]) => {
    const p = priority.toLowerCase();
    switch (p) {
      case "urgent":
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
            Urgent
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-bold">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const kpis: MetricItem[] = [
    {
      icon: "mail",
      label: "All Tickets",
      value: `${tickets.length}`,
      trend: "Database records",
      tone: "lavender",
    },
    {
      icon: "clock",
      label: "Open Queue",
      value: `${openCount}`,
      trend: "Awaiting action",
      tone: "pink",
    },
    {
      icon: "info",
      label: "In Progress",
      value: `${pendingCount}`,
      trend: "Active resolution",
      tone: "yellow",
    },
    {
      icon: "check-circle",
      label: "Resolved",
      value: `${resolvedCount}`,
      trend: "SLA completed",
      tone: "lime",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-[var(--app-card-gap,14px)] support-page-font h-full">
      {/* 1. KPI Stats Cards */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Filter and Search Bar */}
      <div className="panel p-3 bg-surface border border-zinc-150 shrink-0">
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-primary-text" />
            <Input
              placeholder="Search students, subject or ticket #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full border border-primary-border bg-surface text-foreground placeholder:text-zinc-400 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs rounded-full border border-primary-border bg-surface text-foreground font-medium shadow-2xs hover:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl border border-primary-border bg-surface text-foreground shadow-xl min-w-[240px]">
                <SelectItem value="all">All Categories</SelectItem>
                {SUPPORT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs rounded-full border border-primary-border bg-surface text-foreground font-medium shadow-2xs hover:border-primary focus:ring-2 focus:ring-primary/20">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl border border-primary-border bg-surface text-foreground shadow-xl min-w-[140px]">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Tabs with Escalated Filter */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-5 w-full sm:w-auto rounded-full bg-primary-soft p-1 border border-primary/20">
                <TabsTrigger value="all" className="text-xs rounded-full font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                  All
                </TabsTrigger>
                <TabsTrigger value="open" className="text-xs rounded-full font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                  Open
                </TabsTrigger>
                <TabsTrigger value="escalated" className="text-xs rounded-full font-semibold data-[state=active]:bg-rose-600 data-[state=active]:text-white flex items-center gap-1">
                  <span>Escalated</span>
                  <span className="text-[10px] bg-rose-200/50 text-rose-900 rounded-full px-1.5 py-0.2">
                    {escalatedCount}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs rounded-full font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                  In Progress
                </TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs rounded-full font-semibold data-[state=active]:bg-primary data-[state=active]:text-white">
                  Resolved
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-full border border-zinc-200 text-zinc-600 hover:text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tickets Queue Panel */}
      <div className="panel bg-surface border border-zinc-150 flex flex-col flex-1 min-h-0 overflow-hidden relative">
        {/* Pinned Card Header with Scroll Bar Symbol & Indicator */}
        <div className="card-header px-4 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2 shrink-0 mb-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="card-title flex items-center gap-2 text-sm font-bold text-zinc-900">
              <LifeBuoy className="h-4 w-4 text-purple-600" />
              <span>Support Tickets Queue</span>
            </span>
            <span className="text-xs text-zinc-400 font-medium">({filteredTickets.length} tickets from Supabase)</span>

            {/* Scroll Bar Directional Controls */}
            <div className="flex items-center gap-1 ml-0.5">
              <button
                type="button"
                onClick={() => listRef.current?.scrollBy({ top: -200, behavior: "smooth" })}
                className="w-6.5 h-6.5 rounded-lg border border-primary-border bg-primary-soft hover:bg-primary-soft flex items-center justify-center text-primary-text text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Scroll Up"
                aria-label="Scroll queue up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => listRef.current?.scrollBy({ top: 200, behavior: "smooth" })}
                className="w-6.5 h-6.5 rounded-lg border border-primary-border bg-primary-soft hover:bg-primary-soft flex items-center justify-center text-primary-text text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Scroll Down"
                aria-label="Scroll queue down"
              >
                ▼
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/support/sla-escalations">
              <button className="px-3 h-7.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 transition-colors cursor-pointer">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                <span>SLA Desk</span>
              </button>
            </Link>
            <Link to="/support/live-chat">
              <button className="px-3 h-7.5 rounded-full bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Live Chat</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Scrollable Viewport with visible custom scrollbar */}
        <CardContent
          ref={listRef}
          onScroll={checkScrollState}
          className="p-2 sm:p-2 flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-slate-100 bg-surface support-queue-scrollbar pr-2"
        >
          {isLoading && tickets.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-400">
              <RefreshCw className="h-6 w-6 mx-auto animate-spin text-purple-600 mb-2" />
              <span>Fetching live tickets from Supabase database...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600 space-y-2">
              <AlertCircle className="h-6 w-6 mx-auto text-rose-500 mb-1" />
              <p className="font-bold text-sm">{error}</p>
              <Button size="sm" onClick={loadData} className="mt-2 text-xs">
                Retry Connection
              </Button>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              <LifeBuoy className="h-7 w-7 mx-auto text-zinc-300 mb-1.5" />
              <p className="font-semibold text-zinc-700 text-sm">No tickets matching this filter</p>
              <p className="mt-1">Try resetting the search query or status filter.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCategoryFilter("all");
                  setPriorityFilter("all");
                }}
                className="mt-2.5 text-xs rounded-xl"
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            filteredTickets.map((tkt) => {
              const s = tkt.status.toLowerCase();
              return (
                <div
                  key={tkt.id}
                  className="px-4 py-2 sm:px-5 sm:py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2 hover:bg-primary-soft/30 transition-colors"
                >
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-primary-text bg-primary-soft border border-primary/30 px-2.5 py-0.5 rounded-full">
                        {tkt.ticketNumber}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {tkt.studentName}
                      </span>
                      <span className="text-xs text-zinc-300">•</span>
                      <span className="text-xs text-zinc-500 font-medium">
                        {new Date(tkt.created_at).toLocaleDateString()}
                      </span>

                      {getPriorityBadge(tkt.priority)}

                      {s === "open" && (
                        <span className="badge-status-in-progress text-[10px] px-2 py-0.5 font-bold">
                          Open
                        </span>
                      )}
                      {(s === "in progress" || s === "pending") && (
                        <span className="badge-status-assigned text-[10px] px-2 py-0.5 font-bold">
                          In Progress
                        </span>
                      )}
                      {s === "resolved" && (
                        <span className="badge-status-completed text-[10px] px-2 py-0.5 font-bold">
                          Resolved
                        </span>
                      )}
                      {s === "closed" && (
                        <span className="badge-status-not-started text-[10px] px-2 py-0.5 font-bold">
                          Closed
                        </span>
                      )}

                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold rounded-full border-primary-border text-foreground bg-surface"
                      >
                        {tkt.category}
                      </Badge>
                    </div>

                    <Link to={`/support/ticket/${tkt.id}`} className="group block">
                      <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug group-hover:text-primary-text transition-colors">
                        {tkt.subject}
                      </h3>
                    </Link>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-foreground/70 font-medium">
                      <span>
                        Batch: <strong className="text-foreground">{tkt.studentBatch}</strong>
                      </span>
                      <span>
                        Assigned Agent:{" "}
                        <strong className="text-foreground">{tkt.assignedAgent || "Unassigned"}</strong>
                      </span>
                      <span>
                        Email: <span className="font-mono text-zinc-600">{tkt.studentEmail}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-2 pt-1 lg:pt-0 border-t lg:border-t-0 border-primary-soft shrink-0">
                    <Link to={`/support/ticket/${tkt.id}`}>
                      <button className="btn-support-secondary text-xs h-7.5 px-3.5 gap-1.5 font-bold cursor-pointer">
                        Open Workstation <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>

        {/* Floating Scroll to Top button inside the container */}
        {canScrollUp && (
          <button
            onClick={handleScrollToTop}
            className="absolute bottom-5 right-6 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-lg transition-all animate-in fade-in zoom-in-95 cursor-pointer"
            title="Scroll back to top"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Scroll to Top</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TicketsInboxPage;
