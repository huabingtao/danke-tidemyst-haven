import { test, expect } from "@playwright/test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { battleLink } from "../../src/features/battle/links";

test("public deployment battle has a read-only snapshot and a downloadable QR poster", async ({
  page,
  request,
}, info) => {
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  const before = await page.evaluate(() =>
    localStorage.getItem("tidemyst-boards-v2"),
  );
  const url = battleLink(
    {
      kind: "progress",
      room: "15",
      rounds: 1,
      spent: 31,
      found: 14,
      totalGems: 20,
      createdAt: Date.UTC(2026, 9, 14),
    },
    origin + "/",
  );
  await page.goto(url);
  await expect(
    page.getByRole("heading", { name: "我的潮汐秘境战绩", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("battle-hit")).toHaveText("45%");
  await expect(page.getByTestId("battle-completion")).toHaveText("70%");
  await expect(page.getByTestId("battle-poster")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("tidemyst-boards-v2")),
  ).toBe(before);
  const waiting = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载图片", exact: true }).click();
  const download = await waiting;
  const path = `docs/screenshots/production-battle-poster-${info.project.name}.png`;
  await download.saveAs(path);
  const image = await loadImage(path),
    canvas = createCanvas(image.width, image.height),
    ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  expect(
    jsQR(
      new Uint8ClampedArray(
        ctx.getImageData(0, 0, image.width, image.height).data,
      ),
      image.width,
      image.height,
    )?.data,
  ).toBe(url);
  await page.screenshot({
    path: `docs/screenshots/production-battle-${info.project.name}.png`,
    fullPage: true,
  });
  const response = await request.get("/api/stats");
  expect(response.ok()).toBe(true);
  const stats = await response.json();
  expect(stats.online).toBeGreaterThanOrEqual(0);
  expect(stats.totalCompleted).toBeGreaterThanOrEqual(0);
  // No completed-round event is emitted by this smoke test.
});
