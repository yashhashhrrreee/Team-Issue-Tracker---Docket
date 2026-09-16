export type Role = "Owner" | "Manager" | "Leader" | "Developer";
export type IssueStatus = "Open" | "In Progress" | "Done";
export type IssuePriority = "Low" | "Medium" | "High" | "Urgent";
export type IssueCategory = "Technical" | "Managerial" | "Decision";

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  key: string;
  created_at: string;
  role?: Role;
}

export interface Issue {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  category: IssueCategory;
  status: IssueStatus;
  priority: IssuePriority;
  reporter_id: string;
  assignee_id: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}
