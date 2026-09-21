import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { acceptInvite } from "../api/invites";
import { ApiError } from "../api/client";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z.object({
  token: z.string().min(1, "Invite code is required."),
  email: z.string().email("Enter a valid email."),
});
type FormValues = z.infer<typeof schema>;

export function JoinProjectPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => acceptInvite(values.token, values.email),
    onSuccess: (result) => navigate(`/projects/${result.project_id}`),
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError("root", { message });
    },
  });

  const hasError = Boolean(errors.root?.message);

  return (
    <AuthCard
      title="Join project"
      subtitle="Enter the invite code you were sent."
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
          label="Invite code"
          placeholder="X7K2-QPLM"
          invalid={hasError}
          className="truncate"
          {...register("token")}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="jane@doe.com"
          invalid={hasError}
          {...register("email")}
        />

        <p className={`-mt-3 text-xs ${hasError ? "text-red" : "text-ink-soft"}`}>
          {errors.root?.message ?? "Both must match the invite you were sent."}
        </p>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Joining…" : "Join project"}
        </Button>
      </form>
    </AuthCard>
  );
}
