import { expect, test } from "@playwright/test";
import { registerUser, unique } from "./helpers";

// Testing.md §4 flow 1: register → land on Projects (empty state, since
// no projects yet).
test("register lands on Projects with the empty state", async ({ page }) => {
  const username = unique("newuser");
  await registerUser(page, username, `${username}@example.com`);

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByText("No projects yet.")).toBeVisible();
});
