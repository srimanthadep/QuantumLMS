# Quantum LMS - Role-Based Architecture Guide

This codebase organizes all pages, routes, and components strictly by **user role**, adhering to an enterprise-grade role-segregated architecture.

---

## 📁 File Tree Overview

```text
src/
├── pages/
│   ├── teacher/              # 👨‍🏫 Teacher & Faculty Portal
│   │   ├── ClassPage.tsx             # Lead Educator dashboard (Maple Class)
│   │   ├── CoursesPage.tsx           # Curriculum, modules & lessons manager
│   │   ├── StudentsPage.tsx          # Class rosters, grades & student directory
│   │   ├── DoubtsPage.tsx            # Student doubt ticketing & resolution
│   │   ├── CalendarPage.tsx          # Academic schedule & office hours
│   │   ├── LiveClassPage.tsx         # Live lecture scheduler & monitoring
│   │   ├── LiveStudioPage.tsx        # In-browser live studio with AI telemetrics
│   │   ├── AnalyticsPage.tsx         # Class engagement, retention & submissions
│   │   ├── ReportsPage.tsx           # Report cards & performance exports
│   │   ├── SettingsPage.tsx          # Faculty profile, notifications & security
│   │   └── index.ts                  # Teacher barrel export
│   │
│   ├── student/              # 🎓 Student Learning Portal
│   │   ├── StudentPortal.tsx         # Main student portal orchestrator
│   │   ├── StudentDashboardPage.tsx  # Learner overview, tasks & enrolled courses
│   │   ├── StudentOtherPages.tsx     # Student sub-route dispatcher
│   │   ├── AnnouncementsPage.tsx     # Campus & course alerts
│   │   ├── AssignmentsPage.tsx       # Assignment submission & grader
│   │   ├── AttendancePage.tsx        # Attendance records & percentage
│   │   ├── CertificatesPage.tsx      # Course completion credentials
│   │   ├── CommunityPage.tsx         # Study circles & peer network
│   │   ├── CourseDetailsPage.tsx     # Interactive video player & syllabus
│   │   ├── EventsPage.tsx            # Hackathons, seminars & webinars
│   │   ├── GradesPage.tsx            # GPA & transcript breakdowns
│   │   ├── MentorDetailsPage.tsx     # Assigned mentor & 1:1 scheduling
│   │   ├── MyCoursesPage.tsx         # Enrolled & catalog exploration
│   │   ├── MyNotesPage.tsx           # Timestamped lesson notes
│   │   ├── QuizzesPage.tsx           # Interactive tests & assessments
│   │   ├── StudentCommunicationPage.tsx # In-app direct messaging
│   │   ├── StudentDiscussionsPage.tsx# Forum discussions & threads
│   │   ├── StudentProfilePage.tsx    # Student bio & academic badges
│   │   ├── StudentSettingsPage.tsx   # Learner preferences & dark mode
│   │   ├── SupportHelpPage.tsx       # Help center & FAQ tickets
│   │   ├── TimetablePage.tsx         # Weekly lecture schedule
│   │   ├── studentMockData.ts        # Mock data for student features
│   │   ├── studentTypes.ts           # Types for student workflows
│   │   ├── materialUtils.ts          # Syllabus & materials helper
│   │   └── index.ts                  # Student barrel export
│   │
│   ├── admin/                # 🏛️ Institution & Super Admin Portal
│   │   ├── AdminPortal.tsx           # Multi-tenant campuses, faculty, audit logs
│   │   └── index.ts                  # Admin barrel export
│   │
│   ├── support/              # 🎧 Support & Help Desk Portal
│   │   ├── index.tsx                 # Support desk portal orchestrator
│   │   ├── SupportDashboard.tsx      # Omnichannel dispatcher & queue
│   │   ├── TicketsInboxPage.tsx      # Filterable ticket queue & triage
│   │   ├── TicketDetailPage.tsx      # SLA timelines & conversation thread
│   │   ├── LiveChatPage.tsx          # Real-time student live assistance
│   │   ├── KnowledgeBasePage.tsx     # Help articles & search
│   │   ├── SlaEscalationsPage.tsx    # SLA tracking & high-priority alerts
│   │   ├── SupportAgentsPage.tsx     # Agent roster & capacity management
│   │   ├── SupportAnalyticsPage.tsx  # CSAT, resolution times & SLA metrics
│   │   ├── Student360Page.tsx        # Comprehensive 360° student diagnostic
│   │   ├── SupportSettingsPage.tsx   # Queue automation & business hours
│   │   ├── supportTheme.css          # Dedicated theme styles
│   │   └── supportTicketsData.ts     # Mock support tickets
│   │
│   ├── auth/                 # 🔐 Authentication
│   │   ├── AuthPage.tsx              # Sign-in & registration with role preview
│   │   └── index.ts                  # Auth barrel export
│   │
│   └── index.ts              # Global role portal registry
│
├── components/
│   ├── teacher/              # Teacher-specific UI (Sidebar, attendance, assignments)
│   ├── student/              # Student-specific UI (StudentSidebar)
│   ├── admin/                # Admin-specific UI (AdminSidebar, AdminModals, AI monitoring)
│   ├── shared/               # Cross-role components (Modals, MetricCard, VideoPlayer, 360 Drawer)
│   ├── ui/                   # Reusable atomic UI components (button, card, dialog, tabs)
│   └── icons/                # SVG icon library & brand symbols
│
├── context/                  # React Contexts (AuthContext, NotificationContext)
├── data/                     # Global mock datasets & schemas
├── types/                    # Core TypeScript definitions (UserRole, CourseItem, etc.)
└── utils/                    # Shared color utilities and formatters
```

---

## 🚀 How to Import

### Importing Role Pages
```typescript
// 1. Direct from role folder (Recommended)
import { ClassPage, CoursesPage } from "@/pages/teacher"
import { StudentPortal } from "@/pages/student"
import { AdminPortal } from "@/pages/admin"
import SupportPortal from "@/pages/support"
import { AuthPage } from "@/pages/auth"

// 2. From global registry
import { TeacherPages, StudentPages, AdminPages } from "@/pages"
```

### Importing Role Components
```typescript
import { DesktopSidebar } from "@/components/teacher"
import { StudentSidebar } from "@/components/student"
import { AdminSidebar, AdminModals } from "@/components/admin"
import { MetricCard, GroundedAiTutor } from "@/components/shared"
import { Button, Card, Dialog } from "@/components/ui"
```
