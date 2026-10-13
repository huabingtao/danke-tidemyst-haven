---
name: "潮汐秘境"
description: "海蓝棋盘、金黄战绩的中文宝石推理助手"
colors:
  bg: "#f2f7ff"
  surface: "#fffdf3"
  surface-2: "#e6efff"
  ink: "#112b5f"
  muted: "#405d88"
  line: "#b4c9ed"
  primary: "#1762d8"
  primary-soft: "#e4efff"
  primary-ink: "#17499b"
  gem: "#6b4b00"
  gem-soft: "#ffdd63"
  danger: "#c62448"
  warning: "#805a00"
  warning-soft: "#fff0b0"
  cell: "#d9eaff"
  dark-bg: "#0c1d37"
  dark-surface: "#122c50"
  dark-surface-2: "#193c68"
  dark-ink: "#f0f6ff"
  dark-muted: "#b9cef0"
  dark-line: "#4469a0"
  dark-primary: "#8bb8ff"
  dark-primary-soft: "#193d72"
  dark-primary-ink: "#b6d4ff"
  dark-gem: "#ffdf70"
  dark-gem-soft: "#5a450e"
  dark-danger: "#ff8ca0"
  dark-warning: "#ffda6b"
  dark-warning-soft: "#59461a"
  dark-cell: "#204573"
  white: "#ffffff"
  overlay: "#0c244bad"
  yellow: "#ffca28"
  ocean: "#1762d8"
  navy-fixed: "#112b5f"
  gold-stroke: "#c99b15"
  poster-paper: "#fff9e7"
typography:
  display:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "clamp(26px, 4vw, 38px)"
    fontWeight: 900
  headline:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "24px"
    fontWeight: 900
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 850
  body:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 850
  metric:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "38px"
    fontWeight: 900
    lineHeight: 1.15
  supporting:
    fontFamily: "Nunito Variable, PingFang SC, Microsoft YaHei, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  "4": "4px"
  "6": "6px"
  "7": "7px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
spacing:
  "6": "6px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "32": "32px"
  "36": "36px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.navy-fixed}"
    typography: "{typography.label}"
    rounded: "{rounded.8}"
    padding: "10px 15px"
  button-secondary:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.8}"
    padding: "10px 15px"
  button-text:
    textColor: "{colors.muted}"
    rounded: "{rounded.6}"
    padding: "6px 10px"
  input:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.ink}"
    rounded: "{rounded.7}"
    padding: "7px 10px"
  battle-navigation:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.navy-fixed}"
    rounded: "9px"
    padding: "8px 14px"
  view-tab-active:
    backgroundColor: "{colors.ocean}"
    textColor: "{colors.white}"
    rounded: "5px"
    padding: "7px 14px"
  battle-status:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.navy-fixed}"
    rounded: "{rounded.6}"
    padding: "5px 9px"
  battle-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.14}"
    padding: "24px"
  board-cell:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.ink}"
    rounded: "{rounded.6}"
    padding: "0"
  room-navigation-active:
    backgroundColor: "{colors.ocean}"
    textColor: "{colors.white}"
    rounded: "{rounded.10}"
    padding: "12px 10px"
---

# Design System: 潮汐秘境

## Overview

**Creative North Star: "海蓝棋盘与金黄战绩册"**

原创探索奖励册：海蓝承托操作框架，金黄承托宝石、核心动作和收获，冷浅蓝页面让密集棋盘保持清晰。深色主题沿用相同语义，切换为深海蓝底与明亮文字；顶栏和金黄动作保留身份色。

清晰、可信、轻快的中文本地工具以事实和推测的视觉区分为基础。圆角、几何宝石标记、粗数字和少量内嵌深度形成游戏气质；棋盘与分析保持紧凑，战绩页用更大的数字表达数量与比例。视觉不依赖游戏截图或真实金属、纸张纹理。

此记录更新已获批准的旧视觉世界，依据 `src/styles.css` 的最终层叠规则、棋盘与战绩组件，以及 `src/features/battle/poster.ts`。方向合同的五个区块与种子 `c8f2151f` 提供语境；已实现代码决定具体值。

**Key Characteristics:**
- 海蓝操作框架与金黄结果强调。
- Nunito 数字与平台中文字体，数值优先。
- 全列自适应棋盘与完整八状态图例。
- 浅深主题、键盘焦点、触摸与减少动画兼容。
- 固定战绩图片与只读链接共享同一快照。

## Colors

明亮海蓝与暖金黄形成游戏身份；主题色面和文本承担密集读数的对比需求。前置 tokens 的无前缀值为浅色，`dark-` 值对应根节点 `data-theme="dark"` 的同名 CSS 变量。固定身份色不随主题改变。

### Primary

- **操作海蓝**（`primary`、`primary-soft`、`primary-ink`）：棋盘框、焦点、数字、概率与辅助操作的语义族；深色使用对应 `dark-` 值。
- **身份海蓝**（`ocean`）：顶栏、选中房间、选中视图标签和推荐坐标按钮，始终搭配白字。

### Secondary

- **奖励金黄**（`yellow`）：主要动作、战绩入口、推荐结果和海报主要数量区；始终搭配固定海军蓝 `navy-fixed`。
- **宝石色对**（`gem`、`gem-soft`）：已发现与确定宝石，使用同一主题色对并由符号／数值区分。
- **金色描边**（`gold-stroke`）：主要按钮的实体边界。

### Tertiary

- **矛盾红**（`danger`）：矛盾描边、错误说明与冲突图例。
- **核对琥珀**（`warning`、`warning-soft`）：用户旗标、识别待核对与警示色面；虚线和文字进一步区分。

### Neutral

- **冷浅蓝／深海底**（`bg`）：页面与输入底。
- **温白／深蓝面**（`surface`）：已翻开的数字格、分析、弹窗、战绩容器。
- **蓝色次级面**（`surface-2`）：侧栏、标签轨道、空格与次级分区。
- **海军蓝／亮白字**（`ink`）和 **辅助蓝字**（`muted`）：主要及辅助文字。
- **蓝色边界**（`line`）：分隔线、次级控件与数字格描边。
- **未揭晓蓝**（`cell`）：未知格和概率图例的默认底。
- **纯白**（`white`）：固定海蓝上的字与海报二维码底；**深蓝遮罩**（`overlay`）用于模态背景。
- **海报暖纸底**（`poster-paper`）：固定浅色分享图片，独立于浏览页面主题。

### Named Rules

**The Semantic Pair Rule.** 每种棋盘颜色必须同时具有数字、文字、符号或边框状态；已录入事实、推测旗标、精确概率与识别待核对状态保持可辨。

## Typography

**Display Font:** Nunito Variable，中文回退到 PingFang SC、Microsoft YaHei。
**Body Font:** 同一字体栈，随后回退到 -apple-system、sans-serif；Nunito Variable 在入口本地打包。

**Character:** 圆润拉丁数字与清晰中文形成轻快而直接的读数界面。正文沿用自然字距，主要数字采用 `font-variant-numeric: tabular-nums`。

### Hierarchy

- **Display**：战绩页主标题采用流动字号与粗字重；详见 `typography.display`。
- **Headline**：棋盘标题，详见 `typography.headline`。
- **Title**：战绩区标题，详见 `typography.title`；普通分析标题为 16px／650，次级标题 15px／650。
- **Body**：页面默认字号与段落行高见 `typography.body`；说明通常使用 13–15px，帮助说明最大 75ch。
- **Label**：主要动作见 `typography.label`；次级按钮为 14px／750，导航与状态为 800。
- **Metric**：当前战绩数量见 `typography.metric`；移动为 34px，历史战绩为 26px。单位为 16px／600，分析数量为 26px／600。
- **Supporting**：辅助说明见 `typography.supporting`；紧凑棋盘的轴与说明另有 10–11px，不能作为普通正文尺度推广。
- **Board numerals**：数字权重 800，数字大小按格宽计算并封顶 22px；概率大小封顶 12px，并按字符长度再次缩小。此缩放属于棋盘适配，不是通用字号 token。

### Named Rules

**The Number First Rule.** 数量和比例使用清晰粗数字与等宽数字特性；单位退居辅助层，不以装饰文字抢占数字层级。

## Layout

桌面工作区居中、最大宽度 1600px，三栏为 220px / 可伸缩棋盘 / 282px；1199px 以下改为 188px / 可伸缩 / 250px。959px 以下保留 170px 房间栏，分析移到棋盘下方。639px 以下纵向排列房间入口、棋盘和分析，房间列表可横向触摸滚动，底部快捷操作固定并预留安全区。只有房间列表横滚，棋盘自身不横滚。

棋盘按实际容器测量，显示完整 8、10、12 列；格子方形，上限 52px。轴宽按容器为 12 / 14 / 22px，间距为 1.5 / 2 / 5px；格宽扣除轴与全部间距后均分。低于 359px 的页面进一步压缩棋盘外边距。独立按钮和弹窗选项保持大触摸目标，棋格依据可用宽度缩小。

战绩页最大 1100px，桌面内边距 30px 24px 80px，移动为 20px 16px 40px。四项指标桌面四列、移动两列；海报预览与工具桌面两栏、移动纵向排列。采用复用的 6–36px 间距族，紧凑控件、面板与章节逐级扩大间距，不强制每个数值落在单一倍数网格。

## Elevation & Depth

色面和蓝色描边承担结构。主要按钮和棋格有轻内嵌深度；常规战绩面与棋盘面无外部投影。模态通过深蓝遮罩区分；通知使用柔和浮层阴影。按钮颜色过渡为 0.15s，加载占位使用 1.5s 或扫描指示使用 1.6s 的缓动脉冲；系统减少动画偏好关闭动画、过渡与平滑滚动。

### Shadow Vocabulary

- **按钮内嵌深度**：`inset 0 -3px 3px #b58a1529`。
- **棋格内嵌深度**：`inset 0 -2px 0 #112b5f10`。
- **通知浮层**：`0 2px 8px oklch(0.1 0 0 / 0.18)`。

### Named Rules

**The Inset Depth Rule.** 主要按钮与棋格使用轻内嵌深度；工作面靠描边和色面区分，浮层只使用柔和阴影。

## Shapes

圆角随尺度增加：棋格桌面 6px、移动 4px；输入 7px；操作按钮 8px；房间项 10px；推荐块与海报预览 12px；棋盘、主要弹窗与当前战绩容器 14px。小状态牌为 6px，完整图例符号为 5px，顶栏战绩入口为 9px。圆角不是统一套用的一个数。

工作表面用实线边界；棋盘框桌面 3px、移动 2px，战绩与主要弹窗 2px，普通输入 1px。待核对棋格用琥珀虚线，旗标用琥珀实线，矛盾用红色轮廓；这些状态不能合并为同一种强调。原创建模为几何宝石，通用界面图标使用内联 SVG。

## Components

### Buttons

轻快而有实体边界。主要按钮为金黄／固定海军蓝、2px 金色边框和轻内嵌深度，最小高度 44px；悬停亮度为 1.08。次级按钮沿用主题页面底、主字色和 2px 边线，悬停改用主题面色；文字按钮透明底、辅助字色，悬停用次级面与主字色。所有可聚焦操作使用 2px 主色轮廓、3px 偏移；禁用状态透明度 0.4。

### Chips

战绩状态牌用金黄与固定海军蓝，12px／800，紧凑内边距；它是状态说明。棋盘尺寸牌使用主色柔和底与描边。状态与文字同时出现，不把不可操作标签伪装成按钮。

### Cards / Containers

棋盘是主色边框与柔和主色底组成的操作框；当前战绩为主题面底、主色边框和 24px 内边距，移动为 18px 14px。推荐区用金黄色面，数字与依据均为固定海军蓝，坐标按钮海蓝白字。内部内容按边线和留白分组。

### Inputs / Fields

主题页面底、主字色、1px 边线、7px 圆角与 7px 10px 内边距，默认最小高度 40px；房间选择为 44px。棋盘设置中的数字字段使用紧凑 36px 高度，属于密集设置的局部尺寸。只读战绩链接字段为主题面底、8px 圆角与 12px 内边距，允许选择复制。输入光标为主色；焦点沿用统一轮廓。

### Navigation

海蓝顶栏以 4px 金黄底边连接页面。品牌名桌面 20px／900、移动 16px；金黄几何宝石徽记和战绩入口共享身份色。移动战绩入口收为 44px 图标按钮，并保留可访问名称。选中房间为固定海蓝与白字，辅助数据为浅金黄；视图标签的选中项同样海蓝白字。视图按钮最小高度 40px。

### Adaptive Board and Legend

八状态图例覆盖已发现宝石、周围数量、概率、推荐、确定宝石、确定空格、用户旗标和数字矛盾。桌面四列、移动两列，图例符号为 32px／30px。推荐使用金黄底与主色轮廓；确定宝石使用主题宝石色对和宝石边框；选择状态另有轮廓。热图以 `color-mix(in oklch, primary × heat × 65%, cell)` 表达概率。状态选择通过原生模态弹窗，0–8 为三列 52px 按钮；宝石与重置独立，全宽操作。

### Battle Metrics and Sharing

数量、数量／总数、命中率和完成率并列，辅助单位与统计依据清晰可见。海报固定 1080×1440，蓝色标题区、金黄数量区、暖色浅底、原创几何宝石和二维码；该导出格式不跟随页面深色主题。标题与主数值按可用宽度缩小，保留四项指标与记录日期。只读页面复用指标与分享组件；保存图片、分享图片、分享链接和手动复制均有可见状态文字。

## Do's and Don'ts

### Do:

- Do 保留全列棋盘，按实际容器宽度同时缩放格子、坐标轴、间距和数值。
- Do 在八状态图例、棋格和分析中保持同一语义，并明确事实与推测。
- Do 为独立操作保留至少 44px 的主要触摸目标；密集棋格通过状态编辑弹窗提供大按钮。
- Do 使用主题语义变量，并保留可见键盘焦点、原生弹窗与减少动画设置。
- Do 在导出战绩中保留四项数量／比例、统计依据与二维码；图片及链接保持同一固定快照。

### Don't:

- Don't 把棋盘放入内部横向滚动容器或隐藏窄屏列。
- Don't 只靠颜色表达宝石、推荐、矛盾或待核对状态。
- Don't 将推断和旗标包装成已发现宝石或已消耗棋子。
- Don't 引入游戏截图、参考图复制、真实金属或纸张纹理作为品牌材料。
- Don't 将棋格中遗留的字体图形作为新界面的图标规范；新图标沿用现有内联 SVG。
