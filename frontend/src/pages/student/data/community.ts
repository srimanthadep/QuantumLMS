import { supabase, unwrap, type Tables } from "@/lib/supabase"

export type PostRow = Tables<"community_posts">
export type ReplyRow = Tables<"post_replies">
export type SquadRow = Tables<"study_squads">

export interface CommunityData {
  posts: PostRow[]
  replies: ReplyRow[]
  liked: string[]
  saved: string[]
  squads: SquadRow[]
  joined: string[]
}

export async function loadCommunity(): Promise<CommunityData> {
  const [posts, replies, likes, saves, squads, members] = await Promise.all([
    supabase.from("community_posts").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("post_replies").select("*").order("created_at").limit(1000),
    supabase.from("post_likes").select("post_id"),
    supabase.from("post_saves").select("post_id"),
    supabase.from("study_squads").select("*").order("position"),
    supabase.from("squad_members").select("squad_id"),
  ])
  return {
    posts: unwrap(posts),
    replies: unwrap(replies),
    liked: unwrap(likes).map((l) => l.post_id),
    saved: unwrap(saves).map((s) => s.post_id),
    squads: unwrap(squads),
    joined: unwrap(members).map((m) => m.squad_id),
  }
}

export async function createPost(channel: string, title: string, content: string): Promise<PostRow> {
  return unwrap(await supabase.from("community_posts").insert({ channel, title: title.trim(), content: content.trim() }).select("*").single(), "Your post couldn't be published.")
}

export async function deletePost(id: string) {
  unwrap(await supabase.from("community_posts").delete().eq("id", id).select("id"), "The post couldn't be deleted.")
}

export async function replyToPost(postId: string, body: string): Promise<ReplyRow> {
  return unwrap(await supabase.from("post_replies").insert({ post_id: postId, body: body.trim() }).select("*").single(), "Your reply couldn't be posted.")
}

export async function deleteReply(id: string) {
  unwrap(await supabase.from("post_replies").delete().eq("id", id).select("id"), "The reply couldn't be deleted.")
}

/** Toggles the caller's row in a (post_id | squad_id, student_id) join table. */
async function toggleRow(table: "post_likes" | "post_saves", postId: string, on: boolean) {
  if (on) unwrap(await supabase.from(table).upsert({ post_id: postId }, { onConflict: "post_id,student_id", ignoreDuplicates: true }).select("post_id"))
  else unwrap(await supabase.from(table).delete().eq("post_id", postId).select("post_id"))
}

export const setLike = (postId: string, on: boolean) => toggleRow("post_likes", postId, on)
export const setSave = (postId: string, on: boolean) => toggleRow("post_saves", postId, on)

export async function setSquadMember(squadId: string, on: boolean) {
  if (on) unwrap(await supabase.from("squad_members").upsert({ squad_id: squadId }, { onConflict: "squad_id,student_id", ignoreDuplicates: true }).select("squad_id"))
  else unwrap(await supabase.from("squad_members").delete().eq("squad_id", squadId).select("squad_id"))
}
