import { supabase, unwrap, type Tables } from "@/lib/supabase"

export type NotificationRow = Tables<"notifications">

export async function loadNotifications(): Promise<NotificationRow[]> {
  return unwrap(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30))
}

export async function markNotificationRead(id: string) {
  unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).is("read_at", null).select("id"))
}

export async function markAllNotificationsRead() {
  unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).select("id"))
}
