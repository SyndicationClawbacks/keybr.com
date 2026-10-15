import { expect, test } from "@playwright/test";

test("bundled practice, statistics, test, and help load without outside requests", async ({ page }, testInfo) => {
  const external = [];
  const errors = [];
  const failedAssets = [];
  const models = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") console.error(`[browser] ${message.text()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedAssets.push(`${response.status()} ${response.url()}`);
    if (response.url().endsWith(".data")) models.push(response.url());
  });
  await page.route("**/*", async (route) => {
    if (new URL(route.request().url()).origin !== "http://127.0.0.1:1420") {
      external.push(route.request().url());
      await route.abort();
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByTestId("desktop-ready")).toBeVisible();
  await expect(page.getByTestId("practice-page")).toBeVisible();
  await expect.poll(() => models.length).toBeGreaterThan(0);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: testInfo.outputPath("practice.png"), fullPage: true });
  for (const [name, id] of [["Statistics", "profile-page"], ["Typing test", "typing-test-page"], ["Help", "help-page"], ["Backup & about", "backup-page"]]) {
    await page.getByRole("navigation", { name: "Desktop pages" }).getByRole("link", { name, exact: true }).click();
    await expect(page.getByTestId(id)).toBeVisible();
    await page.waitForLoadState("networkidle");
  }
  await expect(page.getByRole("button", { name: "Export backup", exact: true })).toBeVisible();
  expect(external).toEqual([]);
  expect(failedAssets).toEqual([]);
  expect(errors).toEqual([]);
});

test("theme preferences and the hash route survive reload; remote fetch is blocked", async ({ page }) => {
  await page.goto("/#/backup");
  await expect(page.getByTestId("backup-page")).toBeVisible();
  await page.getByLabel("Color theme").selectOption("dark");
  await page.getByLabel("Typing font").selectOption("monospace");
  await expect(page.locator("html")).toHaveAttribute("data-color", "dark");
  const before = await page.evaluate(() => localStorage.getItem("keybr.desktop.theme.v1"));
  expect(before).not.toBeNull();
  await page.reload();
  await expect(page.getByTestId("backup-page")).toBeVisible();
  await expect(page.getByLabel("Color theme")).toHaveValue("dark");
  await expect(page.getByLabel("Typing font")).toHaveValue("monospace");
  expect(await page.evaluate(() => localStorage.getItem("keybr.desktop.theme.v1"))).toEqual(before);
  expect(await page.evaluate(async () => {
    try { await fetch("https://www.keybr.com/"); return false; }
    catch (error) { return String(error).includes("Network access is disabled"); }
  })).toBe(true);
});
