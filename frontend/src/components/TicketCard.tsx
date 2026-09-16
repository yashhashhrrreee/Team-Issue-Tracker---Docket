import type { IssueCategory, IssuePriority } from "../api/types";
import { AssigneeAvatar } from "./AssigneeAvatar";
import { CategoryTag } from "./CategoryTag";
import { PriorityTag } from "./PriorityTag";

const BORDER_CLASSES: Record<IssuePriority, string> = {
  Urgent: "border-l-red",
  High: "border-l-red",
  Medium: "border-l-blue",
  Low: "border-l-blue-light",
};

interface TicketCardProps {
  ticketId: string;
  title: string;
  priority: IssuePriority;
  category?: IssueCategory;
  assigneeUsername?: string | null;
  /** Member Profile groups cards per-person already — showing that
   * person's own avatar on every card is redundant, so this omits it. */
  hideAssignee?: boolean;
}

export function TicketCard({
  ticketId,
  title,
  priority,
  category,
  assigneeUsername = null,
  hideAssignee = false,
}: TicketCardProps) {
  return (
    <div className={`border-l-4 bg-paper-raised p-3.5 ${BORDER_CLASSES[priority]}`}>
      <div className="mb-1.5 font-mono text-[11px] text-ink-soft">{ticketId}</div>
      <p className="mb-3 font-body text-sm font-semibold text-ink">{title}</p>
      <div className="flex items-center gap-2">
        {category && <CategoryTag category={category} />}
        <PriorityTag level={priority} />
        {!hideAssignee && (
          <span className="ml-auto">
            <AssigneeAvatar username={assigneeUsername} />
          </span>
        )}
      </div>
    </div>
  );
}
