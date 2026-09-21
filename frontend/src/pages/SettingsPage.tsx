import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, me } from "../api/auth";
import { listProjects, updateProject } from "../api/projects";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";

// Frontend.md §5 lists a bare top-level `/settings` route (no :projectId),
// but DesignBrief.md's mockup shows Project Settings alongside Account on
// the same page — with no project in the URL, the page has to pick one.
// If the user belongs to more than one project, they choose from a select;
// otherwise their one project is used directly. See Decisions.md.
export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["me"], queryFn: me });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: listProjects });

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");

  const selectedProject = projects?.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    if (!selectedProjectId && projects && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProject) {
      setProjectName(selectedProject.name);
      setProjectKey(selectedProject.key);
    }
  }, [selectedProject]);

  const saveProject = useMutation({
    mutationFn: () => updateProject(selectedProjectId, { name: projectName, key: projectKey }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
  });

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-rule px-4 sm:h-16 sm:px-12">
        <BrandMark />
        <div className="flex items-center gap-4">
          <span className="font-body text-[13px] text-ink-soft sm:text-sm">{user?.username}</span>
          <button
            onClick={() => logoutMutation.mutate()}
            className="font-body text-[13px] font-semibold text-ink-soft hover:text-ink hover:underline sm:text-sm"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[620px] px-4 py-6 sm:px-12 sm:py-9">
        <h1 className="mb-6 font-heading text-xl font-semibold text-ink sm:mb-8 sm:text-2xl">
          Settings
        </h1>

        <section className="mb-8 sm:mb-10">
          <div className="mb-4 font-mono text-xs tracking-[0.1em] text-ink uppercase sm:mb-[18px]">
            Account
          </div>
          <div className="flex flex-col gap-[18px] sm:gap-[22px]">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase sm:text-[11px]">
                Username
              </span>
              <div className="border-b border-rule px-0.5 pt-1.5 pb-2.5 font-body text-base text-ink">
                {user?.username}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase sm:text-[11px]">
                Email
              </span>
              <div className="border-b border-rule px-0.5 pt-1.5 pb-2.5 font-body text-base text-ink">
                {user?.email}
              </div>
            </div>
            <span className="font-body text-sm font-semibold text-ink-soft" title="Not yet available">
              Change password
            </span>
          </div>
        </section>

        {selectedProject && (
          <section className="border-t border-rule pt-7 sm:pt-8">
            <div className="mb-4 flex items-center justify-between sm:mb-[18px]">
              <span className="font-mono text-xs tracking-[0.1em] text-ink uppercase">
                Project settings
              </span>
              {projects && projects.length > 1 && (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="border-0 border-b border-rule bg-transparent font-body text-[13px] text-ink-soft outline-none"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-col gap-[18px] sm:gap-[22px]">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="settings-project-name"
                  className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase sm:text-[11px]"
                >
                  Project name
                </label>
                <input
                  id="settings-project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="border-0 border-b border-rule bg-transparent px-0.5 pt-1.5 pb-2.5 font-body text-base text-ink outline-none focus:border-ink"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="settings-project-key"
                  className="font-mono text-[10px] tracking-[0.08em] text-ink-soft uppercase sm:text-[11px]"
                >
                  Project key
                </label>
                <input
                  id="settings-project-key"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                  className="border-0 border-b border-rule bg-transparent px-0.5 pt-1.5 pb-2.5 font-mono text-base tracking-[0.08em] text-ink uppercase outline-none focus:border-ink"
                />
              </div>
              <Button onClick={() => saveProject.mutate()} disabled={saveProject.isPending} className="self-start">
                {saveProject.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
