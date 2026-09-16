import { apiFetch } from "./client";
import type { Role } from "./types";

export interface Member {
  id: string;
  username: string;
  email: string;
  role: Role;
  joined_at: string;
  open_ticket_count: number;
}

export function listMembers(projectId: string) {
  return apiFetch<Member[]>(`/api/projects/${projectId}/members`);
}
