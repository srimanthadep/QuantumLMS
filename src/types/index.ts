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
  | "message"
  | "chat"
  | "mic"

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
