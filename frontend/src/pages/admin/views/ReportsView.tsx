import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CustomSelect } from "@/components/ui/select"
import AreaChart from "@/components/charts/AreaChart"
import type { useAdminStore } from "@/data/adminStore"

const PERIOD_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
]

export default function ReportsView({ store, onToast }: { store: ReturnType<typeof useAdminStore>; onToast: (m: string) => void }) {
  const [months, setMonths] = useState(6)
  const payments = store.orders.flatMap((o) => o.capturedPayments)
  const trend = Array.from({ length: months }, (_, i) => {
    const at = new Date()
    at.setDate(1)
    at.setMonth(at.getMonth() - months + 1 + i)
    return {
      label: at.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      value: payments
        .filter((p) => {
          const date = new Date(p.date)
          return date.getMonth() === at.getMonth() && date.getFullYear() === at.getFullYear()
        })
        .reduce((sum, p) => sum + p.amount, 0),
    }
  })

  function exportCsv() {
    const cell = (v: unknown) => {
      const text = String(v ?? "")
      return '"' + (/^[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""') + '"'
    }
    const rows = [
      ["Order", "Learner", "Course", "Captured INR", "Refunded INR", "Status"],
      ...store.orders.map((o) => [o.orderNumber, o.studentName, o.courseTitle, o.capturedAmount, o.refundedAmount, o.status]),
    ]
    const url = URL.createObjectURL(new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = "payment-report.csv"
    a.click()
    URL.revokeObjectURL(url)
    onToast("Payment report exported")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Provider-confirmed Razorpay test payments</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          Export payment records
        </Button>
      </div>
      <section className="space-y-5 rounded-2xl border bg-surface p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold">Captured payments · INR</h2>
          <CustomSelect
            aria-label="Report period"
            className="w-36"
            value={String(months)}
            onChange={(v) => setMonths(Number(v))}
            options={PERIOD_OPTIONS}
          />
        </div>
        <AreaChart labels={trend.map((t) => t.label)} series={[{ name: "Captured INR", values: trend.map((t) => t.value) }]} />
        <p className="text-xs text-muted-foreground">
          Grouped by provider capture date. Refund totals are available in the export and payment ledger; no historical refund dates are inferred.
        </p>
      </section>
      <p className="text-sm text-muted-foreground">
        Certificate evidence is available in each course’s Assessments & completion tab. Retention, verified attendance and industry benchmarks are not measured here.
      </p>
    </div>
  )
}
