export function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// Solved Issues uses the spelled-out form ("2 days ago"), distinct from
// the compact "2h ago"/"2d ago" used on Board/Ticket Detail/Backlog —
// this page is meant to read as editorial, not a dense tracker row.
export function relativeDays(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.max(1, Math.round(diffMs / 86400000));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
