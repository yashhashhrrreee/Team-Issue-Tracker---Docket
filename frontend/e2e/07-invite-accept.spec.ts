import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 7: invite a member → accept with correct code+email
// → new member appears in Team roster (not pending).
//
// The product deliberately never shows a created invite's token in the
// UI (Security.md §7 / Decisions.md: a member who can already see the
// invited email shouldn't also see the bearer token) — in production
// that token reaches the invitee by email. There's no email delivery
// here, so the test reads it off the real network response the "Send
// invite" click produces, the way the invitee's inbox would in prod;
// every actual state change still goes through the real UI on both sides.
test("inviting and accepting adds the member to the Team roster", async ({ page, browser }) => {
  const ownerName = unique("owner");
  await registerUser(page, ownerName, `${ownerName}@example.com`);
  await createProject(page, "Engine Room", uniqueKey("ENG"));

  await page.getByRole("link", { name: "Team" }).click();
  await page.waitForURL(/\/team$/);

  const inviteeName = unique("invitee");
  const inviteeEmail = `${inviteeName}@example.com`;

  await page.getByRole("button", { name: "+ Invite member" }).first().click();
  await page.getByLabel("Email").fill(inviteeEmail);

  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/invites") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Send invite" }).click(),
  ]);
  const { token } = (await response.json()) as { token: string };
  expect(token).toBeTruthy();

  await expect(page.getByText(inviteeEmail)).toBeVisible();
  await expect(page.getByText("Pending")).toBeVisible();

  const inviteeContext = await browser.newContext();
  const inviteePage = await inviteeContext.newPage();
  await registerUser(inviteePage, inviteeName, inviteeEmail);

  await inviteePage.goto("/projects/join");
  await inviteePage.getByLabel("Invite code").fill(token);
  await inviteePage.getByLabel("Email").fill(inviteeEmail);
  await inviteePage.getByRole("button", { name: "Join project" }).click();
  await inviteePage.waitForURL(/\/projects\/[^/]+$/);
  await inviteeContext.close();

  await page.reload();
  await expect(page.getByText(inviteeName)).toBeVisible();
  await expect(page.getByText("Pending")).toHaveCount(0);
});
