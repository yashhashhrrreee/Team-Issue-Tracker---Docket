import { apiFetch } from "./client";
import type { Role } from "./types";

interface AcceptInviteResponse {
  project_id: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  status: "Pending";
  created_at: string;
}

export function acceptInvite(token: string, email: string) {
  return apiFetch<AcceptInviteResponse>("/api/invites/accept", {
    method: "POST",
    body: { token, email },
  });
}

export function createInvite(projectId: string, email: string, role: Role) {
  return apiFetch<{ id: string; token: string; email: string; role: Role }>(
    `/api/projects/${projectId}/invites`,
    { method: "POST", body: { email, role } }
  );
}

export function listInvites(projectId: string) {
  return apiFetch<PendingInvite[]>(`/api/projects/${projectId}/invites`);
}
