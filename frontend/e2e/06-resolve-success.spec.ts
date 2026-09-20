import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 6: move a ticket to Done with a resolution note →
// succeeds, note appears on the Solved Issues page.
test("moving a ticket to Done with a note succeeds and shows on Solved Issues", async ({ page }) => {
  const username = unique("resolver");
  await registerUser(page, username, `${username}@example.com`);
  await createProject(page, "Engine Room", uniqueKey("ENG"));

  await page.getByRole("link", { name: "Board" }).click();
  await page.waitForURL(/\/board$/);
  const title = unique("Postgres vs queue-based ingestion ");
  await page.getByRole("button", { name: "+ New issue" }).click();
  await page.waitForURL(/\/issues\/new/);
  await page.locator("#raise-title").fill(title);
  await page.getByRole("button", { name: "Raise ticket" }).click();
  await page.waitForURL(/\/issues\/[^/]+$/);

  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByText("What fixed this?")).toBeVisible();

  const note = "Went with Postgres and a partitioned table by day, no dedicated queue needed.";
  await page.getByPlaceholder("What fixed this, and would it help next time?").fill(note);
  await page.getByRole("button", { name: "Mark as Done" }).click();

  await expect(page.getByText("What fixed this?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Done", exact: true })).toHaveClass(/bg-ink/);

  await page.getByRole("link", { name: "Solved" }).click();
  await page.waitForURL(/\/solved$/);

  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByText(note)).toBeVisible();
});
