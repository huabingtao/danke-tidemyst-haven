# WeChat Poster Save Implementation Plan

**Goal:** 两个分享按钮与微信 HTTPS 图片保存通路。
**Architecture:** 本地 Canvas PNG；微信通过现有 Node 服务临时发布同源 PNG，再用 img/dialog 预览；普通浏览器仍 Blob 下载。纯数据战绩链接不变。
**Tech Stack:** React/TypeScript、Node fs/http、Vitest、Playwright。

- [x] server/battle-images.mjs + server/stats.mjs：PNG POST/GET、格式/配额/来源、24 小时清理；server/battle-images.test.mjs 验证字节往返、过期/重启、无效体和来源。
- [x] src/adapters/battleImage.ts：uploadBattleImage(blob, signal) 返回同源地址和过期时间；验证响应来源，超时及取消。
- [x] src/components/battle/BattlePoster.tsx：只留下载/复制；微信自动预备普通 URL，失败下载重试；src/components/battle/BattleSavePreview.tsx 用 dialog 大图和手动复制降级，移除常驻输入。
- [x] src/styles.css：预览 img 开启长按，响应式且不超过视口。tests/e2e/battle.spec.ts 改为两个按钮、复制回退；tests/e2e/wechat-save.spec.ts 在 Chromium/WebKit 微信 UA 验证正常 HTTPS 型地址/失败重试/原图响应。
- [x] deploy/nginx-https.conf 与 vite.config.ts 增加独立 PNG 路由、2MB、X-Real-IP；deploy/publish.sh 包含新服务模块并保留数据库目录。
- [x] npm test、npm run test:server、npm run build、关键 E2E；发布新不可变版本，再测试公网 PNG 字节/只读 QR/HTTPS，保留旧版。

执行采用本会话内联方式；新增服务和 UI 均随本轮交付，不停留于计划。文档明确真机待验收范围。
