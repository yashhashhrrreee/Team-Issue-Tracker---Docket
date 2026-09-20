import type { Page } from "@playwright/test";

// Shared helpers for the Testing.md §4 e2e flows. Each flow registers
// its own fresh user (and usually its own fresh project) rather than
// reusing the seeded alice/bob/carol/ROC fixture, so specs don't
// interfere with each other's state when run in the same worker
// against the same reset-once-per-suite database.
let counter = 0;
export function unique(label: string) {
  counter += 1;
  return `${label}${Date.now()}${counter}`;
}

// Project keys are capped at 20 chars (Database.md) and read best short —
// a counter-only suffix instead of unique()'s timestamp keeps them tidy.
export function uniqueKey(prefix: string) {
  counter += 1;
  return `${prefix}${counter}`;
}

export async function registerUser(page: Page, username: string, email: string, password = "password123") {
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/projects");
}

export async function loginUser(page: Page, username: string, password = "password123") {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/projects");
}

export async function createProject(page: Page, name: string, key: string) {
  await page.getByRole("button", { name: "+ New project" }).click();
  await page.getByLabel("Project name").fill(name);
  await page.getByLabel("Project key").fill(key);
  await page.getByRole("button", { name: "Create project" }).click();
  await page.waitForURL(/\/projects\/[^/]+$/);
  return page.url().split("/projects/")[1];
}
