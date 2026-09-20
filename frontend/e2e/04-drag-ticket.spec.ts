import { expect, test } from "@playwright/test";
import { createProject, registerUser, unique, uniqueKey } from "./helpers";

// Testing.md §4 flow 4: drag a ticket to a new status column → status
// persists on reload. dnd-kit's PointerSensor needs real pointer events
// past its 6px activation distance, not an HTML5 drag-and-drop dispatch.
test("dragging a ticket to a new column persists after reload", async ({ page }) => {
  const username = unique("dragger");
  await registerUser(page, username, `${username}@example.com`);
  await createProject(page, "Engine Room", uniqueKey("ENG"));

  await page.getByRole("link", { name: "Board" }).click();
  await page.waitForURL(/\/board$/);

  const title = unique("Rate limiter drops requests ");
  await page.getByRole("button", { name: "+ New issue" }).click();
  await page.waitForURL(/\/issues\/new/);
  await page.locator("#raise-title").fill(title);
  await page.getByRole("button", { name: "Raise ticket" }).click();
  await page.waitForURL(/\/issues\/[^/]+$/);

  await page.getByRole("link", { name: "Board" }).click();
  await page.waitForURL(/\/board$/);

  const card = page.getByTestId("board-column-Open").getByText(title);
  const cardBox = await card.boundingBox();
  const targetBox = await page.getByTestId("board-column-In Progress").boundingBox();
  if (!cardBox || !targetBox) throw new Error("Could not locate card or target column.");

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + 40;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.mouse.up();

  await expect(page.getByTestId("board-column-In Progress").getByText(title)).toBeVisible();
  await expect(page.getByTestId("board-column-Open").getByText(title)).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId("board-column-In Progress").getByText(title)).toBeVisible();
  await expect(page.getByTestId("board-column-Open").getByText(title)).toHaveCount(0);
});
