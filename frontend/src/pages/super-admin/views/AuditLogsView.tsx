import { useState, useMemo } from "react"
import {
  Clock,
  Eye,
  Filter,
  Search,
  ShieldAlert,
} from "lucide-react"
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
} from "@/components/ui"
import { AuditDetailSheet } from "@/components/AdminModals"
import type { useSuperAdminStore, SecurityAuditLog } from "@/data/adminStore"
import { cn } from "@/lib/utils"

interface AuditLogsViewProps {
  store: ReturnType<typeof useSuperAdminStore>
}

export default function AuditLogsView({ store }: AuditLogsViewProps) {
  const { auditLogs } = store
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null)

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchSearch =
        log.actorName.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.target.toLowerCase().includes(search.toLowerCase()) ||
        log.ip.toLowerCase().includes(search.toLowerCase())
      const matchCategory = categoryFilter === "All" || log.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [auditLogs, search, categoryFilter])

  const categories = ["All", "Security", "Admin", "Billing", "System", "Data"]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Security Audit Trail"
        description="Immutable system logs, privilege escalations, authentication events, and administrative mutations."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Audit Logs" }]}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by action, actor, target or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-all cursor-pointer",
                categoryFilter === cat
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table Card */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Event Log Entries</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {auditLogs.length} recorded events
              </CardDescription>
            </div>
            <Badge tone="neutral" className="font-mono text-xs">
              HMAC SHA-256 Verified
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<ShieldAlert className="h-5 w-5" />}
                title="No audit events found"
                description="Try clearing your search query or selecting All categories."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("")
                      setCategoryFilter("All")
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-surface-2 font-semibold text-muted-foreground uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action & Category</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLogs.map((log) => {
                    const isSuccess = log.status === "Success"
                    return (
                      <tr key={log.id} className="hover:bg-surface-2/60 transition-colors">
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-foreground text-xs">{log.action}</span>
                          <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground border border-border">
                            {log.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={log.actorName} className="h-6 w-6 text-[10px]" />
                            <span className="font-medium text-foreground">{log.actorName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {log.target}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          {log.ip}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={isSuccess ? "success" : "danger"} dot>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Detail Sheet */}
      <AuditDetailSheet
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
