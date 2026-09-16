import { apiFetch } from "./client";
import type { Issue, IssueCategory, IssuePriority, IssueStatus } from "./types";

export interface ActivityLogEntry {
  id: string;
  issue_id: string;
  actor_id: string;
  event_type: "issue_created" | "field_updated";
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Comment {
  id: string;
  issue_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface IssueDetail extends Issue {
  activity: ActivityLogEntry[];
  comments: Comment[];
}

export interface IssueFilters {
  status?: IssueStatus;
  priority?: IssuePriority;
  category?: IssueCategory;
  assignee_id?: string;
  search?: string;
  sort?: string;
}

export function listIssues(projectId: string, filters: IssueFilters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][]
  );
  const query = params.toString();
  return apiFetch<Issue[]>(`/api/projects/${projectId}/issues${query ? `?${query}` : ""}`);
}

export function createIssue(
  projectId: string,
  data: {
    title: string;
    description: string;
    category: IssueCategory;
    priority: IssuePriority;
    assignee_id?: string | null;
  }
) {
  return apiFetch<Issue>(`/api/projects/${projectId}/issues`, { method: "POST", body: data });
}

export function getIssue(issueId: string) {
  return apiFetch<IssueDetail>(`/api/issues/${issueId}`);
}

export function updateIssue(issueId: string, data: Partial<Issue>) {
  return apiFetch<Issue>(`/api/issues/${issueId}`, { method: "PATCH", body: data });
}

export function changeIssueStatus(issueId: string, status: IssueStatus, resolution_note?: string) {
  return apiFetch<Issue>(`/api/issues/${issueId}/status`, {
    method: "POST",
    body: { status, resolution_note },
  });
}

export function deleteIssue(issueId: string) {
  return apiFetch<{ ok: true }>(`/api/issues/${issueId}`, { method: "DELETE" });
}
