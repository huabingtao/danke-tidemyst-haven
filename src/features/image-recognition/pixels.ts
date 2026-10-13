import { normalizeMask, matchDigit } from "./glyph";
export { normalizeMask, matchDigit } from "./glyph";
import { detectGameBoard, classifyGameCell } from "./gameBoard";
import type { Cell, BoardSize } from "../../core/models";
export interface Pixels {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface GridDetection {
  rect: Rect;
  size: BoardSize;
  confidence: number;
  reason: string;
  profile?: "tidemyst";
}
export interface GlyphTemplate {
  digit: number | "safe" | "flag";
  mask: number[];
  font: string;
}
export interface RecognitionCell {
  cell: Cell;
  confidence: number;
  reason: string;
  needsReview: boolean;
}
export interface CellFeatures {
  mask: number[];
  foreground: number;
  gemScore: number;
  contrast: number;
}
function axisCandidates(
  values: number[],
  size: number,
): { start: number; span: number; score: number }[] {
  const peaks = values
    .flatMap((v, i) =>
      i > 0 &&
      i < values.length - 1 &&
      v > 5 &&
      v >= values[i - 1] &&
      v >= values[i + 1]
        ? [i]
        : [],
    )
    .sort((a, b) => values[b] - values[a])
    .slice(0, 65)
    .sort((a, b) => a - b);
  const results: { start: number; span: number; score: number }[] = [];
  for (let a = 0; a < peaks.length; a++)
    for (let b = a + 1; b < peaks.length; b++) {
      const span = peaks[b] - peaks[a],
        step = span / size;
      if (step < 12) continue;
      let aligned = 0,
        strength = 0;
      for (let k = 0; k <= size; k++) {
        const position = Math.round(peaks[a] + k * step);
        let best = 0;
        for (let delta = -2; delta <= 2; delta++)
          best = Math.max(best, values[position + delta] ?? 0);
        if (best > 5) aligned++;
        strength += Math.min(best / 30, 1);
      }
      // Penalize a cropped sub-grid: regular lines continuing immediately outside
      // the candidate usually mean the board has more rows/columns.
      let continuations = 0;
      for (const p of [peaks[a] - step, peaks[b] + step]) {
        let evidence = 0;
        for (let delta = -2; delta <= 2; delta++)
          evidence = Math.max(evidence, values[Math.round(p) + delta] ?? 0);
        if (evidence > 5) continuations++;
      }
      const score =
        (0.7 * aligned) / (size + 1) +
        (0.3 * strength) / (size + 1) -
        continuations * 0.18;
      if (aligned >= size - 1) results.push({ start: peaks[a], span, score });
    }
  return results.sort((a, b) => b.score - a.score).slice(0, 12);
}
/** Axial repeated edge evidence; deliberately low confidence when regular square grid is absent. */
export function detectGrid(
  image: Pixels,
  preferred?: BoardSize,
): GridDetection {
  const game = detectGameBoard(image, preferred);
  if (game) return game;
  const { width: w, height: h, data } = image,
    xEdges = Array<number>(w).fill(0),
    yEdges = Array<number>(h).fill(0);
  const stride = Math.max(1, Math.floor(Math.max(w, h) / 900));
  for (let y = 1; y < h; y += stride)
    for (let x = 1; x < w; x += stride) {
      const i = (y * w + x) * 4;
      let dx = 0,
        dy = 0;
      for (let ch = 0; ch < 3; ch++) {
        dx += Math.abs(data[i + ch] - data[i - 4 + ch]);
        dy += Math.abs(data[i + ch] - data[i - w * 4 + ch]);
      }
      xEdges[x] += dx / 3 / (h / stride);
      yEdges[y] += dy / 3 / (w / stride);
    }
  let best: GridDetection | undefined;
  for (const size of preferred ? [preferred] : ([8, 10, 12] as BoardSize[])) {
    const xs = axisCandidates(xEdges, size),
      ys = axisCandidates(yEdges, size);
    for (const x of xs)
      for (const y of ys) {
        const aspect = Math.abs(x.span - y.span) / Math.max(x.span, y.span);
        if (aspect > 0.18) continue;
        const confidence = Math.min(x.score, y.score) * (1 - aspect);
        if (!best || confidence > best.confidence)
          best = {
            rect: { x: x.start, y: y.start, width: x.span, height: y.span },
            size,
            confidence,
            reason: "根据重复网格边缘定位，请检查框选范围和尺寸",
          };
      }
  }
  if (best && best.confidence >= 0.65) return best;
  const span = Math.round(Math.min(w, h) * 0.85);
  return {
    rect: {
      x: Math.round((w - span) / 2),
      y: Math.round((h - span) / 2),
      width: span,
      height: span,
    },
    size: preferred ?? 8,
    confidence: 0.1,
    reason: "未找到可靠的规则棋盘。请手动框选；倾斜照片建议重新拍摄正面图。",
  };
}
export function cropPixels(image: Pixels, rect: Rect): Pixels {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(rect.x))),
    y = Math.max(0, Math.min(image.height - 1, Math.round(rect.y)));
  const width = Math.max(1, Math.min(image.width - x, Math.round(rect.width))),
    height = Math.max(1, Math.min(image.height - y, Math.round(rect.height)));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let r = 0; r < height; r++)
    data.set(
      image.data.subarray(
        ((y + r) * image.width + x) * 4,
        ((y + r) * image.width + x + width) * 4,
      ),
      r * width * 4,
    );
  return { width, height, data };
}
export function cellRect(rect: Rect, size: number, index: number): Rect {
  const w = rect.width / size,
    h = rect.height / size,
    pad = 0.13;
  return {
    x: rect.x + ((index % size) + pad) * w,
    y: rect.y + (Math.floor(index / size) + pad) * h,
    width: w * (1 - 2 * pad),
    height: h * (1 - 2 * pad),
  };
}
export function features(image: Pixels): CellFeatures {
  const { width: w, height: h, data } = image;
  // Median perimeter RGB estimates each tile's background, robust to lighting shifts.
  const edges: [number[], number[], number[]] = [[], [], []];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2)
        for (let ch = 0; ch < 3; ch++)
          edges[ch].push(data[(y * w + x) * 4 + ch]);
  const bg = edges.map(
    (values) =>
      values.sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0,
  );
  const binary: number[] = [];
  let colored = 0,
    contrast = 0;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4,
      r = data[p],
      g = data[p + 1],
      b = data[p + 2],
      difference = Math.max(
        Math.abs(r - bg[0]),
        Math.abs(g - bg[1]),
        Math.abs(b - bg[2]),
      );
    binary.push(difference > 55 ? 1 : 0);
    contrast = Math.max(contrast, difference);
    if (g > r * 1.2 && b > r * 1.15 && g > 100 && difference > 55) colored++;
  }
  const foreground = binary.reduce((a, b) => a + b, 0) / binary.length;
  // Broad cyan shape evidence is a candidate only, always marked for human review.
  const gemScore = colored / binary.length;
  return { mask: normalizeMask(binary, w, h), foreground, gemScore, contrast };
}
export function classifyCell(
  image: Pixels,
  templates: GlyphTemplate[],
  profile?: "tidemyst",
): RecognitionCell {
  if (profile === "tidemyst") return classifyGameCell(image, templates);
  const f = features(image),
    match = matchDigit(f.mask, templates);
  if (f.foreground < 0.012 || f.contrast < 45)
    return {
      cell: { observed: "unknown", flagged: false },
      confidence: 0.65,
      reason: "缺少清晰内容，保留未知；可能是未翻开或空白格",
      needsReview: true,
    };
  if (f.gemScore > 0.26 && f.foreground > 0.28)
    return {
      cell: { observed: "gem", flagged: false },
      confidence: 0.7,
      reason: "青色宝石外形候选，请核对",
      needsReview: true,
    };
  if (
    match.score > 0.9 &&
    match.margin > 0.08 &&
    typeof match.digit === "string"
  )
    return {
      cell: {
        observed: match.digit === "safe" ? "safe" : "unknown",
        flagged: match.digit === "flag",
      },
      confidence: match.score,
      reason: "符号模板候选，请核对游戏实际标记",
      needsReview: true,
    };
  if (
    match.score > 0.8 &&
    match.margin > 0.06 &&
    f.foreground < 0.55 &&
    typeof match.digit === "number"
  )
    return {
      cell: { observed: match.digit, flagged: false },
      confidence: match.score,
      reason: "字体模板匹配候选",
      needsReview: match.score < 0.9,
    };
  return {
    cell: { observed: "unknown", flagged: false },
    confidence: Math.min(0.59, match.score),
    reason: "图形或数字不确定，保留未知并等待校正",
    needsReview: true,
  };
}
