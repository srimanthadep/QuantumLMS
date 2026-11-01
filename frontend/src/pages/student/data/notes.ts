import { supabase, unwrap, type Tables } from "@/lib/supabase"

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
  return unwrap(await supabase.from("notes").select("*").order("updated_at", { ascending: false }))
}

export async function createNote(input: NoteInput): Promise<NoteRow> {
  return unwrap(
    await supabase
      .from("notes")
      .insert({ title: input.title, course: input.course, content: input.content, snippet: input.snippet ?? null, tags: input.tags, pinned: input.pinned ?? false, lesson: input.lesson ?? null })
      .select("*")
      .single(),
    "The note couldn't be saved.",
  )
}

export async function updateNote(id: string, patch: Partial<NoteInput>): Promise<NoteRow> {
  return unwrap(await supabase.from("notes").update(patch).eq("id", id).select("*").single(), "The note couldn't be saved.")
}

export async function deleteNote(id: string) {
  unwrap(await supabase.from("notes").delete().eq("id", id).select("id"), "The note couldn't be deleted.")
}
