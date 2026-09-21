import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { me } from "../api/auth";
import { ApiError } from "../api/client";
import { createProject, listProjects } from "../api/projects";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z.object({
  name: z.string().min(1, "Project name is required."),
  key: z.string().min(1, "Key is required.").max(20),
});
type FormValues = z.infer<typeof schema>;

function TopBar() {
  const { data: user } = useQuery({ queryKey: ["me"], queryFn: me });
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-5 sm:h-16 sm:px-12">
      <BrandMark />
      <span className="font-body text-[13px] text-ink-soft sm:text-sm">{user?.username}</span>
    </header>
  );
}

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createProject(values.name, values.key),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      reset();
      navigate(`/projects/${project.id}`);
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError("key", { message });
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <TopBar />

      <div className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8 sm:px-12 sm:py-14">
        <div className="mb-5 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-[26px] font-semibold text-ink sm:text-[32px]">
            Your projects
          </h1>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button onClick={() => navigate("/projects/new")} className="w-full sm:w-auto">
              + New project
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate("/projects/join")}
              className="w-full sm:w-auto"
            >
              Join with invite code
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {isLoading && <p className="text-ink-soft">Loading…</p>}
          {projects?.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="border border-rule bg-paper-raised px-5 py-6 hover:border-ink sm:px-6 sm:py-7"
            >
              <div className="mb-2 font-heading text-lg font-bold text-ink sm:text-xl">
                {project.name}
              </div>
              <div className="mb-3.5 font-mono text-[11px] tracking-[0.1em] text-ink-soft uppercase sm:text-xs">
                {project.key}
              </div>
              <div className="font-body text-sm text-ink-soft">{project.role}</div>
            </Link>
          ))}
          {projects?.length === 0 && (
            <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">
              No projects yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
