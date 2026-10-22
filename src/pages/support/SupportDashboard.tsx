import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import UseAnimations from 'react-useanimations';
import arrowUpRight from 'react-useanimations/lib/arrowUpRight';
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Star,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getAllSupportTickets, SupportTicket } from "./supportTicketsData";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const SupportDashboard: React.FC = () => {
  const [agentPresence, setAgentPresence] = useState<"online" | "away" | "busy">("online");
  const [tickets] = useState<SupportTicket[]>(getAllSupportTickets());
  const queueListRef = useRef<HTMLDivElement>(null);

  const scrollQueue = (direction: "up" | "down") => {
    if (queueListRef.current) {
      const step = 200;
      queueListRef.current.scrollBy({
        top: direction === "down" ? step : -step,
        behavior: "smooth",
      });
    }
  };

  const [selectedCard, setSelectedCard] = useState<"open" | "pending" | "resolved" | null>(null);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const pendingCount = tickets.filter((t) => t.status === "pending").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  const filteredTickets = tickets.filter((tkt) => {
    if (!selectedCard) return true;
    return tkt.status === selectedCard;
  });

  return (
    <div className="space-y-4 support-page-font">
      {/* Header Banner in White Background */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-white/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              Support &amp; Mentor Command Center
            </h1>
            <span className="badge-status-completed shadow-2xs font-bold px-3 py-1">
              <span
                className={`h-2 w-2 rounded-full ${agentPresence === "online" ? "bg-[#AEEB00] animate-pulse" : "bg-zinc-400"}`}
              />
              Agent Status: {agentPresence}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1.5 font-medium">
            Resolve student tickets, handle live chat sessions, monitor SLA countdowns, and manage customer records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status selector */}
          <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50 text-xs">
            {(["online", "away", "busy"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setAgentPresence(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${agentPresence === st
                  ? st === "online"
                    ? "text-white shadow-xs"
                    : st === "busy"
                      ? "bg-red-500 text-white shadow-xs"
                      : "bg-amber-500 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
                  }`}
                style={
                  agentPresence === st && st === "online"
                    ? { backgroundColor: "#10b981", color: "#ffffff" }
                    : undefined
                }
              >
                {st}
              </button>
            ))}
          </div>

          <Link to="/support/live-chat">
            <button className="btn-support-primary text-xs font-bold h-9 px-4 rounded-full group cursor-pointer gap-2">
              <MessageSquare className="h-4 w-4" />
              <span>Live Chat Desk</span>
              <UseAnimations animation={arrowUpRight} size={18} strokeColor="#ffffff" />
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Stats (Quantum folder-tab status cards) */}
      <div className="metrics-grid">
        <StatCard
          title="Open Tickets"
          value={openCount}
          icon={LifeBuoy}
          tone="pink"
          trend={{ value: "1 SLA Alert", isPositive: true }}
          onClick={() => setSelectedCard(selectedCard === "open" ? null : "open")}
          isActive={selectedCard === "open"}
          index={0}
        />
        <StatCard
          title="Pending Approval"
          value={pendingCount}
          icon={Clock}
          tone="yellow"
          trend={{ value: "Awaiting Admin", isPositive: true }}
          onClick={() => setSelectedCard(selectedCard === "pending" ? null : "pending")}
          isActive={selectedCard === "pending"}
          index={1}
        />
        <StatCard
          title="Resolved Tickets"
          value={resolvedCount}
          icon={CheckCircle2}
          tone="lime"
          trend={{ value: "98.2% in SLA", isPositive: true }}
          onClick={() => setSelectedCard(selectedCard === "resolved" ? null : "resolved")}
          isActive={selectedCard === "resolved"}
          index={2}
        />
        <StatCard
          title="Customer CSAT Score"
          value="4.92 / 5.0"
          icon={Star}
          tone="lavender"
          trend={{ value: "+0.2 vs last mo", isPositive: true }}
          onClick={() => setSelectedCard(null)}
          isActive={selectedCard === null}
          index={3}
        />
      </div>

      {/* Main Grid: Priority Inbox & Fast Operational Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Priority Tickets Queue (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="bg-white shadow-xs border-white/80 rounded-2xl flex flex-col h-[460px] overflow-hidden">
            <CardHeader className="p-4 sm:px-5 sm:py-3.5 border-b border-slate-100 flex flex-row items-center justify-between shrink-0 bg-white">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold text-zinc-900">
                  Active Support Queue
                </CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Urgent tickets and batch change proposals requiring mentor response.
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 mr-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => scrollQueue("up")}
                    className="h-7 w-7 p-0 rounded-lg border-slate-200 hover:bg-purple-50 text-purple-700"
                    title="Scroll Up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => scrollQueue("down")}
                    className="h-7 w-7 p-0 rounded-lg border-slate-200 hover:bg-purple-50 text-purple-700"
                    title="Scroll Down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Link to="/support/inbox">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 h-8 text-purple-700 hover:bg-purple-50 font-bold"
                  >
                    View All <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent
              ref={queueListRef}
              className="p-0 divide-y divide-slate-100 flex-1 min-h-0 overflow-y-auto scroll-smooth bg-white [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300"
            >
              {tickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 flex flex-col items-center justify-center gap-2 h-full bg-white">
                  <p>No tickets found in this filtered category.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold h-7 bg-white text-purple-700 border-purple-200 hover:bg-purple-50"
                    onClick={() => setSelectedCard(null)}
                  >
                    Reset Filter &amp; Show All
                  </Button>
                </div>
              ) : (
                filteredTickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="p-3.5 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/40 transition-colors bg-white"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                          {tkt.ticketNumber}
                        </span>
                        <span className="text-xs text-zinc-400">•</span>
                        <span className="text-xs font-bold text-zinc-900">
                          {tkt.studentName}
                        </span>
                        {tkt.priority === "high" && (
                          <Badge variant="destructive" className="text-[10px] font-bold">
                            High Priority
                          </Badge>
                        )}
                        {tkt.status === "open" && (
                          <span className="badge-status-in-progress text-[10px] font-bold px-2 py-0.5">
                            Open
                          </span>
                        )}
                        {tkt.status === "pending" && (
                          <span className="badge-status-assigned text-[10px] font-bold px-2 py-0.5">
                            Pending Admin
                          </span>
                        )}
                        {tkt.status === "resolved" && (
                          <span className="badge-status-completed text-[10px] font-bold px-2 py-0.5">
                            Resolved
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-semibold text-[#111111]">
                        {tkt.subject}
                      </h4>
                      <p className="text-xs text-zinc-500">
                        Batch: {tkt.studentBatch} • Assigned to: {tkt.assignedAgent}
                      </p>
                    </div>

                    <Link to={`/support/ticket/${tkt.id}`}>
                      <button
                        className="btn-support-secondary text-xs gap-1.5 shrink-0 font-bold h-8 px-3.5 cursor-pointer"
                      >
                        Open Ticket <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
            <div className="p-2.5 sm:px-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-zinc-500 shrink-0">
              <span>Support Tickets Queue</span>
              {selectedCard && (
                <button
                  onClick={() => setSelectedCard(null)}
                  className="text-purple-700 hover:underline font-bold text-xs cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Portal Navigation & Live Quick Access (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Mentor Inbox Card in White Background */}
          <div className="p-5 rounded-2xl bg-white border border-white/80 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
                <LifeBuoy className="h-3.5 w-3.5 text-purple-600" /> Mentor Inbox
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-base font-bold text-zinc-900 leading-snug">
              Active Inquiries
            </p>
            <p className="text-xs text-zinc-500 font-medium">
              Avg SLA: 14 mins response
            </p>
            <Link to="/support/inbox" className="block pt-1">
              <Button
                size="sm"
                variant="outline"
                className="w-full h-8 text-xs rounded-xl gap-1.5 font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/80 transition-all"
              >
                <span>Open Tickets</span> <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
