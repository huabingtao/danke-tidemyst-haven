# 潮汐秘境 · 宝石推理助手

独立中文 H5：手动录入或从截图读取棋盘，按真实数字和宝石总数推算每格宝石概率。纯前端，本地处理，无登录、后端或付费 AI API。

## 本地启动

需要 Node.js 22.12+（本次验证为 Node 24.11.1）。

```bash
npm ci
npm run dev
```

打开终端显示的地址，默认 `http://localhost:5173`。手机同局域网可打开电脑的局域网 IP 与端口；正式部署应使用 HTTPS。

`npm ci` 的 postinstall 自动从 npm 依赖复制 OCR worker、WASM 与英语数字模型到 `public/ocr/`。这些文件不纳入源码版本；离线构建前需准备 npm 依赖缓存。运行时没有第三方 OCR CDN 依赖。

## 使用

1. 新建 8×8 / 10×10 / 12×12 房间，设置棋盘的总宝石数。
2. 点击格子，输入游戏显示的 0–8 数字、已发现宝石或已知安全状态；连续录入可作为笔刷。
3. 查看宝石概率、必有宝石、必为空与最高概率并列坐标。点击推荐位置即可记录实际结果。
4. 读取截图支持选择相册、拍照、拖拽、粘贴与多张输入。检查自动框选和尺寸，必要时调整裁剪滑块，识别后逐格校正，勾选核对后导入。
5. 所有房间自动保存在当前浏览器；导出 JSON 可备份和迁移。撤销 / 重做支持本次会话中的编辑、重置、删除和导入；刷新后恢复房间数据，编辑历史不跨刷新。

「推测」旗标不参与概率约束。「安全」是实际已知为空的事实；没有看到数字时不要误填为 0。

## 验证

```bash
npm test
npx playwright install chromium webkit
npm run test:e2e
npm run build
npm run preview
```

Vitest 覆盖约束、组合计数、小棋盘暴力 oracle、房间存储、网格定位与像素分类。Playwright 覆盖 Chromium 桌面/手机视口和 WebKit 手机视口，包括实际同源 OCR、确认导入、刷新恢复、存储失败、取消等流程。自动化内核测试不代表微信或 iPhone 真机已验收。

重新生成可公开的合成识别素材：`node scripts/generate-fixtures.mjs`。未使用原网站图像资源或代码。

## 生产部署

`npm run build` 生成 `dist/`，上传整个目录到任意静态 HTTPS 服务，包含 `ocr/` 子目录。不要用 `file://` 直接双击 HTML，Web Worker 和存储需要正常 HTTP(S) origin。

Vite 使用相对 base，可部署到域名根目录或 `/tidemyst/` 子目录；网页路径末尾使用 `/`，避免资源解析到父目录。WASM 资源需正确返回 `application/wasm`，JS 需正确 JavaScript MIME 类型。不要将缺失的 OCR 文件回退成 `index.html`。

若服务器启用 CSP，需允许同源 JS / worker、`blob:` worker，以及 WASM 编译（现代浏览器 `wasm-unsafe-eval`）。生产策略应在实际宿主中验证。缓存可设置带 hash 的 `assets/` 长期缓存；OCR资源部署更新时同步刷新缓存，HTML 短缓存。

## 功能与边界

- 已实现：三种棋盘、多房间、真实状态与旗标分离、自动保存、撤销重做、JSON 备份、精确后台求解、三种视图、冲突提示、中文浅深主题、移动触控、本地截图识别与人工校正。
- 已实现、仍需真实素材验证：真实游戏数字字体、宝石配色、截图网格识别率、不同设备压缩/亮度、实际相册与拍照入口、微信 WebView 能力。没有真实游戏样本，因此不报告真实识别成功率。
- 设计边界：精确枚举超出预算会停止并提示，不输出截断概率；探索信息参考是邻域覆盖启发式，不是精确熵增。倾斜透视照片请换正面截图；不确定空白一律保留未知。
- 本阶段未开发：微信小程序壳、JS-SDK 业务接入、登录支付；也没有透视自动矫正、近似采样求解或精确信息增益计算。

## 文档

- [实施计划](docs/IMPLEMENTATION_PLAN.md)
- [技术架构](docs/ARCHITECTURE.md)
- [概率算法](docs/ALGORITHM.md)
- [图片识别](docs/IMAGE_RECOGNITION.md)
- [微信 WebView 接入准备](docs/WECHAT_WEBVIEW.md)
- [验收记录](docs/ACCEPTANCE.md)
