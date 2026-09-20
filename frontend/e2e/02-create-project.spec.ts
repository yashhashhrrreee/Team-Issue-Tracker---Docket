import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 2: create a project → land on Project Home.
test("creating a project lands on Project Home", async ({ page }) => {
  const username = unique("owner");
  await registerUser(page, username, `${username}@example.com`);

  const name = "Engine Room";
  const key = uniqueKey("ENG");
  await createProject(page, name, key);

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText(key.toUpperCase())).toBeVisible();
});
