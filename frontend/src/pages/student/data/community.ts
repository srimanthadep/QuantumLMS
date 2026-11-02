import { api, type Tables } from "@/lib/api"

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
  return api.get<CommunityData>("/student/community")
}

export async function createPost(channel: string, title: string, content: string): Promise<PostRow> {
  return api.post<PostRow>("/student/community/posts", { channel, title: title.trim(), content: content.trim() }, "Your post couldn't be published.")
}

export async function deletePost(id: string) {
  await api.del(`/student/community/posts/${encodeURIComponent(id)}`, "The post couldn't be deleted.")
}

export async function replyToPost(postId: string, body: string): Promise<ReplyRow> {
  return api.post<ReplyRow>(`/student/community/posts/${encodeURIComponent(postId)}/replies`, { body: body.trim() }, "Your reply couldn't be posted.")
}

export async function deleteReply(id: string) {
  await api.del(`/student/community/replies/${encodeURIComponent(id)}`, "The reply couldn't be deleted.")
}

export const setLike = (postId: string, on: boolean) => api.put(`/student/community/posts/${encodeURIComponent(postId)}/like`, { on })
export const setSave = (postId: string, on: boolean) => api.put(`/student/community/posts/${encodeURIComponent(postId)}/save`, { on })

export async function setSquadMember(squadId: string, on: boolean) {
  await api.put(`/student/squads/${encodeURIComponent(squadId)}/membership`, { on })
}
