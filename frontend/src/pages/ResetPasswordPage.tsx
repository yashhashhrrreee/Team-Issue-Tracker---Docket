import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { resetPassword } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
type FormValues = z.infer<typeof schema>;

// DesignBrief.md: added after the initial 21-screen set, no existing
// mockup — built from the Login/Register card pattern directly. Token
// comes from the URL query param, not typed in by hand. On an
// invalid/expired/used token, the API returns one generic error
// (Security.md §7a) — shown as-is, never split into three UI states.
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => resetPassword(token, values.newPassword),
    onSuccess: () => navigate("/login?reset=success", { replace: true }),
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError("root", { message });
    },
  });

  const rootError = errors.root?.message;

  return (
    <AuthCard
      title="Reset password"
      subtitle="Choose a new password for your account."
      footer={
        <Link to="/forgot-password" className="font-semibold text-ink hover:underline">
          Request a new reset link
        </Link>
      }
    >
      <form
        className="flex flex-col gap-5 sm:gap-6"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <InputField
          label="New password"
          type="password"
          placeholder="••••••••"
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <InputField
          label="Confirm new password"
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        {rootError && <p className="-mt-3 text-xs text-red">{rootError}</p>}
        <Button type="submit" disabled={isSubmitting} className="mt-1.5 w-full sm:mt-2.5">
          {isSubmitting ? "Resetting…" : "Reset password"}
        </Button>
      </form>
    </AuthCard>
  );
}
