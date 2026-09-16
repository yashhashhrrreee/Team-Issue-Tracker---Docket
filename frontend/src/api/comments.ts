import { apiFetch } from "./client";
import type { Comment } from "./issues";

export function createComment(issueId: string, body: string) {
  return apiFetch<Comment>(`/api/issues/${issueId}/comments`, { method: "POST", body: { body } });
}
