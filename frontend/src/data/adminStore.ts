import { useState, useEffect, useCallback } from "react"
import { api } from "@/lib/api"

export interface AdminCourse {
  id: string
  title: string
  slug: string
  category: "LLM Engineering" | "Agentic Systems" | "Computer Vision" | "MLOps" | "AI Foundations" | string
  instructor: string
  instructorAvatar: string
  enrolledStudents: number
  /** Optional cap on learners. null means unlimited, which is the default for a course. */
  capacity: number | null
  /** Course price in rupees. 0 means the course is free to enroll. */
  price: number
  revenue: number
  rating: number
  completionRate: number
  status: "Published" | "Draft" | "Archived"
  /** Chapter and lesson counts from GET /admin/courses (0 when the API omits them). */
  modulesCount?: number
  lessonsCount?: number
  updatedAt: string
  videoUrl?: string
  videoKey?: string
  audioKey?: string
}

export interface AdminBatch {
  id: string
  name: string
  /** Optional topic label. Empty when the batch is not tied to any course. */
  courseId: string
  courseCode?: string
  courseTitle: string
  /** Batch price in rupees. 0 means admins add learners themselves. */
  price: number
  instructor: string
  instructorAvatar: string
  startDate: string
  endDate: string
  schedule: string
  timezone: string
  enrolledSeats: number
  waitlistedSeats: number
  maxSeats: number
  deliveryMode: "Live + Replay" | "Replay Only" | "Self-Paced"
  replayDelayHours: number
  accessExpiryMonths: number
  meetingUrl?: string | null
  features: {
    liveChat: boolean
    doubtClearing: boolean
    aiTutor: boolean
    certificate: boolean
  }
  status: "Active" | "Upcoming" | "Completed" | "Archived"
  lifecycle?: string
  notes?: string
}

export type BatchRosterStatus = "Active" | "Waitlisted" | "Completed" | "Paused" | "At Risk"

export interface BatchRosterStudent {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  rollNumber: string
  program: string
  status: BatchRosterStatus
  notes: string
  enrolledAt: string
  attendanceRate: number | null
  courseProgress: number
}

export interface BatchAvailableStudent {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  rollNumber: string
  currentBatch: string
}

export interface AdminTeacher {
  id: string
  name: string
  email: string
  title: string
  specialization: string
  role: "Lead Instructor" | "Teaching Assistant" | "Evaluator"
  assignedCourses: string[]
  activeBatches: string[]
  studentCount: number
  rating: number
  status: "Live Now" | "Available" | "In Review" | "Off-Duty"
  avatar: string
  attendanceRate: number
}

export interface AdminStudent {
  id: string
  name: string
  email: string
  avatar: string
  courseId: string
  courseTitle: string
  batchId: string
  batchName: string
  enrolledAt: string
  progress: number
  attendanceRate: number
  evaluationScore: number
  status: "Active" | "Completed" | "At Risk" | "Paused"
}

export interface AdminOrder {
  id: string
  orderNumber: string
  studentId: string
  studentName: string
  studentEmail: string
  courseTitle: string
  amount: number
  currency: "INR"
  method: string
  capturedAmount: number
  refundedAmount: number
  capturedPayments: { amount: number; date: string }[]
  date: string
  status: "Paid" | "Refunded" | "Pending" | "Refund pending"
  refundReason?: string
  invoiceUrl?: string
}

export interface AcademySettings {
  name: string
  tagline: string
  domain: string
  supportEmail: string
  timezone: string
  currency: string
  gstNumber: string
  certificateSignatory: string
  autoIssueCertificates: boolean
  enablePublicVerification: boolean
  requireMfaForStaff: boolean
  notifyOnEnrolment: boolean
  notifyOnLowBatchSeats: boolean
  notifyOnRefundRequest: boolean
}

// Super Admin Interfaces
export interface PlatformServiceHealth {
  id: string
  name: string
  endpoint: string
  category: "Core API" | "Media & Video" | "AI Engine" | "Billing" | "Database & Storage"
  status: "Healthy" | "Degraded" | "Outage"
  uptime: number
  latencyMs: number
  lastIncident?: string
  sparkline: number[]
}

export interface RbacPermissionRow {
  id: string
  permission: string
  description: string
  category: "Curriculum" | "Classes & Video" | "Evaluations" | "Finance" | "Administration" | "AI & Models"
  superAdmin: boolean
  admin: boolean
  teacher: boolean
  evaluator: boolean
  support: boolean
  student: boolean
}

export interface SecurityAuditLog {
  id: string
  timestamp: string
  actorName: string
  actorRole: string
  actorEmail: string
  action: string
  category: "Auth" | "Course" | "Billing" | "RBAC" | "AI Engine" | "Security"
  target: string
  ip: string
  status: "Success" | "Warning" | "Refused"
  details: string
}

export interface AiUsageMetrics {
  totalTokensMonth: number
  totalCostInr: number
  tokensByFeature: {
    aiTutor: number
    videoChaptering: number
    transcription: number
    evaluatorAssist: number
  }
  primaryModel: string
  fallbackModel: string
  temperature: number
  strictnessScore: number
  monthlyBudgetCapInr: number
}

// Initial Seed Data
export const INITIAL_COURSES: AdminCourse[] = []
export const INITIAL_BATCHES: AdminBatch[] = []
export const INITIAL_TEACHERS: AdminTeacher[] = []
export const INITIAL_STUDENTS: AdminStudent[] = []
export const INITIAL_ORDERS: AdminOrder[] = []

export const INITIAL_ACADEMY_SETTINGS: AcademySettings = {
  name: "Quantum School of AI",
  tagline: "",
  domain: "",
  supportEmail: "",
  timezone: "Asia/Kolkata (IST, UTC+5:30)",
  currency: "INR (₹)",
  gstNumber: "",
  certificateSignatory: "",
  autoIssueCertificates: true,
  enablePublicVerification: true,
  requireMfaForStaff: false,
  notifyOnEnrolment: true,
  notifyOnLowBatchSeats: true,
  notifyOnRefundRequest: true,
}

const KEYS = {
  courses: "quantum_admin_courses_v2",
  batches: "quantum_admin_batches_v2",
  teachers: "quantum_admin_teachers_v2",
  students: "quantum_admin_students_v2",
  orders: "quantum_admin_orders_v2",
  settings: "quantum_admin_settings_v2",
  services: "quantum_superadmin_services_v2",
  rbac: "quantum_superadmin_rbac_v2",
  audit: "quantum_superadmin_audit_v2",
  aiUsage: "quantum_superadmin_ai_usage_v2",
}

const isLegacyMockId = (id: string) =>
  /^(course-[0-9]+|batch-[0-9]+|t-[0-9]+|s-[0-9]+|ord-[0-9]+|log-[0-9]+)$/.test(id)

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((item: any) => !isLegacyMockId(item?.id || ""))
      return cleaned as T
    }
    return parsed as T
  } catch {
    // ignore
  }
  return fallback
}

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>()

function saveStorage(key: string, data: unknown) {
  const prev = saveTimers.get(key)
  if (prev) clearTimeout(prev)
  saveTimers.set(
    key,
    setTimeout(() => {
      saveTimers.delete(key)
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch {
        // ignore
      }
    }, 250),
  )
}

function mapApiCourse(c: any): AdminCourse {
  const enrolled = Number(c.enrolled_students ?? 0)
  const price = Number(c.price ?? 39999)
  return {
    id: String(c.id),
    title: String(c.title),
    slug: c.code ? String(c.code).toLowerCase().replace(/[^a-z0-9]/g, "-") : String(c.title).toLowerCase().replace(/[^a-z0-9]/g, "-"),
    category: c.category || "LLM Engineering",
    instructor: c.instructor || "Srimanth",
    instructorAvatar: c.instructor === "Srimanth" ? "/assets/srimanth.png" : "",
    enrolledStudents: enrolled,
    capacity: c.capacity === null || c.capacity === undefined ? null : Number(c.capacity),
    price,
    revenue: Number(c.revenue ?? 0),
    rating: Number(c.rating) || 0,
    completionRate: Number(c.completion_rate ?? 0),
    status: (c.status as AdminCourse["status"]) || "Draft",
    modulesCount: Number(c.modules_count ?? 0),
    lessonsCount: Number(c.lessons_count ?? 0),
    updatedAt: c.updated_at ? new Date(c.updated_at).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
  }
}

function mapApiBatch(b: any): AdminBatch {
  const rawFeatures = (b.features && typeof b.features === "object" ? b.features : {}) as Partial<AdminBatch["features"]>
  return {
    id: String(b.id),
    name: String(b.name),
    courseId: String(b.course_id ?? ""),
    courseCode: b.course_code ? String(b.course_code) : undefined,
    courseTitle: String(b.course_title ?? ""),
    price: Number(b.price ?? 0),
    instructor: String(b.instructor ?? "Srimanth"),
    instructorAvatar: b.instructor_avatar || (b.instructor === "Srimanth" ? "/assets/srimanth.png" : ""),
    startDate: String(b.start_date ?? "2026-11-10"),
    endDate: String(b.end_date ?? "2027-02-15"),
    schedule: String(b.schedule ?? "Mon, Wed, Fri · 7:30 PM - 9:30 PM"),
    timezone: String(b.timezone ?? "Asia/Kolkata"),
    enrolledSeats: Number(b.enrolled_seats ?? 0),
    waitlistedSeats: Number(b.waitlisted_seats ?? 0),
    maxSeats: Number(b.max_seats ?? 100),
    deliveryMode: (b.delivery_mode as AdminBatch["deliveryMode"]) || "Live + Replay",
    replayDelayHours: Number(b.replay_delay_hours ?? 2),
    accessExpiryMonths: Number(b.access_expiry_months ?? 12),
    meetingUrl: b.meeting_url ? String(b.meeting_url) : null,
    features: {
      liveChat: rawFeatures.liveChat ?? true,
      doubtClearing: rawFeatures.doubtClearing ?? true,
      aiTutor: rawFeatures.aiTutor ?? true,
      certificate: rawFeatures.certificate ?? true,
    },
    status: b.lifecycle ? (b.lifecycle === "Running" ? "Active" : b.lifecycle === "Completed" ? "Completed" : b.lifecycle === "Cancelled" ? "Archived" : "Upcoming") : (b.status as AdminBatch["status"]) || "Upcoming",
    lifecycle: b.lifecycle,
    notes: String(b.notes ?? ""),
  }
}

function mapApiOrder(o: any): AdminOrder {
  const captured = (o.payments ?? []).filter((p: any) => p.captured_at)
  return { id: o.id, orderNumber: o.id, studentId: o.student_id, studentName: o.student_name, studentEmail: o.student_email,
    courseTitle: o.offer_title, amount: Number(o.amount) / 100, currency: "INR", method: captured[0]?.method ? `Razorpay (${captured[0].method})` : "Not confirmed",
    date: new Date(o.created_at).toLocaleString(), status: o.status === "paid" ? "Paid" : o.status === "refunded" ? "Refunded" : o.status === "refund_pending" ? "Refund pending" : "Pending",
    capturedAmount: captured.reduce((sum: number, p: any) => sum + Number(p.amount), 0) / 100,
    refundedAmount: captured.reduce((sum: number, p: any) => sum + Number(p.refunded_amount), 0) / 100,
    capturedPayments: captured.map((p: any) => ({ amount: Number(p.amount) / 100, date: p.captured_at })) }
}

// Custom Hook for Admin Data
export function useAdminStore() {
  const [error,setError]=useState("")
  const [courses, setCourses] = useState<AdminCourse[]>(() => loadStorage(KEYS.courses, INITIAL_COURSES))
  const [batches, setBatches] = useState<AdminBatch[]>(() => loadStorage(KEYS.batches, INITIAL_BATCHES))
  const [teachers, setTeachers] = useState<AdminTeacher[]>(() => loadStorage(KEYS.teachers, INITIAL_TEACHERS))
  const [students, setStudents] = useState<AdminStudent[]>(() => loadStorage(KEYS.students, INITIAL_STUDENTS))
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [settings, setSettings] = useState<AcademySettings>(() => loadStorage(KEYS.settings, INITIAL_ACADEMY_SETTINGS))

  useEffect(() => saveStorage(KEYS.courses, courses), [courses])
  useEffect(() => saveStorage(KEYS.batches, batches), [batches])
  useEffect(() => saveStorage(KEYS.teachers, teachers), [teachers])
  useEffect(() => saveStorage(KEYS.students, students), [students])
  useEffect(() => saveStorage(KEYS.orders, orders), [orders])
  useEffect(() => saveStorage(KEYS.settings, settings), [settings])

  const refreshCourses = useCallback(async () => {
    const res = await api.get<{ courses: any[] }>("/admin/courses", { bypassCache: true })
    if (Array.isArray(res?.courses)) {
      setCourses(res.courses.map(mapApiCourse))
    }
  }, [])

  const refreshOperations = useCallback(async () => {
    const [bRes, tRes, sRes, oRes, setRes] = await Promise.allSettled([
      api.get<{ batches: any[] }>("/admin/batches", { bypassCache: true }),
      api.get<{ teachers: any[] }>("/admin/teachers", { bypassCache: true }),
      api.get<{ students: any[] }>("/admin/students", { bypassCache: true }),
      api.get<{ orders: any[] }>("/admin/orders", { bypassCache: true }),
      api.get<{ settings: any }>("/admin/settings", { bypassCache: true }),
    ])

    const failed=[bRes,tRes,sRes,oRes,setRes].find(r=>r.status==="rejected")
    setError(failed&&failed.status==="rejected"?(failed.reason instanceof Error?failed.reason.message:"Unable to refresh academy records"):"")
    if (bRes.status === "fulfilled" && Array.isArray(bRes.value?.batches)) {
      setBatches(bRes.value.batches.map(mapApiBatch))
    }

    if (tRes.status === "fulfilled" && Array.isArray(tRes.value?.teachers)) {
      setTeachers(
        tRes.value.teachers.map((t: any) => ({
          id: t.id,
          name: t.name,
          email: t.email,
          title: t.provisioning_state === "active" ? "Faculty" : `Provisioning ${t.provisioning_state}`,
          specialization: "",
          role: (t.role as any) === "Teacher" ? "Lead Instructor" : ((t.role as any) === "Evaluator" ? "Evaluator" : "Teaching Assistant"),
          assignedCourses: t.assigned_courses ?? [],
          activeBatches: t.active_batches ?? [],
          studentCount: Number(t.student_count ?? 0),
          rating: 0,
          status: t.disabled_at ? "Off-Duty" : t.provisioning_state !== "active" ? "In Review" : "Available",
          avatar: t.avatar || "",
          attendanceRate: 0,
        })),
      )
    }

    if (sRes.status === "fulfilled" && Array.isArray(sRes.value?.students)) {
      setStudents(
        sRes.value.students.map((s: any) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          avatar: s.avatar_url || "",
          courseId: "",
          courseTitle: s.course_title || "No active access",
          batchId: "",
          batchName: s.batch_name || "Unassigned",
          enrolledAt: s.created_at,
          progress: 0,
          attendanceRate: 0,
          evaluationScore: 0,
          status: s.status,
        })),
      )
    }

    if (oRes.status === "fulfilled" && Array.isArray(oRes.value?.orders)) {
      setOrders(oRes.value.orders.map(mapApiOrder))
    }

    if (setRes.status === "fulfilled" && setRes.value?.settings) {
      setSettings((prev) => ({ ...prev, ...setRes.value.settings }))
    }
  }, [])

  // Sync courses & operations with Backend API on mount
  useEffect(() => {
    refreshCourses().catch(e => setError(e.message??"Unable to load courses"))
    refreshOperations().catch(e => setError(e.message??"Unable to load academy records"))
  }, [refreshCourses, refreshOperations])

  const addCourse = useCallback(
    async (
      newCourse: Omit<
        AdminCourse,
        "id" | "enrolledStudents" | "revenue" | "rating" | "completionRate" | "updatedAt"
      >,
    ) => {
      const res = await api.post<{ ok: boolean; course: any }>("/admin/courses", {
        title: newCourse.title,
        category: newCourse.category,
        instructor: newCourse.instructor,
        instructor_role: "Lead Instructor",
        description: `Comprehensive track in ${newCourse.title} covering architecture, practical applications and production deployment.`,
        level: "Beginner",
        credits: 4,
        duration: "12 Weeks",
        price: newCourse.price,
        capacity: newCourse.capacity,
        status: newCourse.status,
      })
      const created = res?.course ? mapApiCourse(res.course) : null
      if (created) {
        setCourses((prev) => [created, ...prev])
        return created
      }

      throw new Error("The server did not confirm course creation. Refresh and try again.")
    },
    [],
  )

  const toggleCourseStatus = useCallback(
    async (courseId: string) => {
      const target = courses.find((c) => c.id === courseId)
      const nextStatus: AdminCourse["status"] = target?.status === "Published" ? "Archived" : "Published"

      await api.patch(`/admin/courses/${courseId}`, { status: nextStatus })

      const today = new Date().toISOString().split("T")[0]
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: nextStatus, updatedAt: today } : c)),
      )
    },
    [courses],
  )

  const updateCourse = useCallback(async (courseId: string, patch: Partial<AdminCourse>) => {
    const apiPayload: Record<string, unknown> = {}
    if (patch.title !== undefined) apiPayload.title = patch.title
    if (patch.category !== undefined) apiPayload.category = patch.category
    if (patch.instructor !== undefined) apiPayload.instructor = patch.instructor
    if (patch.price !== undefined) apiPayload.price = patch.price
    if (patch.capacity !== undefined) apiPayload.capacity = patch.capacity
    if (patch.status !== undefined) apiPayload.status = patch.status

    if (Object.keys(apiPayload).length > 0) {
      await api.patch(`/admin/courses/${courseId}`, apiPayload)
    }

    const today = new Date().toISOString().split("T")[0]
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c
        return {
          ...c,
          ...patch,
          revenue: c.revenue,
          updatedAt: today,
        }
      }),
    )
  }, [])

  const deleteCourse = useCallback(async (courseId: string) => {
    await api.delete(`/admin/courses/${courseId}`)
    setCourses((prev) => prev.filter((c) => c.id !== courseId))
    // Batches do not belong to a course. Deleting one only clears the optional topic label.
    setBatches((prev) => prev.map((b) => (b.courseId === courseId ? { ...b, courseId: "", courseTitle: "", courseCode: undefined } : b)))
  }, [])

  const addBatch = useCallback(
    async (
      batchData: Omit<AdminBatch, "id" | "enrolledSeats" | "waitlistedSeats"> & { waitlistedSeats?: number },
    ) => {
      const res = await api.post<{ ok: boolean; batch: any }>("/admin/batches", {
        name: batchData.name,
        course_id: batchData.courseId || null,
        price: batchData.price ?? 0,
        instructor: batchData.instructor,
        start_date: batchData.startDate,
        end_date: batchData.endDate,
        schedule: batchData.schedule,
        timezone: batchData.timezone || "Asia/Kolkata",
        max_seats: batchData.maxSeats,
        delivery_mode: batchData.deliveryMode,
        replay_delay_hours: batchData.replayDelayHours,
        access_expiry_months: batchData.accessExpiryMonths,
        meeting_url: batchData.meetingUrl || null,
        features: batchData.features,
        status: batchData.status,
        notes: batchData.notes || "",
      })
      if (res?.batch) {
        const created = mapApiBatch(res.batch)
        setBatches((prev) => [created, ...prev])
        return created
      }

      // Never invent a local batch: it would look saved but not exist on the server.
      throw new Error("The server did not confirm batch creation. Refresh and try again.")
    },
    [],
  )

  const duplicateBatch = useCallback(async (batchId: string) => {
    const res = await api.post<{ ok: boolean; batch: any }>(`/admin/batches/${batchId}/duplicate`, {})
    if (res?.batch) {
      const created = mapApiBatch(res.batch)
      setBatches((prev) => [created, ...prev])
      return created
    }
    return null
  }, [])

  const updateBatch = useCallback(async (batchId: string, patch: Partial<AdminBatch>) => {
    const apiPayload: Record<string, unknown> = {}
    if (patch.name !== undefined) apiPayload.name = patch.name
    if (patch.courseId !== undefined) apiPayload.course_id = patch.courseId || null
    if (patch.price !== undefined) apiPayload.price = patch.price
    if (patch.instructor !== undefined) apiPayload.instructor = patch.instructor
    if (patch.startDate !== undefined) apiPayload.start_date = patch.startDate
    if (patch.endDate !== undefined) apiPayload.end_date = patch.endDate
    if (patch.schedule !== undefined) apiPayload.schedule = patch.schedule
    if (patch.timezone !== undefined) apiPayload.timezone = patch.timezone
    if (patch.maxSeats !== undefined) apiPayload.max_seats = patch.maxSeats
    if (patch.deliveryMode !== undefined) apiPayload.delivery_mode = patch.deliveryMode
    if (patch.replayDelayHours !== undefined) apiPayload.replay_delay_hours = patch.replayDelayHours
    if (patch.accessExpiryMonths !== undefined) apiPayload.access_expiry_months = patch.accessExpiryMonths
    if (patch.meetingUrl !== undefined) apiPayload.meeting_url = patch.meetingUrl || null
    if (patch.features !== undefined) apiPayload.features = patch.features
    if (patch.status !== undefined) apiPayload.status = patch.status
    if (patch.notes !== undefined) apiPayload.notes = patch.notes

    const res = await api.patch<{ ok: boolean; batch: any }>(`/admin/batches/${batchId}`, apiPayload)
    if (res?.batch) {
      const mapped = mapApiBatch(res.batch)
      setBatches((prev) => prev.map((b) => (b.id === batchId ? mapped : b)))
      await Promise.allSettled([refreshCourses(), refreshOperations()])
      return mapped
    }

    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, ...patch } : b)))
    return null
  }, [refreshCourses, refreshOperations])

  const deleteBatch = useCallback(async (batchId: string) => {
    await api.delete(`/admin/batches/${batchId}`)
    setBatches((prev) => prev.filter((b) => b.id !== batchId))
  }, [])

  const fetchBatchStudents = useCallback(async (batchId: string) => {
    const res = await api.get<{
      batch: any
      students: any[]
      available_students: any[]
    }>(`/admin/batches/${batchId}/students`, { bypassCache: true })

    return {
      batch: mapApiBatch(res.batch),
      students: (res.students || []).map((s): BatchRosterStudent => ({
        id: String(s.id),
        name: String(s.name),
        email: String(s.email),
        avatarUrl: s.avatar_url ?? null,
        rollNumber: String(s.roll_number ?? ""),
        program: String(s.program ?? "Artificial Intelligence"),
        status: (s.status as BatchRosterStatus) || "Active",
        notes: String(s.notes ?? ""),
        enrolledAt: s.enrolled_at ? new Date(s.enrolled_at).toISOString().split("T")[0] : "",
        attendanceRate: s.attendance_rate == null ? null : Number(s.attendance_rate),
        courseProgress: Number(s.course_progress ?? 0),
      })),
      availableStudents: (res.available_students || []).map((a): BatchAvailableStudent => ({
        id: String(a.id),
        name: String(a.name),
        email: String(a.email),
        avatarUrl: a.avatar_url ?? null,
        rollNumber: String(a.roll_number ?? ""),
        currentBatch: String(a.current_batch ?? ""),
      })),
    }
  }, [])

  const addStudentsToBatch = useCallback(
    async (
      batchId: string,
      payload: {
        studentIds?: string[]
        name?: string
        email?: string
        program?: string
        status?: BatchRosterStatus
        notes?: string
        allowOverCapacity?: boolean
        autoWaitlistWhenFull?: boolean
      },
    ) => {
      const res = await api.post<{
        ok: boolean
        added_count: number
        waitlisted_count: number
        skipped_count: number
        batch: any
      }>(`/admin/batches/${batchId}/students`, {
        ...(payload.studentIds?.length ? { student_ids: payload.studentIds } : {}),
        ...(payload.name ? { name: payload.name } : {}),
        ...(payload.email ? { email: payload.email } : {}),
        ...(payload.program ? { program: payload.program } : {}),
        status: payload.status ?? "Active",
        notes: payload.notes ?? "",
        allow_over_capacity: payload.allowOverCapacity ?? false,
        auto_waitlist_when_full: payload.autoWaitlistWhenFull ?? false,
      })
      if (res?.batch) {
        const updated = mapApiBatch(res.batch)
        setBatches((prev) => prev.map((b) => (b.id === batchId ? updated : b)))
      }
      await Promise.allSettled([refreshCourses(), refreshOperations()])
      return res
    },
    [refreshCourses, refreshOperations],
  )

  const updateBatchStudent = useCallback(
    async (
      batchId: string,
      studentId: string,
      patch: { status?: BatchRosterStatus; notes?: string; targetBatchId?: string; allowOverCapacity?: boolean },
    ) => {
      const res = await api.patch<{ ok: boolean; transferred: boolean; batch: any; target_batch?: any }>(
        `/admin/batches/${batchId}/students/${studentId}`,
        {
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
          ...(patch.targetBatchId !== undefined ? { target_batch_id: patch.targetBatchId } : {}),
          ...(patch.allowOverCapacity !== undefined ? { allow_over_capacity: patch.allowOverCapacity } : {}),
        },
      )
      await Promise.allSettled([refreshCourses(), refreshOperations()])
      return res
    },
    [refreshCourses, refreshOperations],
  )

  const removeStudentFromBatch = useCallback(
    async (batchId: string, studentId: string, unenrolCourse = false) => {
      const query = unenrolCourse ? "?unenrol_course=true" : ""
      await api.delete(`/admin/batches/${batchId}/students/${studentId}${query}`)
      await Promise.allSettled([refreshCourses(), refreshOperations()])
    },
    [refreshCourses, refreshOperations],
  )

  const addTeacher = useCallback(async (teacherData: Omit<AdminTeacher, "id" | "studentCount" | "rating" | "attendanceRate">) => {
    const response = await api.post<{ teacher: { id: string } }>("/admin/teachers", { name: teacherData.name, email: teacherData.email,
      role: teacherData.role, course_ids: teacherData.assignedCourses })
    await refreshOperations()
    return response.teacher
  }, [refreshOperations])
  const updateTeacher = useCallback(async (teacherId: string, patch: Partial<AdminTeacher>) => {
    await api.patch(`/admin/teachers/${teacherId}`, { name: patch.name })
    await refreshOperations()
  }, [refreshOperations])
  const deleteTeacher = useCallback(async (teacherId: string) => {
    await api.delete(`/admin/teachers/${teacherId}`)
    await refreshOperations()
  }, [refreshOperations])

  const enrolStudent = useCallback(
    async (studentData: { name: string; email: string; courseId: string; batchId: string }) => {
      await api.post("/admin/students/enrol", {
        name: studentData.name,
        email: studentData.email,
        ...(studentData.courseId ? { course_id: studentData.courseId } : {}),
        ...(studentData.batchId ? { batch_id: studentData.batchId } : {}),
      })
      await Promise.allSettled([refreshCourses(), refreshOperations()])
      return null
    },
    [refreshCourses, refreshOperations],
  )

  const updateStudent = useCallback(async (studentId:string,patch:Partial<AdminStudent>)=>{
    await api.patch(`/admin/students/${studentId}`,{name:patch.name});await refreshOperations()
  },[refreshOperations])
  const deleteStudent = useCallback(async (studentId:string)=>{
    await api.delete(`/admin/students/${studentId}`);await refreshOperations()
  },[refreshOperations])

  const refundOrder = useCallback(async (orderId: string, reason: string) => {
    await api.post(`/admin/orders/${orderId}/refund`, { reason })
    // The provider must confirm a refund before the UI can show Refunded.
    const result = await api.get<{ orders: AdminOrder[] }>("/admin/orders", { bypassCache: true })
    setOrders(result.orders.map(mapApiOrder))
  }, [])

  const deleteOrder = useCallback(async (orderId: string) => {
    await api.delete(`/admin/orders/${orderId}`)
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
  }, [])

  const updateSettings = useCallback(async (newSettings: Partial<AcademySettings>) => {
    const result=await api.patch<{settings:AcademySettings}>("/admin/settings", newSettings)
    setSettings(result.settings)
  }, [])

  return {
    error,
    courses,
    batches,
    teachers,
    students,
    orders,
    settings,
    addCourse,
    updateCourse,
    toggleCourseStatus,
    deleteCourse,
    refreshCourses,
    addBatch,
    duplicateBatch,
    updateBatch,
    deleteBatch,
    refreshOperations,
    fetchBatchStudents,
    addStudentsToBatch,
    updateBatchStudent,
    removeStudentFromBatch,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    enrolStudent,
    updateStudent,
    deleteStudent,
    refundOrder,
    deleteOrder,
    updateSettings,
  }
}

// Custom Hook for Platform & Infrastructure Data in single-tenant architecture
export function useSuperAdminStore() {
  const [rbac,setRbac]=useState<RbacPermissionRow[]>([])
  const [auditLogs,setAuditLogs]=useState<SecurityAuditLog[]>([])
  const [error,setError]=useState("")
  const refresh=useCallback(async()=>{try{const [policy,audit]=await Promise.all([api.get<{matrix:RbacPermissionRow[]}>("/super-admin/rbac",{bypassCache:true}),api.get<{logs:SecurityAuditLog[]}>("/super-admin/audit",{bypassCache:true})]);setRbac(policy.matrix);setAuditLogs(audit.logs);setError("")}catch(e){setError(e instanceof Error?e.message:"Unable to load platform records")}},[])
  useEffect(()=>{void refresh()},[refresh])
  return {rbac,auditLogs,error,refresh}
}
