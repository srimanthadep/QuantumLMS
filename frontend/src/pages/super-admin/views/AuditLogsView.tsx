import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  ShieldAlert,
  Search,
  Eye,
  Clock,
  Filter,
} from "lucide-react"
import { AuditDetailSheet } from "@/components/AdminModals"
import type { useSuperAdminStore, SecurityAuditLog } from "@/data/adminStore"

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Security Audit Trail
          </h1>
          <p className="text-sm text-muted-foreground">
            Immutable system logs, privilege escalations, authentication events, and administrative mutations
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by action, actor, target or IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Category:</span>
          {["All", "Auth", "RBAC", "Billing", "Course", "AI Engine", "Security"].map((c) => (
            <Button
              key={c}
              size="sm"
              variant={categoryFilter === c ? "default" : "outline"}
              onClick={() => setCategoryFilter(c)}
              className="h-8 text-xs"
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-2 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">IP Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="h-32 text-center text-muted-foreground px-4 py-3">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-2/60 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground text-xs">{log.actorName}</div>
                        <div className="text-[10px] text-primary-text">{log.actorRole}</div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[11px] bg-surface-2 font-normal">
                        {log.category}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                      {log.action}
                    </td>

                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[220px]">
                      {log.target}
                    </td>

                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {log.ip}
                    </td>

                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          log.status === "Success"
                            ? "default"
                            : log.status === "Warning"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-8 px-2 text-xs text-primary-text hover:text-primary-hover"
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AuditDetailSheet
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  )
}
