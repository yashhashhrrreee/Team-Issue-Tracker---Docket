import { apiFetch } from "./client";
import type { Project, IssueCategory, IssuePriority, IssueStatus } from "./types";

export interface ProjectMembership {
  id: string;
  user_id: string;
  project_id: string;
  role: string;
  board_view_preference: "tag" | "swimlane";
  joined_at: string;
}

export interface ProjectDetail extends Project {
  stats: {
    member_count: number;
    status_counts: Partial<Record<IssueStatus, number>>;
    category_counts: Partial<Record<IssueCategory, number>>;
  };
  folders: Array<{
    id: string;
    name: string;
    resources: Array<{ id: string; name: string; type: "link" | "file"; url: string; uploaded_by: string }>;
  }>;
  top_level_resources: Array<{ id: string; name: string; type: "link" | "file"; url: string }>;
  latest_issues: Array<{
    id: string;
    number: number;
    title: string;
    status: IssueStatus;
    priority: IssuePriority;
  }>;
  membership: ProjectMembership;
}

export function listProjects() {
  return apiFetch<Project[]>("/api/projects");
}

export function createProject(name: string, key: string, description?: string) {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: { name, key, description },
  });
}

export function getProject(projectId: string) {
  return apiFetch<ProjectDetail>(`/api/projects/${projectId}`);
}

export function updateBoardViewPreference(projectId: string, board_view_preference: "tag" | "swimlane") {
  return apiFetch<ProjectMembership>(`/api/projects/${projectId}/membership`, {
    method: "PATCH",
    body: { board_view_preference },
  });
}
