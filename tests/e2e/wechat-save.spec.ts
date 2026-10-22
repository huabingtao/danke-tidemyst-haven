import { test, expect } from "@playwright/test";
import { battleLink } from "../../src/features/battle/links";
const snapshot = {
  kind: "progress" as const,
  room: "15",
  rounds: 1,
  spent: 31,
  found: 14,
  totalGems: 20,
  createdAt: Date.UTC(2026, 9, 14),
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: navigator.userAgent + " MicroMessenger/8.0",
    }),
  );
});
test("WeChat download previews a normal URL PNG with native long-press enabled and only two actions", async ({
  page,
  request,
}, info) => {
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  await page.getByRole("button", { name: "分享当前战绩", exact: true }).click();
  const card = page.getByRole("region", { name: "战绩分享卡片" });
  const image = card.getByTestId("battle-poster");
  await expect(image).toHaveAttribute(
    "src",
    new RegExp(
      "^" +
        origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
        "/api/battle-images/[a-f0-9]{32}\\.png$",
    ),
  );
  await expect(card.locator(".poster-tools button")).toHaveCount(2);
  await expect(card.getByRole("textbox")).toHaveCount(0);
  const url = (await image.getAttribute("src"))!;
  const response = await request.get(url);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  expect(response.headers()["content-disposition"]).toContain("inline");
  const head = await request.head(url);
  expect(head.ok()).toBe(true);
  expect(head.headers()["content-type"]).toContain("image/png");
  const body = await response.body();
  expect(body.readUInt32BE(16)).toBe(1080);
  expect(body.readUInt32BE(20)).toBe(1440);
  await card.getByRole("button", { name: "下载图片", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "保存战绩图片",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("wechat-save-image")).toHaveAttribute(
    "src",
    url,
  );
  expect(
    await dialog
      .getByTestId("wechat-save-image")
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue("-webkit-touch-callout"),
      ),
  ).not.toBe("none");
  await page.screenshot({
    path: `docs/screenshots/wechat-save-${info.project.name}.png`,
  });
  await dialog
    .getByRole("button", { name: "关闭战绩图片预览", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
});
test("WeChat image preparation failure preserves link copying and supports retry", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/battle-images", async (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.continue(),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  await page.getByRole("button", { name: "分享当前战绩", exact: true }).click();
  const card = page.getByRole("region", { name: "战绩分享卡片" });
  await expect(card).toContainText("微信图片准备失败");
  await expect(
    card.getByRole("button", { name: "复制战绩链接", exact: true }),
  ).toBeEnabled();
  fail = false;
  await card.getByRole("button", { name: "下载图片", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "保存战绩图片", exact: true }),
  ).toBeVisible();
});

test("WeChat scanned battle has a leading play entry and no download or image upload", async ({ page }) => {
  let uploads = 0;
  await page.route("**/api/battle-images", route => {
    uploads++;
    return route.fulfill({ status: 503, body: "not needed" });
  });
  await page.goto("/");
  await page.goto(battleLink(snapshot, new URL(page.url()).origin + "/"));
  await expect(page.getByRole("link", { name: "我也来一局", exact: true })).toBeInViewport();
  await expect(page.getByTestId("battle-poster")).toBeVisible();
  await expect(page.getByRole("button", { name: "下载图片", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "复制战绩链接", exact: true })).toBeVisible();
  expect(uploads).toBe(0);
});
