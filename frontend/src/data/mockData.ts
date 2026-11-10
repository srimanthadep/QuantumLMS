import type {
  MetricItem,
  AssignmentItem,
  StudentItem,
  ReportItem,
  CourseItem,
  DoubtItem,
  CalendarEventItem,
  LiveSessionItem,
  AIMonitoringData,
  SessionRecordingItem,
  TeachingSuggestionItem,
  LiveAttendanceRecord,
  CorrectionSubmissionItem,
  RecordingReviewDataset,
} from "../types"

export const initialCourseMetrics: MetricItem[] = []
export const initialClassMetrics: MetricItem[] = []
export const initialStudentMetrics: MetricItem[] = []
export const initialReportMetrics: MetricItem[] = []
export const initialAnalyticsMetrics: MetricItem[] = []

export const initialAssignments: AssignmentItem[] = []
export const initialStudents: StudentItem[] = []
export const initialCourses: CourseItem[] = []
export const initialReports: ReportItem[] = []
export const initialDoubts: DoubtItem[] = []
export const initialCalendarEvents: CalendarEventItem[] = []
export const initialLiveSessions: LiveSessionItem[] = []

export const initialRecordingReviews: Record<string, RecordingReviewDataset> = {}
export const initialCorrectionSubmissions: CorrectionSubmissionItem[] = []
export const initialAIMonitoringData: AIMonitoringData = {
  lastUpdated: "",
  overallStatus: "Optimal",
  engagementScore: 0,
  activeParticipants: 0,
  totalEnrolled: 0,
  questionsCount: 0,
  participationTrend: "Stable",
  lectureProgressPercent: 0,
  currentSegmentTitle: "",
  attentionFlags: [],
  suggestions: [],
}

export const initialRecordings: SessionRecordingItem[] = []
export const initialTeachingSuggestions: TeachingSuggestionItem[] = []
export const initialAttendanceRecords: LiveAttendanceRecord[] = []
