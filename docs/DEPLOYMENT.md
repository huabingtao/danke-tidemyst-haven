# 腾讯云部署记录

域名：`https://dankecxmj.guaguahub.cn/`。服务器：`124.220.195.160`，Ubuntu 24.04.4，Nginx 1.24.0，Certbot 2.9.0。连接信息来自本机已有部署记录；不保存或复制私钥。

## 本次执行方案

- [x] 检查 SSH、DNS、已有虚拟主机与证书，不改其他站点。
- [x] 生产构建，上传全部 dist（含同源 OCR）至独立版本目录。
- [x] 开通独立 HTTP 虚拟主机并验证 ACME 文件可访问。
- [x] 复用服务器已有 ACME 账号，webroot 签发单域名证书。
- [x] 配置 HTTPS 和 HTTP 跳转，nginx -t 后 reload。
- [x] 保留 certbot.timer，为此证书设置成功续期后 reload hook，并模拟续期。
- [x] 验证 HTTPS、静态资源 MIME、分享恢复和真实截图识别，保存线上截图。

## 路径与更新

应用：`/var/www/tidemyst-haven/releases/20261013-944701a/`，`current` 符号链接指向活动版本。独立 ACME 根：`/var/www/tidemyst-haven/acme/`。站点配置：`/etc/nginx/sites-available/dankecxmj.guaguahub.cn`，启用链接放在 sites-enabled。源模板在 `deploy/`，证书只保留在服务器 `/etc/letsencrypt/`。

后续更新：本地运行 `npm run build`，通过 SSH/rsync 上传整个 dist 到新的版本目录；上传完成后用临时符号链接和 `mv -Tf` 切换 current，保留旧目录可回滚。不要在运行中的 current 目录使用 rsync --delete，以免上传中缺少文件。版本目录不自动清理。应用无需 Node 常驻服务或 PM2。

分享默认使用线上域名，不需要改 `.env`。浏览器存储按 origin 隔离，localhost 数据不会自动搬到线上；可使用 JSON 导入导出或进度链接迁移。

## HTTPS 与续期

使用服务器已有账号和 Certbot webroot 插件，验证目录固定在 acme 下，HTTPS 跳转时仍允许 80 端口的挑战路径。成功续期后专属 deploy hook 检查 Nginx 并 reload，沿用系统 certbot.timer。操作依据 [Certbot webroot 文档](https://eff-certbot.readthedocs.io/en/stable/using.html#webroot) 和 [续期文档](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates)。

检查命令：

```bash
ssh root@124.220.195.160 'nginx -t; systemctl status certbot.timer --no-pager'
ssh root@124.220.195.160 'certbot renew --cert-name dankecxmj.guaguahub.cn --dry-run --run-deploy-hooks'
curl -I https://dankecxmj.guaguahub.cn/
```

续期验证仅指定此域名，不对其他证书执行强制续期。

## 2026-10-13 线上验收

- SHA-256 校验全部 19 个生产文件一致（包括同源 OCR），线上源代码版本 `944701a`。
- HTTPS 200，正常验证证书；HTTP 301 到正式 HTTPS。Let’s Encrypt YE2 证书包含且仅包含此域名，本次有效期至 2027-01-11 17:59:11（Asia/Shanghai）。私钥只在服务器。
- certbot.timer 为 active/enabled。`certbot renew --cert-name dankecxmj.guaguahub.cn --dry-run --run-deploy-hooks` 成功，专属 deploy hook 检查并 reload Nginx；输出中的 “error output” 是 nginx -t 的正常 stderr，无失败退出。
- HTML no-cache；hash 静态资源一年 immutable，OCR 一天缓存；JS/WASM MIME 正确，缺失 OCR 文件返回 404。
- 正式域名 Playwright 共 9 项通过：Chromium 桌面/手机、WebKit 手机的编辑与概率、真实 64 格截图识别、公开分享链接与独立接收者恢复。没有向真实微信群发送消息。
- 远程首次 OCR 冷加载在 WebKit 的本次测试约 41 秒，因此生产验证等待窗口为 45 秒；本地窗口 10 秒不能作为公网首次模型加载的上限。首次 6 项线上检查有 1 项因此超时，生产专用配置重新验证全部通过。
- 其他站点配置未修改；Nginx 整体语法通过并处于 active，抽检现有 calculator 站点仍返回 200。

重新验证：`npx playwright test -c playwright.production.config.ts`。默认针对本域名，可用 E2E_BASE_URL 指定其他正式地址；使用独立浏览器上下文和模拟剪贴板，不自动发消息。

[正式域名桌面截图](screenshots/production-desktop.png)、[手机截图](screenshots/production-mobile.png)。本次未开发微信菜单 SDK 签名服务；已有系统分享/复制链接功能可用，真实微信菜单卡片仍按 SHARING.md 后续接入。
