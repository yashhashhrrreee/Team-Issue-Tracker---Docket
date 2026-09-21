import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { register as registerUser } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z.object({
  username: z.string().min(1, "Username is required."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      registerUser(values.username, values.email, values.password),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      navigate("/projects");
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError("email", { message });
    },
  });

  return (
    <AuthCard
      title="Create account"
      subtitle="You'll create or join a project after signing up."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-ink hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-5 sm:gap-6"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <InputField
          label="Username"
          placeholder="jane.doe"
          error={errors.username?.message}
          {...register("username")}
        />
        <InputField
          label="Email"
          type="email"
          placeholder="jane@doe.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <InputField
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={isSubmitting} className="mt-1.5 w-full sm:mt-2.5">
          {isSubmitting ? "Creating…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
