# Real Screenshot Recognition Implementation Plan

> 执行方式：当前会话逐项实现，沿用用户已授权的自动开发流程。纯前端、本地处理；核心算法保持独立。

**Goal:** 修复用户提供的真实游戏截图识别，自动正确填入 8×8 棋盘。
**Architecture:** 增加真实游戏外框/间隙定位和盖板/金色宝石/白色数字通路，复用模板和同源 OCR，保留通用后备。
**Tech Stack:** TypeScript、Canvas、Web Worker、Tesseract、Vitest、Playwright。

## Tasks

- [x] 将人工逐格标注写入 tests/fixtures/real/tidemyst-8.json，在 tests/image-recognition/game.test.ts 用原图及变体验证定位和分类，先复现失败。
- [x] 将 normalizeMask/matchDigit 抽至 glyph.ts，pixels.ts 保留原导出；gameBoard.ts 实现青色连通外框、深色间隙尺寸校验和三类格子特征；不可使用截图绝对坐标或硬编码格子结果。
- [x] pixels.detectGrid 优先可信游戏定位，否则回退通用网格。GridDetection.profile 和 RecognitionRequest.profile 传入真实皮肤识别通路。
- [x] pipeline 提取白色数字掩码，弱数字候选用 OCR 二次判断；蓝色盖板跳过 OCR。automaticCells 接受可靠金色宝石，弱结果仍保持未知并供校正。补充适合描边粗体数字的字体模板。
- [x] Playwright 自动上传真实原图并逐格核对、确认 14 颗已发现与 6 颗剩余及无矛盾。验证桌面/手机 Chromium/WebKit，保留自动关闭弹窗、取消、多图及旧合成输入测试。另增同一真实图四种预处理变体的三个浏览器全流程对照。
- [x] 执行 npm test、npm run test:e2e、npm run build 和 dist 真实截图冒烟；记录样本范围与剩余泛化限制并保存交付截图。
