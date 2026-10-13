# 微信小程序 WebView 接入准备

## 本阶段已准备

应用是静态 H5，可部署 HTTPS；核心算法不依赖 wx 或浏览器扩展。环境检测、文件输入、粘贴监听、下载和未来 HostAdapter 集中在适配层。界面使用安全区域、触摸滚动、至少 44px 格子与移动编辑面板，持久化使用 origin 内 localStorage，不需要跨域 Cookie。

微信 UA 可识别 MicroMessenger，miniProgram UA 是初步提示，不足以保证小程序环境；未来应在独立 adapter 内按官方 SDK 的正式环境检测 API 校正。

## 已验证和待真机验证

| 能力            | 当前实现 / 验证                                          | 微信降级与待验收                                                                    |
| --------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 图片/相册       | input[type=file]、multiple；Chromium / WebKit 自动化通过 | 文件选择器由宿主实现；必须验证 iOS/Android 实际相册和多选                           |
| 拍照            | input accept=image/* capture=environment，代码已提供入口 | capture 是浏览器提示，不能保证宿主提供相机；退回相册或手动录入                      |
| 粘贴截图        | paste 事件读取文件，无主动申请剪贴板权限                 | 微信或系统未提供图片时用文件选择器；没有粘贴能力不是致命错误                        |
| JSON 导出       | Blob URL + download，桌面、模拟移动和 WebKit 通过        | 微信可能限制下载；可用普通浏览器保存备份，未来宿主提供分享/保存 adapter             |
| 本地存储        | try/catch；自动恢复及存储拒绝测试通过                    | 微信清缓存/切账号/域名变化可能清除，提示导出；实际容量不写死                        |
| Web Worker/WASM | Chromium / WebKit 的后台求解与识别通过                   | 微信内核需实测；solver 不支持时显示错误，图像 OffscreenCanvas 缺失则降级分格 Canvas |
| 返回 / 通信     | HostAdapter.back、notifyBoardChanged 可注入              | 小程序壳中定义生命周期和返回行为，再对接独立微信 adapter                            |

这些是自动化浏览器结果，不是实际微信内置浏览器支持承诺。[HTML capture 说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture)解释了选择器和设备差异；[localStorage 说明](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)描述 origin 隔离和存储策略拒绝。主动剪贴板 read 还受安全上下文与权限影响，本项目优先使用用户触发的粘贴事件，不强行申请。[Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/read)

## 正式嵌入前的工作

1. 准备静态 HTTPS 域名并部署完整 dist，包括 OCR worker、WASM 和语言文件，测试 CSP、MIME 与同源加载。
2. 在具备相关资格的小程序壳中用 web-view 指向 H5 URL。业务域名、校验文件、备案、平台权限和可用接口以发布当时[微信官方 web-view 文档](https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html)和后台要求为准。本次工具未能打开官方页面，未据此写死资格规则或数量限制。
3. 若需要 JS-SDK 文件选择、分享或宿主通信，在独立 adapter 引入，并按官方要求配置签名与域名；H5 的核心、store 和 solver 继续不直接读 wx。JS-SDK 签名需要服务端能力时，作为后续接入任务。
4. 用 iPhone Safari、iPhone 微信、Android Chrome、Android 微信与真实小程序 web-view 分别测试：8/10/12 棋盘滚动、长时间编辑、相册/拍照/多图、取消 OCR、存储恢复、JSON 导出失败提示、后台返回和退出恢复。
5. 使用真实游戏截图验证识别，尤其是压缩图片、深浅截图、不同语言/字体和高分辨率。不要把仅合成样本测试当作上线识别验收。

尚未开发小程序壳、微信登录、支付、JS-SDK 签名服务或平台发布；这些不是本阶段交付范围。
