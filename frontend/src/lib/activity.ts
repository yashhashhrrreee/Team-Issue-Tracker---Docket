import type { ActivityLogEntry } from "../api/issues";

// Turns a raw ACTIVITY_LOG row into the sentence shown on Ticket Detail's
// timeline, e.g. "jane.doe changed status from Open to In Progress".
export function describeActivity(entry: ActivityLogEntry, actorUsername: string): string {
  if (entry.event_type === "issue_created") {
    return `${actorUsername} raised this ticket`;
  }

  const field = entry.meta.field as string;
  const from = entry.meta.from;
  const to = entry.meta.to;

  if (field === "assignee_id") {
    return to ? `${actorUsername} reassigned this ticket` : `${actorUsername} unassigned this ticket`;
  }
  if (field === "resolution_note") {
    return `${actorUsername} added a resolution note`;
  }
  return `${actorUsername} changed ${field.replace(/_/g, " ")} from ${from ?? "—"} to ${to ?? "—"}`;
}
