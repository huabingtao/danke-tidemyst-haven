import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loadImage } from "@napi-rs/canvas";
import { createBoard } from "../../src/core/models";
const b = createBoard();
b.id = "battle-e2e-source";
delete b.roundId;
const rows = (
  JSON.parse(readFileSync("tests/fixtures/real/tidemyst-8.json", "utf8")) as {
    rows: (string | number)[][];
  }
).rows;
b.cells = rows.flat().map((o) => ({
  observed: o === "gem" ? "gem" : typeof o === "number" ? o : "unknown",
  flagged: false,
}));
test.beforeEach(async ({ page }) => {
  const completed = new Set<string>();
  await page.route("**/api/stats**", (route) => {
    if (route.request().url().endsWith("/completed"))
      completed.add(route.request().postDataJSON().roundId);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ online: 2, totalCompleted: completed.size }),
    });
  });
  await page.addInitScript((board) => {
    if (!localStorage.getItem("tidemyst-boards-v1"))
      localStorage.setItem(
        "tidemyst-boards-v1",
        JSON.stringify({ version: 1, boards: [board], activeId: board.id }),
      );
  }, b);
});
test("battle snapshots, PNGs, read-only restore, re-settlement and cumulative history work together", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByText("精确计算", { exact: false })).toBeVisible();
  if (info.project.name === "desktop")
    await page.screenshot({
      path: "docs/screenshots/yellow-blue-desktop.png",
      fullPage: true,
    });
  else {
    await page
      .locator(".board-surface")
      .evaluate((el) => el.scrollIntoView({ block: "start" }));
    await page.screenshot({
      path: `docs/screenshots/yellow-blue-${info.project.name}.png`,
    });
  }
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  const current = page.locator(".current-battle");
  await expect(current.getByTestId("battle-spent")).toContainText("31");
  await expect(current.getByTestId("battle-found")).toContainText("14");
  await expect(current.getByTestId("battle-hit")).toHaveText("45%");
  await expect(current.getByTestId("battle-completion")).toHaveText("70%");
  await page.getByRole("button", { name: "分享当前战绩", exact: true }).click();
  const result = page.getByRole("region", { name: "战绩分享结果" });
  await expect(result.getByTestId("battle-poster")).toBeVisible();
  const link = await result
    .getByRole("textbox", { name: "只读战绩链接" })
    .inputValue();
  expect(link).toContain("#battle=");
  await expect(result).toContainText("进行中");
  const downloading = page.waitForEvent("download");
  await result.getByRole("button", { name: "下载图片", exact: true }).click();
  const download = await downloading;
  await download.saveAs(
    `docs/screenshots/battle-poster-${info.project.name}.png`,
  );
  const im = await loadImage(
    `docs/screenshots/battle-poster-${info.project.name}.png`,
  );
  expect([im.width, im.height]).toEqual([1080, 1440]);
  await page.screenshot({
    path: `docs/screenshots/battle-share-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "结束本局", exact: true }).click();
  await expect(page.locator(".battle-record")).toHaveCount(1);
  await expect(current.locator(".battle-status")).toHaveText("已结算");
  await page.screenshot({
    path: `docs/screenshots/battle-settled-${info.project.name}.png`,
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "重新结算本局" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "重新结算本局" }).click();
  await expect(page.locator(".battle-record")).toHaveCount(1);
  await expect(page.locator(".community-stats")).toContainText(
    /累计完成\s*1\s*局/,
  );
  // Full-page mobile captures can leave the emulated visual viewport displaced.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "回到棋盘" }).click();
  await page.getByTestId("cell-12").click();
  await page.getByRole("button", { name: "重置此格", exact: true }).click();
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  await expect(
    page.locator(".current-battle").getByTestId("battle-found"),
  ).toContainText("13");
  await expect(current.locator(".battle-status")).toHaveText(
    "有修改待重新结算",
  );
  await page.screenshot({
    path: `docs/screenshots/battle-changed-${info.project.name}.png`,
    fullPage: true,
  });
  await expect(
    page.locator(".battle-record").getByTestId("battle-found"),
  ).toContainText("14");
  // Full-page mobile captures can leave the emulated visual viewport displaced.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "回到棋盘" }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录宝石", exact: true }).click();
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  await page.getByRole("button", { name: "结束本局", exact: true }).click();
  await expect(page.locator(".battle-record")).toHaveCount(2);
  for (const item of await page
    .locator(".battle-record input[type=checkbox]")
    .all())
    await item.check();
  await page.getByRole("button", { name: "分享累计战绩", exact: true }).click();
  await expect(result).toContainText("2 局累计战绩");
  await expect(result.getByTestId("battle-poster")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  await expect(page.locator(".battle-record")).toHaveCount(2);
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tidemyst-boards-v2")!),
  );
  await page.goto(link);
  await expect(
    page.getByRole("heading", { name: "我的潮汐秘境战绩", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("battle-spent")).toContainText("31");
  await expect(page.getByTestId("battle-hit")).toHaveText("45%");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tidemyst-boards-v2")!),
    ),
  ).toEqual(before);
  expect(
    await page
      .getByRole("link", { name: "打开工具，开始我的一局" })
      .getAttribute("href"),
  ).not.toContain("#battle");
  await page.screenshot({
    path: `docs/screenshots/battle-readonly-${info.project.name}.png`,
    fullPage: true,
  });
});
test("battle image cancellation, save fallback and unavailable statistics preserve local play", async ({
  page,
}) => {
  await page.unroute("**/api/stats**");
  await page.route("**/api/stats**", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: () => Promise.reject({ name: "AbortError" }),
    });
  });
  await page.goto("/");
  await expect(page.locator(".community-stats")).toContainText("统计暂不可用");
  await page.getByRole("button", { name: "我的战绩", exact: true }).click();
  await page.getByRole("button", { name: "分享当前战绩", exact: true }).click();
  const result = page.getByRole("region", { name: "战绩分享结果" });
  await expect(result.getByTestId("battle-poster")).toBeVisible();
  await result
    .getByRole("button", { name: "分享战绩图片", exact: true })
    .click();
  await expect(result).toContainText("已取消图片分享");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  await result
    .getByRole("button", { name: "分享战绩图片", exact: true })
    .click();
  await expect(result).toContainText("长按预览保存");
  await page.goto("/#battle=invalid!");
  await expect(
    page.getByRole("heading", { name: "无法打开战绩" }),
  ).toBeVisible();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tidemyst-boards-v2")!),
  );
  expect(stored.boards[0].cells[12].observed).toBe("gem");
});
test("yellow-blue dark mode and 12-column boards fit a 320px screen", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("combobox", { name: "新房间尺寸" }).selectOption("12");
  await page.getByRole("button", { name: "新建房间", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page
        .locator(".board-scroll")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    )
    .toBe(true);
  await page.getByRole("button", { name: "切换深色模式" }).click();
  await page
    .locator(".board-surface")
    .evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.screenshot({
    path: `docs/screenshots/yellow-blue-dark-${info.project.name}.png`,
  });
  await page.getByTestId("cell-143").click();
  await expect(page.getByRole("dialog", { name: "编辑 L12" })).toBeVisible();
});
