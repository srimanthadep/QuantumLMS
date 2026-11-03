import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Receipt,
  RotateCcw,
  Search,
  CheckCircle,
  FileText,
  CreditCard,
  Wallet,
} from "lucide-react"
import { InvoiceModal, RefundConfirmDialog } from "@/components/AdminModals"
import type { useAdminStore, AdminOrder } from "@/data/adminStore"

interface OrdersViewProps {
  store: ReturnType<typeof useAdminStore>
  onToast: (msg: string) => void
}

export default function OrdersView({ store, onToast }: OrdersViewProps) {
  const { orders, refundOrder } = store

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<AdminOrder | null>(null)
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<AdminOrder | null>(null)

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.studentName.toLowerCase().includes(search.toLowerCase()) ||
        o.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
        o.courseTitle.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "All" || o.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [orders, search, statusFilter])

  const totalPaid = orders
    .filter((o) => o.status === "Paid")
    .reduce((sum, o) => sum + o.amount, 0)
  const totalRefunded = orders
    .filter((o) => o.status === "Refunded")
    .reduce((sum, o) => sum + o.amount, 0)

  const handleRefundConfirmed = (orderId: string, reason: string) => {
    refundOrder(orderId, reason)
    onToast(`Refund approved and initiated for ${orderId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Tuition Orders & Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            Payment transactions, tax invoices, gateway settlement logs, and refund approvals
          </p>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Gross Receipts (Paid)</div>
          <div className="text-2xl font-bold text-foreground font-mono">
            ₹{totalPaid.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-success font-medium">Settled via Razorpay & Stripe</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Refunds Issued</div>
          <div className="text-2xl font-bold text-danger font-mono">
            ₹{totalRefunded.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {orders.filter((o) => o.status === "Refunded").length} transactions reversed
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-xs">
          <div className="text-xs font-medium text-muted-foreground">Avg. Tuition Amount</div>
          <div className="text-2xl font-bold text-primary-text font-mono">₹41,800</div>
          <div className="text-[11px] text-muted-foreground">Across all enrolled cohorts</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order #, learner name, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
          {["All", "Paid", "Refunded", "Pending"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "default" : "outline"}
              onClick={() => setStatusFilter(st)}
              className="h-8 text-xs"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Learner Details</th>
                <th className="px-4 py-3">Course Enrolled</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Amount (₹)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 text-center text-muted-foreground px-4 py-3">
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                      {ord.orderNumber}
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        <div className="font-semibold text-foreground text-xs">{ord.studentName}</div>
                        <div className="text-[11px] text-muted-foreground">{ord.studentEmail}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-xs font-medium text-foreground">
                      {ord.courseTitle}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[11px] bg-surface-2 font-normal">
                        <CreditCard className="mr-1 h-3 w-3 text-muted-foreground" />
                        {ord.method}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {ord.date}
                    </td>

                    <td className="px-4 py-3 font-mono text-sm font-bold text-foreground">
                      ₹{ord.amount.toLocaleString("en-IN")}
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant={ord.status === "Paid" ? "default" : "destructive"} className="text-xs">
                        {ord.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoiceOrder(ord)}
                        className="h-8 px-2 text-xs text-primary-text hover:text-primary-hover"
                      >
                        <Receipt className="mr-1 h-3.5 w-3.5" />
                        Invoice
                      </Button>

                      {ord.status === "Paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRefundOrder(ord)}
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-danger"
                        >
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                          Refund
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <InvoiceModal
        order={selectedInvoiceOrder}
        isOpen={!!selectedInvoiceOrder}
        onClose={() => setSelectedInvoiceOrder(null)}
      />

      <RefundConfirmDialog
        order={selectedRefundOrder}
        isOpen={!!selectedRefundOrder}
        onClose={() => setSelectedRefundOrder(null)}
        onConfirmRefund={handleRefundConfirmed}
      />
    </div>
  )
}
