import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createInvite, listInvites } from "../api/invites";
import { listMembers } from "../api/members";
import { getProject } from "../api/projects";
import { AssigneeAvatar } from "../components/AssigneeAvatar";
import { Button } from "../components/Button";
import { NavTabs } from "../components/NavTabs";
import { ProjectTopBar } from "../components/ProjectTopBar";
import type { Role } from "../api/types";

const ROLES: Role[] = ["Owner", "Manager", "Leader", "Developer"];

function AddMemberModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Leader");

  const mutation = useMutation({
    mutationFn: () => createInvite(projectId, email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", projectId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink/50 px-5">
      <div className="w-full max-w-[460px] border border-rule bg-paper px-6 pt-8 pb-9 shadow-[0_20px_40px_rgba(28,43,74,0.25)] sm:px-10 sm:pt-10">
        <h2 className="mb-6 font-heading text-2xl font-semibold text-ink">Invite a member</h2>

        <div className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="invite-email"
              className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase"
            >
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="border-0 border-b border-rule bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-base text-ink outline-none placeholder:text-[#9AA6BB] focus:border-ink"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <label className="font-mono text-[11px] tracking-[0.08em] text-ink-soft uppercase">
              Role
            </label>
            <div className="grid grid-cols-2 border border-rule sm:flex">
              {ROLES.map((r, i) => {
                const isLeftCol = i % 2 === 0;
                const isTopRow = i < 2;
                const isLast = i === ROLES.length - 1;
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={[
                      "border-rule py-2.5 text-center font-body text-[13px] sm:flex-1",
                      role === r ? "bg-ink font-semibold text-paper" : "text-ink-soft",
                      isLeftCol ? "border-r" : "",
                      isTopRow ? "border-b sm:border-b-0" : "",
                      !isLast ? "sm:border-r" : "",
                    ].join(" ")}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <Button
          onClick={() => email.trim() && mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-[30px] w-full"
        >
          {mutation.isPending ? "Sending…" : "Send invite"}
        </Button>

        <div className="mt-4 text-center">
          <button onClick={onClose} className="font-body text-sm text-ink-soft hover:underline">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [modalOpen, setModalOpen] = useState(false);

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
  const { data: invites } = useQuery({
    queryKey: ["invites", projectId],
    queryFn: () => listInvites(projectId!),
    enabled: Boolean(projectId),
  });

  if (!project) return null;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <ProjectTopBar projectName={project.name} projectKey={project.key} />
      <div className="mx-auto w-full max-w-[820px] flex-1 px-4 sm:px-12">
        <NavTabs projectId={projectId!} />

        <div className="flex items-center justify-between py-5 sm:py-7">
          <h1 className="font-heading text-xl font-semibold text-ink sm:text-2xl">Team</h1>
          <Button onClick={() => setModalOpen(true)} className="!hidden sm:!block">
            + Invite member
          </Button>
        </div>
        <Button onClick={() => setModalOpen(true)} className="mb-3 w-full sm:hidden">
          + Invite member
        </Button>

        <div className="flex flex-col border-t border-rule">
          {members?.map((member) => (
            <Link
              key={member.id}
              to={`/projects/${projectId}/team/${member.id}`}
              className="flex items-center gap-3.5 border-b border-rule py-[18px] sm:gap-4"
            >
              <AssigneeAvatar username={member.username} size="row" />
              <div className="flex-1">
                <div className="font-body text-sm font-semibold text-ink sm:text-[15px]">
                  {member.username}
                </div>
                <div className="font-body text-xs text-ink-soft sm:text-[13px]">{member.role}</div>
              </div>
              <div className="font-mono text-xs text-ink sm:text-[13px]">
                {member.open_ticket_count}{" "}
                <span className="font-body text-[11px] text-ink-soft sm:text-xs">open</span>
              </div>
            </Link>
          ))}

          {invites?.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-3.5 border-b border-rule py-[18px] opacity-50 sm:gap-4"
            >
              <AssigneeAvatar username={invite.email} size="row" />
              <div className="flex-1">
                <div className="font-body text-sm font-semibold text-ink sm:text-[15px]">
                  {invite.email}
                </div>
                <div className="font-body text-xs text-ink-soft italic sm:text-[13px]">Pending</div>
              </div>
              <div className="font-mono text-xs text-ink-soft sm:text-[13px]">
                — <span className="font-body text-[11px] sm:text-xs">open</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && <AddMemberModal projectId={projectId!} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
