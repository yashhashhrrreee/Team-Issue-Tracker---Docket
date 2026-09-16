// Database.md: ISSUE.number is a real per-project sequence (assigned via
// an atomic PROJECT.next_issue_number increment), not a derived value —
// "KEY-142" is just key + number, same as the mockups show.
export function formatTicketId(projectKey: string, issueNumber: number): string {
  return `${projectKey.toUpperCase()}-${issueNumber}`;
}
