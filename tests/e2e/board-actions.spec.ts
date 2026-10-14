import { test, expect } from "@playwright/test";

test("board actions share one row, require confirmation, and trophy is centered", async ({ page }, info) => {
  await page.goto("/");
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录宝石", exact: true }).click();
  const row = page.locator(".history-buttons");
  for (const name of ["重置", "删除", "推测旗标工具"]) {
    await expect(row.getByRole("button", { name, exact: true })).toBeVisible();
  }
  const boxes = await Promise.all(["重置", "删除", "推测旗标工具"].map(name => row.getByRole("button", { name, exact: true }).boundingBox()));
  expect(new Set(boxes.map(box => box?.y)).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (info.project.name !== "desktop") {
    const centered = await page.locator(".battle-nav").evaluate(button => {
      const b = button.getBoundingClientRect(), icon = button.querySelector("svg")!.getBoundingClientRect();
      return Math.abs(b.x + b.width / 2 - icon.x - icon.width / 2) < 1;
    });
    expect(centered).toBe(true);
  }
  page.once("dialog", dialog => dialog.dismiss());
  await row.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toContainText("◆");
  page.once("dialog", dialog => dialog.dismiss());
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toContainText("◆");
  await page.screenshot({ path: `/tmp/board-actions-${info.project.name}.png`, fullPage: true });
  page.once("dialog", dialog => dialog.accept());
  await row.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.getByTestId("cell-0")).not.toContainText("◆");
  await page.getByRole("button", { name: "撤销", exact: true }).first().click();
  await expect(page.getByTestId("cell-0")).toContainText("◆");
  page.once("dialog", dialog => dialog.accept());
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toHaveCount(0);
});
