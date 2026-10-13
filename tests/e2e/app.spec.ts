import { test, expect, type Page, type TestInfo } from "@playwright/test";
import path from "node:path";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { createCanvas, loadImage } from "@napi-rs/canvas";
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

test("edit modal has gem, 0–8 and reset; rounded probabilities, recommendation and all legend states", async ({
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
  const minimum = page.viewportSize()!.width >= 640 ? 44 : 18;
  expect(box!.width).toBeGreaterThanOrEqual(minimum);
  expect(box!.height).toBeGreaterThanOrEqual(minimum);
  expect(
    await page
      .locator(".board-scroll")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
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

test("actual user game screenshot automatically fills all 64 cells correctly", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await upload(page, testInfo, ["tests/fixtures/real/tidemyst-8.jpg"]);
  await expect(page.getByRole("heading", { name: "房间 2" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await testInfo.attach("recognized-real-board", {
    body: await page.evaluate(
      () => localStorage.getItem("tidemyst-boards-v1") ?? "",
    ),
    contentType: "application/json",
  });
  const rows = (
    JSON.parse(readFileSync("tests/fixtures/real/tidemyst-8.json", "utf8")) as {
      rows: (string | number)[][];
    }
  ).rows;
  for (const [i, value] of rows.flat().entries()) {
    const label = await page
      .getByTestId(`cell-${i}`)
      .getAttribute("aria-label");
    if (value === "gem") expect(label, `cell ${i}`).toContain("已发现宝石");
    else if (typeof value === "number")
      expect(label, `cell ${i}`).toContain(`数字 ${value}`);
    else expect(label, `cell ${i}`).toMatch(/宝石概率|未知/);
    expect(label, `cell ${i} uncertainty`).not.toContain("需要核对");
  }
  await expect(page.getByText("精确计算", { exact: false })).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/real-import-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

for (const variant of [
  { scale: 1600 / 2532, brightness: 1, quality: 70 },
  { scale: 0.4, brightness: 1, quality: 55 },
  { scale: 1600 / 2532, brightness: 0.8, quality: 75 },
  { scale: 1600 / 2532, brightness: 1.15, quality: 75 },
]) {
  test(`real screenshot survives preprocessing ${JSON.stringify(variant)}`, async ({
    page,
  }, testInfo) => {
    const im = await loadImage("tests/fixtures/real/tidemyst-8.jpg"),
      canvas = createCanvas(
        Math.round(im.width * variant.scale),
        Math.round(im.height * variant.scale),
      ),
      ctx = canvas.getContext("2d");
    ctx.drawImage(im, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < frame.data.length; i += 4)
      for (let ch = 0; ch < 3; ch++)
        frame.data[i + ch] = Math.min(
          255,
          frame.data[i + ch] * variant.brightness,
        );
    ctx.putImageData(frame, 0, 0);
    const input = testInfo.outputPath("variant.jpg");
    await writeFile(input, canvas.toBuffer("image/jpeg", variant.quality));
    await page.goto("/");
    await upload(page, testInfo, [input]);
    await expect(page.getByRole("heading", { name: "房间 2" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("tidemyst-boards-v1") ?? "{}"),
    );
    const board = stored.boards.find(
      (b: { id: string }) => b.id === stored.activeId,
    );
    const truth = JSON.parse(
      readFileSync("tests/fixtures/real/tidemyst-8.json", "utf8"),
    ).rows.flat();
    await testInfo.attach("recognized-board", {
      body: JSON.stringify(board),
      contentType: "application/json",
    });
    expect(
      board.cells.map((c: { observed: string | number }) => c.observed),
    ).toEqual(truth);
    expect(
      board.cells.filter((c: { recognition?: unknown }) => c.recognition),
    ).toHaveLength(0);
    await expect(page.getByText("精确计算", { exact: false })).toBeVisible();
  });
}

test("cell dialog reset clears only this cell and participates in undo, redo and persistence", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await observe(page, 0, "gem");
  await observe(page, 10, 2);
  await page.getByRole("button", { name: "推测旗标工具" }).click();
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "推测旗标工具" }).click();
  await page.getByTestId("cell-0").click();
  await page
    .getByRole("dialog", { name: "编辑 A1" })
    .getByRole("button", { name: "重置此格", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("cell-0")).not.toHaveAttribute(
    "aria-label",
    /已发现宝石|推测旗标/,
  );
  await expect(page.getByTestId("cell-10")).toHaveAttribute(
    "aria-label",
    /数字 2/,
  );
  await page.getByRole("button", { name: "撤销", exact: true }).first().click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /已发现宝石.*推测旗标/,
  );
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("cell-0")).not.toHaveAttribute(
    "aria-label",
    /已发现宝石|推测旗标/,
  );
  await observe(page, 10, 3);
  await page.getByTestId("cell-10").click();
  await page.getByRole("button", { name: "重置此格", exact: true }).click();
  await expect(page.getByTestId("cell-10")).not.toHaveAttribute(
    "aria-label",
    /数字/,
  );
  // Existing low-confidence candidates must be cleared as well, not reappear on reload.
  await upload(page, testInfo, ["tests/fixtures/board-8.png"]);
  await expect(page.getByRole("heading", { name: "房间 2" })).toBeVisible();
  await page.getByTestId("cell-18").click();
  await page.getByRole("button", { name: "重置此格", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("cell-18")).not.toHaveAttribute(
    "aria-label",
    /需要核对/,
  );
});
test("all board sizes fit without internal scrolling and react to live viewport changes", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const size of [8, 10, 12]) {
    if (size !== 8) {
      await page
        .getByRole("combobox", { name: "新房间尺寸" })
        .selectOption(String(size));
      await page.getByRole("button", { name: "新建房间", exact: true }).click();
    }
    let previousWidth = 0;
    for (const width of [320, 375, 390, 430, 768, 844]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      const viewport = page.locator(".board-scroll");
      await expect
        .poll(() =>
          viewport.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        )
        .toBe(true);
      const bounds = await viewport.boundingBox();
      const last = await page.getByTestId(`cell-${size - 1}`).boundingBox();
      const first = await page.getByTestId("cell-0").boundingBox();
      expect(last!.x + last!.width).toBeLessThanOrEqual(
        bounds!.x + bounds!.width + 1,
      );
      expect(Math.abs(first!.width - first!.height)).toBeLessThan(1);
      expect(first!.width).toBeGreaterThan(18);
      if (width === 375) expect(first!.width).toBeGreaterThan(previousWidth);
      previousWidth = first!.width;
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".board-surface").scrollIntoViewIfNeeded();
  await page.locator(".board-surface").screenshot({
    path: `docs/screenshots/adaptive-12-${testInfo.project.name}.png`,
  });
  await page.getByTestId("cell-0").click();
  await expect(
    page.getByRole("button", { name: "重置此格", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/screenshots/reset-dialog-${testInfo.project.name}.png`,
  });
});

test("progress share links restore a frozen room without overwriting other rooms or duplicating on refresh", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await observe(page, 0, "gem");
  await observe(page, 10, 2);
  await page.getByRole("button", { name: "推测旗标工具" }).click();
  await page.getByTestId("cell-2").click();
  await page.getByRole("button", { name: "推测旗标工具" }).click();
  await page.getByRole("button", { name: "分享当前进度", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "分享链接", exact: true });
  await expect(dialog).toBeVisible();
  const link = await dialog
    .getByRole("textbox", { name: "分享链接地址" })
    .inputValue();
  expect(link).toContain("#progress=");
  expect(link.length).toBeLessThan(600);
  await expect(dialog).toContainText("本地测试地址");
  await dialog.getByRole("button", { name: "关闭分享" }).click();
  await observe(page, 0, 1);
  // Navigate to a smaller shared board while a larger board's last-cell editor is open.
  await page.getByRole("combobox", { name: "新房间尺寸" }).selectOption("12");
  await page.getByRole("button", { name: "新建房间", exact: true }).click();
  await page.getByTestId("cell-143").click();
  await page.goto(link);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /已发现宝石/,
  );
  await expect(page.getByTestId("cell-10")).toHaveAttribute(
    "aria-label",
    /数字 2/,
  );
  await expect(page.getByTestId("cell-2")).toHaveAttribute(
    "aria-label",
    /推测旗标/,
  );
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(3);
  await observe(page, 1, 3);
  await page.reload();
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(3);
  await expect(page.getByTestId("cell-1")).toHaveAttribute(
    "aria-label",
    /数字 3/,
  );
  await page.getByRole("button", { name: "分享工具", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    await dialog.getByRole("textbox", { name: "分享链接地址" }).inputValue(),
  ).not.toContain("#progress=");
  await page.screenshot({
    path: `docs/screenshots/share-${testInfo.project.name}.png`,
  });
});
test("link copy supports browser denial and invalid snapshots keep existing data", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("denied")) },
    });
    document.execCommand = () => false;
  });
  await page.goto("/");
  await observe(page, 0, "gem");
  await page.getByRole("button", { name: "分享工具", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "分享链接", exact: true });
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "复制测试链接", exact: true })
    .click();
  await expect(dialog).toContainText("长按");
  await dialog.getByRole("button", { name: "关闭分享" }).click();
  await page.goto("/#progress=not-a-complete-link");
  await expect(page.getByRole("status")).toContainText("分享链接无效");
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /已发现宝石/,
  );
  await expect(page.getByRole("button", { name: /切换房间/ })).toHaveCount(1);
});

test("one copy button places the exact progress link on the clipboard", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          (window as Window & { copiedShare?: string }).copiedShare = text;
          return Promise.resolve();
        },
      },
    }),
  );
  await page.goto("/");
  await observe(page, 0, "gem");
  await page.getByRole("button", { name: "分享当前进度", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "分享链接", exact: true });
  await expect(dialog).toBeVisible();
  const link = await dialog
    .getByRole("textbox", { name: "分享链接地址" })
    .inputValue();
  await dialog
    .getByRole("button", { name: "复制测试链接", exact: true })
    .click();
  await expect(dialog).toContainText("测试链接已复制");
  expect(
    await page.evaluate(
      () => (window as Window & { copiedShare?: string }).copiedShare,
    ),
  ).toBe(link);
  expect(link).toContain("#progress=");
});
