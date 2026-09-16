import type { IssueStatus } from "../api/types";

// Deliberately NOT color-coded per status — stays neutral ink outline
// regardless of which status is shown. Source Sans / normal case, per
// the Ticket Detail mockup (not mono/uppercase like Priority/Category).
export function StatusPill({ status }: { status: IssueStatus }) {
  return (
    <span className="inline-block border border-ink px-2.5 py-[3px] font-body text-xs text-ink">
      {status}
    </span>
  );
}
