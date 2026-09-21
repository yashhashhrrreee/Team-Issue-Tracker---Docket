import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getIssue } from "../api/issues";
import { listNotifications, markNotificationRead, type Notification } from "../api/notifications";
import { getProject } from "../api/projects";
import { ProjectTopBar } from "../components/ProjectTopBar";
import { relativeTime } from "../lib/time";
import { formatTicketId } from "../lib/ticketId";

const TYPE_LABELS: Record<string, string> = {
  decision_needed: "Decision needed",
  assigned: "Assigned",
  commented: "Commented",
  status_changed: "Status changed",
};

export function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
  });

  const issueQueries = useQueries({
    queries: (notifications ?? [])
      .filter((n) => n.issue_id)
      .map((n) => ({
        queryKey: ["issue", n.issue_id],
        queryFn: () => getIssue(n.issue_id!),
      })),
  });

  const issueByNotifId = new Map(
    (notifications ?? [])
      .filter((n) => n.issue_id)
      .map((n, i) => [n.id, issueQueries[i]?.data])
  );

  const projectIds = [...new Set(issueQueries.map((q) => q.data?.project_id).filter(Boolean))] as string[];
  const projectQueries = useQueries({
    queries: projectIds.map((pid) => ({
      queryKey: ["project", pid],
      queryFn: () => getProject(pid),
    })),
  });
  const projectById = new Map(projectIds.map((pid, i) => [pid, projectQueries[i]?.data]));

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function handleClick(n: Notification) {
    if (!n.read) markRead.mutate(n.id);
    if (n.issue_id) navigate(`/issues/${n.issue_id}`);
  }

  function describe(n: Notification) {
    const issue = issueByNotifId.get(n.id);
    if (!issue) return "";
    const project = projectById.get(issue.project_id);
    const ticketId = project ? formatTicketId(project.key, issue.number) : "";
    if (n.type === "status_changed") return `${ticketId} moved to ${issue.status}`;
    return `${ticketId} — ${issue.title}`;
  }

  return (
    <div className="min-h-screen bg-paper">
      <ProjectTopBar />
      <div className="mx-auto w-full max-w-[620px] px-4 py-6 sm:px-12 sm:py-9">
        <h1 className="mb-4.5 font-heading text-xl font-semibold text-ink sm:mb-6 sm:text-2xl">
          Notifications
        </h1>

        <div className="flex flex-col">
          {notifications?.map((n) => {
            const isDecision = n.type === "decision_needed";
            const unread = !n.read;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className="flex items-start gap-3.5 border-t py-[15px] pl-3.5 text-left last:border-b sm:gap-4 sm:py-[18px] sm:pl-4"
                style={{
                  borderColor: "#C9D2DE",
                  borderLeftWidth: 3,
                  borderLeftColor: unread ? (isDecision ? "#B3352B" : "#1C2B4A") : "transparent",
                  backgroundColor: unread && isDecision ? "#FDF3F1" : "transparent",
                  opacity: unread ? 1 : 0.6,
                }}
              >
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline gap-1.5 sm:gap-2">
                    <span
                      className="font-mono text-[9px] font-semibold tracking-[0.06em] uppercase sm:text-[10px]"
                      style={{ color: isDecision && unread ? "#B3352B" : "#5B6B85" }}
                    >
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                    <span className="font-body text-[11px] text-ink-soft sm:text-xs">
                      {relativeTime(n.created_at)}
                    </span>
                  </div>
                  <div
                    className={`font-body text-sm sm:text-[15px] ${
                      n.type === "commented" || n.type === "status_changed"
                        ? "text-ink"
                        : "font-semibold text-ink"
                    }`}
                  >
                    {describe(n)}
                  </div>
                </div>
              </button>
            );
          })}
          {notifications?.length === 0 && (
            <p className="py-16 text-center font-body text-[15px] text-ink-soft">
              You're all caught up.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
