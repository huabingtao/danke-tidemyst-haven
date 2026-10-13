import { test, expect } from "@playwright/test";

test("public deployment shares its HTTPS address and restores the frozen progress", async ({
  page,
  browser,
}, testInfo) => {
  // Observe the copied value without changing the user's clipboard or invoking an OS share sheet.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          sessionStorage.setItem("copied-share", value);
        },
      },
    });
  });
  await page.goto("/");
  const origin = new URL(page.url()).origin;
  expect(origin).toMatch(/^https:\/\//);
  await page.getByTestId("cell-0").click();
  await page.getByRole("button", { name: "记录宝石", exact: true }).click();
  await page.getByTestId("cell-10").click();
  await page.getByRole("button", { name: "记录数字 2", exact: true }).click();
  await page.getByRole("button", { name: "分享当前进度", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "分享链接", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).not.toContainText("本地测试地址");
  const link = await dialog
    .getByRole("textbox", { name: "分享链接地址" })
    .inputValue();
  expect(link).toContain(`${origin}/#progress=`);
  expect(
    await page.evaluate(() => sessionStorage.getItem("copied-share")),
  ).toBe(link);
  await testInfo.attach("public-progress-link", {
    body: link,
    contentType: "text/plain",
  });

  const recipient = await browser.newContext({ ...testInfo.project.use });
  try {
    const receivingPage = await recipient.newPage();
    await receivingPage.goto(link);
    await expect(receivingPage.getByTestId("cell-0")).toHaveAttribute(
      "aria-label",
      /已发现宝石/,
    );
    await expect(receivingPage.getByTestId("cell-10")).toHaveAttribute(
      "aria-label",
      /数字 2/,
    );
    await expect(
      receivingPage.getByRole("button", { name: /切换房间/ }),
    ).toHaveCount(2);
    await receivingPage.reload();
    await expect(
      receivingPage.getByRole("button", { name: /切换房间/ }),
    ).toHaveCount(2);
  } finally {
    await recipient.close();
  }
  await dialog.getByRole("button", { name: "关闭分享" }).click();
  await page.getByRole("button", { name: "分享工具", exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    await dialog.getByRole("textbox", { name: "分享链接地址" }).inputValue(),
  ).toBe(`${origin}/`);
  await page.screenshot({
    path: `docs/screenshots/production-${testInfo.project.name}.png`,
  });
});
