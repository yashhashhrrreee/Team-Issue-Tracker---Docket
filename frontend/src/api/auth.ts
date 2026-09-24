import { apiFetch } from "./client";
import type { User } from "./types";

export function login(username: string, password: string) {
  return apiFetch<User>("/api/auth/login", { method: "POST", body: { username, password } });
}

export function register(username: string, email: string, password: string) {
  return apiFetch<User>("/api/auth/register", {
    method: "POST",
    body: { username, email, password },
  });
}

export function logout() {
  return apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function me() {
  return apiFetch<User>("/api/auth/me");
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch<{ ok: true }>("/api/auth/password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export function forgotPassword(email: string) {
  return apiFetch<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch<{ ok: true }>("/api/auth/reset-password", {
    method: "POST",
    body: { token, new_password: newPassword },
  });
}
