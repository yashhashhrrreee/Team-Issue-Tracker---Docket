import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { login } from "../api/auth";
import { ApiError } from "../api/client";
import { AuthCard } from "../components/AuthCard";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";

const schema = z.object({
  username: z.string().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => login(values.username, values.password),
    onSuccess: (user) => {
      queryClient.setQueryData(["me"], user);
      navigate("/projects");
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      setError("password", { message });
    },
  });

  return (
    <AuthCard
      title="Sign in"
      subtitle="Enter your credentials to continue."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-ink hover:underline">
            Register
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
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" disabled={isSubmitting} className="mt-1.5 w-full sm:mt-2.5">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
