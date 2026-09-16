import { apiFetch } from "./client";

export interface Notification {
  id: string;
  user_id: string;
  issue_id: string | null;
  type: "assigned" | "commented" | "status_changed" | "decision_needed" | string;
  read: boolean;
  created_at: string;
}

export function listNotifications() {
  return apiFetch<Notification[]>("/api/notifications");
}

export function markNotificationRead(id: string) {
  return apiFetch<Notification>(`/api/notifications/${id}`, { method: "PATCH", body: {} });
}
