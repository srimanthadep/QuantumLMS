export interface BatchEntitlement {
  accessType: "live_and_replay" | "replay_only";
  replayReleaseDelayHours: number; // e.g. 0 for instantaneous, 24 for delayed release
  accessExpiryDate: string;
  allowLiveChat: boolean;
  allowDoubts: boolean;
  allowAiTutor: boolean;
  allowCertificates: boolean;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: "Generative AI" | "LLM Engineering" | "Agentic Systems" | "Computer Vision" | "MLOps";
  level: "Beginner" | "Intermediate" | "Advanced";
  modulesCount: number;
  totalHours: number;
  rating: number;
  enrolledStudentsCount: number;
  thumbnail: string;
  priceRupees: number;
  status: "active" | "draft" | "archived";
}

export interface Batch {
  id: string;
  courseId: string;
  courseTitle: string;
  name: string; // e.g. "Cohort 7 (Weekday Evening)"
  cohortCode: string;
  startDate: string;
  endDate: string;
  teacherId: string;
  teacherName: string;
  maxSeats: number;
  enrolledCount: number;
  status: "upcoming" | "active" | "completed";
  entitlement: BatchEntitlement;
}

export interface LiveClassSession {
  id: string;
  batchId: string;
  batchName: string;
  courseTitle: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "scheduled" | "live" | "processing" | "in_review" | "published" | "cancelled";
  streamUrl?: string;
  viewerCount?: number;
  activeTopic?: string;
  confusionCount?: number; // "I'm lost" counter
  handRaisesCount?: number;
}

export interface VideoChapter {
  id: string;
  timestampSeconds: number;
  timestampFormatted: string; // "00:14:20"
  title: string;
  summary: string;
  keyKeywords: string[];
}

export interface TranscriptSnippet {
  id: string;
  timestampSeconds: number;
  timestampFormatted: string;
  speaker: string;
  text: string;
}

export interface LectureRecording {
  id: string;
  classId: string;
  courseTitle: string;
  title: string;
  durationFormatted: string;
  publishedAt: string;
  thumbnailUrl?: string;
  videoUrl: string;
  chapters: VideoChapter[];
  transcript: TranscriptSnippet[];
  aiSummary: string;
  keyConcepts: string[];
  pdfNotesUrl?: string;
  dppAttachmentUrl?: string;
  status: "processing" | "in_review" | "published";
}

export interface StudentDoubt {
  id: string;
  studentId: string;
  studentName: string;
  studentAvatar?: string;
  courseTitle: string;
  batchName: string;
  classTitle: string;
  timestampSeconds?: number;
  timestampFormatted?: string;
  question: string;
  status: "open" | "ai_answered" | "teacher_replied" | "resolved" | "escalated";
  aiAnswer?: string;
  teacherReply?: string;
  createdAt: string;
}

export interface RubricCriterion {
  id: string;
  criteria: string;
  maxScore: number;
  score: number;
  rationale: string;
}

export interface TestSubmission {
  id: string;
  testId: string;
  testTitle: string;
  courseTitle: string;
  batchName: string;
  studentId: string;
  studentName: string; // masked in blind grading
  submittedAt: string;
  status: "pending" | "draft" | "graded" | "re_evaluation_requested";
  objectiveScore: number;
  objectiveMaxScore: number;
  codeSubmission?: string;
  descriptiveAnswers?: Array<{ question: string; answer: string }>;
  rubricScores: RubricCriterion[];
  aiSuggestedScore?: number;
  aiRationale?: string;
  evaluatorFeedback: string;
  totalScore: number;
  maxScore: number;
  reEvaluationReason?: string;
  priority?: "urgent" | "normal" | "low";
  deadline?: string;
  isOverdue?: boolean;
  slaTimeRemaining?: string;
  returnedForResubmission?: boolean;
  resubmissionNote?: string;
  releasedToStudent?: boolean;
  files?: Array<{ name: string; language: string; content: string }>;
  annotatedAttachmentUrl?: string;
  gradeHistory?: Array<{ date: string; evaluator: string; totalScore: number; changeReason: string }>;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentBatch: string;
  category: "academic_doubt" | "payment_issue" | "batch_change" | "account_access" | "extension";
  priority: "urgent" | "high" | "medium" | "low";
  status: "open" | "pending" | "resolved";
  assignedAgent?: string;
  subject: string;
  messages: Array<{
    id: string;
    sender: string;
    role: "student" | "agent" | "teacher" | "system";
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
  proposedAction?: {
    type: "batch_move" | "validity_extension";
    targetBatchName?: string;
    extensionDays?: number;
    status: "proposed" | "approved" | "rejected";
  };
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  paymentId: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  batchName: string;
  amountRupees: number;
  status: "captured" | "failed" | "refunded";
  method: "UPI (Google Pay)" | "Razorpay NetBanking" | "Credit Card" | "EMI";
  date: string;
  invoiceNumber: string;
}

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  studentName: string;
  studentId: string;
  courseTitle: string;
  batchName: string;
  issueDate: string;
  verificationCode: string;
  gradeAwarded: "Distinction (95%)" | "Excellent (88%)" | "Passed (79%)";
  pdfUrl?: string;
}

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetResource: string;
  details: string;
  ipAddress: string;
  timestamp: string;
  status: "success" | "warning" | "denied";
}
