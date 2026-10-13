# 潮汐秘境 H5 实施计划

目标：交付支持移动端、PC 和未来微信 web-view 的中文本地宝石概率工具。
架构：React / TypeScript / Vite / Tailwind / Zustand；纯函数核心与 Web Worker 隔离；图片 Canvas 特征、字体模板和 Tesseract 混合识别；静态同源 OCR 资源。
执行方式：当前会话逐项实现与检查。用户已授权按完整需求自动实施，无需再次审批方案。

## 全局约束与验收

- 三种尺寸与总宝石默认值：8/20、10/30、12/45。
- 数字约束是周围八邻域；用户旗标不参与事实约束。
- 概率必须按完整合法布局计数，区域按宝石数量分布合并，未约束区域按组合数加权。
- 超预算不得使用截断样本冒充精确概率；返回明确无法完成精确求解状态。
- 图片本地处理、可取消、低置信度保持未知且可编辑、确认后方可导入。
- 中文、浅深主题、PC 三栏与手机单栏；格子 44px 起，棋盘内部滚动。
- 自动保存、撤销重做、JSON 导入验证、多个房间、重置删除。

## 文件与接口

- `src/core/models.ts`：Cell / Board / SolveResult、neighbors、createBoard、JSON schema 校验。
- `src/core/solver.ts`：solveBoard(board, options)；约束传播、分区、剪枝枚举、BigInt 计数、组合权重。
- `src/core/recommendations.ts`：最高概率并列格；独立的邻域覆盖信息启发式，明确不是实际熵增。
- `src/workers/solver.worker.ts` 与 `src/hooks/useSolver.ts`：任务替换、取消、错误降级。
- `src/stores/boards.ts`：持久化、完整棋盘快照历史、房间 CRUD、JSON 导入导出。
- `src/features/image-recognition/pixels.ts`：纯像素网格定位、格子特征、模板比较。
- `src/features/image-recognition/pipeline.ts`、`src/workers/image.worker.ts`：限尺寸解码、可取消识别、OCR worker、进度。
- `src/components/BoardGrid.tsx`、`CellEditor.tsx`、`RoomList.tsx`、`Analysis.tsx`、`ImageImporter.tsx`：各自独立 UI。
- `src/adapters/environment.ts`：能力检测与未来微信桥接适配点。

## 阶段与验证

- [x] 1. 初始化严格 TS / Vite / React / Tailwind / Vitest / Playwright；写 PRODUCT、DESIGN 与数据模型。
- [x] 2. 房间 CRUD、编辑、历史、自动恢复、导入导出；状态测试验证持久化与无效数据拒绝。
- [x] 3. 求解器与 worker：先编写空白棋盘、0、满邻域、共享线索、矛盾和总数加权测试，再实现。
      小棋盘 oracle 枚举所有掩码，逐一比较每个概率；包含多个独立约束组件和无约束变量。
      `npm test`：全部通过，空白8×8精确31.25%，10×10精确30%。
- [x] 4. 图片流水线与修正面板：合成网格定位、数字、宝石、未知、模糊、取消与确认导入测试；OCR资源同源。
      不使用原站资源，不声称缺乏真实截图情况下的真实准确率。
- [x] 5. 手机布局、触控尺寸、safe-area、主题与微信能力降级；浏览器检查375/390与1440宽度。
- [x] 6. `npm run test:e2e` 验证创建、编辑、worker、撤销恢复、刷新、截图修正导入；`npm run build` 验证产物。
- [x] 7. 写 ARCHITECTURE、ALGORITHM、IMAGE_RECOGNITION、WECHAT_WEBVIEW、README 与交付限制。

## 风险处理

复杂连通区域最坏指数复杂度；限制节点和时间，用户仍可编辑与取消。照片透视/倾斜无法用轴对齐裁剪完全修复，提示重新上传正面截图。无真实截图时只对合成样本做自动验收，游戏配色/数字字体识别仍需真实样本验证。微信业务域名与接口权限按正式发布时官方文档复核。
