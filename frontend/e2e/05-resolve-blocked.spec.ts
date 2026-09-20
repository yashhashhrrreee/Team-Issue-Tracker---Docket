import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 5: move a ticket to Done without a resolution note
// → blocked. Backend.md §5 rule 2 requires a note server-side; the UI
// half is ResolveModal disabling "Mark as Done" until one is typed —
// there's no separate error banner, so "blocked" is verified as: the
// submit control stays disabled and the status never actually changes.
test("moving a ticket to Done without a resolution note is blocked", async ({ page }) => {
  const username = unique("blocker");
  await registerUser(page, username, `${username}@example.com`);
  await createProject(page, "Engine Room", uniqueKey("ENG"));

  await page.getByRole("link", { name: "Board" }).click();
  await page.waitForURL(/\/board$/);
  const title = unique("Add pagination to the audit log ");
  await page.getByRole("button", { name: "+ New issue" }).click();
  await page.waitForURL(/\/issues\/new/);
  await page.locator("#raise-title").fill(title);
  await page.getByRole("button", { name: "Raise ticket" }).click();
  await page.waitForURL(/\/issues\/[^/]+$/);

  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("What fixed this?")).toBeVisible();

  const markDone = page.getByRole("button", { name: "Mark as Done" });
  await expect(markDone).toBeDisabled();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("What fixed this?")).toHaveCount(0);
  await expect(page.getByText("Open", { exact: true }).first()).toBeVisible();
});
