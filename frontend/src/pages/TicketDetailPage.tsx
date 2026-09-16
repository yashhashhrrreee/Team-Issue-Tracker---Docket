import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { me } from "../api/auth";
import { createComment } from "../api/comments";
import { changeIssueStatus, deleteIssue, getIssue } from "../api/issues";
import { listMembers } from "../api/members";
import { getProject } from "../api/projects";
import { AssigneeAvatar } from "../components/AssigneeAvatar";
import { CategoryTag } from "../components/CategoryTag";
import { NavTabs } from "../components/NavTabs";
import { PriorityTag } from "../components/PriorityTag";
import { ProjectTopBar } from "../components/ProjectTopBar";
import { ResolveModal } from "../components/ResolveModal";
import { StatusPill } from "../components/StatusPill";
import type { IssueStatus } from "../api/types";
import { describeActivity } from "../lib/activity";
import { relativeTime, shortDate } from "../lib/time";
import { formatTicketId } from "../lib/ticketId";

const STATUSES: IssueStatus[] = ["Open", "In Progress", "Done"];

export function TicketDetailPage() {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resolveOpen, setResolveOpen] = useState(false);
  const [commentBody, setCommentBody] = useState("");

  const { data: issue } = useQuery({
    queryKey: ["issue", issueId],
    queryFn: () => getIssue(issueId!),
    enabled: Boolean(issueId),
  });

  const { data: members } = useQuery({
    queryKey: ["members", issue?.project_id],
    queryFn: () => listMembers(issue!.project_id),
    enabled: Boolean(issue?.project_id),
  });

  const { data: project } = useQuery({
    queryKey: ["project", issue?.project_id],
    queryFn: () => getProject(issue!.project_id),
    enabled: Boolean(issue?.project_id),
  });

  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: me });

  const usernameOf = useMemo(() => {
    const map = new Map(members?.map((m) => [m.id, m.username]) ?? []);
    return (userId: string | null) => (userId ? map.get(userId) ?? "someone" : null);
  }, [members]);

  const statusMutation = useMutation({
    mutationFn: (vars: { status: IssueStatus; resolution_note?: string }) =>
      changeIssueStatus(issueId!, vars.status, vars.resolution_note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      setResolveOpen(false);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => createComment(issueId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      setCommentBody("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteIssue(issueId!),
    onSuccess: () => navigate(issue ? `/projects/${issue.project_id}/board` : "/projects"),
  });

  if (!issue) return null;

  const reporterName = usernameOf(issue.reporter_id);
  const assigneeName = usernameOf(issue.assignee_id);

  function handleStatusClick(status: IssueStatus) {
    if (status === issue!.status) return;
    if (status === "Done") {
      setResolveOpen(true);
    } else {
      statusMutation.mutate({ status });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar projectName={project?.name} projectKey={project?.key} />
      <div className="mx-auto w-full max-w-[1080px] px-4 sm:px-12">
        <NavTabs projectId={issue.project_id} />
      </div>

      <div className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 sm:px-12 sm:py-8">
        <div className="mb-1.5 flex items-start justify-between">
          <span className="font-mono text-[13px] tracking-[0.08em] text-ink-soft">
            {project ? formatTicketId(project.key, issue.number) : "…"}
          </span>
          <div className="flex items-center gap-4 sm:gap-[18px]">
            <button className="font-body text-[13px] font-semibold text-ink hover:underline">
              Edit
            </button>
            <button
              onClick={() => deleteMutation.mutate()}
              className="font-body text-[13px] font-semibold text-red hover:underline"
            >
              Delete
            </button>
          </div>
        </div>

        <h1 className="mb-4 font-heading text-[21px] font-semibold text-ink sm:mb-[18px] sm:text-[28px]">
          {issue.title}
        </h1>

        <div className="mb-[18px] flex flex-wrap items-center gap-2 sm:mb-6">
          <StatusPill status={issue.status} />
          <PriorityTag level={issue.priority} />
          <CategoryTag category={issue.category} />
        </div>

        <div className="mb-[18px] flex flex-col gap-2.5 border-t border-b border-rule py-3.5 sm:mb-6 sm:flex-row sm:items-center sm:gap-8 sm:py-4">
          <div className="flex items-center gap-2.5">
            <AssigneeAvatar username={reporterName} size="md" />
            <div className="sm:hidden">
              <span className="font-body text-xs text-ink-soft">Reported by {reporterName}</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-mono text-[9px] tracking-[0.08em] text-ink-soft uppercase">
                Reporter
              </div>
              <div className="font-body text-[13px] text-ink">{reporterName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <AssigneeAvatar username={assigneeName} size="md" />
            <div className="sm:hidden">
              <span className="font-body text-xs text-ink-soft">
                {assigneeName ? `Assigned to ${assigneeName}` : "Unassigned"}
              </span>
            </div>
            <div className="hidden sm:block">
              <div className="font-mono text-[9px] tracking-[0.08em] text-ink-soft uppercase">
                Assignee
              </div>
              <div className="font-body text-[13px] text-ink">{assigneeName ?? "Unassigned"}</div>
            </div>
          </div>
          <div className="font-mono text-[10px] text-ink-soft sm:ml-auto sm:text-[11px]">
            Created {shortDate(issue.created_at)} · Updated {relativeTime(issue.updated_at)}
          </div>
        </div>

        <div className="mb-[18px] flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:gap-3">
          <span className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase sm:text-[11px]">
            Status
          </span>
          <div className="flex border border-rule">
            {STATUSES.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusClick(status)}
                className={`flex-1 border-r border-rule px-3 py-2 font-body text-[11px] whitespace-nowrap last:border-r-0 sm:flex-none sm:px-5 sm:text-[13px] ${
                  status === issue.status
                    ? "bg-ink font-semibold text-paper"
                    : "text-ink-soft hover:bg-paper-raised"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-7 max-w-[640px] font-body text-sm leading-[1.55] text-ink sm:mb-10 sm:text-[15px] sm:leading-[1.6]">
          {issue.description}
        </p>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[1fr_1.2fr] sm:gap-10">
          <div>
            <div className="mb-3 font-mono text-[11px] tracking-[0.1em] text-ink-soft uppercase sm:mb-4 sm:text-xs">
              Activity
            </div>
            <div className="flex flex-col border-l border-rule pl-3.5 sm:pl-[18px]">
              {[...issue.activity].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="py-2 font-mono text-[11px] text-ink-soft sm:py-[9px] sm:text-xs"
                >
                  {describeActivity(entry, usernameOf(entry.actor_id) ?? "someone")} ·{" "}
                  {relativeTime(entry.created_at)}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3.5 font-mono text-[11px] tracking-[0.1em] text-ink uppercase sm:mb-4 sm:text-xs">
              Comments
            </div>

            <div className="mb-4 flex flex-col gap-4 sm:mb-5 sm:gap-5">
              {issue.comments.map((comment) => {
                const authorName = usernameOf(comment.author_id) ?? "someone";
                return (
                  <div key={comment.id} className="flex gap-2.5 sm:gap-3">
                    <AssigneeAvatar username={authorName} size="lg" />
                    <div>
                      <div className="mb-1 flex items-baseline gap-1.5 sm:gap-2">
                        <span className="font-body text-xs font-semibold text-ink sm:text-[13px]">
                          {authorName}
                        </span>
                        <span className="font-body text-[11px] text-ink-soft sm:text-xs">
                          {relativeTime(comment.created_at)}
                        </span>
                      </div>
                      <div className="font-body text-[13px] leading-[1.5] text-ink sm:text-sm">
                        {comment.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-2.5 border-t border-rule pt-3.5 sm:gap-3 sm:pt-4">
              <AssigneeAvatar username={currentUser?.username ?? null} size="lg" />
              <div className="flex-1">
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={2}
                  placeholder="Add a comment…"
                  className="w-full resize-none border border-rule bg-paper-raised p-2.5 font-body text-sm text-ink outline-none focus:border-ink"
                />
                <button
                  onClick={() => commentBody.trim() && commentMutation.mutate(commentBody)}
                  className="mt-2 w-full bg-ink px-[18px] py-2 font-body text-[13px] font-semibold text-paper hover:bg-[#15213A] sm:w-auto"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResolveModal
        open={resolveOpen}
        ticketLabel={project ? formatTicketId(project.key, issue.number) : "…"}
        isSubmitting={statusMutation.isPending}
        onSubmit={(note) => statusMutation.mutate({ status: "Done", resolution_note: note })}
        onCancel={() => setResolveOpen(false)}
      />
    </div>
  );
}
