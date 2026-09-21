import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getProject } from "../api/projects";
import { AssigneeAvatar } from "../components/AssigneeAvatar";
import { NavTabs } from "../components/NavTabs";
import { ProjectTopBar } from "../components/ProjectTopBar";
import { TicketCard } from "../components/TicketCard";
import type { Issue, IssueStatus, Role } from "../api/types";
import { formatTicketId } from "../lib/ticketId";

interface MemberProfile {
  id: string;
  username: string;
  email: string;
  role: Role;
  issues_by_status: Record<IssueStatus, Issue[]>;
}

const STATUSES: IssueStatus[] = ["Open", "In Progress", "Done"];

function getMemberProfile(projectId: string, userId: string) {
  return apiFetch<MemberProfile>(`/api/projects/${projectId}/members/${userId}`);
}

export function MemberProfilePage() {
  const { projectId, userId } = useParams<{ projectId: string; userId: string }>();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
  const { data: profile } = useQuery({
    queryKey: ["memberProfile", projectId, userId],
    queryFn: () => getMemberProfile(projectId!, userId!),
    enabled: Boolean(projectId && userId),
  });

  if (!project || !profile) return null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar projectName={project.name} projectKey={project.key} />

      <div className="mx-auto w-full max-w-[820px] flex-1 px-4 py-5 sm:px-12 sm:py-9">
        <Link
          to={`/projects/${projectId}/team`}
          className="mb-5 inline-block font-body text-[13px] font-semibold text-ink-soft sm:mb-6"
        >
          ← Back to Team
        </Link>

        <div className="mb-7 flex items-center gap-4 sm:mb-8 sm:gap-5">
          <AssigneeAvatar username={profile.username} size="profile" />
          <div>
            <div className="font-heading text-xl font-semibold text-ink sm:text-[26px]">
              {profile.username}
            </div>
            <div className="font-body text-[13px] text-ink-soft sm:text-[15px]">{profile.role}</div>
          </div>
        </div>

        <div className="flex flex-col gap-[26px] sm:gap-8">
          {STATUSES.map((status) => {
            const issues = profile.issues_by_status[status] ?? [];
            return (
              <div key={status}>
                <div className="mb-3 flex items-baseline gap-2 sm:mb-3.5">
                  <span className="font-body text-[13px] font-semibold text-ink sm:text-sm">
                    {status}
                  </span>
                  <span className="font-mono text-[11px] text-ink-soft sm:text-xs">
                    {issues.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 sm:gap-3">
                  {issues.map((issue) => (
                    <Link key={issue.id} to={`/issues/${issue.id}`}>
                      <TicketCard
                        ticketId={formatTicketId(project.key, issue.number)}
                        title={issue.title}
                        priority={issue.priority}
                        category={issue.category}
                        hideAssignee
                      />
                    </Link>
                  ))}
                  {issues.length === 0 && (
                    <p className="font-mono text-xs text-ink-soft italic">No tickets</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
