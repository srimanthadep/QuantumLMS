import { useState } from "react"
import {
  GraduationCap,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Trash2,
  UserCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import PageHeader from "@/components/ui/page-header"
import { SegmentedControl } from "@/components/ui/tabs"
import PlacementStories from "@/components/student/PlacementStories"
import RecentPlacementsCard from "@/components/student/RecentPlacementsCard"
import AlumniPage from "@/pages/student/AlumniPage"
import {
  useAlumniNetwork,
  type AlumniProfile,
  type PlacementItem,
  type PlacementStory,
} from "@/data/alumniStore"
import {
  AlumniMetricsDialog,
  AlumniProfileFormDialog,
  ConfirmDeleteDialog,
  PlacementStoryFormDialog,
  RecentPlacementFormDialog,
} from "./alumni/AlumniDialogs"

type AlumniTab = "directory" | "stories" | "recent"

interface AlumniViewProps {
  onToast: (msg: string) => void
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function AlumniView({ onToast }: AlumniViewProps) {
  const {
    profiles,
    stories,
    recentPlacements,
    metrics,
    loading,
    refresh,
    addProfile,
    updateProfile,
    deleteProfile,
    addStory,
    updateStory,
    deleteStory,
    addPlacement,
    updatePlacement,
    deletePlacement,
    updateMetrics,
  } = useAlumniNetwork("admin")

  const [activeTab, setActiveTab] = useState<AlumniTab>("directory")

  // Dialog states
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<AlumniProfile | null>(null)

  const [storyDialogOpen, setStoryDialogOpen] = useState(false)
  const [editingStory, setEditingStory] = useState<PlacementStory | null>(null)

  const [placementDialogOpen, setPlacementDialogOpen] = useState(false)
  const [editingPlacement, setEditingPlacement] = useState<PlacementItem | null>(null)

  const [metricsDialogOpen, setMetricsDialogOpen] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "profile" | "story" | "placement"
    id: string
    label: string
  } | null>(null)

  const openPrimaryCreate = () => {
    if (activeTab === "directory") {
      setEditingProfile(null)
      setProfileDialogOpen(true)
    } else if (activeTab === "stories") {
      setEditingStory(null)
      setStoryDialogOpen(true)
    } else {
      setEditingPlacement(null)
      setPlacementDialogOpen(true)
    }
  }

  const primaryCreateLabel =
    activeTab === "directory"
      ? "Post Alumni Profile"
      : activeTab === "stories"
        ? "Post Placement Story"
        : "Post Recent Placement"

  return (
    <div className="flex flex-col gap-6 pb-12">
      <PageHeader
        eyebrow="Placement Network"
        title="Alumni Placements"
        description="Connect with Quantum School alumni and post, edit, or delete the journeys, stories, and metrics shown across the Student Portal."
        className="mb-0"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refresh().then(() => onToast("Alumni network synced from server"))}
              leftIcon={<RefreshCw className={loading ? "animate-spin" : undefined} />}
            >
              Sync
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={openPrimaryCreate} leftIcon={<Plus />}>
              {primaryCreateLabel}
            </Button>
          </div>
        }
      >
        <div className="pt-1">
          <SegmentedControl
            aria-label="Alumni management sections"
            value={activeTab}
            onChange={setActiveTab}
            options={[
              {
                value: "directory",
                label: `Alumni Directory (${profiles.length})`,
                icon: <GraduationCap className="h-3.5 w-3.5" />,
              },
              {
                value: "stories",
                label: `Placement Stories (${stories.length})`,
                icon: <Quote className="h-3.5 w-3.5" />,
              },
              {
                value: "recent",
                label: `Recent Placements (${recentPlacements.length})`,
                icon: <UserCheck className="h-3.5 w-3.5" />,
              },
            ]}
          />
        </div>
      </PageHeader>

      {activeTab === "directory" && (
        <AlumniPage
          hideHeader
          onToast={onToast}
          adminControls={{
            onCreateProfile: () => {
              setEditingProfile(null)
              setProfileDialogOpen(true)
            },
            onEditProfile: (profile) => {
              setEditingProfile(profile)
              setProfileDialogOpen(true)
            },
            onDeleteProfile: (profile) =>
              setDeleteTarget({
                kind: "profile",
                id: profile.id,
                label: profile.name,
              }),
            onEditMetrics: () => setMetricsDialogOpen(true),
          }}
        />
      )}

      {activeTab === "stories" && (
        <PlacementStories
          adminControls={{
            onPost: () => {
              setEditingStory(null)
              setStoryDialogOpen(true)
            },
            onEdit: (story) => {
              setEditingStory(story)
              setStoryDialogOpen(true)
            },
            onDelete: (story) =>
              setDeleteTarget({
                kind: "story",
                id: story.id,
                label: story.fullName,
              }),
          }}
        />
      )}

      {activeTab === "recent" && (
        <div className="space-y-6">
          <RecentPlacementsCard mode="admin" hideHeader className="h-[340px]" />

          <section aria-label="Manage recent placements" className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                Recent Placements ({recentPlacements.length})
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus />}
                onClick={() => {
                  setEditingPlacement(null)
                  setPlacementDialogOpen(true)
                }}
              >
                Post Recent Placement
              </Button>
            </div>

            {recentPlacements.length === 0 ? (
              <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface text-center">
                <p className="text-sm font-medium text-foreground">No recent placements posted yet</p>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus />}
                  onClick={() => {
                    setEditingPlacement(null)
                    setPlacementDialogOpen(true)
                  }}
                >
                  Post Recent Placement
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {recentPlacements.map((item, idx) => {
                  const itemId = item.id ?? `idx-${idx}`
                  const safeSrc =
                    item.src && (item.src.startsWith("/") || /^https?:\/\//i.test(item.src)) ? item.src : ""
                  return (
                    <div
                      key={itemId}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs transition hover:border-border-strong"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 text-sm font-bold text-white"
                          style={{ backgroundColor: item.color || "#2563EB" }}
                        >
                          {safeSrc ? (
                            <img
                              src={safeSrc}
                              alt={item.name}
                              className="h-full w-full object-cover"
                              style={item.offsetY ? { objectPosition: `center ${item.offsetY}px` } : undefined}
                            />
                          ) : (
                            getInitials(item.name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
                          <p className="truncate text-xs font-medium text-primary-text">{item.company}</p>
                          {item.role && (
                            <p className="truncate text-[11px] text-muted-foreground">{item.role}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditingPlacement(item)
                            setPlacementDialogOpen(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Delete ${item.name}`}
                          className="text-danger hover:bg-danger-soft hover:text-danger"
                          onClick={() =>
                            setDeleteTarget({
                              kind: "placement",
                              id: itemId,
                              label: `${item.name} (${item.company})`,
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Create / Edit Dialogs */}
      <AlumniProfileFormDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        initialProfile={editingProfile}
        onSubmit={async (values) => {
          if (editingProfile) {
            await updateProfile(editingProfile.id, values)
            onToast(`Updated alumni profile for ${values.name}`)
          } else {
            await addProfile(values)
            onToast(`Published ${values.name} to the Alumni Directory`)
          }
        }}
      />

      <PlacementStoryFormDialog
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        initialStory={editingStory}
        onSubmit={async (values) => {
          if (editingStory) {
            await updateStory(editingStory.id, values)
            onToast(`Updated placement story for ${values.fullName}`)
          } else {
            await addStory(values)
            onToast(`Published placement story for ${values.fullName}`)
          }
        }}
      />

      <RecentPlacementFormDialog
        open={placementDialogOpen}
        onOpenChange={setPlacementDialogOpen}
        initialPlacement={editingPlacement}
        onSubmit={async (values) => {
          const editId = editingPlacement?.id
          if (editingPlacement && editId) {
            await updatePlacement(editId, values)
            onToast(`Updated placement card for ${values.name}`)
          } else if (editingPlacement) {
            const idx = recentPlacements.indexOf(editingPlacement)
            await updatePlacement(idx >= 0 ? `idx-${idx}` : "", values)
            onToast(`Updated placement card for ${values.name}`)
          } else {
            await addPlacement(values)
            onToast(`Added ${values.name} (${values.company}) to Recent Placements`)
          }
        }}
      />

      <AlumniMetricsDialog
        open={metricsDialogOpen}
        onOpenChange={setMetricsDialogOpen}
        metrics={metrics}
        onSubmit={async (patch) => {
          await updateMetrics(patch)
          onToast("Updated alumni banner placement metrics")
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.label ?? "entry"}?`}
        description="This permanently removes the item from the Alumni Network and Student Portal."
        onConfirm={async () => {
          if (!deleteTarget) return
          if (deleteTarget.kind === "profile") {
            await deleteProfile(deleteTarget.id)
          } else if (deleteTarget.kind === "story") {
            await deleteStory(deleteTarget.id)
          } else {
            await deletePlacement(deleteTarget.id)
          }
          onToast(`Removed ${deleteTarget.label} from Alumni Network`)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
