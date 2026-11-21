import { useRef, useState, type FormEvent } from "react"
import { Database, Download, FileCode, FileText, Paperclip, Presentation, Trash2, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Field from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CustomSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ConfirmRequest } from "../shared/ConfirmDialog"
import { PanelHeader, WorkspaceEmpty } from "./WorkspaceParts"
import { MATERIAL_TYPE_OPTIONS, type MaterialItem, type MaterialType } from "./courseContent"

interface CourseMaterialsPanelProps {
  courseId: string
  materials: MaterialItem[]
  onMaterialsChange: (next: MaterialItem[]) => void
  onConfirm: (request: ConfirmRequest) => void
  onToast: (msg: string) => void
}

const TYPE_STYLE: Record<MaterialType, { icon: typeof FileText; tone: string }> = {
  PDF: { icon: FileText, tone: "bg-primary-soft text-primary-text" },
  Slides: { icon: Presentation, tone: "bg-warning-soft text-warning" },
  "Code Notebook": { icon: FileCode, tone: "bg-success-soft text-success" },
  Dataset: { icon: Database, tone: "bg-info-soft text-info" },
}

/** Downloadable resources for enrolled learners: upload a file or link, list, remove. */
export default function CourseMaterialsPanel({ courseId, materials, onMaterialsChange, onConfirm, onToast }: CourseMaterialsPanelProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [type, setType] = useState<MaterialType>("PDF")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const reset = () => {
    setTitle("")
    setType("PDF")
    setDescription("")
    setUrl("")
    setFile(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setUploading(true)
    try {
      let finalUrl = url.trim()
      let fileName = file ? file.name : undefined
      let size = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "Link"
      if (file) {
        const uploaded = await api.postBuffer<{ ok: boolean; url: string; fileName: string; size: string }>(
          `/admin/courses/${courseId}/materials/upload?filename=${encodeURIComponent(file.name)}`,
          file,
          { headers: { "Content-Type": file.type || "application/octet-stream", "x-filename": file.name } },
        )
        finalUrl = uploaded.url
        fileName = uploaded.fileName
        size = uploaded.size
      }
      const res = await api.post<{ ok: boolean; material: MaterialItem }>(`/admin/courses/${courseId}/materials`, {
        title: title.trim(),
        type,
        description: description.trim(),
        url: finalUrl || undefined,
        fileName,
        size,
      })
      if (res.material) {
        onMaterialsChange([...materials, res.material])
        onToast(`Added "${res.material.title}"`)
        setOpen(false)
        reset()
      }
    } catch (err) {
      onToast(`Could not upload material: ${err instanceof Error ? err.message : "unknown error"}`)
    } finally {
      setUploading(false)
    }
  }

  const remove = (m: MaterialItem) =>
    onConfirm({
      title: `Remove "${m.title}"?`,
      description: "Learners will no longer see or download this file.",
      confirmLabel: "Remove material",
      onConfirm: async () => {
        try {
          await api.delete(`/admin/courses/${courseId}/materials/${m.id}`)
          onMaterialsChange(materials.filter((x) => x.id !== m.id))
          onToast(`Removed "${m.title}"`)
        } catch (err) {
          onToast(`Could not remove material: ${err instanceof Error ? err.message : "unknown error"}`)
          return false
        }
      },
    })

  return (
    <div className="space-y-4">
      <PanelHeader title="Materials" description="Slides, notebooks, datasets and PDFs that enrolled learners can download.">
        <Button size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => setOpen(true)}>
          Add material
        </Button>
      </PanelHeader>

      {materials.length === 0 ? (
        <WorkspaceEmpty icon={FileText} title="No materials yet" description="Share slide decks, code notebooks or datasets with your learners.">
          <Button size="sm" leftIcon={<Upload aria-hidden="true" />} onClick={() => setOpen(true)}>
            Add material
          </Button>
        </WorkspaceEmpty>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((m) => {
            const style = TYPE_STYLE[m.type] ?? TYPE_STYLE.PDF
            const Icon = style.icon
            return (
              <li key={m.id}>
                <Card className="flex h-full flex-col gap-3 p-4 transition-colors hover:border-border-strong/60">
                  <div className="flex items-start gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", style.tone)}>
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{m.title}</h3>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        {m.type} · <span className="tabular-nums">{m.size}</span>
                      </p>
                    </div>
                  </div>
                  {m.description && <p className="line-clamp-2 text-caption text-muted-foreground">{m.description}</p>}
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-caption font-medium text-primary-text hover:underline">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Open file
                      </a>
                    ) : (
                      <span className="text-caption text-muted-foreground">No file attached</span>
                    )}
                    <Button size="icon-sm" variant="ghost" aria-label={`Remove ${m.title}`} className="text-danger hover:bg-danger/10 hover:text-danger" onClick={() => remove(m)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (uploading) return
          setOpen(o)
          if (!o) reset()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add material</DialogTitle>
            <DialogDescription>Upload a file, or paste a link to Google Drive or GitHub.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4 py-1">
            <Field label="Title" required>
              <Input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lecture slides: agent architecture" />
            </Field>
            <Field label="Type">
              <CustomSelect value={type} onChange={(v) => setType(v as MaterialType)} options={MATERIAL_TYPE_OPTIONS} />
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">File</p>
              <input
                ref={fileInput}
                type="file"
                className="sr-only"
                id="material-file"
                accept=".pdf,.ppt,.pptx,.ipynb,.zip,.csv,.json,.h5"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{file.name}</span>
                  <span className="shrink-0 text-caption tabular-nums text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  <button
                    type="button"
                    aria-label="Remove selected file"
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setFile(null)
                      if (fileInput.current) fileInput.current.value = ""
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="material-file"
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed border-border-strong px-4 py-5 text-center transition-colors hover:border-primary-border hover:bg-primary-soft/40"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm font-medium text-foreground">Choose a file</span>
                  <span className="text-caption text-muted-foreground">PDF, PPTX, IPYNB, ZIP, CSV or JSON</span>
                </label>
              )}
            </div>
            <Field label="Or a link" hint={file ? "The uploaded file is used instead of this link." : undefined}>
              <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" disabled={!!file} />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional note for learners" />
            </Field>
            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" loading={uploading} disabled={!title.trim()}>
                Add material
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
