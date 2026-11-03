import { useState } from "react"
import {
  Building2,
  CheckCircle,
  Globe,
  Mail,
  Plus,
  Search,
  Sparkles,
  Users,
  Edit2,
  Trash2,
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
  Progress,
  StatCard,
} from "@/components/ui"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import Stagger, { StaggerItem } from "@/components/motion/Stagger"
import type { MetricItem } from "@/types"
import type { useSuperAdminStore, TenantHub } from "@/data/adminStore"
import { cn } from "@/lib/utils"

interface TenantsViewProps {
  store: ReturnType<typeof useSuperAdminStore>
}

export default function TenantsView({ store }: TenantsViewProps) {
  const { tenants, addTenant, updateTenant, deleteTenant } = store
  const [search, setSearch] = useState("")

  // Add tenant state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<TenantHub["type"]>("University Partner")
  const [newLocation, setNewLocation] = useState("Bengaluru, KA")
  const [newRegion, setNewRegion] = useState("ap-south-1 (Mumbai)")
  const [newQuota, setNewQuota] = useState(5000000)
  const [newLearners, setNewLearners] = useState(250)
  const [newContact, setNewContact] = useState("")
  const [newEmail, setNewEmail] = useState("")

  // Edit tenant state
  const [editingTenant, setEditingTenant] = useState<TenantHub | null>(null)
  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState<TenantHub["type"]>("University Partner")
  const [editLocation, setEditLocation] = useState("")
  const [editQuota, setEditQuota] = useState(5000000)
  const [editStatus, setEditStatus] = useState<TenantHub["status"]>("Active")
  const [editContact, setEditContact] = useState("")

  // Delete tenant state
  const [deletingTenant, setDeletingTenant] = useState<TenantHub | null>(null)

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.contactPerson.toLowerCase().includes(search.toLowerCase()),
  )

  const totalStudents = tenants.reduce((sum, t) => sum + t.learnersCount, 0)
  const totalCourses = tenants.reduce((sum, t) => sum + t.coursesSubscribed, 0)

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    addTenant({
      name: newName,
      type: newType,
      location: newLocation,
      cloudRegion: newRegion,
      learnersCount: Number(newLearners),
      coursesSubscribed: 4,
      aiTokensUsedMonthly: 0,
      aiTokenLimitMonthly: Number(newQuota),
      status: "Active",
      contactPerson: newContact || "Program Lead",
      contactEmail: newEmail || "lead@partner.edu",
    })

    setNewName("")
    setIsAddOpen(false)
  }

  const handleOpenEdit = (t: TenantHub) => {
    setEditingTenant(t)
    setEditName(t.name)
    setEditType(t.type)
    setEditLocation(t.location)
    setEditQuota(t.aiTokenLimitMonthly)
    setEditStatus(t.status)
    setEditContact(t.contactPerson)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTenant || !editName.trim()) return

    updateTenant(editingTenant.id, {
      name: editName,
      type: editType,
      location: editLocation,
      aiTokenLimitMonthly: Number(editQuota),
      status: editStatus,
      contactPerson: editContact,
    })
    setEditingTenant(null)
  }

  const handleDeleteTenant = () => {
    if (!deletingTenant) return
    deleteTenant(deletingTenant.id)
    setDeletingTenant(null)
  }

  const kpis: MetricItem[] = [
    {
      icon: "users",
      label: "Active Hubs",
      value: `${tenants.length}`,
      trend: "Multi-campus isolation",
      tone: "lavender",
    },
    {
      icon: "fire",
      label: "Enterprise Learners",
      value: `${totalStudents.toLocaleString("en-IN")}`,
      trend: "Across all campuses",
      tone: "lime",
    },
    {
      icon: "star",
      label: "Courses Subscribed",
      value: `${totalCourses}`,
      trend: "Curriculum allocations",
      tone: "yellow",
    },
    {
      icon: "trend",
      label: "Partitioning SLA",
      value: "100%",
      trend: "Zero cross-tenant leakage",
      tone: "pink",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Enterprise Tenants & Hubs"
        description="Multi-tenant organization partitioning, AI token quotas, and cloud region mappings."
        breadcrumb={[{ label: "Platform Console", href: "/super-admin" }, { label: "Tenants" }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search hubs or campuses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs sm:text-sm"
              />
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Provision Hub
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <StaggerItem key={kpi.label}>
            <StatCard item={kpi} />
          </StaggerItem>
        ))}
      </Stagger>

      {/* Tenants Grid */}
      {filteredTenants.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No tenant hubs found"
          description="Try adjusting your search criteria."
          action={
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              Reset Search
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filteredTenants.map((tenant) => {
            const quotaPct = Math.round((tenant.aiTokensUsedMonthly / tenant.aiTokenLimitMonthly) * 100)
            return (
              <Card key={tenant.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">{tenant.name}</CardTitle>
                        <Badge tone="primary">{tenant.type}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2 text-xs">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{tenant.location}</span>
                        <span>·</span>
                        <span className="font-mono">{tenant.cloudRegion}</span>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge tone={tenant.status === "Active" ? "success" : "secondary"} dot>
                        {tenant.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(tenant)}
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-primary-text"
                        title="Edit Tenant Hub"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingTenant(tenant)}
                        className="h-7 w-7 p-0 text-danger hover:text-danger hover:bg-danger/10"
                        title="Deprovision Tenant Hub"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Quota Progress */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monthly AI Quota</span>
                      <span className="font-mono font-semibold text-foreground">
                        {(tenant.aiTokensUsedMonthly / 1_000_000).toFixed(1)}M / {(tenant.aiTokenLimitMonthly / 1_000_000).toFixed(0)}M tokens ({quotaPct}%)
                      </span>
                    </div>
                    <Progress value={quotaPct} className="h-2" />
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 rounded-md bg-surface-2 p-2.5 text-xs">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Learners</p>
                      <p className="font-semibold text-foreground text-sm">{tenant.learnersCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Courses</p>
                      <p className="font-semibold text-foreground text-sm">{tenant.coursesSubscribed}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Contact</p>
                      <p className="font-semibold text-foreground text-xs truncate">{tenant.contactPerson.split(" ")[0]}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border text-muted-foreground">
                    <span>Cluster ID: {tenant.id}</span>
                    <span className="font-medium text-foreground">{tenant.contactPerson}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Provision Hub Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Provision Enterprise Hub</DialogTitle>
                <DialogDescription>Setup a new tenant organization partition</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateTenant} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Organization / Campus Name</label>
              <Input
                required
                placeholder="e.g. Stanford AI Guild"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Hub Category</label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                >
                  <option value="University Partner">University Partner</option>
                  <option value="Enterprise Lab">Enterprise Lab</option>
                  <option value="Research Guild">Research Guild</option>
                  <option value="Corporate Center">Corporate Center</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Campus Location</label>
                <Input
                  required
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Monthly AI Token Quota</label>
                <Input
                  type="number"
                  min={1000000}
                  step={500000}
                  value={newQuota}
                  onChange={(e) => setNewQuota(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Learner Limit</label>
                <Input
                  type="number"
                  min={10}
                  max={10000}
                  value={newLearners}
                  onChange={(e) => setNewLearners(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Contact Email</label>
              <Input
                type="email"
                placeholder="lead@partner.edu"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Deploy Hub</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Modal */}
      <Dialog open={!!editingTenant} onOpenChange={(open) => !open && setEditingTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-text border border-primary-border">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Edit Tenant Partition</DialogTitle>
                <DialogDescription>Modify hub quotas, location, and SLA status</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingTenant && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Organization Name</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Category</label>
                  <select
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none"
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                  >
                    <option value="University Partner">University Partner</option>
                    <option value="Enterprise Lab">Enterprise Lab</option>
                    <option value="Research Guild">Research Guild</option>
                    <option value="Corporate Center">Corporate Center</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Status</label>
                  <select
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground focus:outline-none"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="Active">Active</option>
                    <option value="Provisioning">Provisioning</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Monthly AI Quota (Tokens)</label>
                <Input
                  type="number"
                  min={1000000}
                  step={500000}
                  value={editQuota}
                  onChange={(e) => setEditQuota(Number(e.target.value))}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingTenant(null)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Tenant Confirmation Dialog */}
      <Dialog open={!!deletingTenant} onOpenChange={(open) => !open && setDeletingTenant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10 text-danger border border-danger/20">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Deprovision Tenant Hub?</DialogTitle>
                <DialogDescription>
                  This enterprise hub partition and associated cloud allocations will be permanently removed.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deletingTenant && (
            <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{deletingTenant.name}</p>
              <p className="text-muted-foreground">{deletingTenant.location} · {deletingTenant.learnersCount} learners</p>
            </div>
          )}

          <DialogFooter className="pt-3">
            <Button type="button" variant="outline" onClick={() => setDeletingTenant(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteTenant}>
              Confirm Deprovision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
