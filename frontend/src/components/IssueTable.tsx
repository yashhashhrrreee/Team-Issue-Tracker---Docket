import { Link } from "react-router-dom";
import { AssigneeAvatar } from "./AssigneeAvatar";
import { CategoryTag } from "./CategoryTag";
import { PriorityTag } from "./PriorityTag";
import { StatusPill } from "./StatusPill";
import type { Issue } from "../api/types";
import { relativeTime } from "../lib/time";
import { formatTicketId } from "../lib/ticketId";

interface IssueTableProps {
  issues: Issue[];
  projectKey: string;
  usernameOf: (userId: string | null) => string | null;
  showStatus?: boolean;
  sort: string;
  onSortChange: (sort: string) => void;
}

export function IssueTable({
  issues,
  projectKey,
  usernameOf,
  showStatus = true,
  sort,
  onSortChange,
}: IssueTableProps) {
  const desktopCols = showStatus
    ? "90px 1fr 130px 100px 110px 140px 110px"
    : "90px 1fr 100px 110px 140px 110px";

  function toggleSort() {
    onSortChange(sort === "-updated_at" ? "updated_at" : "-updated_at");
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <div
          className="grid items-center gap-3 border-b border-rule py-2.5"
          style={{ gridTemplateColumns: desktopCols }}
        >
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase">ID</span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase">Title</span>
          {showStatus && (
            <span className="font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase">
              Status
            </span>
          )}
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase">
            Priority
          </span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase">
            Category
          </span>
          <span className="font-mono text-[11px] tracking-[0.06em] text-ink-soft uppercase">
            Assignee
          </span>
          <button
            onClick={toggleSort}
            className="flex items-center gap-1 font-mono text-[11px] tracking-[0.06em] text-ink uppercase"
          >
            Updated <span className="text-[9px]">{sort.startsWith("-") ? "▾" : "▴"}</span>
          </button>
        </div>

        {issues.map((issue) => (
          <Link
            key={issue.id}
            to={`/issues/${issue.id}`}
            className="grid items-center gap-3 border-b border-rule py-3.5 last:border-b-0 hover:bg-paper-raised"
            style={{ gridTemplateColumns: desktopCols }}
          >
            <span className="font-mono text-xs text-ink-soft">
              {formatTicketId(projectKey, issue.number)}
            </span>
            <span className="font-body text-sm text-ink">{issue.title}</span>
            {showStatus && <StatusPill status={issue.status} />}
            <span className="w-fit">
              <PriorityTag level={issue.priority} />
            </span>
            <span className="w-fit">
              <CategoryTag category={issue.category} />
            </span>
            <div className="flex items-center gap-2">
              <AssigneeAvatar username={usernameOf(issue.assignee_id)} />
              <span className="font-body text-[13px] text-ink">
                {usernameOf(issue.assignee_id) ?? "Unassigned"}
              </span>
            </div>
            <span className="font-mono text-xs text-ink-soft">{relativeTime(issue.updated_at)}</span>
          </Link>
        ))}
      </div>

      {/* Mobile stacked rows */}
      <div className="flex flex-col sm:hidden">
        {issues.map((issue) => (
          <Link
            key={issue.id}
            to={`/issues/${issue.id}`}
            className="flex flex-col gap-1.5 border-b border-rule py-3.5 last:border-b-0"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[11px] text-ink-soft">
                {formatTicketId(projectKey, issue.number)}
              </span>
              <span className="font-mono text-[11px] text-ink-soft">
                {relativeTime(issue.updated_at)}
              </span>
            </div>
            <span className="font-body text-sm text-ink">{issue.title}</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {showStatus && <StatusPill status={issue.status} />}
              <PriorityTag level={issue.priority} />
              <CategoryTag category={issue.category} />
              <span className="ml-auto">
                <AssigneeAvatar username={usernameOf(issue.assignee_id)} size="sm" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
