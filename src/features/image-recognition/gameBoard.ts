import type { BoardSize } from "../../core/models";
import type {
  Pixels,
  Rect,
  GridDetection,
  GlyphTemplate,
  RecognitionCell,
  CellFeatures,
} from "./pixels";
import { normalizeMask, matchGameDigit } from "./glyph";
import { GAME_DIGIT_TEMPLATES } from "./gameDigitTemplates";
interface BlobBox {
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
}
/** Normalize thresholds by a robust upper channel quantile, preserving hue ratios. */
function exposure(image: Pixels): number {
  const samples: number[] = [];
  const stride = Math.max(1, Math.floor((image.width * image.height) / 4096));
  for (let i = 0; i < image.width * image.height; i += stride) {
    const p = i * 4;
    samples.push(Math.max(image.data[p], image.data[p + 1], image.data[p + 2]));
  }
  samples.sort((a, b) => a - b);
  return Math.max(
    0.35,
    (samples[Math.floor((samples.length - 1) * 0.995)] ?? 255) / 255,
  );
}
const cyan = (r: number, g: number, b: number) =>
  g > 110 && b > 130 && r < g * 0.8 && b > r * 1.4;
/** Eight-connected color components at a bounded analysis resolution. No screenshot coordinates. */
function cyanBoxes(image: Pixels): BlobBox[] {
  const scale = Math.min(1, 600 / Math.max(image.width, image.height));
  const gain = exposure(image);
  const w = Math.round(image.width * scale),
    h = Math.round(image.height * scale),
    mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p =
        (Math.min(
          image.height - 1,
          Math.floor(((y + 0.5) * image.height) / h),
        ) *
          image.width +
          Math.min(
            image.width - 1,
            Math.floor(((x + 0.5) * image.width) / w),
          )) *
        4;
      mask[y * w + x] = cyan(
        image.data[p] / gain,
        image.data[p + 1] / gain,
        image.data[p + 2] / gain,
      )
        ? 1
        : 0;
    }
  const queue = new Int32Array(w * h),
    boxes: BlobBox[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    mask[i] = 0;
    queue[0] = i;
    let length = 1,
      left = w,
      right = 0,
      top = h,
      bottom = 0;
    for (let q = 0; q < length; q++) {
      const p = queue[q],
        x = p % w,
        y = Math.floor(p / w);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const next = ny * w + nx;
          if (mask[next]) {
            mask[next] = 0;
            queue[length++] = next;
          }
        }
    }
    if (length >= 15)
      boxes.push({
        x: (left * image.width) / w,
        y: (top * image.height) / h,
        width: ((right - left + 1) * image.width) / w,
        height: ((bottom - top + 1) * image.height) / h,
        count: length / (scale * scale),
      });
  }
  return boxes;
}
function light(image: Pixels, x: number, y: number): number {
  const p =
    (Math.max(0, Math.min(image.height - 1, Math.round(y))) * image.width +
      Math.max(0, Math.min(image.width - 1, Math.round(x)))) *
    4;
  return (image.data[p] + image.data[p + 1] + image.data[p + 2]) / 3;
}
/** True tile gaps are consistently darker than BOTH adjacent tile interiors, on both axes. */
function gapAlignment(
  image: Pixels,
  rect: Rect,
  size: number,
  vertical: boolean,
): number {
  const start = vertical ? rect.x : rect.y,
    span = vertical ? rect.width : rect.height,
    step = span / size;
  let score = 0;
  for (let k = 1; k < size; k++) {
    let sum = 0;
    for (let t = 0; t < 80; t++) {
      const along = (t + 0.5) / 80;
      const sample = (across: number) =>
        vertical
          ? light(image, across, rect.y + along * rect.height)
          : light(image, rect.x + along * rect.width, across);
      const p = start + k * step;
      const center =
        (sample(p - step * 0.008) + sample(p) + sample(p + step * 0.008)) / 3;
      const side = Math.min(sample(p - step * 0.18), sample(p + step * 0.18));
      sum += Math.max(
        0,
        Math.min(1, (0.93 - center / Math.max(1, side)) / 0.36),
      );
    }
    score += sum / 80;
  }
  return score / (size - 1);
}
export function detectGameBoard(
  image: Pixels,
  preferred?: BoardSize,
): GridDetection | null {
  const boxes = cyanBoxes(image);
  let outline: GridDetection | null = null;
  let best: GridDetection | null = null,
    bestScore = 0;
  for (const box of boxes) {
    const aspect =
      Math.abs(box.width - box.height) / Math.max(box.width, box.height);
    if (
      box.width < image.width * 0.5 ||
      box.height < image.width * 0.45 ||
      aspect > 0.08
    )
      continue;
    // The large outline is thin; solid cyan decoration is not a game frame.
    if (box.count / (box.width * box.height) > 0.2) continue;
    outline = {
      rect: { x: box.x, y: box.y, width: box.width, height: box.height },
      size: preferred ?? 8,
      profile: "tidemyst",
      confidence: 0.25,
      reason: "检测到游戏外框，但无法确认完整规则网格，请使用清晰的完整截图",
    };
    for (const size of preferred ? [preferred] : ([8, 10, 12] as BoardSize[])) {
      for (let padding = 0; padding <= 0.018; padding += 0.002) {
        const rect = {
          x: box.x + box.width * padding,
          y: box.y + box.height * padding,
          width: box.width * (1 - padding * 2),
          height: box.height * (1 - padding * 2),
        };
        const x = gapAlignment(image, rect, size, true),
          y = gapAlignment(image, rect, size, false),
          score = Math.min(x, y);
        if (score < 0.62 || score <= bestScore) continue;
        bestScore = score;
        best = {
          rect,
          size,
          profile: "tidemyst",
          confidence: Math.min(0.99, 0.8 + score * 0.19),
          reason: "根据游戏青色外框和双轴格子间隙自动定位",
        };
      }
    }
  }
  return best ?? outline;
}
export function gameFeatures(image: Pixels): CellFeatures & {
  gold: number;
  covered: number;
  blue: number;
  centered: boolean;
} {
  const gain = exposure(image);
  const { width: w, height: h, data } = image,
    binary: number[] = [];
  let gold = 0,
    covered = 0,
    blue = 0,
    white = 0,
    left = w,
    right = -1,
    top = h,
    bottom = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4,
        r = data[p] / gain,
        g = data[p + 1] / gain,
        b = data[p + 2] / gain;
      if (r > 140 && g > 70 && g < r * 0.96 && b < g * 0.65) gold++;
      if (cyan(r, g, b)) covered++;
      if (b > r * 1.5 && b > g * 1.1 && g > 25 && r < 120) blue++;
      const bit =
        x > w * 0.15 &&
        x < w * 0.85 &&
        y > h * 0.12 &&
        y < h * 0.88 &&
        Math.min(r, g, b) > 150 &&
        Math.max(r, g, b) - Math.min(r, g, b) < 65
          ? 1
          : 0;
      binary.push(bit);
      if (bit) {
        white++;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  const count = w * h;
  const centered =
    right >= left &&
    Math.abs((left + right) / 2 - w / 2) < w * 0.16 &&
    Math.abs((top + bottom) / 2 - h / 2) < h * 0.16 &&
    right - left < w * 0.65 &&
    bottom - top > h * 0.2;
  return {
    mask: normalizeMask(binary, w, h),
    foreground: white / count,
    gemScore: gold / count,
    contrast: 255,
    gold: gold / count,
    covered: covered / count,
    blue: blue / count,
    centered,
  };
}
export function classifyGameCell(
  image: Pixels,
  templates: GlyphTemplate[],
): RecognitionCell {
  const f = gameFeatures(image);
  if (f.gold > 0.16 && f.blue > 0.15)
    return {
      cell: { observed: "gem", flagged: false },
      confidence: 0.97,
      needsReview: false,
      reason: "金色宝石与蓝色格底特征一致",
    };
  if (f.covered > 0.3 && f.gold < 0.03)
    return {
      cell: { observed: "unknown", flagged: false },
      confidence: 0.97,
      needsReview: false,
      reason: "蓝色未翻开格",
    };
  if (
    f.blue > 0.55 &&
    f.centered &&
    f.foreground > 0.012 &&
    f.foreground < 0.24
  ) {
    const match = matchGameDigit(f.mask, [
      ...GAME_DIGIT_TEMPLATES,
      ...templates,
    ]);
    if (
      typeof match.digit === "number" &&
      match.score > 0.8 &&
      match.margin > 0.06
    )
      return {
        cell: { observed: match.digit, flagged: false },
        confidence: match.score,
        needsReview: match.score < 0.9,
        reason: "游戏白色数字字形匹配",
      };
    return {
      cell: { observed: "unknown", flagged: false },
      confidence: 0.5,
      needsReview: true,
      reason: "白色数字需 OCR 二次识别",
    };
  }
  return {
    cell: { observed: "unknown", flagged: false },
    confidence: 0.4,
    needsReview: true,
    reason: "游戏格子特征不清晰，请核对",
  };
}
