import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ApiError } from "../api/client";
import { createProject } from "../api/projects";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z.object({
  name: z.string().min(1, "Project name is required."),
  key: z.string().min(1, "Project key is required.").max(20),
});
type FormValues = z.infer<typeof schema>;

export function NewProjectPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => createProject(values.name, values.key),
    onSuccess: (project) => navigate(`/projects/${project.id}`),
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError("key", { message });
    },
  });

  return (
    <AuthCard
      title="New project"
      subtitle="Name your project and give it a short key."
      footer={
        <Link to="/projects" className="font-semibold text-ink hover:underline">
          Cancel
        </Link>
      }
    >
      <form
        className="flex flex-col gap-5 sm:gap-6"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <InputField
          label="Project name"
          placeholder="Engine Room"
          error={errors.name?.message}
          {...register("name")}
        />
        <InputField
          label="Project key"
          placeholder="ENG"
          className="uppercase"
          error={errors.key?.message}
          {...register("key")}
        />
        <Button type="submit" disabled={isSubmitting} className="mt-1.5 w-full sm:mt-2.5">
          {isSubmitting ? "Creating…" : "Create project"}
        </Button>
      </form>
    </AuthCard>
  );
}
