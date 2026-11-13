import { Button } from "@/components/ui/button"
import type { useAdminStore } from "@/data/adminStore"
interface OverviewViewProps {
  store: ReturnType<typeof useAdminStore>
  onOpenCreateBatch: () => void
  onOpenManualEnrol: () => void
  onNavigate: (tabId: string) => void
}

export default function OverviewView({store,onOpenManualEnrol,onOpenCreateBatch}:OverviewViewProps) {
 const {courses,batches,students,orders}=store
 const captured=orders.reduce((sum,o)=>sum+o.capturedAmount,0),refunded=orders.reduce((sum,o)=>sum+o.refundedAmount,0)
 return <div className="space-y-6"><header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Academy overview</h1><p className="text-sm text-muted-foreground">Current courses, cohorts and provider-confirmed test payments</p></div><div className="flex gap-2"><Button variant="outline" onClick={onOpenManualEnrol}>Enrol learner</Button><Button onClick={onOpenCreateBatch}>New batch</Button></div></header><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[["Courses",courses.length],["Learners",students.length],["Active batches",batches.filter(b=>b.status==="Active").length],["Net test payments",`INR ${(captured-refunded).toLocaleString("en-IN")}`]].map(([title,value])=><section key={title} className="rounded-2xl border bg-surface p-5"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-2 text-3xl font-semibold">{value}</p></section>)}</div><section className="rounded-2xl border bg-surface p-6 space-y-4"><h2 className="font-semibold">Cohort capacity</h2>{!batches.length&&<p className="text-sm text-muted-foreground">No batches yet.</p>}{batches.slice(0,8).map(b=><div key={b.id} className="flex flex-wrap justify-between gap-3 border-b pb-3 text-sm"><span>{b.name}</span><span className="text-muted-foreground">{b.enrolledSeats} / {b.maxSeats} enrolled · {b.status}</span></div>)}</section><p className="text-sm text-muted-foreground">Payments reflect Razorpay test-mode captures less confirmed refunds. Live attendance records join clicks, not verified presence. Completion is governed by each course’s saved policy.</p></div>
}
