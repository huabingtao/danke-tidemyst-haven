import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Remote OCR downloads can exceed the 10-second localhost assertion window.
export default defineConfig({
  ...base,
  testDir: "tests",
  testMatch: [
    "e2e/app.spec.ts",
    "e2e/wechat-save.spec.ts",
    "deployment/*.spec.ts",
  ],
  grep: /actual user game screenshot automatically|edit modal has gem|public deployment shares|public deployment battle|WeChat download previews/,
  expect: { timeout: 45000 },
  use: {
    ...base.use,
    baseURL: process.env.E2E_BASE_URL ?? "https://dankecxmj.guaguahub.cn",
  },
  webServer: undefined,
});
