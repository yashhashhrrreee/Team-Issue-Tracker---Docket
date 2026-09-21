import { useQueries, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getIssue, listIssues } from "../api/issues";
import { listMembers } from "../api/members";
import { getProject } from "../api/projects";
import { CategoryTag } from "../components/CategoryTag";
import { NavTabs } from "../components/NavTabs";
import { ProjectTopBar } from "../components/ProjectTopBar";
import { relativeDays } from "../lib/time";
import { formatTicketId } from "../lib/ticketId";

export function SolvedIssuesPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
  const { data: members } = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => listMembers(projectId!),
    enabled: Boolean(projectId),
  });
  const { data: doneIssues } = useQuery({
    queryKey: ["issues", projectId, "done-for-solved"],
    queryFn: () => listIssues(projectId!, { status: "Done", sort: "-updated_at" }),
    enabled: Boolean(projectId),
  });

  // Fetch full detail per resolved issue so "resolved by" reflects the
  // actual actor of the status->Done activity-log entry, not a proxy
  // like the assignee (who isn't necessarily who closed it).
  const detailQueries = useQueries({
    queries: (doneIssues ?? []).map((issue) => ({
      queryKey: ["issue", issue.id],
      queryFn: () => getIssue(issue.id),
      enabled: Boolean(doneIssues),
    })),
  });

  const usernameOf = (userId: string | null) => {
    const map = new Map(members?.map((m) => [m.id, m.username]) ?? []);
    return userId ? (map.get(userId) ?? "someone") : "someone";
  };

  const details = detailQueries.map((q) => q.data).filter(Boolean) as NonNullable<
    (typeof detailQueries)[number]["data"]
  >[];

  function resolvedByOf(detail: (typeof details)[number]) {
    const doneEntry = [...detail.activity]
      .reverse()
      .find((a) => a.event_type === "field_updated" && a.meta.field === "status" && a.meta.to === "Done");
    return usernameOf(doneEntry?.actor_id ?? detail.assignee_id);
  }

  if (!project) return null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar projectName={project.name} projectKey={project.key} />
      <div className="mx-auto w-full max-w-[820px] px-4 sm:px-12">
        <NavTabs projectId={projectId!} />
      </div>

      <div className="mx-auto w-full max-w-[820px] flex-1 px-4 py-6 sm:px-12 sm:py-9">
        <p className="mb-5 font-body text-[13px] text-ink-soft sm:mb-7 sm:text-sm">
          What's already been figured out, so nobody has to figure it out twice.
        </p>

        <div className="flex flex-col">
          {details.map((detail) => (
            <div key={detail.id} className="border-t py-[22px] last:border-b sm:py-7" style={{ borderColor: "#C9D2DE" }}>
              <div className="mb-1.5 flex items-baseline gap-2.5 sm:mb-2 sm:gap-3">
                <span className="font-mono text-[11px] text-ink-soft sm:text-xs">
                  {formatTicketId(project.key, detail.number)}
                </span>
                <CategoryTag category={detail.category} />
              </div>
              <div className="mb-2 font-heading text-lg font-semibold text-ink sm:mb-2.5 sm:text-[22px]">
                {detail.title}
              </div>
              <p className="mb-3 max-w-[640px] font-body text-[15px] leading-[1.55] text-ink sm:mb-3.5 sm:text-lg sm:leading-[1.6]">
                {detail.resolution_note}
              </p>
              <div className="font-body text-xs text-ink-soft sm:text-[13px]">
                Resolved by {resolvedByOf(detail)} · {relativeDays(detail.updated_at)}
              </div>
            </div>
          ))}
          {details.length === 0 && doneIssues?.length === 0 && (
            <p className="py-8 font-mono text-xs text-ink-soft uppercase">
              Nothing resolved yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
