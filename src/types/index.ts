export type IconName =
  | "users"
  | "calendar"
  | "document"
  | "trend"
  | "home"
  | "reports"
  | "analytics"
  | "settings"
  | "activity"
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
  | "chevron-left"
  | "grid"
  | "list"
  | "message-circle"
  | "video"
  | "mic"
  | "mic-off"
  | "video-off"
  | "monitor"
  | "phone-off"
  | "info"
  | "download"
  | "tag"
  | "pause"
  | "maximize"
  | "edit"
  | "check-circle"
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
  due?: string
  status: "Completed" | "In Progress" | "Assigned" | "Not Started"
  tone: "green" | "purple" | "yellow" | "gray"
}

export interface StudentItem {
  id: string
  name: string
  rollNumber: string
  image: string
  email?: string
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
  assignedClass?: string
  assignedCourse?: string
  batch?: string
  deliveryFormat?: string
  grade?: string
  pendingAssignments?: number
  completedTasks?: number
  totalTasks?: number
  lastActivity?: string
  teacherNotes?: string
  modulesCompleted?: number
  totalModules?: number
  courses?: { name: string; code: string; progress: number }[]
}

export type ActivityEventType =
  | "lesson_completed"
  | "video_watched"
  | "material_opened"
  | "assignment_submitted"
  | "quiz_attempted"

export interface StudentActivityEvent {
  id: string
  type: ActivityEventType
  title: string
  timestamp: string // "HH:MM AM/PM"
  detail?: string
  courseName?: string
}

export interface StudentDayActivity {
  date: string // "YYYY-MM-DD"
  dayOfWeek: number // 0-6 (0=Sun, 1=Mon, ..., 6=Sat)
  level: 0 | 1 | 2 | 3 | 4 // 0: none, 1: low (1-2), 2: medium (3-4), 3: high (5-6), 4: very high (7+)
  count: number
  events: StudentActivityEvent[]
}

export interface StudentActivitySummary {
  studentId: string
  totalActiveDays: number
  totalActivities: number
  mostRecentDate: string
  currentStreakDays: number
  longestStreakDays: number
  isDemoData: boolean
  weeks: {
    weekIndex: number
    monthLabel?: string
    days: StudentDayActivity[]
  }[]
}

export interface LessonMaterial {
  id: string
  title: string
  type: "Document" | "Video Lecture" | "Lab Worksheet" | "Slide Deck" | "PDF" | "Audio" | "External"
  sizeOrDuration: string
  url?: string
}

export interface LessonItem {
  id: string
  title: string
  duration: string
  completed: boolean
  type: "Interactive Lab" | "Video Lecture" | "Hands-on Exercise" | "Reading & Theory" | "PDF Document" | "Audio Lecture"
  description: string
  objectives: string[]
  contentSummary: string
  materials: LessonMaterial[]
  adminNotes?: string
  videoUrl?: string
  pdfUrl?: string
  audioUrl?: string
  externalUrl?: string
  resourceType?: "video" | "pdf" | "audio" | "document" | "external"
}

export interface StudentModuleSubmission {
  studentId: string
  studentName: string
  studentRoll: string
  studentAvatar?: string
  submittedAt: string
  status: "Submitted" | "Graded" | "Late" | "Pending"
  score?: number
  maxMarks: number
  submittedFile?: string
  teacherFeedback?: string
}

export interface ModuleAssignmentItem {
  id: string
  moduleId: string
  moduleTitle: string
  courseId: string
  title: string
  type: "Written Assignment" | "Coding Lab" | "Quiz Assessment" | "Project Milestone"
  description: string
  instructions: string
  dueDate: string
  maxMarks: number
  status: "Assigned" | "In Review" | "Graded" | "Closed"
  submissionsCount: number
  totalEnrolled: number
  attachments?: { name: string; size: string; type: string; url?: string }[]
  averageScore?: number
  isDemoData?: boolean
  submissions?: StudentModuleSubmission[]
}

export interface CourseModuleItem {
  id: string
  title: string
  description?: string
  objectives?: string[]
  lessonsCount?: number
  lessons: LessonItem[]
  completed: boolean
  progress: number
  assignment?: ModuleAssignmentItem | null
}

export interface CourseItem {
  id: string
  code: string
  name: string
  thumbnail: string
  description: string
  enrolledStudentsCount: number
  modulesCount: number
  lessonsCount: number
  progress: number
  status: "Active" | "Completed" | "Archived"
  tone: "purple" | "lime" | "yellow" | "pink"
  assignedClass: string
  term: string
  instructor: string
  modules: CourseModuleItem[]
  enrolledStudentIds: string[]
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

export interface DoubtResponse {
  id: string
  author: string
  authorRole: "Teacher" | "Student"
  authorAvatar?: string
  text: string
  createdAt: string
}

export interface DoubtItem {
  id: string
  studentId: string
  studentName: string
  studentAvatar: string
  studentRoll: string
  courseId: string
  courseName: string
  courseCode: string
  moduleName?: string
  lessonName?: string
  questionTitle: string
  questionText: string
  submittedAt: string
  priority: "High" | "Medium" | "Low"
  status: "Pending" | "In Progress" | "Resolved"
  responses: DoubtResponse[]
}

export interface CalendarEventItem {
  id: string
  title: string
  description?: string
  startDate: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  category: "Class" | "Deadline" | "Quiz" | "Meeting" | "Office Hours" | "Reminder"
  courseId?: string
  courseName?: string
  location?: string
  status?: "Scheduled" | "Completed" | "Pending"
  isReadOnly: boolean
}

export interface LiveSessionItem {
  id: string
  title: string
  courseId: string
  courseName: string
  courseCode: string
  batchName?: string
  scheduledDate: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  durationMinutes: number
  status: "Live Now" | "Upcoming" | "Completed" | "Cancelled" | "Scheduled"
  platform: "Zoom" | "Google Meet" | "Quantum Classroom"
  meetingUrl?: string
  recordingUrl?: string
  classNotes?: string
  instructorName: string
  instructorAvatar?: string
  enrolledCount?: number
  topicsCovered?: string[]
  isReadOnly: boolean
  date?: string
  time?: string
  duration?: string
}

export interface WhisperTranscriptEntry {
  id: string
  speaker: string
  speakerRole?: "Instructor" | "Student"
  timestamp: string // "02:15"
  seconds: number
  text: string
}

export interface RecordingChapterItem {
  id: string
  timestamp: string // "00:00"
  seconds: number
  title: string
  description: string
}

export interface ExecutiveSummaryData {
  text: string
  status: "AI-Generated · Verified" | "AI-Generated · Demo Data"
  lastUpdated: string
}

export interface CorrectionSubmissionItem {
  id: string
  recordingId: string
  recordingTitle?: string
  type: "Transcript" | "Chapter" | "Summary"
  targetId?: string
  timestamp?: string
  originalContent: string
  proposedChange: string
  proposedText?: string
  category?: string
  reason?: string
  submittedDate: string
  submittedAt?: string
  status: "Pending Review" | "Accepted" | "Rejected"
}

export interface RecordingReviewDataset {
  recordingId: string
  sessionId: string
  title: string
  courseName: string
  courseCode: string
  sessionDate: string
  duration: string
  status: RecordingStatus
  videoUrl?: string
  executiveSummary: ExecutiveSummaryData
  whisperTranscripts: WhisperTranscriptEntry[]
  chapters: RecordingChapterItem[]
}

export interface AIMonitoringSuggestion {
  id: string
  category: "Engagement" | "Pacing" | "Pedagogy" | "Assessment"
  text: string
  priority: "High" | "Medium" | "Low"
  dismissed?: boolean
}

export interface AIMonitoringFlag {
  id: string
  severity: "Low" | "Medium" | "High"
  message: string
  timestamp: string
}

export interface AIMonitoringData {
  lastUpdated: string
  overallStatus: "Optimal" | "Moderate" | "Needs Attention"
  engagementScore: number
  activeParticipants: number
  totalEnrolled: number
  questionsCount: number
  participationTrend: "Increasing" | "Stable" | "Decreasing"
  lectureProgressPercent: number
  currentSegmentTitle: string
  attentionFlags: AIMonitoringFlag[]
  suggestions: AIMonitoringSuggestion[]
}

export type RecordingStatus = "Available" | "Processing" | "Not Available"

export interface SessionRecordingItem {
  id: string
  sessionId: string
  title: string
  courseName: string
  courseCode: string
  sessionDate: string
  duration: string
  status: RecordingStatus
  recordingUrl?: string
  thumbnail?: string
  fileSize?: string
  viewsCount?: number
  keyTakeaways?: string[]
}

export interface TeachingSuggestionItem {
  id: string
  sessionId?: string
  courseCode: string
  category:
    | "Revision"
    | "Concept Clarification"
    | "Follow-up Activity"
    | "Next Class Question"
    | "Lecture Structure"
  title: string
  explanation: string
  priority: "High" | "Medium" | "Low"
  recommendedAction?: string
}

export type AttendanceStatus = "Present" | "Late" | "Absent" | "Left Early"

export interface LiveAttendanceRecord {
  id: string
  sessionId: string
  studentId: string
  studentName: string
  studentRoll: string
  studentAvatar?: string
  email: string
  joinTime: string
  leaveTime: string
  durationMinutes: number
  durationFormatted: string
  status: AttendanceStatus
  notes?: string
  deviceUsed?: string
  handRaisesCount?: number
}
