import { api, type Tables } from "@/lib/api"

export type NoteRow = Tables<"notes">

export interface NoteInput {
  title: string
  course: string
  content: string
  snippet?: string | null
  tags: string[]
  pinned?: boolean
  lesson?: string | null
}

export async function loadNotes(): Promise<NoteRow[]> {
  return api.get<NoteRow[]>("/student/notes")
}

export async function createNote(input: NoteInput): Promise<NoteRow> {
  return api.post<NoteRow>(
    "/student/notes",
    { title: input.title, course: input.course, content: input.content, snippet: input.snippet ?? null, tags: input.tags, pinned: input.pinned ?? false, lesson: input.lesson ?? null },
    "The note couldn't be saved.",
  )
}

export async function updateNote(id: string, patch: Partial<NoteInput>): Promise<NoteRow> {
  return api.patch<NoteRow>(`/student/notes/${encodeURIComponent(id)}`, patch, "The note couldn't be saved.")
}

export async function deleteNote(id: string) {
  await api.del(`/student/notes/${encodeURIComponent(id)}`, "The note couldn't be deleted.")
}
