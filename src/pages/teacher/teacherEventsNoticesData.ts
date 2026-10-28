/**
 * Quantum LMS Teacher Portal — Events & Notices Data & Storage
 */

export interface EventAgendaItem {
  time: string
  title: string
  speakerOrLead?: string
  description?: string
}

export interface EventAttachment {
  name: string
  size: string
  type: string
  url?: string
}

export interface TeacherEventItem {
  id: string
  title: string
  category: "Hackathons" | "Guest Lectures" | "Workshops" | "Academic" | "Faculty Meetings" | "Research Colloquium"
  date: string // "YYYY-MM-DD"
  displayDate: string // e.g. "Oct 30, 2026"
  startTime: string // "05:00 PM"
  endTime: string // "07:30 PM"
  time: string // "05:00 PM - 07:30 PM"
  month: string // "OCT"
  day: string // "30"
  location: string
  organizer: string
  organizerRole?: string
  description: string
  fullDescription: string
  agenda?: EventAgendaItem[]
  attachments?: EventAttachment[]
  meetingUrl?: string // Present ONLY when valid meeting link exists
  meetingPlatform?: "Google Meet" | "Zoom" | "Quantum Live Stream"
  registered: boolean
  isToday?: boolean
  isUpcoming?: boolean
  isFeatured?: boolean
}

export interface NoticeAttachment {
  name: string
  size: string
  type: string
  url?: string
}

export interface TeacherNoticeItem {
  id: string
  title: string
  category: "Academic" | "Faculty & Administration" | "Examination & Grading" | "Curriculum & AI Lab" | "Campus Facilities"
  priority: "Urgent" | "Important" | "Normal"
  publishedAt: string // ISO timestamp
  displayDate: string // e.g. "Today, 09:30 AM" or "Oct 27, 2026"
  publisher: string
  authorRole: string
  description: string
  fullContent: string
  attachments?: NoticeAttachment[]
  isRead: boolean
  isPinned?: boolean
}

const STORAGE_KEY = "quantum_teacher_events_notices_v1"

export const INITIAL_TEACHER_EVENTS: TeacherEventItem[] = [
  {
    id: "tev-1",
    title: "Quantum AI Hackathon 2026: Autonomous Multi-Agent Systems",
    category: "Hackathons",
    date: "2026-10-30",
    displayDate: "Oct 30 - Nov 01, 2026",
    startTime: "05:00 PM",
    endTime: "09:00 PM",
    time: "48 Hours · Kickoff 5:00 PM",
    month: "OCT",
    day: "30",
    location: "Quantum AI Innovation Lab & Virtual Arena",
    organizer: "Quantum Research Council & School of AI",
    organizerRole: "Faculty Mentorship & Hackathon Committee",
    description: "48-hour competitive faculty-supervised student sprint building autonomous multi-agent systems with compute credits and venture grants.",
    fullDescription: "Join faculty mentors, researchers, and Year 4 STEM scholars in a 48-hour university-wide hackathon. Teachers will participate in project evaluation, code clinics, and live rubric scoring on the final Sunday showcase. Compute credits on H100 clusters are provisioned for all registered teams.",
    agenda: [
      { time: "05:00 PM - 06:00 PM", title: "Opening Keynote & Problem Statement Release", speakerOrLead: "Dean Marcus Sterling" },
      { time: "06:00 PM - 08:00 PM", title: "Team Architecture Review & Compute Provisioning", speakerOrLead: "Srimanth (Lead Educator)" },
      { time: "Saturday 11:00 AM", title: "Mid-Sprint Checkpoint & Agent Safety Linting", speakerOrLead: "Evaluation Committee" },
      { time: "Sunday 04:00 PM", title: "Final Stage Demonstrations & Award Ceremony", speakerOrLead: "Quantum AI Jury" }
    ],
    attachments: [
      { name: "Hackathon_Rulebook_2026_Faculty_Edition.pdf", size: "2.4 MB", type: "PDF", url: "https://quantum-lms.edu/docs/hackathon-rulebook.pdf" },
      { name: "Agent_Evaluation_Rubric_Matrix.xlsx", size: "640 KB", type: "XLSX", url: "https://quantum-lms.edu/docs/eval-rubric.xlsx" }
    ],
    meetingUrl: "https://meet.google.com/qai-hack-2026",
    meetingPlatform: "Google Meet",
    registered: true,
    isUpcoming: true,
    isFeatured: true
  },
  {
    id: "tev-2",
    title: "Faculty Senate Colloquium: Multimodal Reasoning in Elementary AI Curricula",
    category: "Faculty Meetings",
    date: "2026-10-28",
    displayDate: "Today · Oct 28, 2026",
    startTime: "02:00 PM",
    endTime: "03:30 PM",
    time: "02:00 PM - 03:30 PM",
    month: "OCT",
    day: "28",
    location: "Faculty Boardroom 4A & Virtual Video Bridge",
    organizer: "Academic Affairs Committee",
    organizerRole: "Office of the Dean",
    description: "Monthly faculty sync reviewing curriculum benchmark progressions, mid-semester assessment analytics, and Year 4 STEM outcomes.",
    fullDescription: "The monthly meeting of the Department of Artificial Intelligence faculty. Agenda includes reviewing the Year 4 cohort benchmark results, discussing student doubt volume trends, allocating graduate teaching assistants for practical modules, and ratifying the updated rubric for AI Ethics assignments.",
    agenda: [
      { time: "02:00 PM - 02:20 PM", title: "Academic Standing & Student Progress Analytics Review", speakerOrLead: "Prof. Sarah Jenkins" },
      { time: "02:20 PM - 02:50 PM", title: "Teacher Content Approval Workflow & Rubric Calibration", speakerOrLead: "Srimanth & Evaluation Panel" },
      { time: "02:50 PM - 03:30 PM", title: "Open Discussion: Assessment Security & Midterm Logistics", speakerOrLead: "All Faculty" }
    ],
    attachments: [
      { name: "Colloquium_Agenda_Briefing_Oct28.pdf", size: "1.1 MB", type: "PDF", url: "https://quantum-lms.edu/docs/senate-briefing.pdf" }
    ],
    meetingUrl: "https://meet.google.com/qai-senate-oct28",
    meetingPlatform: "Google Meet",
    registered: true,
    isToday: true,
    isUpcoming: true
  },
  {
    id: "tev-3",
    title: "Workshop: Parameter-Efficient Fine-Tuning (PEFT) with LoRA & vLLM",
    category: "Workshops",
    date: "2026-10-29",
    displayDate: "Tomorrow · Oct 29, 2026",
    startTime: "04:00 PM",
    endTime: "06:00 PM",
    time: "04:00 PM - 06:00 PM",
    month: "OCT",
    day: "29",
    location: "AI Systems Computer Lab 302 & Online Hands-On",
    organizer: "Quantum High-Performance Computing Center",
    organizerRole: "Research Engineering Division",
    description: "Hands-on technical workshop for STEM instructors demonstrating QLoRA quantization, flash attention v2, and low-latency inference.",
    fullDescription: "Comprehensive professional development lab for AI educators. Covers practical setup of HuggingFace TRL, bitsandbytes 4-bit quantization, LoRA adapter merging, and continuous batching with vLLM servers. Teachers will receive reproducible Jupyter lab notebooks for classroom demonstrations.",
    agenda: [
      { time: "04:00 PM - 04:30 PM", title: "Mathematical Foundations of Low-Rank Adaptation", speakerOrLead: "Dr. Vikram Seth" },
      { time: "04:30 PM - 05:30 PM", title: "Interactive Lab: Fine-Tuning Llama-3-8B on GPU Nodes", speakerOrLead: "HPC Engineering Team" },
      { time: "05:30 PM - 06:00 PM", title: "Integrating Hands-on Labs into Student Course Modules", speakerOrLead: "Q&A Session" }
    ],
    attachments: [
      { name: "PEFT_LoRA_Classroom_Lab_Starter.ipynb", size: "3.8 MB", type: "ZIP", url: "https://quantum-lms.edu/labs/peft-starter.zip" },
      { name: "HPC_Cluster_Access_Guide.pdf", size: "920 KB", type: "PDF", url: "https://quantum-lms.edu/docs/hpc-guide.pdf" }
    ],
    meetingUrl: "https://meet.google.com/qai-peft-lab",
    meetingPlatform: "Google Meet",
    registered: false,
    isUpcoming: true
  },
  {
    id: "tev-4",
    title: "Distinguished Guest Lecture: Neuro-Symbolic AI & Causal Reasoning",
    category: "Guest Lectures",
    date: "2026-11-04",
    displayDate: "Nov 04, 2026",
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    time: "11:00 AM - 12:30 PM",
    month: "NOV",
    day: "04",
    location: "Main Auditorium & Quantum Global Live Broadcast",
    organizer: "Quantum Distinguished Speaker Series",
    organizerRole: "Institute for Advanced AI Studies",
    description: "Keynote presentation by Dr. Elena Vance exploring hybrid architectures bridging deep neural networks with formal logic proofs.",
    fullDescription: "Dr. Elena Vance, Principal Research Director at DeepMind Oxford, will present breakthroughs in combining continuous vector representations with discrete logical knowledge graphs. The talk addresses safety guarantees, hallucination reduction, and mathematical theorem proving in frontier foundation models.",
    agenda: [
      { time: "11:00 AM - 11:10 AM", title: "Welcome & Speaker Introduction", speakerOrLead: "Vice Chancellor K. Raman" },
      { time: "11:10 AM - 12:00 PM", title: "Keynote: Causal Neuro-Symbolic Learning", speakerOrLead: "Dr. Elena Vance" },
      { time: "12:00 PM - 12:30 PM", title: "Interactive Faculty & Scholar Q&A", speakerOrLead: "Moderated Discussion" }
    ],
    attachments: [
      { name: "Elena_Vance_Colloquium_Abstract.pdf", size: "520 KB", type: "PDF", url: "https://quantum-lms.edu/docs/elena-vance-abstract.pdf" }
    ],
    meetingUrl: "https://quantum-lms.edu/live/distinguished-vance",
    meetingPlatform: "Quantum Live Stream",
    registered: true,
    isUpcoming: true
  },
  {
    id: "tev-5",
    title: "Midterm Examination Preparation & Proctor Briefing",
    category: "Academic",
    date: "2026-11-02",
    displayDate: "Nov 02, 2026",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    time: "09:00 AM - 10:30 AM",
    month: "NOV",
    day: "02",
    location: "Exam Control Center · Hall C",
    organizer: "University Examination Board",
    organizerRole: "Registrar's Office",
    description: "Mandatory briefing for all lead teachers and course proctors regarding online examination protocols, code plagiarism detectors, and accommodations.",
    fullDescription: "All course instructors with midterm assessments scheduled for the Fall term must attend this briefing. Topics include automated coding environment lockdowns, AI plagiarism thresholds in homework submissions, student disability accommodations, and digital answer sheet archival.",
    agenda: [
      { time: "09:00 AM - 09:30 AM", title: "Secure Testing Environment & AI Proctor Protocol", speakerOrLead: "Chief Examination Officer" },
      { time: "09:30 AM - 10:00 AM", title: "Gradebook Moderation & Evaluator Review Pipelines", speakerOrLead: "Registrar Operations" },
      { time: "10:00 AM - 10:30 AM", title: "Emergency Contingency Plans & Support Escalation", speakerOrLead: "Support Team Lead" }
    ],
    attachments: [
      { name: "Proctor_Code_of_Conduct_2026.pdf", size: "1.4 MB", type: "PDF", url: "https://quantum-lms.edu/docs/proctor-conduct.pdf" }
    ],
    meetingUrl: undefined, // In-person venue, no video link
    registered: false,
    isUpcoming: true
  },
  {
    id: "tev-6",
    title: "AI Ethics & Algorithmic Governance Research Symposium",
    category: "Research Colloquium",
    date: "2026-11-10",
    displayDate: "Nov 10, 2026",
    startTime: "01:30 PM",
    endTime: "05:00 PM",
    time: "01:30 PM - 05:00 PM",
    month: "NOV",
    day: "10",
    location: "Innovation Amphitheater & Virtual Poster Hall",
    organizer: "Center for Responsible Artificial Intelligence",
    organizerRole: "Ethics & Policy Working Group",
    description: "Annual symposium presenting peer-reviewed student research and faculty whitepapers on algorithmic bias, model watermarking, and safety.",
    fullDescription: "A multi-track academic symposium highlighting faculty research and exceptional student projects in AI safety, data privacy, fairness benchmarks, and model explainability. Accepted papers will be indexed in the Quantum Institutional AI Repository.",
    agenda: [
      { time: "01:30 PM - 02:00 PM", title: "Opening Address: The 2026 AI Governance Framework", speakerOrLead: "Prof. Priya Nair" },
      { time: "02:00 PM - 03:30 PM", title: "Track 1: Algorithmic Bias in Foundation Models", speakerOrLead: "Selected Faculty Papers" },
      { time: "03:30 PM - 05:00 PM", title: "Track 2: Student Poster Sessions & Live Demonstrations", speakerOrLead: "Year 4 Honors Cohort" }
    ],
    attachments: [
      { name: "Symposium_Call_for_Whitepapers.pdf", size: "1.8 MB", type: "PDF", url: "https://quantum-lms.edu/docs/symposium-call.pdf" },
      { name: "Poster_Template_LaTeX.zip", size: "4.2 MB", type: "ZIP", url: "https://quantum-lms.edu/docs/poster-template.zip" }
    ],
    meetingUrl: "https://meet.google.com/qai-ethics-symposium",
    meetingPlatform: "Google Meet",
    registered: false,
    isUpcoming: true
  },
  {
    id: "tev-7",
    title: "Teacher Office Hours: Doubt Resolution & Code Debugging",
    category: "Academic",
    date: "2026-10-28",
    displayDate: "Today · Oct 28, 2026",
    startTime: "04:00 PM",
    endTime: "05:30 PM",
    time: "04:00 PM - 05:30 PM",
    month: "OCT",
    day: "28",
    location: "Office 214 & Google Meet Virtual Room",
    organizer: "Srimanth (Lead Educator)",
    organizerRole: "Year 4 AI Cohort Instructor",
    description: "Open office hours for Year 4 Maple & Oak cohorts to resolve PyTorch implementation bugs, matrix calculus doubts, and project proposals.",
    fullDescription: "Drop-in academic support session dedicated to answering student doubts on Neural Network Backpropagation and Linear Algebra assignments. Students can queue questions live or share screen for interactive debugging.",
    agenda: [
      { time: "04:00 PM - 04:45 PM", title: "Group Walkthrough: Common Gradient Descent Pitfalls", speakerOrLead: "Srimanth" },
      { time: "04:45 PM - 05:30 PM", title: "One-on-One Project Guidance & Code Diagnostics", speakerOrLead: "Individual Breakout" }
    ],
    attachments: [],
    meetingUrl: "https://meet.google.com/qai-office-srimanth",
    meetingPlatform: "Google Meet",
    registered: true,
    isToday: true,
    isUpcoming: true
  },
  {
    id: "tev-8",
    title: "Quarterly STEM Parent-Teacher Academic Conference",
    category: "Faculty Meetings",
    date: "2026-11-14",
    displayDate: "Nov 14, 2026",
    startTime: "10:00 AM",
    endTime: "02:00 PM",
    time: "10:00 AM - 02:00 PM",
    month: "NOV",
    day: "14",
    location: "Campus Central Atrium & Hybrid Video Portal",
    organizer: "Parent-Teacher Advisory Board",
    organizerRole: "Dean of Student Well-being",
    description: "Individual consultative meetings with Year 4 parents discussing academic trajectory, AI project portfolios, and career roadmap.",
    fullDescription: "Parent-teacher consultations for Year 4 AI and STEM classes. Instructors will present the AI Diagnostic Digest, student mastery heatmaps, and discuss individualized support pathways.",
    agenda: [
      { time: "10:00 AM - 10:30 AM", title: "Opening Plenary on AI Skill Benchmarking", speakerOrLead: "Dean Marcus Sterling" },
      { time: "10:30 AM - 02:00 PM", title: "Individual 15-Minute Family Consultations", speakerOrLead: "Class Lead Teachers" }
    ],
    attachments: [
      { name: "Parent_Conference_Schedule_Slots.pdf", size: "880 KB", type: "PDF", url: "https://quantum-lms.edu/docs/parent-slots.pdf" }
    ],
    meetingUrl: undefined,
    registered: false,
    isUpcoming: true
  }
]

export const INITIAL_TEACHER_NOTICES: TeacherNoticeItem[] = [
  {
    id: "tnot-1",
    title: "Urgent: Midterm Gradebook Submission Deadline — Nov 06, 2026",
    category: "Examination & Grading",
    priority: "Urgent",
    publishedAt: "2026-10-28T08:30:00Z",
    displayDate: "Today · 08:30 AM",
    publisher: "University Examination Directorate",
    authorRole: "Chief Registrar & Controller of Examinations",
    description: "All lead teachers must finalize and lock continuous assessment grades (Assignments 1–3 and Quizzes) in the Evaluator Portal by Friday, Nov 06 at 11:59 PM.",
    fullContent: `Dear Faculty Members,

In accordance with Academic Calendar Regulation 14.2, all mid-semester continuous assessment components must be verified, signed off, and synchronized into the Central Academic Database before the student progress freeze on Friday, November 06, 2026, at 11:59 PM.

Key Guidelines:
1. Ensure all student assignments submitted prior to October 25 have complete rubric scores and written feedback recorded.
2. For students with approved medical exemptions or bereavement leave, input code "EX" into the gradebook rather than zero.
3. Once grades are finalized, click "Lock Gradebook & Submit to Examination Board" in the Evaluator Portal.
4. Late submissions will trigger automated administrative escalation to the Department Dean.

Please review the attached Moderation Guidelines for score standard deviation parameters across sections.`,
    attachments: [
      { name: "Continuous_Assessment_Moderation_Guide.pdf", size: "1.4 MB", type: "PDF", url: "https://quantum-lms.edu/notices/assessment-guide.pdf" },
      { name: "Exemption_Filing_Form_2026.docx", size: "280 KB", type: "DOCX", url: "https://quantum-lms.edu/notices/exemption-form.docx" }
    ],
    isRead: false,
    isPinned: true
  },
  {
    id: "tnot-2",
    title: "Scheduled Maintenance: GPU Compute Cluster (Nodes H100-A to H100-F)",
    category: "Curriculum & AI Lab",
    priority: "Urgent",
    publishedAt: "2026-10-27T16:45:00Z",
    displayDate: "Yesterday · 04:45 PM",
    publisher: "High-Performance Computing Infrastructure Group",
    authorRole: "Systems Operations Director",
    description: "Scheduled firmware patch and InfiniBand optical switch maintenance on Saturday, Oct 31, from 01:00 AM to 06:00 AM. Student model trainings will be paused.",
    fullContent: `Attention AI & Machine Learning Faculty,

The central HPC cluster will undergo essential security firmware updates and network fabric recalibration this weekend:

- Window: Saturday, October 31, 2026, from 01:00 AM to 06:00 AM IST (5 hours)
- Affected Resources: GPU Cluster partitions gpu-h100-small, gpu-h100-train, and JupyterHub interactive workspaces.
- Action Required: Please advise your students not to schedule long-running model training jobs during this window. Running SLURM jobs will be safely checkpointed and resumed automatically after maintenance concludes.
- The Quantum LMS Teacher and Student web portals will remain fully accessible without interruption.`,
    attachments: [
      { name: "HPC_Maintenance_Window_Details.pdf", size: "750 KB", type: "PDF", url: "https://quantum-lms.edu/notices/hpc-maintenance.pdf" }
    ],
    isRead: false,
    isPinned: true
  },
  {
    id: "tnot-3",
    title: "Teacher Content Creation & Admin Approval Policy Enacted",
    category: "Academic",
    priority: "Important",
    publishedAt: "2026-10-26T11:00:00Z",
    displayDate: "Oct 26, 2026",
    publisher: "Academic Governance Council",
    authorRole: "Dean of Academic Quality Assurance",
    description: "Effective immediately, all new teacher-created assignments, quizzes, and digital learning materials must receive Admin review approval prior to student visibility.",
    fullContent: `To all Teaching Staff and Department Chairs,

To ensure continuous compliance with National AI Curriculum Framework standards, the Quantum School of AI has deployed the Content Governance & Approval Workflow.

Workflow Summary:
1. When creating an Assignment, Quiz, or Learning Material within your Assigned Courses, use "Save as Draft" to work iteratively.
2. When finalized, click "Submit for Approval". Content will enter the administrative verification queue in "Pending Approval" status.
3. School Administration reviews submissions against instructional rubrics within 24 business hours.
4. Content marked "Changes Requested" or "Rejected" can be revised and resubmitted directly from the Submissions & Approvals panel.
5. Content will only become visible to enrolled students once approved.

Thank you for your partnership in upholding world-class academic rigor across our curricula.`,
    attachments: [
      { name: "Instructional_Quality_Standards_2026.pdf", size: "2.1 MB", type: "PDF", url: "https://quantum-lms.edu/notices/quality-standards.pdf" }
    ],
    isRead: false,
    isPinned: false
  },
  {
    id: "tnot-4",
    title: "Graduate Teaching Assistant (GTA) Allocation for Fall Lab Modules",
    category: "Faculty & Administration",
    priority: "Important",
    publishedAt: "2026-10-25T14:15:00Z",
    displayDate: "Oct 25, 2026",
    publisher: "Department of Computer Science & Artificial Intelligence",
    authorRole: "Faculty Dean · Prof. Marcus Sterling",
    description: "Review your assigned Graduate Teaching Assistants for lab sections and student doubt resolution support for the second half of the semester.",
    fullContent: `Dear Course Instructors,

The roster of allocated Graduate Teaching Assistants (GTAs) for the second half of the Fall 2026 semester has been finalized. 

Each lead teacher for Year 4 courses has been paired with 2 qualified doctoral or master's scholars to assist with:
- Moderating live class chats and lab sessions.
- Providing timely code diagnostics on student forum doubts.
- Performing preliminary grading on non-proctored programming worksheets.

Please schedule an initial orientation meeting with your assigned GTAs by Friday to align on grading criteria and weekly office hour coverage.`,
    attachments: [
      { name: "GTA_Course_Allocation_Roster_Fall26.xlsx", size: "490 KB", type: "XLSX", url: "https://quantum-lms.edu/notices/gta-roster.xlsx" }
    ],
    isRead: true,
    isPinned: false
  },
  {
    id: "tnot-5",
    title: "Campus Library & Digital IEEE/ACM Repository Access Expansion",
    category: "Campus Facilities",
    priority: "Normal",
    publishedAt: "2026-10-24T10:00:00Z",
    displayDate: "Oct 24, 2026",
    publisher: "Quantum Central Library & Information Services",
    authorRole: "Head Librarian",
    description: "Institutional single sign-on access has been established for ACM Digital Library, IEEE Xplore, and Nature Machine Intelligence for all faculty and scholars.",
    fullContent: `We are pleased to announce that the Quantum Central Library has upgraded our campus-wide academic subscription licenses.

Faculty members can now access full-text PDF downloads and supplementary code archives from:
- ACM Digital Library (Full SIGGRAPH, SIGKDD, CHI suites)
- IEEE Xplore Digital Library (Trans. on Neural Networks and Learning Systems)
- Nature Machine Intelligence & Springer AI Monographs
- ArXiv verified Institutional Mirror with high-speed direct downloads

Access is automatic when logged in through your @quantum-lms.edu institutional credentials or campus eduroam Wi-Fi network.`,
    attachments: [
      { name: "Digital_Library_SSO_Guide.pdf", size: "620 KB", type: "PDF", url: "https://quantum-lms.edu/notices/library-guide.pdf" }
    ],
    isRead: true,
    isPinned: false
  },
  {
    id: "tnot-6",
    title: "Fall Semester Final Project Showcase & Industry Partner Invitations",
    category: "Academic",
    priority: "Important",
    publishedAt: "2026-10-22T09:00:00Z",
    displayDate: "Oct 22, 2026",
    publisher: "Industry Relations & Career Development Center",
    authorRole: "Director of Industry Partnerships",
    description: "Nominate outstanding student capstone projects for presentation to visiting engineering directors from leading tech organizations.",
    fullContent: `Instructors of Year 4 STEM and AI Capstone courses:

The Annual Fall Project Showcase will take place on December 12, 2026. Representatives from over 35 leading technology companies and venture research laboratories will attend to view student live demos.

Instructors are requested to submit project nominations by November 20. Each course may nominate up to 3 exemplary student teams based on technical originality, code quality, and real-world societal impact. Nominated teams will receive professional pitch coaching and hardware prototyping stipends.`,
    attachments: [
      { name: "Showcase_Nomination_Form_2026.pdf", size: "1.2 MB", type: "PDF", url: "https://quantum-lms.edu/notices/showcase-form.pdf" }
    ],
    isRead: true,
    isPinned: false
  },
  {
    id: "tnot-7",
    title: "Classroom Audio-Visual & Hybrid Streaming Tech Check",
    category: "Campus Facilities",
    priority: "Normal",
    publishedAt: "2026-10-20T15:30:00Z",
    displayDate: "Oct 20, 2026",
    publisher: "Campus Facilities & Media Services",
    authorRole: "Media Operations Supervisor",
    description: "All lecture halls have been calibrated with high-definition PTZ tracking cameras and ceiling beamforming microphone arrays.",
    fullContent: `Media Services has completed the mid-term audit of classroom multimedia equipment across Academic Blocks 1 through 5. 

Highlights of recent enhancements:
- AI speaker-tracking PTZ cameras calibrated to follow instructor movements at whiteboard and lectern.
- Shure ceiling beamforming microphones tuned for natural acoustic pickup without lapel clip-on mics.
- Wireless HDMI display casting enabled for macOS, Windows, and iPad Pro devices.

If you encounter any latency or audio issues during live classroom lectures, press the red "AV Assistance" call button on the lectern control panel for immediate 3-minute technician dispatch.`,
    attachments: [],
    isRead: true,
    isPinned: false
  }
]

export interface EventsNoticesState {
  events: TeacherEventItem[]
  notices: TeacherNoticeItem[]
}

export function getEventsNoticesData(): EventsNoticesState {
  if (typeof window === "undefined") {
    return { events: INITIAL_TEACHER_EVENTS, notices: INITIAL_TEACHER_NOTICES }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed.events) && Array.isArray(parsed.notices)) {
        return {
          events: parsed.events,
          notices: parsed.notices
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse events and notices from localStorage:", e)
  }

  // Initialize and persist default state
  const initial = { events: INITIAL_TEACHER_EVENTS, notices: INITIAL_TEACHER_NOTICES }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  } catch {
    // ignore
  }
  return initial
}

export function saveEventsNoticesData(state: EventsNoticesState): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent("quantum-events-notices-changed", { detail: state }))
  } catch (e) {
    console.error("Failed to save events and notices to localStorage:", e)
  }
}

export function toggleEventRegistration(eventId: string): { registered: boolean; title: string } {
  const current = getEventsNoticesData()
  let result = { registered: false, title: "" }

  const updatedEvents = current.events.map((ev) => {
    if (ev.id === eventId) {
      const nextReg = !ev.registered
      result = { registered: nextReg, title: ev.title }
      return { ...ev, registered: nextReg }
    }
    return ev
  })

  saveEventsNoticesData({ ...current, events: updatedEvents })
  return result
}

export function markNoticeAsRead(noticeId: string, isRead: boolean = true): void {
  const current = getEventsNoticesData()
  const updatedNotices = current.notices.map((n) => {
    if (n.id === noticeId) {
      return { ...n, isRead }
    }
    return n
  })
  saveEventsNoticesData({ ...current, notices: updatedNotices })
}

export function markAllNoticesAsRead(): number {
  const current = getEventsNoticesData()
  let unreadCount = 0
  const updatedNotices = current.notices.map((n) => {
    if (!n.isRead) unreadCount++
    return { ...n, isRead: true }
  })
  saveEventsNoticesData({ ...current, notices: updatedNotices })
  return unreadCount
}
