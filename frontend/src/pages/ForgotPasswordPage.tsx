import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { forgotPassword } from "../api/auth";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z.object({
  email: z.string().email("Enter a valid email."),
});
type FormValues = z.infer<typeof schema>;

// DesignBrief.md: added after the initial 21-screen set, no existing
// mockup — built from the Login/Register card pattern directly. The UI
// must show exactly one confirmation state regardless of whether the
// email matched an account (Security.md §2's enumeration-prevention
// principle) — there is deliberately no error branch here at all.
export function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => forgotPassword(values.email),
  });

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your account email and we'll send a reset link."
      footer={
        <Link to="/login" className="font-semibold text-ink hover:underline">
          Back to login
        </Link>
      }
    >
      {mutation.isSuccess ? (
        <p className="font-body text-sm text-ink">
          If that email is registered, we've sent a reset link.
        </p>
      ) : (
        <form
          className="flex flex-col gap-5 sm:gap-6"
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          <InputField
            label="Email"
            type="email"
            placeholder="jane@doe.com"
            error={errors.email?.message}
            {...register("email")}
          />
          <Button type="submit" disabled={isSubmitting} className="mt-1.5 w-full sm:mt-2.5">
            {isSubmitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
