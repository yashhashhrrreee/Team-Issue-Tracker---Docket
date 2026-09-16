import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet } from "react-router-dom";
import { me } from "../api/auth";

// Testing.md e2e flow 9: direct navigation to a protected route while
// logged out must redirect to /login, not render a blank page with a
// failed background fetch. Only the root "/" (LoadingPage) checked auth
// before this — any other URL typed/bookmarked directly had no guard.
export function RequireAuth() {
  const { data, isFetched, isError } = useQuery({
    queryKey: ["me"],
    queryFn: me,
    retry: false,
  });

  if (!isFetched) return null;
  if (isError || !data) return <Navigate to="/login" replace />;
  return <Outlet />;
}
