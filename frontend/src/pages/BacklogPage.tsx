import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { listIssues } from "../api/issues";
import { listMembers } from "../api/members";
import { getProject } from "../api/projects";
import { IssueFilterBar, type Filters } from "../components/IssueFilterBar";
import { IssueTable } from "../components/IssueTable";
import { NavTabs } from "../components/NavTabs";
import { ProjectTopBar } from "../components/ProjectTopBar";
import type { IssueCategory, IssuePriority, IssueStatus } from "../api/types";

const EMPTY_FILTERS: Filters = { assignee_id: "", priority: "", category: "", status: "", search: "" };

export function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState("-updated_at");

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
  const { data: issues } = useQuery({
    queryKey: ["issues", projectId, filters, sort],
    queryFn: () =>
      listIssues(projectId!, {
        assignee_id: filters.assignee_id || undefined,
        priority: (filters.priority || undefined) as IssuePriority | undefined,
        category: (filters.category || undefined) as IssueCategory | undefined,
        status: (filters.status || undefined) as IssueStatus | undefined,
        search: filters.search || undefined,
        sort,
      }),
    enabled: Boolean(projectId),
  });

  const usernameOf = useMemo(() => {
    const map = new Map(members?.map((m) => [m.id, m.username]) ?? []);
    return (userId: string | null) => (userId ? map.get(userId) ?? null : null);
  }, [members]);

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (!project) return null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar projectName={project.name} projectKey={project.key} />
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-12">
        <NavTabs projectId={projectId!} />
        <IssueFilterBar filters={filters} onChange={setFilters} members={members ?? []} sort={sort} onSortChange={setSort} />
        <div className="pb-8">
          {issues && (
            <IssueTable
              issues={issues}
              projectKey={project.key}
              usernameOf={usernameOf}
              sort={sort}
              onSortChange={setSort}
            />
          )}
          {issues?.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <span className="font-body text-[15px] text-ink-soft">
                {hasActiveFilters ? "No tickets match your filters." : "No tickets yet."}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="font-body text-[13px] font-semibold text-ink hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
