import { test, expect } from "@playwright/test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { battleLink } from "../../src/features/battle/links";

test("public deployment battle has a read-only snapshot and a QR poster and a prominent play entry", async ({
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
  await expect(
    page.getByRole("button", { name: "下载图片", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "我也来一局", exact: true }),
  ).toBeInViewport();
  const entry = page.getByRole("link", { name: "我也来一局", exact: true });
  expect(await entry.getAttribute("href")).not.toContain("#battle");
  const pngBytes = await page
    .getByTestId("battle-poster")
    .evaluate(async (img: HTMLImageElement) => {
      const response = await fetch(img.src);
      return Array.from(new Uint8Array(await response.arrayBuffer()));
    });
  const image = await loadImage(Buffer.from(pngBytes)),
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
  await entry.click();
  await expect(page.locator(".board-grid")).toBeVisible();
  // No completed-round event is emitted by this smoke test.
});
