import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

// The main user path, from sign-up to deleting the account, as one person.
// The test project needs "Confirm email" turned off. Each run deletes the
// account it made; a failed run leaves a dovie-e2e-* user behind.
test("sign up, use Dovie for a day, export and delete the account", async ({ page }) => {
  const stamp = Date.now();
  const email = `dovie-e2e-${stamp}@example.com`;
  const plan = `E2E plan ${stamp}`;
  const habit = `E2E habit ${stamp}`;
  const expense = `E2E lunch ${stamp}`;
  const words = `E2E journal page ${stamp}`;

  await test.step("sign up", async () => {
    await page.goto("/signup");
    await page.getByLabel("Your name").fill("Testing Person");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(`E2e-${stamp}-pass!`);
    await page.getByRole("checkbox").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/onboarding/);
  });

  await test.step("onboarding", async () => {
    await page.getByLabel(/I confirm I am 18/).check();
    await page.getByLabel(/I have read the/).check();
    await page.getByRole("button", { name: "Start with today" }).click();
    await expect(page).toHaveURL(/\/today/);
  });

  await test.step("add a plan", async () => {
    await page.getByRole("textbox", { name: "New task" }).fill(plan);
    await page.getByRole("button", { name: "Add task" }).click();
    await expect(page.getByRole("checkbox", { name: `Mark "${plan}" as done` })).toBeVisible();
    // Reload, so the check is of what was saved rather than the optimistic list.
    await page.reload();
    await expect(page.getByText(plan)).toBeVisible();
  });

  await test.step("check in", async () => {
    const card = page.getByRole("radiogroup", { name: "How was your day?" });
    await card.getByRole("radio").nth(3).click();
    await page.getByRole("button", { name: "Check in" }).click();
    await expect(page.getByRole("button", { name: "Update", exact: true })).toBeVisible();
  });

  await test.step("add and tick a habit", async () => {
    await page.goto("/goals");
    await page.getByRole("textbox", { name: "New habit" }).fill(habit);
    await page.getByRole("button", { name: "Add habit" }).click();
    await page.getByRole("checkbox", { name: `${habit}: not done today` }).click();
    await expect(page.getByRole("checkbox", { name: `${habit}: done today` })).toBeChecked();
    await page.reload();
    await expect(page.getByRole("checkbox", { name: `${habit}: done today` })).toBeChecked();
  });

  await test.step("add an expense", async () => {
    await page.goto("/money");
    await page.getByRole("button", { name: "Expense", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("What was it?").fill(expense);
    await dialog.getByLabel("Amount").fill("250");
    await dialog.getByRole("button", { name: "Add expense" }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    await expect(page.getByText(expense).first()).toBeVisible();
  });

  await test.step("save a journal page", async () => {
    await page.goto("/journal");
    await page.getByRole("textbox", { name: "Write anything" }).fill(words);
    await page.getByRole("button", { name: "Save this page" }).click();
    await expect(page.getByText("Saved.", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Write anything" })).toHaveValue(words);
  });

  await test.step("export the data", async () => {
    await page.goto("/settings");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Download my data" }).click(),
    ]);
    const data = await readFile(await download.path(), "utf8");
    for (const text of [plan, habit, expense, words]) expect(data).toContain(text);
  });

  await test.step("delete the account", async () => {
    await page.getByRole("button", { name: "Delete my account" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete account and data" }).click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await page.goto("/today");
    await expect(page).toHaveURL(/\/login/);
  });
});
