import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Code2, Download, FilePlus2, Hash, NotebookPen, Pencil, Pin, PinOff, Search, Trash2, Undo2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { spring, transition } from "@/lib/motion"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
} from "@/components/ui"
import CopyButton from "@/components/student/CopyButton"
import type { NoteItem } from "./studentTypes"
import { initialNotesList, initialStudentCourses } from "./studentMockData"
import { downloadTextFile } from "./studentUtils"

interface MyNotesPageProps {
  onToast: (msg: string) => void
}

type Note = NoteItem & { pinned?: boolean }

const STORAGE_KEY = "quantum_student_notes_v2"
const COURSES = initialStudentCourses.map((c) => c.title)

function loadNotes(): Note[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Note[]
  } catch {
    // fall through to seed data
  }
  return initialNotesList.map((n, i) => ({ ...n, pinned: i === 0 }))
}

const EMPTY = { title: "", course: COURSES[0] ?? "", tags: "", content: "", snippet: "" }

export default function MyNotesPage({ onToast }: MyNotesPageProps) {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [query, setQuery] = useState("")
  const [course, setCourse] = useState("all")
  const [tag, setTag] = useState<string | null>(null)
  const [editing, setEditing] = useState<Note | "new" | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [titleError, setTitleError] = useState<string | null>(null)
  const [trash, setTrash] = useState<{ note: Note; index: number } | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    } catch {
      // storage unavailable; notes stay in memory
    }
  }, [notes])

  useEffect(() => {
    if (!trash) return
    const t = setTimeout(() => setTrash(null), 5000)
    return () => clearTimeout(t)
  }, [trash])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    notes.forEach((n) => n.tags.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [notes])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return notes
      .filter((n) => course === "all" || n.course === course)
      .filter((n) => !tag || n.tags.includes(tag))
      .filter((n) => !q || [n.title, n.content, n.snippet ?? "", n.tags.join(" ")].some((v) => v.toLowerCase().includes(q)))
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned))
  }, [notes, course, tag, query])

  const openEditor = (n: Note | "new") => {
    setEditing(n)
    setTitleError(null)
    setForm(n === "new" ? EMPTY : { title: n.title, course: n.course, tags: n.tags.join(", "), content: n.content, snippet: n.snippet ?? "" })
  }

  const save = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!form.title.trim()) {
      setTitleError("Give the note a title.")
      return
    }
    const data = {
      title: form.title.trim(),
      course: form.course,
      content: form.content.trim(),
      snippet: form.snippet.trim() || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
      lastModified: "Just now",
    }
    if (editing === "new") {
      setNotes((list) => [{ id: `nt-${Date.now()}`, ...data }, ...list])
      onToast("Note created")
    } else if (editing) {
      setNotes((list) => list.map((n) => (n.id === editing.id ? { ...n, ...data } : n)))
      onToast("Note saved")
    }
    setEditing(null)
  }

  const remove = (n: Note) => {
    const index = notes.findIndex((x) => x.id === n.id)
    setNotes((list) => list.filter((x) => x.id !== n.id))
    setTrash({ note: n, index })
  }
  const undo = () => {
    if (!trash) return
    setNotes((list) => {
      const next = [...list]
      next.splice(Math.min(trash.index, next.length), 0, trash.note)
      return next
    })
    setTrash(null)
  }
  const togglePin = (id: string) => setNotes((list) => list.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)))

  const exportMd = () => {
    const md = visible
      .map((n) => [`## ${n.title}`, `_${n.course} · ${n.lastModified}_`, "", n.content, n.snippet ? `\n\`\`\`python\n${n.snippet}\n\`\`\`` : "", n.tags.length ? `\nTags: ${n.tags.map((t) => `#${t}`).join(" ")}` : ""].join("\n"))
      .join("\n\n---\n\n")
    downloadTextFile(`# Study notes\n\n${md}\n`, "Quantum_Study_Notes.md", "text/markdown;charset=utf-8")
    onToast(`Exported ${visible.length} note${visible.length === 1 ? "" : "s"} as Markdown`)
  }

  const filtersActive = !!query || course !== "all" || !!tag

  return (
    <div className="flex flex-col">
      <PageHeader
        eyebrow="Study notes"
        title="Notes"
        description="Lecture annotations, formulas and code snippets, saved on this device."
        actions={
          <>
            <Button variant="outline" leftIcon={<Download aria-hidden="true" />} onClick={exportMd} disabled={visible.length === 0}>
              Export .md
            </Button>
            <Button leftIcon={<FilePlus2 aria-hidden="true" />} onClick={() => openEditor("new")}>
              New note
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="Search notes"
          placeholder="Search titles, content, code and tags"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search aria-hidden="true" />}
          trailing={
            query ? (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="flex rounded p-0.5 hover:text-foreground">
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null
          }
          wrapperClassName="sm:max-w-md"
        />
        <Select value={course} onValueChange={setCourse}>
          <SelectTrigger aria-label="Filter by course" className="sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {COURSES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="no-scrollbar mb-5 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Filter by tag">
        {tags.map(([t, count]) => {
          const active = tag === t
          return (
            <motion.button
              key={t}
              type="button"
              aria-pressed={active}
              onClick={() => setTag(active ? null : t)}
              whileTap={{ scale: 0.94 }}
              transition={spring.snappy}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-caption font-medium transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:border-border-strong/60 hover:text-foreground",
              )}
            >
              <Hash className="h-3 w-3" aria-hidden="true" />
              {t}
              <span className={cn("tabular-nums", active ? "text-primary-foreground" : "text-subtle-foreground")}>{count}</span>
            </motion.button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<NotebookPen aria-hidden="true" />}
          title={filtersActive ? "No notes match" : "No notes yet"}
          description={filtersActive ? "Try another search or clear the filters." : "Capture formulas, insights and code while you learn."}
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("")
                  setCourse("all")
                  setTag(null)
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button size="sm" onClick={() => openEditor("new")}>
                Write your first note
              </Button>
            )
          }
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((n) => (
              <motion.article
                key={n.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: transition.fast }}
                transition={transition.base}
                className={cn(
                  "group flex flex-col gap-3 rounded-lg border bg-surface p-5 shadow-[var(--elev-xs)] transition-[border-color,box-shadow] duration-200 hover:shadow-[var(--elev-md)]",
                  n.pinned ? "border-primary-border" : "border-border hover:border-border-strong/60",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge tone="neutral" className="max-w-full">
                      <span className="truncate">{n.course}</span>
                    </Badge>
                    <h3 className="mt-2 text-[15px] font-semibold leading-6 text-foreground">{n.title}</h3>
                  </div>
                  <div className="-mr-2 -mt-1 flex shrink-0 items-center opacity-100 transition-opacity duration-150 focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <Tooltip content={n.pinned ? "Unpin" : "Pin to top"}>
                      <Button variant="ghost" size="icon-sm" aria-label={n.pinned ? "Unpin note" : "Pin note"} aria-pressed={!!n.pinned} onClick={() => togglePin(n.id)}>
                        {n.pinned ? <PinOff aria-hidden="true" /> : <Pin aria-hidden="true" />}
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit">
                      <Button variant="ghost" size="icon-sm" aria-label="Edit note" onClick={() => openEditor(n)}>
                        <Pencil aria-hidden="true" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button variant="ghost" size="icon-sm" aria-label="Delete note" onClick={() => remove(n)} className="hover:text-danger">
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                {n.content && <p className="text-sm leading-6 text-muted-foreground">{n.content}</p>}
                {n.snippet && (
                  <div className="relative overflow-hidden rounded-md border border-border bg-ink-950">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-white/80">
                        <Code2 className="h-3 w-3" aria-hidden="true" /> python
                      </span>
                      <CopyButton text={n.snippet} size="icon-sm" className="h-6 w-6 text-white/80 hover:bg-white/10 hover:text-white" onCopied={() => onToast("Snippet copied")} />
                    </div>
                    <pre className="overflow-x-auto px-3 py-2.5 font-mono text-[12px] leading-5 text-white/90">
                      <code>{n.snippet}</code>
                    </pre>
                  </div>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {n.tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTag(t)}
                        className="rounded-full px-1.5 py-0.5 text-caption font-medium text-primary-text transition-colors hover:bg-primary-soft"
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-caption text-subtle-foreground">
                    {n.pinned && <Pin className="h-3 w-3 text-primary-text" aria-label="Pinned" />}
                    {n.lastModified}
                  </span>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <AnimatePresence>
        {trash && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 16, x: "-50%", transition: transition.fast }}
            transition={spring.soft}
            className="fixed bottom-6 left-1/2 z-40 flex items-center gap-3 rounded-lg border border-border bg-surface-3 py-2 pl-4 pr-2 text-sm text-foreground shadow-[var(--elev-lg)]"
          >
            <span>
              Deleted <span className="font-medium">“{trash.note.title.length > 32 ? `${trash.note.title.slice(0, 32)}…` : trash.note.title}”</span>
            </span>
            <Button size="sm" variant="secondary" leftIcon={<Undo2 aria-hidden="true" />} onClick={undo}>
              Undo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <form
            onSubmit={save}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault()
                save()
              }
            }}
            className="grid gap-4"
            noValidate
          >
            <DialogHeader>
              <DialogTitle>{editing === "new" ? "New note" : "Edit note"}</DialogTitle>
              <DialogDescription>Ctrl + S saves. Notes are stored on this device.</DialogDescription>
            </DialogHeader>
            <Field label="Title" required error={titleError}>
              <Input
                autoFocus
                value={form.title}
                onChange={(e) => {
                  setForm((f) => ({ ...f, title: e.target.value }))
                  setTitleError(null)
                }}
                placeholder="e.g. Attention as soft dictionary lookup"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Course">
                <Select value={form.course} onValueChange={(v) => setForm((f) => ({ ...f, course: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COURSES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tags" hint="Separate with commas">
                <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="RAG, Embeddings" />
              </Field>
            </div>
            <Field label="Note">
              <Textarea value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="What did you learn?" className="min-h-[110px]" />
            </Field>
            <Field label="Code snippet" hint="Optional">
              <Textarea
                value={form.snippet}
                onChange={(e) => setForm((f) => ({ ...f, snippet: e.target.value }))}
                placeholder="import numpy as np"
                spellCheck={false}
                className="min-h-[96px] font-mono text-[13px]"
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">{editing === "new" ? "Create note" : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
