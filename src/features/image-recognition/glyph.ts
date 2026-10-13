import type { GlyphTemplate } from "./pixels";
export function normalizeMask(
  binary: number[],
  width: number,
  height: number,
): number[] {
  let left = width,
    top = height,
    right = -1,
    bottom = -1;
  binary.forEach((v, i) => {
    if (v) {
      const x = i % width,
        y = Math.floor(i / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  });
  if (right < 0) return Array<number>(20 * 28).fill(0);
  const out: number[] = [];
  for (let y = 0; y < 28; y++)
    for (let x = 0; x < 20; x++) {
      const sx =
          left +
          Math.min(right - left, Math.floor((x / 20) * (right - left + 1))),
        sy =
          top +
          Math.min(bottom - top, Math.floor((y / 28) * (bottom - top + 1)));
      out.push(binary[sy * width + sx]);
    }
  return out;
}
export function matchDigit(mask: number[], templates: GlyphTemplate[]) {
  const byDigit = new Map<GlyphTemplate["digit"], number>();
  for (const t of templates) {
    let union = 0,
      intersection = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] || t.mask[i]) union++;
      if (mask[i] && t.mask[i]) intersection++;
    }
    const score = union ? intersection / union : 0;
    byDigit.set(t.digit, Math.max(score, byDigit.get(t.digit) ?? 0));
  }
  const sorted = [...byDigit].sort((a, b) => b[1] - a[1]);
  return {
    digit: sorted[0]?.[0] ?? 0,
    score: sorted[0]?.[1] ?? 0,
    margin: (sorted[0]?.[1] ?? 0) - (sorted[1]?.[1] ?? 0),
  };
}

const dilatedMasks = new WeakMap<GlyphTemplate, number[]>();
function dilate(mask: number[]): number[] {
  return mask.map((_, i) => {
    const x = i % 20,
      y = Math.floor(i / 20);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx >= 0 && nx < 20 && ny >= 0 && ny < 28 && mask[ny * 20 + nx])
          return 1;
      }
    return 0;
  });
}
/** Keep exact overlap dominant; tolerate one normalized pixel of anti-aliasing at contours.
 * Two-sided contour agreement avoids favoring an incomplete/thicker glyph alone.
 */
export function matchGameDigit(mask: number[], templates: GlyphTemplate[]) {
  const expanded = dilate(mask),
    byDigit = new Map<GlyphTemplate["digit"], number>();
  for (const t of templates) {
    let expandedTemplate = dilatedMasks.get(t);
    if (!expandedTemplate) {
      expandedTemplate = dilate(t.mask);
      dilatedMasks.set(t, expandedTemplate);
    }
    let union = 0,
      intersection = 0,
      inputCount = 0,
      templateCount = 0,
      inputNear = 0,
      templateNear = 0;
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] || t.mask[i]) union++;
      if (mask[i] && t.mask[i]) intersection++;
      if (mask[i]) {
        inputCount++;
        if (expandedTemplate[i]) inputNear++;
      }
      if (t.mask[i]) {
        templateCount++;
        if (expanded[i]) templateNear++;
      }
    }
    const precision = inputCount ? inputNear / inputCount : 0,
      recall = templateCount ? templateNear / templateCount : 0;
    const contour =
      precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    const score = 0.75 * (union ? intersection / union : 0) + 0.25 * contour;
    byDigit.set(t.digit, Math.max(score, byDigit.get(t.digit) ?? 0));
  }
  const sorted = [...byDigit].sort((a, b) => b[1] - a[1]);
  return {
    digit: sorted[0]?.[0] ?? 0,
    score: sorted[0]?.[1] ?? 0,
    margin: (sorted[0]?.[1] ?? 0) - (sorted[1]?.[1] ?? 0),
  };
}
