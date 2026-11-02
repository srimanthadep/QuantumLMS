import { api, type Tables } from "@/lib/api"

export type NotificationRow = Tables<"notifications">

export async function loadNotifications(): Promise<NotificationRow[]> {
  return api.get<NotificationRow[]>("/student/notifications")
}

export async function markNotificationRead(id: string) {
  await api.post("/student/notifications/read", { id })
}

export async function markAllNotificationsRead() {
  await api.post("/student/notifications/read", {})
}
