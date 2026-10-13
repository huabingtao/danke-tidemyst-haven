import { test, expect } from "@playwright/test";
import path from "node:path";
test("edit, solve, undo/redo, restore, all sizes and themes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("cell-0")).toContainText("31.25%");
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录数字 0", exact: true }).click();
  await expect(page.getByTestId("cell-1")).toContainText("×");
  await page.getByRole("button", { name: "关闭格子编辑", exact: true }).click();
  await page.getByRole("button", { name: "撤销", exact: true }).first().click();
  await expect(page.getByTestId("cell-0")).toContainText("31.25%");
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /数字 0/,
  );
  await page.reload();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /数字 0/,
  );
  await page.getByRole("combobox", { name: "新房间尺寸" }).selectOption("10");
  await page.getByRole("button", { name: "新建房间", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toContainText("30%");
  await page.getByRole("combobox", { name: "新房间尺寸" }).selectOption("12");
  await page.getByRole("button", { name: "新建房间", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toContainText("31.25%");
  await page.getByRole("button", { name: /切换.*模式/ }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    /dark|light/,
  );
  const cellBox = await page.getByTestId("cell-0").boundingBox();
  expect(cellBox!.width).toBeGreaterThanOrEqual(44);
  expect(cellBox!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(3);
});
test("upload, recognize, manually correct and confirm before solving", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "读取截图", exact: true })
    .first()
    .click();
  await page
    .locator("dialog input[type=file][multiple]")
    .setInputFiles(path.resolve("tests/fixtures/board-8.png"));
  await expect(page.locator("dialog canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "开始识别", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("数字 OCR 辅助").uncheck();
  await page.getByRole("button", { name: "开始识别", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "确认导入并计算", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "确认导入并计算", exact: true }),
  ).toBeDisabled();
  await page.locator("dialog").getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录数字 0", exact: true }).click();
  await page.locator("dialog").getByTestId("cell-1").click();
  await page.getByRole("button", { name: "? 未知", exact: true }).click();
  await page.getByLabel("我已核对尺寸、总数与格子；未知内容保留为未知").check();
  await page
    .getByRole("button", { name: "确认导入并计算", exact: true })
    .click();
  await expect(page.locator("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "房间 截图 1" }),
  ).toBeVisible();
  await expect(page.getByTestId("cell-1")).toContainText("×");
});
test("JSON export import and invalid file rejection", async ({ page }) => {
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const file = await download;
  const location = await file.path();
  expect(location).toBeTruthy();
  await page
    .locator(".room-sidebar input[type=file]")
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":2,"boards":[]}'),
    });
  await expect(page.locator(".toast")).toContainText("不是有效");
  await page.locator(".room-sidebar input[type=file]").setInputFiles(location!);
  await expect(page.locator(".toast")).toContainText("数据已导入");
});
test("actual numeric OCR runs entirely from same-origin resources", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "OCR core smoke is shared; UI recognition is tested on all engines",
  );
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/features/image-recognition/pipeline.ts";
    const module = (await import(
      modulePath
    )) as typeof import("../../src/features/image-recognition/pipeline");
    const response = await fetch("/tests/fixtures/digit-5.png"),
      blob = await response.blob(),
      bitmap = await createImageBitmap(blob),
      canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const progress: string[] = [];
    const cells = await module.recognizeCells(
      {
        image,
        rect: { x: 0, y: 0, width: image.width, height: image.height },
        size: 1,
        templates: [],
        ocr: true,
        assetBase: location.origin + "/ocr",
      },
      (p: { message: string }) => progress.push(p.message),
    );
    return { cells, progress };
  });
  expect(
    result.progress.some((p: string) => p.includes("加载本地数字 OCR")),
  ).toBe(true);
  expect(result.cells[0].cell.observed).toBe(5);
  expect(requests.some((u) => u.includes("/ocr/lang/eng.traineddata"))).toBe(
    true,
  );
  expect(
    requests
      .filter((u) => /^https?:/.test(u))
      .every((u) => u.startsWith("http://127.0.0.1:5173")),
  ).toBe(true);
});
test("multiple screenshots import in sequence", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "读取截图", exact: true })
    .first()
    .click();
  await page
    .locator("dialog input[type=file][multiple]")
    .setInputFiles([
      path.resolve("tests/fixtures/board-8.png"),
      path.resolve("tests/fixtures/board-10.png"),
    ]);
  await expect(
    page.getByRole("button", { name: "开始识别", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("数字 OCR 辅助").uncheck();
  for (const size of ["8", "10"]) {
    await expect(
      page.getByRole("combobox", { name: "识别棋盘尺寸" }),
    ).toHaveValue(size);
    await page.getByRole("button", { name: "开始识别", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "确认导入并计算", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("我已核对尺寸、总数与格子；未知内容保留为未知")
      .check();
    await page
      .getByRole("button", { name: "确认导入并计算", exact: true })
      .click();
  }
  await expect(page.locator("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(3);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "房间 截图 2" }),
  ).toBeVisible();
});
test("storage failure and corrupt images leave the application usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "◆ 宝石", exact: true }).click();
  await expect(page.locator(".toast")).toContainText("无法保存");
  await page.getByRole("button", { name: "关闭格子编辑", exact: true }).click();
  await page
    .getByRole("button", { name: "读取截图", exact: true })
    .first()
    .click();
  await page
    .locator("dialog input[type=file][multiple]")
    .setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid png"),
    });
  await expect(page.locator("dialog").getByRole("alert")).toContainText(
    "无法解码",
  );
  await page.getByRole("button", { name: "关闭图片识别", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /已发现宝石/,
  );
});
test("screenshots capture working desktop and mobile layouts", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByTestId("cell-0")).toContainText("31.25%");
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录数字 0", exact: true }).click();
  await page.getByRole("button", { name: "关闭格子编辑", exact: true }).click();
  await expect(page.getByTestId("cell-1")).toContainText("×");
  await page.screenshot({
    path: `docs/screenshots/${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("cancelling recognition preserves manually edited cells", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "读取截图", exact: true })
    .first()
    .click();
  await page
    .locator("dialog input[type=file][multiple]")
    .setInputFiles(path.resolve("tests/fixtures/board-ambiguous.png"));
  await page
    .getByRole("button", { name: "从空棋盘手动校正", exact: true })
    .click();
  await page.locator("dialog").getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录数字 1", exact: true }).click();
  const model = page
    .context()
    .waitForEvent("response", {
      predicate: (r) => r.url().includes("/ocr/lang/eng.traineddata"),
    });
  await page.getByRole("button", { name: "重新识别", exact: true }).click();
  expect((await model).status()).toBe(200);
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(page.locator("dialog").getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /数字 1/,
  );
  await expect(page.locator("dialog .recognition-progress")).toContainText(
    "已取消",
  );
});
