import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 3: raise a ticket → appears on the Board in the
// correct column.
test("raising a ticket puts it on the Board in the Open column", async ({ page }) => {
  const username = unique("raiser");
  await registerUser(page, username, `${username}@example.com`);
  await createProject(page, "Engine Room", uniqueKey("ENG"));

  await page.getByRole("link", { name: "Board" }).click();
  await page.waitForURL(/\/board$/);

  const title = unique("Fuel gauge misreads ");
  await page.getByRole("button", { name: "+ New issue" }).click();
  await page.waitForURL(/\/issues\/new/);
  await page.locator("#raise-title").fill(title);
  await page.getByRole("button", { name: "Raise ticket" }).click();

  await expect(page.getByText("Ticket stamped")).toBeVisible();
  await page.waitForURL(/\/issues\/[^/]+$/);

  await page.getByRole("link", { name: "Board" }).click();
  await page.waitForURL(/\/board$/);

  const openColumn = page.getByTestId("board-column-Open");
  await expect(openColumn.getByText(title)).toBeVisible();
  await expect(page.getByTestId("board-column-In Progress").getByText(title)).toHaveCount(0);
  await expect(page.getByTestId("board-column-Done").getByText(title)).toHaveCount(0);
});
