export type IconName =
  | "users"
  | "calendar"
  | "document"
  | "trend"
  | "home"
  | "reports"
  | "analytics"
  | "settings"
  | "search"
  | "book"
  | "chart"
  | "ruler"
  | "dots"
  | "menu"
  | "close"
  | "check"
  | "plus"
  | "sparkles"
  | "star"
  | "mail"
  | "filter"
  | "logout"
  | "compass"
  | "radio"
  | "note"
  | "award"
  | "help"
  | "bell"
  | "fire"
  | "clock"
  | "bookmark"
  | "play"
  | "chevron-right"
  | "shield"
  | "server"
  | "key"
  | "cpu"
  | "lock"
  | "database"
  | "terminal"
  | "layers"

export type UserRole = "Super Admin" | "Admin" | "Teacher" | "Student" | "Parent"

export interface CurrentUser {
  id: string
  name: string
  role: UserRole
  email: string
  title?: string
  avatar?: string
  campus?: string
  permissions?: string[]
}

export interface FacultyMember {
  id: string
  name: string
  email: string
  title: string
  department: string
  classesAssigned: string[]
  studentCount: number
  status: "Active" | "In Class" | "On Leave"
  attendanceRate: number
  avatar: string
  rating: number
}

export interface AuditLogItem {
  id: string
  timestamp: string
  actor: string
  role: string
  action: string
  target: string
  ip: string
  severity: "info" | "warning" | "security"
  category: "Auth" | "Permission" | "AI Engine" | "Database" | "Academic"
}

export interface CampusTenant {
  id: string
  name: string
  location: string
  type: "Primary Campus" | "Virtual Academy" | "Innovation Hub"
  studentCount: number
  facultyCount: number
  status: "Online" | "Maintenance" | "Syncing"
  cloudRegion: string
  aiQuotaUsed: number
}

export interface ClassRoomInfo {
  id: string
  name: string
  room: string
  grade: string
  leadTeacher: string
  studentsEnrolled: number
  maxCapacity: number
  avgScore: number
  attendance: number
}

export interface MetricItem {
  icon: IconName
  label: string
  value: string
  trend: string
  tone: "lavender" | "pink" | "yellow" | "lime"
}

export interface AssignmentItem {
  id: string
  icon: IconName
  title: string
  meta: string
  status: "Completed" | "In Progress" | "Assigned" | "Not Started"
  tone: "green" | "purple" | "yellow" | "gray"
}

export interface StudentItem {
  id: string
  name: string
  rollNumber: string
  image: string
  completion: number
  average: number
  attendance: number
  status: "Excelling" | "On Track" | "Needs Attention"
  tone: "lime" | "pink" | "yellow" | "purple"
  subjects: {
    english: number
    math: number
    science: number
    art: number
  }
  tags: string[]
  parentName: string
  parentEmail: string
}

export interface ReportItem {
  id: string
  title: string
  meta: string
  date: string
  type: string
  recipients: string
  readRate: number
  status: "Sent" | "In Progress" | "Scheduled"
  tone: "green" | "purple" | "yellow" | "lime"
  summary?: {
    avgScore: number
    attendance: number
    readCount: string
    topGain: string
    notes: string
  }
}
