import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { changeIssueStatus, listIssues } from "../api/issues";
import { listMembers } from "../api/members";
import { getProject, updateBoardViewPreference } from "../api/projects";
import { Button } from "../components/Button";
import { NavTabs } from "../components/NavTabs";
import { ProjectTopBar } from "../components/ProjectTopBar";
import { ResolveModal } from "../components/ResolveModal";
import { TicketCard } from "../components/TicketCard";
import type { Issue, IssueCategory, IssueStatus } from "../api/types";
import { formatTicketId } from "../lib/ticketId";

const STATUSES: IssueStatus[] = ["Open", "In Progress", "Done"];
const CATEGORIES: IssueCategory[] = ["Technical", "Managerial", "Decision"];
const CATEGORY_LABEL_CLASSES: Record<IssueCategory, string> = {
  Technical: "text-blue",
  Managerial: "text-blue-light",
  Decision: "text-red font-semibold",
};

function DraggableCard({ issue, ticketId, assigneeUsername }: { issue: Issue; ticketId: string; assigneeUsername: string | null }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
  });
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !isDragging && navigate(`/issues/${issue.id}`)}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <TicketCard
        ticketId={ticketId}
        title={issue.title}
        priority={issue.priority}
        category={issue.category}
        assigneeUsername={assigneeUsername}
      />
    </div>
  );
}

function DroppableColumn({
  status,
  children,
}: {
  status: IssueStatus;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      data-testid={`board-column-${status}`}
      className={`min-h-[80px] ${isOver ? "bg-paper-raised/50" : ""}`}
    >
      {children}
    </div>
  );
}

export function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [mobileStatus, setMobileStatus] = useState<IssueStatus>("Open");
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Issue | null>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId!),
    enabled: Boolean(projectId),
  });
  const { data: issues } = useQuery({
    queryKey: ["issues", projectId],
    queryFn: () => listIssues(projectId!),
    enabled: Boolean(projectId),
  });
  const { data: members } = useQuery({
    queryKey: ["members", projectId],
    queryFn: () => listMembers(projectId!),
    enabled: Boolean(projectId),
  });

  const usernameOf = useMemo(() => {
    const map = new Map(members?.map((m) => [m.id, m.username]) ?? []);
    return (userId: string | null) => (userId ? map.get(userId) ?? null : null);
  }, [members]);

  const view = project?.membership.board_view_preference ?? "tag";

  const viewMutation = useMutation({
    mutationFn: (next: "tag" | "swimlane") => updateBoardViewPreference(projectId!, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { issueId: string; status: IssueStatus; resolution_note?: string }) =>
      changeIssueStatus(vars.issueId, vars.status, vars.resolution_note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issues", projectId] });
      setResolveTarget(null);
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    setActiveIssue(issues?.find((i) => i.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null);
    const targetStatus = event.over?.id as IssueStatus | undefined;
    const issue = issues?.find((i) => i.id === event.active.id);
    if (!issue || !targetStatus || targetStatus === issue.status) return;

    if (targetStatus === "Done") {
      setResolveTarget(issue);
    } else {
      statusMutation.mutate({ issueId: issue.id, status: targetStatus });
    }
  }

  if (!project || !issues) return null;

  const byStatus = (status: IssueStatus) => issues.filter((i) => i.status === status);
  const byStatusAndCategory = (status: IssueStatus, category: IssueCategory) =>
    issues.filter((i) => i.status === status && i.category === category);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar
        projectName={project.name}
        projectKey={project.key}
        action={
          <Button
            onClick={() => window.location.assign(`/issues/new?projectId=${projectId}`)}
            className="!px-[18px] !py-[9px] !text-[13px] sm:!px-[18px]"
          >
            + New issue
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-12">
        <NavTabs projectId={projectId!} />

        <div className="hidden justify-end py-4 sm:flex">
          <div className="flex border border-rule">
            {(["tag", "swimlane"] as const).map((v) => (
              <button
                key={v}
                onClick={() => viewMutation.mutate(v)}
                className={`px-[18px] py-2 font-body text-[13px] ${
                  view === v
                    ? "bg-ink font-semibold text-paper"
                    : "border-l border-rule text-ink-soft first:border-l-0"
                }`}
              >
                {v === "tag" ? "Tag view" : "Swimlane view"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex border border-rule sm:hidden">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setMobileStatus(status)}
              className={`flex-1 border-r border-rule px-1 py-2.5 text-center font-body text-[13px] last:border-r-0 ${
                mobileStatus === status ? "bg-ink font-semibold text-paper" : "text-ink-soft"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile: tag view only, one column at a time */}
      <div className="flex-1 px-4 py-4 sm:hidden">
        <div className="flex flex-col gap-3">
          {byStatus(mobileStatus).map((issue) => (
            <div key={issue.id} onClick={() => (window.location.href = `/issues/${issue.id}`)}>
              <TicketCard
                ticketId={formatTicketId(project.key, issue.number)}
                title={issue.title}
                priority={issue.priority}
                category={issue.category}
                assigneeUsername={usernameOf(issue.assignee_id)}
              />
            </div>
          ))}
          {byStatus(mobileStatus).length === 0 && (
            <div className="flex h-[160px] items-center justify-center border border-dashed border-rule">
              <span className="font-body text-[13px] text-ink-soft italic">Nothing here</span>
            </div>
          )}
        </div>
      </div>

      <div className="hidden flex-1 overflow-y-auto px-12 pb-10 sm:block">
        <div className="mx-auto max-w-[1200px]">
          {view === "tag" ? (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-3 items-start gap-6">
                {STATUSES.map((status) => {
                  const columnIssues = byStatus(status);
                  return (
                    <DroppableColumn key={status} status={status}>
                      <div className="mb-3.5 flex items-baseline gap-2">
                        <span className="font-body text-sm font-semibold text-ink">{status}</span>
                        <span className="font-mono text-xs text-ink-soft">
                          {columnIssues.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-3">
                        {columnIssues.map((issue) => (
                          <DraggableCard
                            key={issue.id}
                            issue={issue}
                            ticketId={formatTicketId(project.key, issue.number)}
                            assigneeUsername={usernameOf(issue.assignee_id)}
                          />
                        ))}
                        {columnIssues.length === 0 && (
                          <div className="flex h-[200px] items-center justify-center border border-dashed border-rule">
                            <span className="font-body text-[13px] text-ink-soft italic">
                              Nothing here
                            </span>
                          </div>
                        )}
                      </div>
                    </DroppableColumn>
                  );
                })}
              </div>
              <DragOverlay>
                {activeIssue && (
                  <div className="w-64 rotate-[-2deg] shadow-[0_12px_24px_rgba(28,43,74,0.22)]">
                    <TicketCard
                      ticketId={formatTicketId(project.key, activeIssue.number)}
                      title={activeIssue.title}
                      priority={activeIssue.priority}
                      category={activeIssue.category}
                      assigneeUsername={usernameOf(activeIssue.assignee_id)}
                    />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="grid grid-cols-[120px_1fr_1fr_1fr] border border-rule">
              <div className="border-r border-b border-rule" />
              {STATUSES.map((status) => (
                <div
                  key={status}
                  className="border-r border-b border-rule px-3 py-2.5 font-body text-[13px] font-semibold text-ink last:border-r-0"
                >
                  {status}
                </div>
              ))}
              {CATEGORIES.map((category) => (
                <>
                  <div
                    key={`${category}-label`}
                    className={`border-r border-b border-rule px-3 py-3.5 font-mono text-[11px] tracking-[0.06em] uppercase last:border-b-0 ${CATEGORY_LABEL_CLASSES[category]}`}
                  >
                    {category}
                  </div>
                  {STATUSES.map((status, i) => {
                    const cellIssues = byStatusAndCategory(status, category);
                    return (
                      <div
                        key={`${category}-${status}`}
                        className={`border-b border-rule p-3 ${i < STATUSES.length - 1 ? "border-r" : ""}`}
                      >
                        {cellIssues.length === 0 ? (
                          <p className="font-body text-xs text-ink-soft italic">No tickets</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {cellIssues.map((issue) => (
                              <div
                                key={issue.id}
                                onClick={() => (window.location.href = `/issues/${issue.id}`)}
                                className="cursor-pointer border-l-4 bg-paper-raised p-2.5"
                                style={{
                                  borderLeftColor:
                                    issue.priority === "Low"
                                      ? "#7C93B3"
                                      : issue.priority === "Medium"
                                        ? "#2C4A7C"
                                        : "#B3352B",
                                }}
                              >
                                <div className="mb-1 font-mono text-[10px] text-ink-soft">
                                  {formatTicketId(project.key, issue.number)}
                                </div>
                                <div className="font-body text-[13px] text-ink">{issue.title}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          )}
        </div>
      </div>

      <ResolveModal
        open={Boolean(resolveTarget)}
        ticketLabel={resolveTarget ? formatTicketId(project.key, resolveTarget.number) : ""}
        isSubmitting={statusMutation.isPending}
        onSubmit={(note) =>
          resolveTarget &&
          statusMutation.mutate({ issueId: resolveTarget.id, status: "Done", resolution_note: note })
        }
        onCancel={() => setResolveTarget(null)}
      />
    </div>
  );
}
