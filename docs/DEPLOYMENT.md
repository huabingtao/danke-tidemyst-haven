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

后续更新：本地运行 `npm run build`，通过 SSH/rsync 上传整个 dist 到新的版本目录；上传完成后用临时符号链接和 `mv -Tf` 切换 current，保留旧目录可回滚。不要在运行中的 current 目录使用 rsync --delete，以免上传中缺少文件。版本目录不自动清理。旧版本为纯静态部署；2026-10-14 新增独立 Node 统计服务，见下文。

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

## 2026-10-14 战绩与统计发布

新增版本使用前端和 API 分别不可变目录，`deploy/publish.sh` 校验全部 SHA-256、保存 Nginx 配置，统计服务就绪后切换前端；失败自动恢复旧前端和配置。更新仍不修改其他站点，HTTPS 和 Certbot 续期沿用已有配置。

```bash
npm run build
bash deploy/publish.sh 20261014-battle-v2-1
```

本脚本目标是已授权服务器，不包含私钥。SSH BatchMode/StrictHostKeyChecking 保持本机已有可信身份与主机校验。

- 前端：`/var/www/tidemyst-haven/releases/<版本>/`，current 指向活动目录；保留 `20261013-944701a`。
- API：`/opt/tidemyst-stats/releases/<版本>/stats.mjs`，current 独立切换。
- 服务：`tidemyst-stats.service`，www-data，systemd 开机启动，127.0.0.1:3009；Node 22.23.2 原生 SQLite，无 npm 运行依赖。
- 数据：`/var/lib/tidemyst-stats/stats.sqlite`，WAL 模式，独立于版本；在线名单仅内存，重启后由心跳恢复。
- Nginx：同源 `/api/stats` 转发，2KB 输入上限，接口 no-store；JSON 完成事件只含匿名 ID 和局 ID。
- 数据备份应使用 SQLite backup 或 VACUUM INTO 生成一致快照；不要在运行时只复制 .sqlite 而忽略 WAL。将备份与部署目录分别保留。

检查：`systemctl is-active tidemyst-stats`、`curl https://dankecxmj.guaguahub.cn/api/stats`。累计从服务上线开始；线上验收只读 GET/心跳，不插入虚假已完成事件。

前端回滚（不清除统计数据库）：

```bash
ssh root@124.220.195.160 'ln -s releases/20261013-944701a /var/www/tidemyst-haven/current.rollback && mv -Tf /var/www/tidemyst-haven/current.rollback /var/www/tidemyst-haven/current'
```

旧前端不发送统计事件。需要回滚 API 时将 API current 指向已保留的兼容版本并重启服务；SQLite 数据目录不随回滚删除。完整恢复旧 Nginx 使用对应 `nginx-<版本>.backup`，先 nginx -t 再 reload。v2 本机战绩仍保留，旧应用读取迁移前 v1 缓存。线上新版本验收结果完成后补记。

首次 20261014-battle-v2 发布在 API 启动检查阶段自动回滚：Node CLI 检查未解析版本软链接导致进程正常退出而未监听端口。已改用 realpathSync 比较入口并增加真实子进程软链接启动/退出测试；修复后使用独立版本 20261014-battle-v2-1。初次目录仅保留供诊断，不是可用回滚版本；可用旧版本仍是 20261013-944701a。

### 本次线上验收结果

- 活动前端和 API 均为 `20261014-battle-v2-1`；25 个 dist 文件及 3 个 API/部署输入文件校验一致。原可用前端和对应 Nginx 备份仍保留。
- Nginx 语法成功，统计 service active/enabled；仅监听 127.0.0.1:3009，其他服务端口保持。
- HTTPS 页面与 `/api/stats` 200，API Content-Type application/json、Cache-Control no-store；HTTP 301 到 HTTPS，JS/WASM MIME 正确，已有证书与续期 timer 保持。
- 正式域名 12 项浏览器测试通过：编辑/图例/概率、原进度快照恢复、真实截图全部 64 格、只读战绩不修改接收存档、实际 PNG 1080×1440 与 QR 解码为完全相同的 HTTPS 战绩链接。
- 线上未触发“结束本局”，累计维持 0，没有注入测试完成事件；测试浏览器心跳会在退出后 90 秒内自然过期。WebKit 此次真实截图首次冷加载约 39 秒，仍使用 45 秒线上等待窗口。
- 浏览器额外确认旧存档四格原观测迁移保留，当前战绩为 4 枚/1 宝石/25%/5%，未结算该真实存档。
- `systemctl reload nginx` 是异步信号，本次紧随 reload 的第一个探测曾命中旧 worker 的 HTML fallback；随后 JSON 和公开测试确认新 worker 生效。发布脚本已增加带 JSON 校验的有限重试，未来不会把 HTML 200 当作统计健康响应。

[线上只读战绩](screenshots/production-battle-desktop.png)、[真实 PNG](screenshots/production-battle-poster-desktop.png)。实际微信账号/群发送和手机硬件仍未代替用户测试。

[上线浏览器实拍](screenshots/production-cua.png)保留原深色设置；验收结束临时心跳已自然过期，额外确认在线数回到当前一个浏览器。
