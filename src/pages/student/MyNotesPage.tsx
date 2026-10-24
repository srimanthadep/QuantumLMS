import { useState, useMemo } from "react"
import { Icon } from "../../components/Icon"
import type { NoteItem } from "./studentTypes"
import { initialNotesList } from "./studentMockData"

interface MyNotesPageProps {
  onToast: (msg: string) => void
}

export function MyNotesPage({ onToast }: MyNotesPageProps) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotesList)
  const [selectedTag, setSelectedTag] = useState<string>("All")
  const [search, setSearch] = useState("")
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null)

  // New Note form state
  const [newTitle, setNewTitle] = useState("")
  const [newCourse, setNewCourse] = useState("Generative AI Masterclass")
  const [newContent, setNewContent] = useState("")
  const [newSnippet, setNewSnippet] = useState("")
  const [newTagsStr, setNewTagsStr] = useState("")

  const allTags = useMemo(() => {
    const set = new Set<string>()
    notes.forEach((n) => n.tags.forEach((t) => set.add(t)))
    return ["All", ...Array.from(set)]
  }, [notes])

  const filtered = useMemo(() => {
    let list = notes
    if (selectedTag !== "All") {
      list = list.filter((n) => n.tags.includes(selectedTag))
    }
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.course.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }, [notes, selectedTag, search])

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const tags = newTagsStr
      ? newTagsStr
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : ["General"]
    const item: NoteItem = {
      id: `nt-${Date.now()}`,
      title: newTitle,
      course: newCourse,
      lastModified: "Just now",
      content: newContent,
      snippet: newSnippet || undefined,
      tags,
    }
    setNotes([item, ...notes])
    setIsCreateModalOpen(false)
    setNewTitle("")
    setNewContent("")
    setNewSnippet("")
    setNewTagsStr("")
    onToast(`Study note "${item.title}" created successfully! 📝`)
  }

  const handleDeleteNote = (id: string, title: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    if (activeNote?.id === id) setActiveNote(null)
    onToast(`Deleted note "${title}".`)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header Panel */}
      <section className="panel" aria-label="Notes Header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="card-title">My Study Notes & Code Snippets</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                {notes.length} Notes Saved
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Personalized lecture annotations, mathematical formulas, code
              templates, and review guides.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const mdContent =
                  "# Quantum School of AI - Student Study Notes\n\n" +
                  `Student: Srimanth | Exported: ${new Date().toLocaleDateString()}\n\n` +
                  notes
                    .map(
                      (n) =>
                        `## ${n.title}\n**Course:** ${n.course} | **Tags:** ${n.tags.join(", ")} | **Last Modified:** ${n.lastModified}\n\n${n.content}\n` +
                        (n.snippet ? `\n\`\`\`python\n${n.snippet}\n\`\`\`\n` : "") +
                        "\n---\n",
                    )
                    .join("\n")
                const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = "Quantum_Study_Notes_Srimanth.md"
                a.click()
                URL.revokeObjectURL(url)
                onToast("Study notes exported as Markdown notebook (.md)! 📝")
              }}
              className="px-3.5 py-1.5 rounded-full border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Export Notes (.md)
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-1.5 rounded-full bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>+ New Note</span>
            </button>
          </div>
        </div>

        {/* Filter Tags & Search */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="filter-pills overflow-x-auto pb-1 sm:pb-0">
            {allTags.map((tag) => (
              <button
                key={tag}
                className={`filter-pill ${selectedTag === tag ? "active" : ""}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
              <Icon name="search" size={13} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes or snippets..."
              className="w-full pl-8 pr-7 py-1 rounded-full text-xs bg-zinc-50 border border-zinc-200 focus:outline-none focus:border-purple-500 focus:bg-white"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-2 flex items-center text-xs text-zinc-400 hover:text-zinc-700"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((note) => (
          <div
            key={note.id}
            onClick={() => setActiveNote(note)}
            className="panel p-5 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer border border-zinc-100"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                  {note.course}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {note.lastModified}
                </span>
              </div>

              <h4 className="font-bold text-base text-zinc-900 mb-2 leading-snug">
                {note.title}
              </h4>

              <p className="text-xs text-zinc-600 leading-relaxed mb-3 line-clamp-3">
                {note.content}
              </p>

              {/* Code Snippet Preview if present */}
              {note.snippet && (
                <div className="p-3 bg-zinc-900 text-purple-300 font-mono text-[11px] rounded-xl mb-3 overflow-x-auto border border-zinc-800">
                  <pre>{note.snippet}</pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <div className="flex flex-wrap gap-1">
                {note.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              <div
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    if (note.snippet) {
                      navigator.clipboard?.writeText(note.snippet)
                      onToast("Code snippet copied to clipboard!")
                    } else {
                      navigator.clipboard?.writeText(note.content)
                      onToast("Note text copied to clipboard!")
                    }
                  }}
                  className="px-2.5 py-1 rounded-full border border-zinc-200 text-[11px] font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                  title="Copy Content"
                >
                  Copy
                </button>
                <button
                  onClick={() => handleDeleteNote(note.id, note.title)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-xs cursor-pointer"
                  title="Delete Note"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note View / Edit Modal */}
      {activeNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setActiveNote(null)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {activeNote.course}
                </span>
                <h3 className="font-bold text-lg text-zinc-900">
                  {activeNote.title}
                </h3>
                <span className="text-[11px] text-zinc-400">
                  Modified: {activeNote.lastModified}
                </span>
              </div>
              <button
                onClick={() => setActiveNote(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs mb-6">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 leading-relaxed text-zinc-800">
                {activeNote.content}
              </div>

              {activeNote.snippet && (
                <div>
                  <div className="flex justify-between items-center text-xs text-zinc-500 mb-1 font-bold">
                    <span>Executable Code Snippet:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(activeNote.snippet || "")
                        onToast("Code snippet copied!")
                      }}
                      className="text-purple-700 hover:underline cursor-pointer"
                    >
                      Copy Snippet
                    </button>
                  </div>
                  <pre className="p-4 bg-zinc-950 text-purple-200 font-mono rounded-2xl text-[11px] overflow-x-auto border border-zinc-800">
                    {activeNote.snippet}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveNote(null)}
                className="px-4 py-2 rounded-full border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onToast(`Exporting note "${activeNote.title}" as PDF...`)
                  setActiveNote(null)
                }}
                className="px-5 py-2 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 cursor-pointer shadow-sm text-xs"
              >
                Download Note PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-3xl shadow-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  New Study Note
                </span>
                <h3 className="font-bold text-lg text-zinc-900">
                  Create Lecture Annotation
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 cursor-pointer"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateNote}
              className="flex flex-col gap-3 text-xs"
            >
              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Cosine Similarity vs Dot Product Analysis"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Subject Course
                </label>
                <select
                  value={newCourse}
                  onChange={(e) => setNewCourse(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                >
                  <option value="Generative AI Masterclass">
                    Generative AI Masterclass
                  </option>
                  <option value="Python for AI">Python for AI</option>
                  <option value="Machine Learning Foundations">
                    Machine Learning Foundations
                  </option>
                  <option value="AI Agents Bootcamp">AI Agents Bootcamp</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Lecture Notes / Observations
                </label>
                <textarea
                  required
                  rows={4}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Summarize key takeaways, mathematical insights, or lecture questions..."
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Python / Code Snippet (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newSnippet}
                  onChange={(e) => setNewSnippet(e.target.value)}
                  placeholder="def cosine_sim(a, b): return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))"
                  className="w-full p-2.5 rounded-xl font-mono text-[11px] border border-zinc-200 bg-zinc-50 text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">
                  Tags (Comma-separated)
                </label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={(e) => setNewTagsStr(e.target.value)}
                  placeholder="RAG, Math, Transformers"
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-zinc-200 font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-purple-700 text-white font-bold hover:bg-purple-800 cursor-pointer shadow-sm"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
