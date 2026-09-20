import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 9: log out (via the real UI button) → attempt to
// visit a project URL directly → redirected to login, no project data
// shown. Exercises RequireAuth (src/components/RequireAuth.tsx), added
// specifically to satisfy this flow — see Decisions.md.
test("logging out via the UI then visiting a project URL redirects to login", async ({ page }) => {
  const username = unique("loggerouter");
  await registerUser(page, username, `${username}@example.com`);
  const projectId = await createProject(page, "Engine Room", uniqueKey("ENG"));

  await page.goto("/settings");
  await page.getByRole("button", { name: "Log out" }).click();
  await page.waitForURL(/\/login$/);

  await page.goto(`/projects/${projectId}/board`);
  await page.waitForURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Engine Room")).toHaveCount(0);
});
