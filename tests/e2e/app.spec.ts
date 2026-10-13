import { test, expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
async function observe(page: Page, index: number, value: number | "gem") {
  await page.getByTestId(`cell-${index}`).click();
  const dialog = page.getByRole("dialog", { name: /编辑 / });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", {
      name: value === "gem" ? "记录宝石" : `记录数字 ${value}`,
      exact: true,
    })
    .click();
  await expect(dialog).not.toBeVisible();
}
async function upload(page: Page, testInfo: TestInfo, files: string[]) {
  const choosing = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "读取截图", exact: true })
    .first()
    .click();
  if (testInfo.project.name !== "desktop") {
    const source = page.getByRole("dialog", { name: "选择截图来源" });
    await expect(source.getByRole("button", { name: /拍照/ })).toBeVisible();
    await source.getByRole("button", { name: /从相册选择/ }).click();
  }
  await (await choosing).setFiles(files.map((f) => path.resolve(f)));
}

test("edit modal has exactly gem and 0–8; rounded probabilities, recommendation and all legend states", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("cell-0")).toContainText("31%");
  await expect(page.getByTestId("cell-9")).toHaveAttribute(
    "data-recommended",
    "true",
  );
  await expect(page.locator(".full-legend>span")).toHaveCount(8);
  for (const text of [
    "已发现宝石",
    "已翻开，周围宝石数",
    "宝石概率，%",
    "推荐下一步",
    "确定有宝石",
    "确定为空",
    "用户推测旗标",
    "数字矛盾，请检查记录",
  ])
    await expect(page.locator(".full-legend")).toContainText(text);
  await page.getByTestId("cell-0").click();
  const dialog = page.getByRole("dialog", { name: "编辑 A1" });
  await expect(dialog.getByRole("button", { name: /记录数字/ })).toHaveCount(9);
  await expect(
    dialog.getByRole("button", { name: "记录宝石", exact: true }),
  ).toBeVisible();
  await expect(dialog.locator(".state-picker")).toHaveCount(0);
  await dialog.getByRole("button", { name: "记录数字 0", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("cell-1")).toContainText("×");
  await page.getByRole("button", { name: "撤销", exact: true }).first().click();
  await expect(page.getByTestId("cell-0")).toContainText("31%");
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
  for (const [size, p] of [
    ["10", "30%"],
    ["12", "31%"],
  ]) {
    await page.getByRole("combobox", { name: "新房间尺寸" }).selectOption(size);
    await page.getByRole("button", { name: "新建房间", exact: true }).click();
    await expect(page.getByTestId("cell-0")).toContainText(p);
  }
  await page.getByRole("button", { name: /切换.*模式/ }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    /dark|light/,
  );
  const box = await page.getByTestId("cell-0").boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(3);
});
test("flags and erase remain available outside the observation dialog", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "推测旗标工具", exact: true }).click();
  await page.getByTestId("cell-0").click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /推测旗标/,
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "推测旗标工具", exact: true }).click();
  await observe(page, 0, 1);
  await page.getByRole("button", { name: "擦除记录工具", exact: true }).click();
  await page.getByTestId("cell-0").click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute("aria-label", /31%/);
});
test("upload automatically recognizes, fills board and closes progress without parameters", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await upload(page, testInfo, ["tests/fixtures/board-8.png"]);
  await expect(page.getByRole("heading", { name: "房间 2" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /数字 0/,
  );
  await expect(
    page.getByRole("button", { name: "开始识别", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: "识别棋盘尺寸" }),
  ).toHaveCount(0);
  await expect(page.getByTestId("cell-18")).toHaveAttribute(
    "aria-label",
    /需要核对/,
  );
  await observe(page, 18, "gem");
  await expect(page.getByTestId("cell-18")).toHaveAttribute(
    "aria-label",
    /已发现宝石/,
  );
  await expect(page.getByTestId("cell-18")).not.toHaveClass(/review/);
  await page.reload();
  await expect(page.getByTestId("cell-18")).toHaveAttribute(
    "aria-label",
    /已发现宝石/,
  );
});
test("multiple screenshots infer 8/10/12 sizes without user settings", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await upload(page, testInfo, [
    "tests/fixtures/board-8.png",
    "tests/fixtures/board-10.png",
    "tests/fixtures/board-12.png",
  ]);
  await expect(page.getByRole("heading", { name: "房间 4" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "12乘12棋盘" })).toBeVisible();
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(4);
  await page.reload();
  await expect(page.getByRole("heading", { name: "房间 4" })).toBeVisible();
});
test("mobile camera source uses capture input and starts recognition automatically", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "desktop",
    "desktop directly uploads files",
  );
  await page.goto("/");
  await expect(page.getByTestId("camera-input")).toHaveAttribute(
    "capture",
    "environment",
  );
  await page
    .getByRole("button", { name: "读取截图", exact: true })
    .first()
    .click();
  const choosing = page.waitForEvent("filechooser");
  await page
    .getByRole("dialog", { name: "选择截图来源" })
    .getByRole("button", { name: /^拍照/ })
    .click();
  await (await choosing).setFiles(path.resolve("tests/fixtures/board-8.png"));
  await expect(page.getByRole("heading", { name: "房间 2" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /数字 0/,
  );
});
test("provided legend is rejected instead of filling a fabricated board", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await upload(page, testInfo, ["tests/fixtures/legend-reference.png"]);
  await expect(page.getByRole("alert")).toContainText("未检测到完整");
  await page
    .getByRole("button", { name: "返回棋盘，重新上传", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(1);
  await expect(page.getByTestId("cell-0")).toContainText("31%");
});
test("JSON export import validates files", async ({ page }) => {
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出", exact: true }).click();
  const file = await download;
  const location = await file.path();
  expect(location).toBeTruthy();
  await page.locator(".room-sidebar input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":2,"boards":[]}'),
  });
  await expect(page.locator(".toast")).toContainText("不是有效");
  await page.locator(".room-sidebar input[type=file]").setInputFiles(location!);
  await expect(page.locator(".toast")).toContainText("数据已导入");
});
test("storage refusal and corrupt image do not destroy observations", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("blocked", "SecurityError");
    };
  });
  await page.goto("/");
  await observe(page, 0, "gem");
  await expect(page.locator(".toast")).toContainText("无法保存");
  await page.getByTestId("screenshot-input").setInputFiles({
    name: "bad.png",
    mimeType: "image/png",
    buffer: Buffer.from("invalid png"),
  });
  await expect(page.getByRole("alert")).toContainText("无法解码");
  await page.getByRole("button", { name: "关闭图片识别", exact: true }).click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /已发现宝石/,
  );
});
test("actual numeric OCR runs entirely from same-origin resources", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "same core OCR smoke; worker model loading is tested on each engine",
  );
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const modulePath = "/src/features/image-recognition/pipeline.ts",
      module = (await import(
        modulePath
      )) as typeof import("../../src/features/image-recognition/pipeline");
    const response = await fetch("/tests/fixtures/digit-5.png"),
      bitmap = await createImageBitmap(await response.blob()),
      canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const cells = await module.recognizeCells(
      {
        image,
        rect: { x: 0, y: 0, width: image.width, height: image.height },
        size: 1,
        templates: [],
        ocr: true,
        assetBase: location.origin + "/ocr",
      },
      () => {},
    );
    return cells;
  });
  expect(result[0].cell.observed).toBe(5);
  expect(requests.some((u) => u.includes("/ocr/lang/"))).toBe(true);
  expect(
    requests
      .filter((u) => /^https?:/.test(u))
      .every((u) => u.startsWith("http://127.0.0.1:5173")),
  ).toBe(true);
});
test("cancel automatically-started OCR leaves the previous room intact", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await observe(page, 0, 3);
  const model = page.context().waitForEvent("response", {
    predicate: (r) => r.url().includes("/ocr/lang/eng.traineddata"),
  });
  await upload(page, testInfo, ["tests/fixtures/board-ambiguous.png"]);
  expect((await model).status()).toBe(200);
  await page.getByRole("button", { name: "取消识别", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /数字 3/,
  );
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(1);
});
test("capture revised desktop and mobile layout and modal", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.getByTestId("cell-9")).toHaveAttribute(
    "data-recommended",
    "true",
  );
  await page.screenshot({
    path: `docs/screenshots/revised-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByTestId("cell-0").click();
  await expect(page.getByRole("dialog", { name: "编辑 A1" })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/editor-${testInfo.project.name}.png`,
  });
});
