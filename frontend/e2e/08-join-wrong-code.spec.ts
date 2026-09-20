import { expect, test } from "@playwright/test";
import { registerUser, unique } from "./helpers";

// Testing.md §4 flow 8: attempt to join with a wrong code → inline
// error shown, matching Backend.md's exact error message
// ("Code and email don't match an active invite.").
test("joining with a wrong invite code shows the inline error", async ({ page }) => {
  const username = unique("wrongjoiner");
  await registerUser(page, username, `${username}@example.com`);

  await page.goto("/projects/join");
  await page.getByLabel("Invite code").fill("NOT-A-REAL-CODE");
  await page.getByLabel("Email").fill(`${username}@example.com`);
  await page.getByRole("button", { name: "Join project" }).click();

  await expect(page.getByText("Code and email don't match an active invite.")).toBeVisible();
  await expect(page).toHaveURL(/\/projects\/join$/);
});
