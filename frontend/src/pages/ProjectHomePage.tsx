import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listMembers } from "../api/members";
import { getProject } from "../api/projects";
import { AssigneeAvatar } from "../components/AssigneeAvatar";
import { NavTabs } from "../components/NavTabs";
import { PriorityTag } from "../components/PriorityTag";
import { ProjectTopBar } from "../components/ProjectTopBar";
import { StatusPill } from "../components/StatusPill";
import type { IssueCategory, IssueStatus } from "../api/types";
import { formatTicketId } from "../lib/ticketId";

const STATUSES: IssueStatus[] = ["Open", "In Progress", "Done"];
const CATEGORIES: IssueCategory[] = ["Technical", "Managerial", "Decision"];

function MemberStack({ usernames, total }: { usernames: string[]; total: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex">
        {usernames.slice(0, 3).map((username, i) => (
          <span key={username} className={i > 0 ? "-ml-2" : ""}>
            <span className="block rounded-full border-[1.5px] border-paper">
              <AssigneeAvatar username={username} size="md" />
            </span>
          </span>
        ))}
      </div>
      <span className="font-body text-[13px] text-ink-soft">
        {total} member{total === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function StatGroup({ items }: { items: { value: number; label: string; color?: string }[] }) {
  return (
    <div className="flex items-center gap-[18px]">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-[5px]">
          <span
            className="font-mono text-[15px] font-semibold"
            style={{ color: item.color ?? "#1C2B4A" }}
          >
            {item.value}
          </span>
          <span className="font-body text-xs text-ink-soft">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function ResourceFolder({
  name,
  resources,
  defaultOpen,
}: {
  name: string;
  resources: { id: string; name: string; type: "link" | "file" }[];
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-t-0 border-rule first:border-t">
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between border-b border-rule px-[18px] py-3.5 text-left ${
          open ? "bg-paper-raised" : ""
        }`}
      >
        <span className="font-body text-sm font-semibold text-ink">{name}</span>
        <span className="font-mono text-[11px] text-ink-soft">{open ? "−" : "+"}</span>
      </button>
      {open &&
        resources.map((resource) => (
          <div
            key={resource.id}
            className="flex items-center gap-2.5 border-b border-rule py-3.5 pr-[18px] pl-[34px] last:border-b-0"
          >
            <span className={`font-mono text-[11px] ${resource.type === "link" ? "text-blue" : "text-ink-soft"}`}>
              {resource.type === "link" ? "⇗" : "▤"}
            </span>
            <span className="font-body text-sm text-ink">{resource.name}</span>
          </div>
        ))}
    </div>
  );
}

export function ProjectHomePage() {
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

  if (!project) return null;

  const statusCounts = STATUSES.map((status) => ({
    value: project.stats.status_counts[status] ?? 0,
    label: status,
  }));
  const categoryColors: Record<IssueCategory, string> = {
    Technical: "#2C4A7C",
    Managerial: "#7C93B3",
    Decision: "#B3352B",
  };
  const decisionCount = project.stats.category_counts.Decision ?? 0;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar />

      <div className="mx-auto w-full max-w-[1100px] px-4 pt-5 sm:px-12 sm:pt-9">
        <div className="mb-1.5 flex items-baseline gap-2.5 sm:gap-3.5">
          <h1 className="font-heading text-2xl font-semibold text-ink sm:text-[32px]">
            {project.name}
          </h1>
          <span className="font-mono text-xs tracking-[0.1em] text-ink-soft uppercase sm:text-[13px]">
            {project.key}
          </span>
        </div>
        <p className="mb-4 font-body text-[13px] text-ink-soft sm:mb-6 sm:text-[15px]">
          {project.description}
        </p>

        {/* Desktop stats row */}
        <div className="mb-7 hidden items-center gap-7 border-t border-b border-rule py-4 sm:flex">
          <MemberStack usernames={members?.map((m) => m.username) ?? []} total={project.stats.member_count} />
          <div className="h-5 w-px bg-rule" />
          <StatGroup items={statusCounts} />
          <div className="h-5 w-px bg-rule" />
          <div className="flex items-center gap-[18px]">
            <StatGroup
              items={CATEGORIES.filter((c) => c !== "Decision").map((c) => ({
                value: project.stats.category_counts[c] ?? 0,
                label: c,
                color: categoryColors[c],
              }))}
            />
            <div className="flex items-baseline gap-1.5 border border-red px-2.5 py-[3px]">
              <span className="font-mono text-[15px] font-bold text-red">{decisionCount}</span>
              <span className="font-body text-xs font-semibold text-red">Decision</span>
            </div>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="mb-4 flex flex-col gap-2.5 border-t border-b border-rule py-3.5 sm:hidden">
          <div className="flex items-center justify-between">
            <MemberStack usernames={members?.map((m) => m.username) ?? []} total={project.stats.member_count} />
            <div className="flex items-baseline gap-1.5 border border-red px-2.5 py-[3px]">
              <span className="font-mono text-[13px] font-bold text-red">{decisionCount}</span>
              <span className="font-body text-[11px] font-semibold text-red">Decision</span>
            </div>
          </div>
          <StatGroup items={statusCounts} />
          <StatGroup
            items={CATEGORIES.filter((c) => c !== "Decision").map((c) => ({
              value: project.stats.category_counts[c] ?? 0,
              label: c,
              color: categoryColors[c],
            }))}
          />
        </div>

        <NavTabs projectId={projectId!} />
      </div>

      <div className="mx-auto grid w-full max-w-[1100px] flex-1 grid-cols-1 gap-7 px-4 py-6 sm:grid-cols-[1fr_1.3fr] sm:gap-10 sm:px-12 sm:py-8">
        <div>
          <div className="mb-3.5 font-mono text-xs tracking-[0.1em] text-ink uppercase sm:mb-4">
            Resources
          </div>
          {project.folders.map((folder, i) => (
            <ResourceFolder key={folder.id} name={folder.name} resources={folder.resources} defaultOpen={i === 0} />
          ))}
          {project.top_level_resources.length > 0 && (
            <div className="border border-t-0 border-rule">
              {project.top_level_resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-2.5 border-b border-rule px-[18px] py-3.5 last:border-b-0"
                >
                  <span className={`font-mono text-[11px] ${resource.type === "link" ? "text-blue" : "text-ink-soft"}`}>
                    {resource.type === "link" ? "⇗" : "▤"}
                  </span>
                  <span className="font-body text-sm text-ink">{resource.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3.5 flex items-center justify-between sm:mb-4">
            <span className="font-mono text-xs tracking-[0.1em] text-ink uppercase">
              Latest issues
            </span>
            <Link
              to={`/projects/${projectId}/backlog`}
              className="font-body text-xs text-ink-soft hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="flex flex-col">
            {project.latest_issues.map((issue) => (
              <Link
                key={issue.id}
                to={`/issues/${issue.id}`}
                className="flex flex-col gap-2 border-b border-rule py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
              >
                <span className="font-mono text-xs text-ink-soft sm:w-16">
                  {formatTicketId(project.key, issue.number)}
                </span>
                <span className="font-body text-sm text-ink sm:flex-1">{issue.title}</span>
                <div className="flex gap-2">
                  <StatusPill status={issue.status} />
                  <PriorityTag level={issue.priority} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
