import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FileArchive, GitBranch, UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { transition } from "@/lib/motion"
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Field, Input, Textarea } from "@/components/ui"
import type { AssignmentData } from "@/pages/student/studentTypes"

interface AssignmentSubmitDialogProps {
  assignment: AssignmentData | null
  onClose: () => void
  onSubmit: (id: string, repoUrl: string, comments: string) => void
}

const GITHUB = /^https:\/\/(www\.)?github\.com\/[^/\s]+\/[^/\s]+/

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Submission form: GitHub link and/or a dropped file, plus notes for the evaluator. */
export default function AssignmentSubmitDialog({ assignment, onClose, onSubmit }: AssignmentSubmitDialogProps) {
  const last = useRef<AssignmentData | null>(null)
  if (assignment) last.current = assignment
  const shown = assignment ?? last.current

  const [repo, setRepo] = useState("")
  const [comments, setComments] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!assignment) return
    setRepo(assignment.repoUrl ?? "")
    setComments("")
    setFile(null)
    setRepoError(null)
    setFormError(null)
    setLoading(false)
  }, [assignment])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!shown) return
    const url = repo.trim()
    if (url && !GITHUB.test(url)) {
      setRepoError("Use a GitHub link like https://github.com/you/project")
      return
    }
    if (!url && !file) {
      setFormError("Add a repository link or attach a file.")
      return
    }
    setLoading(true)
    setTimeout(() => {
      const note = [comments.trim(), file ? `Attached: ${file.name} (${fileSize(file.size)})` : ""].filter(Boolean).join("\n")
      onSubmit(shown.id, url, note)
      onClose()
    }, 650)
  }

  const takeFile = (f: File | undefined | null) => {
    if (!f) return
    setFile(f)
    setFormError(null)
  }

  return (
    <Dialog open={!!assignment} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {shown && (
          <form onSubmit={submit} className="grid gap-5" noValidate>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="primary">{shown.course}</Badge>
                <Badge tone="warning">Due {shown.dueDate}</Badge>
              </div>
              <DialogTitle className="mt-1">{shown.title}</DialogTitle>
              <DialogDescription>{shown.description}</DialogDescription>
            </DialogHeader>

            <Field label="GitHub repository" hint="Public or shared with your instructor." error={repoError}>
              <Input
                leading={<GitBranch aria-hidden="true" />}
                placeholder="https://github.com/you/project"
                value={repo}
                inputMode="url"
                onChange={(e) => {
                  setRepo(e.target.value)
                  setRepoError(null)
                  setFormError(null)
                }}
              />
            </Field>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground" id="attach-label">
                Attachment
              </span>
              <label
                aria-labelledby="attach-label"
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  takeFile(e.dataTransfer.files?.[0])
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-[border-color,background-color] duration-150",
                  dragging ? "border-primary bg-primary-soft" : "border-border-strong/60 hover:border-primary-border hover:bg-surface-2",
                )}
              >
                <motion.span animate={{ y: dragging ? -3 : 0, scale: dragging ? 1.08 : 1 }} transition={transition.fast} className="flex text-primary-text">
                  <UploadCloud className="h-6 w-6" aria-hidden="true" />
                </motion.span>
                <span className="text-sm text-foreground">
                  Drop a file here or <span className="font-medium text-primary-text">browse</span>
                </span>
                <span className="text-caption text-muted-foreground">.zip, .ipynb, .pdf or .py up to 50 MB</span>
                <input type="file" className="sr-only" accept=".zip,.ipynb,.pdf,.py,.tar,.gz" onChange={(e) => takeFile(e.target.files?.[0])} />
              </label>
              <AnimatePresence initial={false}>
                {file && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={transition.fast}
                    className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2"
                  >
                    <FileArchive className="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
                    <span className="text-caption tabular-nums text-muted-foreground">{fileSize(file.size)}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => setFile(null)}>
                      <X aria-hidden="true" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Field label="Notes for the evaluator" hint="Optional. Mention anything incomplete or worth a look.">
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="How to run it, design choices, known gaps…" />
            </Field>

            <AnimatePresence initial={false}>
              {formError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={transition.fast}
                  role="alert"
                  className="text-caption font-medium text-danger"
                >
                  {formError}
                </motion.p>
              )}
            </AnimatePresence>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" loading={loading}>
                {loading ? "Submitting…" : "Submit work"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
