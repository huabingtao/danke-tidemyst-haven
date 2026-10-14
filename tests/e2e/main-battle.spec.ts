import { test, expect } from "@playwright/test";

test("finish and share current room without leaving the board", async ({ page }, info) => {
  // Prevent browser acceptance checks from adding artificial public completions.
  await page.route("**/api/stats/completed", route => route.fulfill({ json: { online: 1, totalCompleted: 1 } }));
  await page.goto("/");
  const finish = page.getByRole("button", { name: "结束本局并晒战绩", exact: true });
  await expect(finish).toBeDisabled();
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录宝石", exact: true }).click();
  await expect(finish).toBeEnabled();
  await finish.click();
  const dialog = page.getByRole("dialog", { name: "晒本局战绩", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".poster-preview img")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "下载图片", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "复制战绩链接", exact: true })).toBeVisible();
  await expect(page.getByTestId("cell-0")).toHaveCount(1);
  await page.screenshot({ path: `/tmp/main-battle-${info.project.name}.png`, fullPage: true });
  await dialog.getByRole("button", { name: "关闭战绩分享" }).click();
  await finish.click();
  await expect(dialog).toBeVisible();
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem("tidemyst-boards-v2")!).records);
  expect(records).toHaveLength(1);
  expect(records[0].spent).toBe(1);
  expect(records[0].found).toBe(1);
});
