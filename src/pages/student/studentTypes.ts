import type { IconName } from "../../types"

export type StudentNavPage = "Dashboard" | "My Courses" | "Course Details" | "Timetable" | "Attendance" | "Assignments" | "Quizzes" | "Grades" | "Communication" | "Discussions" | "Mentor Details" | "My Notes" | "Certificates" | "Resume Building" | "Mock Interview" | "Events & Notices" | "Announcements" | "Community" | "Profile" | "Settings" | "Support & Help" | "Support" | "Help Center"

export interface EducationEntry {
  id: string
  degree: string
  institution: string
  year: string
  score: string
  location?: string
}

export interface ProjectEntry {
  id: string
  title: string
  role?: string
  technologies: string
  link?: string
  description: string
}

export interface ExperienceEntry {
  id: string
  company: string
  role: string
  duration: string
  location?: string
  responsibilities: string
}

export interface CertificationEntry {
  id: string
  name: string
  issuer: string
  date: string
  link?: string
}

export interface AchievementEntry {
  id: string
  title: string
  year: string
  description: string
}

export interface ResumeData {
  personalInfo: {
    fullName: string
    headline: string
    email: string
    phone: string
    location: string
    linkedin: string
    github: string
    portfolio: string
  }
  summary: string
  education: EducationEntry[]
  skills: {
    languages: string[]
    frameworks: string[]
    tools: string[]
    concepts: string[]
  }
  projects: ProjectEntry[]
  experience: ExperienceEntry[]
  certifications: CertificationEntry[]
  achievements: AchievementEntry[]
}

export interface CourseItem {
  id: string
  title: string
  category: string
  image: string
  instructor: string
  instructorRole: string
  progress: number
  status: "In Progress" | "Completed" | "Catalog"
  lastWatched: string
  progressColor: string
  totalModules: number
  completedModules: number
  nextMilestone: string
  rating: string
  reviews: string
  duration: string
  level: "Beginner" | "Intermediate" | "Advanced"
  credits: number
  description: string
}

export interface LessonItem {
  id: string
  title: string
  duration: string
  type: "video" | "reading" | "lab"
  status: "Completed" | "In Progress" | "Locked"
  summary: string
}

export interface ModuleItem {
  id: string
  title: string
  lessonCount: number
  duration: string
  status: "Completed" | "In Progress" | "Locked"
  lessons: LessonItem[]
}

export interface ResourceMaterial {
  id: string
  title: string
  type: "PDF" | "Code Notebook" | "Dataset" | "Slides"
  size: string
  date: string
  description: string
  fileName?: string
  url?: string
  driveUrl?: string
  driveId?: string
  isAvailable?: boolean
  errorMessage?: string
  content?: string
  mimeType?: string
}

export interface TimetableSlot {
  id: string
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"
  time: string
  courseCode: string
  courseName: string
  instructor: string
  room: string
  status: "Live Now" | "Upcoming" | "Completed"
  isOnline: boolean
}

export interface AttendanceSubject {
  id: string
  code: string
  name: string
  totalClasses: number
  attended: number
  percentage: number
  status: "Good Standing" | "Needs Attention"
}

export interface AssignmentData {
  id: string
  title: string
  course: string
  dueDate: string
  maxMarks: number
  status: "Pending" | "Submitted" | "Graded"
  priority: "High" | "Medium" | "Normal"
  submissionDate?: string
  grade?: string
  score?: number
  feedback?: string
  description: string
  repoUrl?: string
  comments?: string
  uploadedFileName?: string
}

export interface AssessmentQuestion {
  id: number
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  topic?: string
  difficulty?: "Easy" | "Medium" | "Hard"
}

export interface AssessmentAttempt {
  id: string
  quizId: string
  studentId: string
  studentName?: string
  attemptNumber: number
  startedAt: string
  submittedAt: string
  timeTakenSeconds: number
  answers: Record<number, number> // questionIndex -> selectedOptionIndex (0-3)
  score: number
  maxScore: number
  scoreStr: string
  pct: number
  passed: boolean
  feedback?: string
}

export interface QuizData {
  id: string
  title: string
  course: string
  dueDate: string
  durationMinutes: number
  questionCount: number
  passingPct: number
  status: "Active" | "Upcoming" | "Completed"
  score?: string
  pct?: number
  availableFrom?: string
  maxAttempts?: number
  attemptsUsed?: number
  latestAttemptId?: string
  questions?: AssessmentQuestion[]
}

export interface GradeItem {
  id: string
  courseCode: string
  courseTitle: string
  credits: number
  midterm: number
  assignments: number
  finalExam: number
  totalScore: number
  letterGrade: "A+" | "A" | "A-" | "B+" | "B"
  status: "Passed with Honors" | "Passed" | "In Progress"
}

export interface EventItem {
  id: string
  title: string
  category: "Hackathons" | "Guest Lectures" | "Workshops" | "Academic"
  date: string
  month: string
  day: string
  time: string
  location: string
  speaker?: string
  isFeatured?: boolean
  description: string
  registered?: boolean
}

export interface AnnouncementItem {
  id: string
  title: string
  author: string
  department: string
  timestamp: string
  category: "Urgent" | "Academic" | "Infrastructure" | "General"
  content: string
  attachmentName?: string
  attachmentSize?: string
  isRead: boolean
}

export interface NoteItem {
  id: string
  title: string
  course: string
  lastModified: string
  content: string
  snippet?: string
  tags: string[]
  lesson?: string
}

export interface CertificateItem {
  id: string
  title: string
  course: string
  issueDate: string
  credentialId: string
  grade: string
  skills: string[]
  status: "Earned" | "In Progress"
  progress?: number
}

export interface CommunityPost {
  id: string
  author: string
  avatar: string
  badge: string
  time: string
  channel: string
  title: string
  content: string
  likes: number
  replies: number
  isLiked?: boolean
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  category: "Getting Started" | "Courses & Labs" | "Submissions & Quizzes" | "Attendance & Leaves" | "Technical"
  linkTarget?: StudentNavPage
  linkLabel?: string
}

export type TicketCategory =
  | "Select Issue Category"
  | "All Categories"
  | "Login & Account"
  | "Live Class"
  | "Assignments & Exams"
  | "Course Content"
  | "Technical Problem"
  | "Payments & Certificates"
  | "Notifications"
  | "Others"
  | "Account & Access Management"
  | "Course & Content Management"
  | "Assignments & Assessments"
  | "Live Classes & Attendance"
  | "Technical Support"
  | "Communication & Notifications"
  | "General Help & Feedback"
  | "Technical Issue"
  | "Course/Content"
  | "Attendance"
  | "Assignment"
  | "Timetable"
  | "Account/Profile"
  | "Mentor"
  | "Other"

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent"
export type TicketStatus = "Open" | "In Progress" | "Resolved" | "Closed"

export interface TicketReply {
  id: string
  author: string
  role: "Student" | "Support Team" | "Faculty" | "System"
  avatar?: string
  timestamp: string
  content: string
  attachmentName?: string
  attachmentSize?: string
}

export interface SupportTicket {
  id: string
  category: TicketCategory
  subject: string
  description: string
  priority: TicketPriority
  status: TicketStatus
  createdDate: string
  lastUpdate: string
  attachmentName?: string
  attachmentSize?: string
  replies: TicketReply[]
  resolutionNotes?: string
}

export interface MentorAssignedStudent {
  id: string
  name: string
  rollNumber: string
  avatar: string
  status: string
  program: string
}

export interface MentorMeetingInfo {
  status: "Scheduled" | "Not Scheduled"
  scheduledDate?: string
  scheduledTime?: string
  topic?: string
  zoomUrl?: string
  agenda?: string
}

export interface MentorProfile {
  id: string
  name: string
  avatar: string
  title: string
  department: string
  email: string
  phone: string
  office: string
  bio: string
  specializations: string[]
  officeHours: string
  availabilityStatus: "Available Now" | "In Lecture" | "Away"
  assignedStudents: MentorAssignedStudent[]
  meeting?: MentorMeetingInfo
}

// Mock Interview System Data Models
export type InterviewType =
  | "Technical"
  | "HR"
  | "Behavioral"
  | "Coding"
  | "Aptitude"

export interface InterviewQuestion {
  id: string
  category: InterviewType
  question: string
  expectedConcepts: string[]
  sampleAnswer: string
  tip: string
}

export interface InterviewSetup {
  jobRole: string
  experienceLevel: "Fresher" | "1-2 Years" | "3-5 Years" | "5+ Years"
  questionCount: number
  durationMinutes: number
}

export interface InterviewQuestionResponse {
  questionId: string
  questionText: string
  answerText: string
  scorePercent: number
  feedback: string
  conceptsFound: string[]
  conceptsMissed: string[]
}

export interface InterviewHistoryItem {
  id: string
  date: string
  type: InterviewType
  role: string
  score: number // 0-100 percentage
  totalQuestions: number
  completedQuestions: number
  durationMinutes: number
  timeSpentSeconds: number
  responses: InterviewQuestionResponse[]
}

export interface InterviewStats {
  totalInterviews: number
  averageScore: number
  practiceHours: number
  interviewsCompleted: number
}
