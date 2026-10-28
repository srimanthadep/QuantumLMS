import { SupportTicket as BaseSupportTicket } from "@/types/lms";

export type SupportCategory =
  | "Login & Account"
  | "Live Class	"
  | "Assignments & Exams"
  | "Course Content"
  | "Technical Problem"
  | "Payments & Certificates	"
  | "Notifications"
  | "Others";

export type SupportPriority = "high" | "medium" | "low";

export interface SupportCategoryInfo {
  id: SupportCategory;
  label: string;
  badgeClass: string;
}

export const SUPPORT_CATEGORIES: SupportCategoryInfo[] = [
  {
    id: "Login & Account",
    label: "Login & Account",
    badgeClass: "bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/30 rounded-full",
  },
  {
    id: "Live Class	",
    label: "Live Class	",
    badgeClass: "bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/30 rounded-full",
  },
  {
    id: "Assignments & Exams",
    label: "Assignments & Exams",
    badgeClass: "bg-[#EAFCC7] text-[#3B6600] border-[#AEEB00]/40 rounded-full",
  },
  {
    id: "Course Content",
    label: "Course Content",
    badgeClass: "bg-[#FFF3E0] text-[#B45309] border-[#FDBA74]/40 rounded-full",
  },
  {
    id: "Technical Problem",
    label: "Technical Problem",
    badgeClass: "bg-[#FEE4E2] text-[#D92D20] border-[#FDA29B]/40 rounded-full",
  },
  {
    id: "Payments & Certificates",
    label: "Payments & Certificates",
    badgeClass: "bg-[#FFF3E0] text-[#B45309] border-[#FDBA74]/40 rounded-full",
  },
  {
    id: "Notifications",
    label: "Notifications",
    badgeClass: "bg-[#F0EDFF] text-[#7042D2] border-[#905FEB]/30 rounded-full",
  },
  {
    id: "Others",
    label: "Others",
    badgeClass: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] rounded-full",
  },
];

export interface SupportTicket extends Omit<BaseSupportTicket, "category" | "priority"> {
  category: SupportCategory;
  priority: SupportPriority;
}

export const ALL_SUPPORT_TICKETS: SupportTicket[] = [
  // 1. Account & Access Management
  {
    id: "tkt-1082",
    ticketNumber: "TKT-1082",
    studentId: "usr-student-1",
    studentName: "Arjun Mehta",
    studentEmail: "arjun.m@learner.ai",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Account & Access Management",
    priority: "medium",
    status: "open",
    assignedAgent: "Nikhil Joshi",
    subject: "Requesting move from Weekday Evening to Weekend Intensive cohort",
    createdAt: "Today, 09:30 AM",
    messages: [
      {
        id: "msg-1082-1",
        sender: "Arjun Mehta",
        role: "student",
        message: "Hello Support Team, due to new office timings I am unable to attend the 8 PM weekday live lectures. Can I please be moved to the Weekend Cohort?",
        timestamp: "09:30 AM",
      },
      {
        id: "msg-1082-2",
        sender: "Nikhil Joshi",
        role: "agent",
        message: "Hi Arjun, I have verified your attendance and course progress (78% completion). I am proposing a batch shift to Agentic Systems Weekend Cohort for Admin review. Your historical progress will be fully preserved.",
        timestamp: "10:15 AM",
      },
    ],
    proposedAction: {
      type: "batch_move",
      targetBatchName: "Agentic Systems Bootcamp (Weekend Cohort)",
      status: "proposed",
    },
  },
  {
    id: "tkt-1083",
    ticketNumber: "TKT-1083",
    studentId: "usr-student-5",
    studentName: "Simran Kaur",
    studentEmail: "simran.k@example.com",
    studentBatch: "Cohort 8 (Replay Only)",
    category: "Account & Access Management",
    priority: "high",
    status: "pending",
    assignedAgent: "Nikhil Joshi",
    subject: "Medical pause: Requesting 30-day access validity extension",
    createdAt: "Yesterday, 02:40 PM",
    messages: [
      {
        id: "msg-1083-1",
        sender: "Simran Kaur",
        role: "student",
        message: "I was hospitalized last week with dengue. Could my access expiry date be extended by 30 days so I can finish the milestones?",
        timestamp: "Yesterday, 02:40 PM",
      },
      {
        id: "msg-1083-2",
        sender: "Nikhil Joshi",
        role: "agent",
        message: "Hi Simran, I have reviewed your hospital certificate. I have initiated a 30-day validity extension proposal for admin sanction. Please take adequate rest.",
        timestamp: "Yesterday, 03:15 PM",
      },
    ],
    proposedAction: {
      type: "validity_extension",
      extensionDays: 30,
      status: "proposed",
    },
  },
  {
    id: "tkt-1094",
    ticketNumber: "TKT-1094",
    studentId: "usr-student-42",
    studentName: "Aditi Roy",
    studentEmail: "aditi.r@learner.ai",
    studentBatch: "Cohort 8 (Replay Only)",
    category: "Account & Access Management",
    priority: "medium",
    status: "pending",
    assignedAgent: "Nikhil Joshi",
    subject: "Request to upgrade from Self-Paced Replay-Only to Live Synchronous Cohort",
    createdAt: "Yesterday, 08:50 PM",
    messages: [
      {
        id: "msg-1094-1",
        sender: "Aditi Roy",
        role: "student",
        message: "I started in self-paced Cohort 8, but I would really like to participate in live discussions and code-along sessions with Prof. Rajesh. Willing to pay the fee differential.",
        timestamp: "Yesterday, 08:50 PM",
      },
    ],
    proposedAction: {
      type: "batch_move",
      targetBatchName: "Cohort 7 (Live Synchronous + Replays)",
      status: "proposed",
    },
  },

  // 2. Course & Content Management
  {
    id: "tkt-1085",
    ticketNumber: "TKT-1085",
    studentId: "usr-student-12",
    studentName: "Ananya Sharma",
    studentEmail: "ananya.s@example.com",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Course & Content Management",
    priority: "medium",
    status: "open",
    assignedAgent: "Meera Sen",
    subject: "GST invoice download returns 404 for recent installment payment",
    createdAt: "Today, 10:45 AM",
    messages: [
      {
        id: "msg-1085-1",
        sender: "Ananya Sharma",
        role: "student",
        message: "I made the second installment payment via UPI yesterday. When clicking 'Download Tax Invoice', it shows an error 404. Need the invoice for company sponsorship reimbursement.",
        timestamp: "10:45 AM",
      },
    ],
  },
  {
    id: "tkt-1092",
    ticketNumber: "TKT-1092",
    studentId: "usr-student-35",
    studentName: "Kavita Reddy",
    studentEmail: "kavita.r@learner.ai",
    studentBatch: "Agentic Systems Bootcamp",
    category: "Course & Content Management",
    priority: "medium",
    status: "resolved",
    assignedAgent: "Meera Sen",
    subject: "Employer tuition reimbursement certificate and verification letter",
    createdAt: "4 days ago, 10:10 AM",
    messages: [
      {
        id: "msg-1092-1",
        sender: "Kavita Reddy",
        role: "student",
        message: "My employer requires an official fee payment proof and enrollment verification letter on institute letterhead.",
        timestamp: "4 days ago, 10:10 AM",
      },
      {
        id: "msg-1092-2",
        sender: "Meera Sen",
        role: "agent",
        message: "Verification letter generated, digitally stamped and dispatched with transaction receipt.",
        timestamp: "4 days ago, 01:25 PM",
      },
    ],
  },
  {
    id: "tkt-1095",
    ticketNumber: "TKT-1095",
    studentId: "usr-student-48",
    studentName: "Rajiv Menon",
    studentEmail: "rajiv.m@ai-build.com",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Course & Content Management",
    priority: "low",
    status: "open",
    assignedAgent: "Aakash Varma",
    subject: "Module 7 Multi-Agent Workflows video lecture slides missing download link",
    createdAt: "Today, 08:10 AM",
    messages: [
      {
        id: "msg-1095-1",
        sender: "Rajiv Menon",
        role: "student",
        message: "Under Module 7 resources, the slides PDF link gives a broken link error. The demo code zip works fine.",
        timestamp: "Today, 08:10 AM",
      },
    ],
  },

  // 3. Assignments & Assessments
  {
    id: "tkt-1086",
    ticketNumber: "TKT-1086",
    studentId: "usr-student-15",
    studentName: "Devendra Rao",
    studentEmail: "devendra.r@example.com",
    studentBatch: "Cohort 5 (Agentic Systems)",
    category: "Assignments & Assessments",
    priority: "medium",
    status: "pending",
    assignedAgent: "Pooja Hegde",
    subject: "Capstone project milestone 2 submission lock reset request",
    createdAt: "Today, 08:20 AM",
    messages: [
      {
        id: "msg-1086-1",
        sender: "Devendra Rao",
        role: "student",
        message: "I mistakenly pushed an incomplete branch to GitHub and clicked submit on milestone 2. The portal has locked the submission. Can mentor please unlock it for re-submission?",
        timestamp: "08:20 AM",
      },
    ],
  },
  {
    id: "tkt-1090",
    ticketNumber: "TKT-1090",
    studentId: "usr-student-28",
    studentName: "Vikramaditya Singh",
    studentEmail: "vikram.s@learner.ai",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Assignments & Assessments",
    priority: "medium",
    status: "resolved",
    assignedAgent: "Aakash Varma",
    subject: "Multi-Head Attention matrix dimension mismatch explanation & lab re-evaluation",
    createdAt: "2 days ago, 11:30 AM",
    messages: [
      {
        id: "msg-1090-1",
        sender: "Vikramaditya Singh",
        role: "student",
        message: "Why is the projection dimension split as (batch, heads, seq_len, head_dim) rather than contiguous reshapes?",
        timestamp: "2 days ago, 11:30 AM",
      },
      {
        id: "msg-1090-2",
        sender: "Aakash Varma",
        role: "agent",
        message: "Detailed architectural breakdown shared with memory stride diagrams. Concept validated in 1:1 office hours session.",
        timestamp: "2 days ago, 02:00 PM",
      },
    ],
  },
  {
    id: "tkt-1093",
    ticketNumber: "TKT-1093",
    studentId: "usr-student-39",
    studentName: "Siddharth Joshi",
    studentEmail: "siddharth.j@learner.ai",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Assignments & Assessments",
    priority: "high",
    status: "pending",
    assignedAgent: "Nikhil Joshi",
    subject: "University semester examinations conflict: Request 15-day milestone deferral",
    createdAt: "Today, 06:15 AM",
    messages: [
      {
        id: "msg-1093-1",
        sender: "Siddharth Joshi",
        role: "student",
        message: "My university engineering final exams are from Nov 1 to Nov 14. Requesting a 15-day grace period for Module 5 & 6 project milestones.",
        timestamp: "06:15 AM",
      },
    ],
    proposedAction: {
      type: "validity_extension",
      extensionDays: 15,
      status: "proposed",
    },
  },

  // 4. Live Classes & Attendance
  {
    id: "tkt-1087",
    ticketNumber: "TKT-1087",
    studentId: "usr-student-19",
    studentName: "Sneha Patel",
    studentEmail: "sneha.p@example.com",
    studentBatch: "Cohort 8 (Replay Only)",
    category: "Live Classes & Attendance",
    priority: "low",
    status: "open",
    assignedAgent: "Tanvi Deshmukh",
    subject: "Live stream audio-video sync latency on mobile safari browser",
    createdAt: "Yesterday, 07:10 PM",
    messages: [
      {
        id: "msg-1087-1",
        sender: "Sneha Patel",
        role: "student",
        message: "When watching replays on iPad iOS 18 Safari, the audio drifts out of sync by about 3 seconds after 20 minutes.",
        timestamp: "Yesterday, 07:10 PM",
      },
    ],
  },
  {
    id: "tkt-1096",
    ticketNumber: "TKT-1096",
    studentId: "usr-student-52",
    studentName: "Neha Gupta",
    studentEmail: "neha.g@domain.in",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Live Classes & Attendance",
    priority: "medium",
    status: "open",
    assignedAgent: "Nikhil Joshi",
    subject: "Attendance record not synced for Session 12 on Fine-tuning LoRA Models",
    createdAt: "Yesterday, 11:20 PM",
    messages: [
      {
        id: "msg-1096-1",
        sender: "Neha Gupta",
        role: "student",
        message: "I attended the complete 2.5 hour live session on Sunday, but my attendance dashboard shows 'Absent'. Please verify log and update.",
        timestamp: "Yesterday, 11:20 PM",
      },
    ],
  },
  {
    id: "tkt-1097",
    ticketNumber: "TKT-1097",
    studentId: "usr-student-55",
    studentName: "Farhan Akhtar",
    studentEmail: "farhan.a@quantum.edu",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Live Classes & Attendance",
    priority: "low",
    status: "resolved",
    assignedAgent: "Aakash Varma",
    subject: "Live studio classroom interactive doubt whiteboard not loading",
    createdAt: "3 days ago, 08:45 PM",
    messages: [
      {
        id: "msg-1097-1",
        sender: "Farhan Akhtar",
        role: "student",
        message: "During live class lecture 8, the shared canvas whiteboard displayed a websocket reconnecting toast.",
        timestamp: "3 days ago, 08:45 PM",
      },
      {
        id: "msg-1097-2",
        sender: "Aakash Varma",
        role: "agent",
        message: "WebSocket relay server node restarted and proxy timeouts updated. Student confirmed smooth connection on test room.",
        timestamp: "3 days ago, 09:30 PM",
      },
    ],
  },

  // 5. Technical Support
  {
    id: "tkt-1084",
    ticketNumber: "TKT-1084",
    studentId: "usr-student-8",
    studentName: "Rohan Verma",
    studentEmail: "rohan.v@example.com",
    studentBatch: "Cohort 6 (Full Access)",
    category: "Technical Support",
    priority: "high",
    status: "open",
    assignedAgent: "Aakash Varma",
    subject: "GPU Jupyter Notebook instance out of CUDA memory during PyTorch lab",
    createdAt: "Today, 11:15 AM",
    messages: [
      {
        id: "msg-1084-1",
        sender: "Rohan Verma",
        role: "student",
        message: "My lab pod crashed with CUDA Out of Memory error while training the Llama 3 8B LoRA adapter on module 4. Could you restart the pod or allocate more VRAM?",
        timestamp: "11:15 AM",
      },
    ],
  },
  {
    id: "tkt-1077",
    ticketNumber: "TKT-1077",
    studentId: "usr-student-3",
    studentName: "Ananya Deshmukh",
    studentEmail: "ananya.d@example.com",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Technical Support",
    priority: "high",
    status: "open",
    assignedAgent: "Aakash Varma",
    subject: "Lecture 9 live stream video blackscreen error on Linux Brave browser",
    createdAt: "Yesterday, 09:15 PM",
    messages: [
      {
        id: "msg-1077-1",
        sender: "Ananya Deshmukh",
        role: "student",
        message: "Widevine DRM on Linux Brave browser returns MediaError 4043. Audio plays but screen is black.",
        timestamp: "Yesterday, 09:15 PM",
      },
    ],
  },
  {
    id: "tkt-1088",
    ticketNumber: "TKT-1088",
    studentId: "usr-student-21",
    studentName: "Priyanka Nair",
    studentEmail: "priyanka.n@example.com",
    studentBatch: "Cohort 6 (Full Access)",
    category: "Technical Support",
    priority: "medium",
    status: "resolved",
    assignedAgent: "Nikhil Joshi",
    subject: "Docker container port mapping issue resolved for Flask API exercise",
    createdAt: "Yesterday, 04:30 PM",
    messages: [
      {
        id: "msg-1088-1",
        sender: "Priyanka Nair",
        role: "student",
        message: "Cannot access Flask app on localhost:5000 inside Docker container sandbox.",
        timestamp: "Yesterday, 04:30 PM",
      },
      {
        id: "msg-1088-2",
        sender: "Nikhil Joshi",
        role: "agent",
        message: "Binding to 0.0.0.0 instead of 127.0.0.1 in app.run(host='0.0.0.0') resolves the port forwarding from container to host. Verified student successfully passed the exercise.",
        timestamp: "Yesterday, 05:10 PM",
      },
    ],
  },
  {
    id: "tkt-1089",
    ticketNumber: "TKT-1089",
    studentId: "usr-student-24",
    studentName: "Devendra Patel",
    studentEmail: "dev.patel@tech.in",
    studentBatch: "Cohort 8 (Replay Only)",
    category: "Technical Support",
    priority: "high",
    status: "open",
    assignedAgent: "Meera Sen",
    subject: "Duplicate UPI debit during Cohort 8 enrollment checkout",
    createdAt: "Today, 07:45 AM",
    messages: [
      {
        id: "msg-1089-1",
        sender: "Devendra Patel",
        role: "student",
        message: "During Razorpay checkout, the first transaction timed out but money was deducted from bank account (₹39,999). Then I paid again and got order ID order_Qz89106. Please refund the duplicate debit.",
        timestamp: "07:45 AM",
      },
    ],
  },

  // 6. Communication & Notifications
  {
    id: "tkt-1091",
    ticketNumber: "TKT-1091",
    studentId: "usr-student-31",
    studentName: "Tanmay Bhatnagar",
    studentEmail: "tanmay.b@example.com",
    studentBatch: "Cohort 8 (Replay Only)",
    category: "Communication & Notifications",
    priority: "low",
    status: "resolved",
    assignedAgent: "Tanvi Deshmukh",
    subject: "Discord cohort study group invite link expired",
    createdAt: "3 days ago, 03:20 PM",
    messages: [
      {
        id: "msg-1091-1",
        sender: "Tanmay Bhatnagar",
        role: "student",
        message: "The welcome email discord invite token expired. Can you re-issue my community invite?",
        timestamp: "3 days ago, 03:20 PM",
      },
      {
        id: "msg-1091-2",
        sender: "Tanvi Deshmukh",
        role: "agent",
        message: "Fresh single-use Discord auth link generated and sent to registered email.",
        timestamp: "3 days ago, 03:45 PM",
      },
    ],
  },
  {
    id: "tkt-1098",
    ticketNumber: "TKT-1098",
    studentId: "usr-student-58",
    studentName: "Sanya Malhotra",
    studentEmail: "sanya.m@learn.org",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Communication & Notifications",
    priority: "medium",
    status: "open",
    assignedAgent: "Tanvi Deshmukh",
    subject: "Not receiving calendar invite alerts for Sunday guest expert session",
    createdAt: "Today, 08:30 AM",
    messages: [
      {
        id: "msg-1098-1",
        sender: "Sanya Malhotra",
        role: "student",
        message: "Google Calendar sync seems disabled for my profile. I missed the notification for the special RAG session yesterday.",
        timestamp: "Today, 08:30 AM",
      },
    ],
  },
  {
    id: "tkt-1099",
    ticketNumber: "TKT-1099",
    studentId: "usr-student-61",
    studentName: "Karthik Raman",
    studentEmail: "karthik.r@techcorp.com",
    studentBatch: "Agentic Systems Bootcamp",
    category: "Communication & Notifications",
    priority: "low",
    status: "resolved",
    assignedAgent: "Tanvi Deshmukh",
    subject: "SMS notification toggle not saving in student account settings",
    createdAt: "4 days ago, 02:15 PM",
    messages: [
      {
        id: "msg-1099-1",
        sender: "Karthik Raman",
        role: "student",
        message: "Whenever I click 'Enable SMS class reminders' and refresh, it resets to unchecked.",
        timestamp: "4 days ago, 02:15 PM",
      },
      {
        id: "msg-1099-2",
        sender: "Tanvi Deshmukh",
        role: "agent",
        message: "Fixed DND verification on telecom gateway. SMS alerts successfully enabled and test ping received.",
        timestamp: "4 days ago, 03:00 PM",
      },
    ],
  },

  // 7. Others
  {
    id: "tkt-1100",
    ticketNumber: "TKT-1100",
    studentId: "usr-student-64",
    studentName: "Deepa Krishnan",
    studentEmail: "deepa.k@research.in",
    studentBatch: "Cohort 7 (Live + Replay)",
    category: "Others",
    priority: "medium",
    status: "open",
    assignedAgent: "Meera Sen",
    subject: "Course curriculum feedback: Request for LangSmith tracing case study",
    createdAt: "Yesterday, 05:40 PM",
    messages: [
      {
        id: "msg-1100-1",
        sender: "Deepa Krishnan",
        role: "student",
        message: "The Agentic systems module is outstanding! Would love if Prof. Rajesh could dedicate 30 mins to LangSmith tracing and cost observability in the next cohort project.",
        timestamp: "Yesterday, 05:40 PM",
      },
    ],
  },
  {
    id: "tkt-1101",
    ticketNumber: "TKT-1101",
    studentId: "usr-student-67",
    studentName: "Manish Saxena",
    studentEmail: "manish.s@quantum.ai",
    studentBatch: "Cohort 6 (Full Access)",
    category: "Others",
    priority: "low",
    status: "resolved",
    assignedAgent: "Nikhil Joshi",
    subject: "Alumni network directory access and resume review portal assistance",
    createdAt: "5 days ago, 11:00 AM",
    messages: [
      {
        id: "msg-1101-1",
        sender: "Manish Saxena",
        role: "student",
        message: "Completed 100% of the program! Where can I submit my updated portfolio for the hiring partners network review?",
        timestamp: "5 days ago, 11:00 AM",
      },
      {
        id: "msg-1101-2",
        sender: "Nikhil Joshi",
        role: "agent",
        message: "Congratulations on graduation! Activated Alumni placement portal credentials and forwarded profile to corporate relations team.",
        timestamp: "5 days ago, 01:10 PM",
      },
    ],
  },
];

export function getAllSupportTickets(): SupportTicket[] {
  return [...ALL_SUPPORT_TICKETS];
}

export function getSupportTicketById(id?: string): SupportTicket | undefined {
  if (!id) return undefined;
  const cleanId = id.trim().toLowerCase();
  return ALL_SUPPORT_TICKETS.find(
    (t) =>
      t.id.toLowerCase() === cleanId ||
      t.ticketNumber.toLowerCase() === cleanId ||
      cleanId.endsWith(t.id.toLowerCase())
  );
}
