import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LifeBuoy,
  Search,
  Clock,
  ArrowRight,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Layers,
  ArrowUp,
  ChevronsUpDown,
} from "lucide-react";
import { SupportTicket, getAllSupportTickets, SUPPORT_CATEGORIES } from "./supportTicketsData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { MetricItem } from "@/types";
import { MetricCard } from "@/components/MetricCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const TicketsInboxPage: React.FC = () => {
  const [tickets] = useState<SupportTicket[]>(getAllSupportTickets());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const listRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  const filteredTickets = tickets.filter((tkt) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      tkt.subject.toLowerCase().includes(query) ||
      tkt.studentName.toLowerCase().includes(query) ||
      tkt.ticketNumber.toLowerCase().includes(query) ||
      tkt.studentBatch.toLowerCase().includes(query) ||
      (tkt.assignedAgent && tkt.assignedAgent.toLowerCase().includes(query));

    if (!matchesSearch) return false;
    if (statusFilter !== "all" && tkt.status !== statusFilter) return false;

    if (categoryFilter !== "all" && tkt.category !== categoryFilter) return false;

    if (priorityFilter !== "all" && tkt.priority !== priorityFilter) return false;

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

  const getCategoryBadgeClass = (category: string) => {
    const found = SUPPORT_CATEGORIES.find((c) => c.id === category);
    return found ? found.badgeClass : "bg-slate-50 text-zinc-600 border-slate-200";
  };

  const getPriorityBadge = (priority: SupportTicket["priority"]) => {
    switch (priority) {
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
      trend: "All registered requests",
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
      label: "Pending Review",
      value: `${pendingCount}`,
      trend: "In verification",
      tone: "yellow",
    },
    {
      icon: "check-circle",
      label: "Resolved",
      value: `${resolvedCount}`,
      trend: "SLA met",
      tone: "lime",
    },
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2 support-page-font h-full">
      {/* 1. KPI Stats (Canonical 132px Folder-Tab Cards with 8px Gap) */}
      <div className="metrics-grid shrink-0">
        {kpis.map((item) => (
          <MetricCard key={item.label} item={item} />
        ))}
      </div>

      {/* 2. Filter and Search Bar */}
      <div className="panel p-3 bg-white border border-zinc-150 shrink-0">
        <div className="flex flex-col md:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#905FEB]" />
            <Input
              placeholder="Search students or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-full border border-[#E5DEFF] bg-white text-[#111111] placeholder:text-zinc-400 focus:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs rounded-full border border-[#E5DEFF] bg-white text-[#111111] font-medium shadow-2xs hover:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl border border-[#E5DEFF] bg-white text-[#111111] shadow-xl min-w-[240px]">
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
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs rounded-full border border-[#E5DEFF] bg-white text-[#111111] font-medium shadow-2xs hover:border-[#905FEB] focus:ring-2 focus:ring-[#905FEB]/20">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-2xl border border-[#E5DEFF] bg-white text-[#111111] shadow-xl min-w-[140px]">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto rounded-full bg-[#F0EDFF] p-1 border border-[#905FEB]/20">
                <TabsTrigger value="all" className="text-xs rounded-full font-semibold data-[state=active]:bg-[#905FEB] data-[state=active]:text-white">
                  All
                </TabsTrigger>
                <TabsTrigger value="open" className="text-xs rounded-full font-semibold data-[state=active]:bg-[#905FEB] data-[state=active]:text-white">
                  Open
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs rounded-full font-semibold data-[state=active]:bg-[#905FEB] data-[state=active]:text-white">
                  Pending
                </TabsTrigger>
                <TabsTrigger value="resolved" className="text-xs rounded-full font-semibold data-[state=active]:bg-[#905FEB] data-[state=active]:text-white">
                  Resolved
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* 3. Tickets Queue Panel */}
      <div className="panel bg-white border border-zinc-150 flex flex-col flex-1 min-h-0 overflow-hidden relative">
        {/* Pinned Card Header with Scroll Bar Symbol & Indicator */}
        <div className="card-header px-4 py-3 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-2 shrink-0 mb-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="card-title flex items-center gap-2 text-sm font-bold text-zinc-900">
              <LifeBuoy className="h-4 w-4 text-purple-600" />
              <span>Support Tickets Queue</span>
            </span>
            <span className="text-xs text-zinc-400 font-medium">({filteredTickets.length} tickets)</span>

            {/* Scroll Bar Symbol & Indicator Badge */}
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0EDFF] text-[#7042D2] border border-[#905FEB]/30 text-[11px] font-bold shadow-2xs"
              title="Support Tickets Queue is scrollable"
            >
              <ChevronsUpDown className="h-3.5 w-3.5 text-[#905FEB] animate-pulse" />
              <span>Scroll Queue</span>
            </span>

            {/* Scroll Bar Directional Controls */}
            <div className="flex items-center gap-1 ml-0.5">
              <button
                type="button"
                onClick={() => listRef.current?.scrollBy({ top: -200, behavior: "smooth" })}
                className="w-6.5 h-6.5 rounded-lg border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#F0EDFF] flex items-center justify-center text-[#7042D2] text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                title="Scroll Up"
                aria-label="Scroll queue up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => listRef.current?.scrollBy({ top: 200, behavior: "smooth" })}
                className="w-6.5 h-6.5 rounded-lg border border-[#E5DEFF] bg-[#FAF9FF] hover:bg-[#F0EDFF] flex items-center justify-center text-[#7042D2] text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
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
          className="p-2 sm:p-2 flex-1 min-h-0 overflow-y-auto scroll-smooth divide-y divide-slate-100 bg-white support-queue-scrollbar pr-2"
        >
          {filteredTickets.length === 0 ? (
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
            filteredTickets.map((tkt) => (
              <div
                key={tkt.id}
                className="px-4 py-2 sm:px-5 sm:py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2 hover:bg-[#F0EDFF]/30 transition-colors"
              >
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#7042D2] bg-[#F0EDFF] border border-[#905FEB]/30 px-2.5 py-0.5 rounded-full">
                      {tkt.ticketNumber}
                    </span>
                    <span className="text-xs font-bold text-[#111111]">
                      {tkt.studentName}
                    </span>
                    <span className="text-xs text-zinc-300">•</span>
                    <span className="text-xs text-zinc-500 font-medium">{tkt.createdAt}</span>

                    {tkt.priority === "high" && (
                      <span className="badge-status-assigned text-[10px] px-2 py-0.5 font-bold">
                        High
                      </span>
                    )}
                    {tkt.priority === "medium" && (
                      <span className="badge-status-in-progress text-[10px] px-2 py-0.5 font-bold">
                        Medium
                      </span>
                    )}
                    {tkt.priority === "low" && (
                      <span className="badge-status-not-started text-[10px] px-2 py-0.5 font-bold">
                        Low
                      </span>
                    )}

                    {tkt.status === "open" && (
                      <span className="badge-status-in-progress text-[10px] px-2 py-0.5 font-bold">
                        In Progress
                      </span>
                    )}
                    {tkt.status === "pending" && (
                      <span className="badge-status-assigned text-[10px] px-2 py-0.5 font-bold">
                        Assigned
                      </span>
                    )}
                    {tkt.status === "resolved" && (
                      <span className="badge-status-completed text-[10px] px-2 py-0.5 font-bold">
                        Completed
                      </span>
                    )}

                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold rounded-full border-[#E5DEFF] text-[#111111] bg-white"
                    >
                      {tkt.category}
                    </Badge>

                    {tkt.proposedAction && (
                      <Badge variant="outline" className="text-[10px] bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/30 font-bold rounded-full">
                        Proposed: {tkt.proposedAction.type === "batch_move" ? "Batch Move" : `${tkt.proposedAction.extensionDays || 30}-day Extension`}
                      </Badge>
                    )}
                  </div>

                  <Link to={`/support/ticket/${tkt.id}`} className="group block">
                    <h3 className="text-xs sm:text-sm font-bold text-[#111111] leading-snug group-hover:text-[#905FEB] transition-colors">
                      {tkt.subject}
                    </h3>
                  </Link>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#111111]/70 font-medium">
                    <span>Batch: <strong className="text-[#111111]">{tkt.studentBatch}</strong></span>
                    <span>Assigned Agent: <strong className="text-[#111111]">{tkt.assignedAgent || "Unassigned"}</strong></span>
                    <span>Email: <span className="font-mono text-zinc-600">{tkt.studentEmail}</span></span>
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-2 pt-1 lg:pt-0 border-t lg:border-t-0 border-[#F0EDFF] shrink-0">
                  <Link to={`/support/ticket/${tkt.id}`}>
                    <button
                      className="btn-support-secondary text-xs h-7.5 px-3.5 gap-1.5 font-bold cursor-pointer"
                    >
                      Open Workstation <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))
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
