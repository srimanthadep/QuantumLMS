import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  LayoutDashboard, 
  BookOpen, 
  Users, 
  Calendar, 
  Video, 
  HelpCircle, 
  Award, 
  FileCheck2, 
  LifeBuoy, 
  ShieldAlert, 
  Settings,
  CreditCard,
  Bot
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  title: string;
  category: string;
  icon: React.ElementType;
  path: string;
  keywords?: string[];
}

const COMMAND_ITEMS: CommandItem[] = [
  // Super Admin
  { id: "sa-dash", title: "Super Admin Platform Overview", category: "Super Admin", icon: ShieldAlert, path: "/super-admin/dashboard" },
  { id: "sa-users", title: "User & Role Directory", category: "Super Admin", icon: Users, path: "/super-admin/users" },
  { id: "sa-perms", title: "Permission Matrix", category: "Super Admin", icon: Settings, path: "/super-admin/roles" },
  { id: "sa-costs", title: "LLM Token Usage & Costs", category: "Super Admin", icon: Bot, path: "/super-admin/usage-costs" },
  { id: "sa-audit", title: "Platform Audit Logs", category: "Super Admin", icon: ShieldAlert, path: "/super-admin/audit-logs" },

  // Admin
  { id: "adm-dash", title: "Admin Operations Dashboard", category: "Admin", icon: LayoutDashboard, path: "/admin/dashboard" },
  { id: "adm-courses", title: "Course Catalog & Syllabus", category: "Admin", icon: BookOpen, path: "/admin/courses" },
  { id: "adm-batches", title: "Batch Entitlements & Cohorts", category: "Admin", icon: Users, path: "/admin/batches" },
  { id: "adm-sched", title: "Master Class Scheduler", category: "Admin", icon: Calendar, path: "/admin/schedule" },
  { id: "adm-live", title: "Live Class Monitor", category: "Admin", icon: Video, path: "/admin/live-monitor" },
  { id: "adm-pay", title: "Razorpay Transactions & Invoices", category: "Admin", icon: CreditCard, path: "/admin/payments" },

  // Teacher
  { id: "tch-dash", title: "Teacher Studio Dashboard", category: "Teacher", icon: LayoutDashboard, path: "/teacher/dashboard" },
  { id: "tch-live", title: "Live Classroom Studio", category: "Teacher", icon: Video, path: "/teacher/classroom/class-agentic-101" },
  { id: "tch-rec", title: "Lecture Recording & AI Chapters Editor", category: "Teacher", icon: Bot, path: "/teacher/recordings" },
  { id: "tch-doubts", title: "Student Timestamped Doubts Desk", category: "Teacher", icon: HelpCircle, path: "/teacher/doubts" },
  { id: "tch-tests", title: "Assessment & Test Builder", category: "Teacher", icon: FileCheck2, path: "/teacher/tests" },

  // Student
  { id: "stu-dash", title: "Student Learning Hub", category: "Student", icon: LayoutDashboard, path: "/student/dashboard" },
  { id: "stu-courses", title: "My Enrolled Courses & Batches", category: "Student", icon: BookOpen, path: "/student/courses" },
  { id: "stu-sched", title: "Upcoming Classes Timetable", category: "Student", icon: Calendar, path: "/student/schedule" },
  { id: "stu-replays", title: "Video Replays & AI Lecture Library", category: "Student", icon: Video, path: "/student/replays" },
  { id: "stu-player", title: "Smart Player with Grounded AI Tutor", category: "Student", icon: Bot, path: "/student/replays/rep-rag-8" },
  { id: "stu-tests", title: "Assessments & Timed Tests", category: "Student", icon: FileCheck2, path: "/student/assessments" },
  { id: "stu-certs", title: "Verified Certificates", category: "Student", icon: Award, path: "/student/certificates" },

  // Evaluator
  { id: "eval-dash", title: "Evaluator Dashboard", category: "Evaluator", icon: LayoutDashboard, path: "/evaluator/dashboard" },
  { id: "eval-queue", title: "Submission Grading Queue", category: "Evaluator", icon: FileCheck2, path: "/evaluator/queue" },

  // Support
  { id: "sup-dash", title: "Support & Mentor Desk", category: "Support", icon: LifeBuoy, path: "/support/dashboard" },
  { id: "sup-tickets", title: "Ticket Inbox & Canned Responses", category: "Support", icon: LifeBuoy, path: "/support/tickets" },
  { id: "sup-360", title: "Student 360 Explorer", category: "Support", icon: Users, path: "/support/students" },
];

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onOpenChange }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const filteredItems = useMemo(() => {
    if (!query.trim()) return COMMAND_ITEMS.slice(0, 10);
    const q = query.toLowerCase();
    return COMMAND_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (item: CommandItem) => {
    onOpenChange(false);
    navigate(item.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border-border/80 shadow-2xl rounded-2xl bg-card">
        <DialogTitle className="sr-only">Command Palette Search</DialogTitle>
        <DialogDescription className="sr-only">Quickly jump to any LMS page or action</DialogDescription>
        
        <div className="flex items-center px-4 border-b border-border/70 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, course, role, or feature (e.g. 'replays', 'evaluator', 'costs')..."
            className="h-12 border-0 bg-transparent px-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground/70"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono border border-border/70 rounded px-1.5 py-0.5 bg-muted/60 text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="p-2 max-h-80 overflow-y-auto sleek-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching pages or commands found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-xs outline-none select-none",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-foreground hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={cn("p-1.5 rounded-lg shrink-0", isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="truncate">{item.title}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 font-medium ml-2",
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-border/70 bg-muted/10 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>Navigate: <kbd className="font-mono bg-muted/70 px-1 rounded">↑</kbd> <kbd className="font-mono bg-muted/70 px-1 rounded">↓</kbd></span>
            <span>Select: <kbd className="font-mono bg-muted/70 px-1 rounded">↵</kbd></span>
          </div>
          <span>Global Search</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
