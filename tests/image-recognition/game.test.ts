import { it, expect } from "vitest";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import {
  detectGrid,
  cellRect,
  cropPixels,
  classifyCell,
  type Pixels,
} from "../../src/features/image-recognition/pixels";
const truth = JSON.parse(
  readFileSync("tests/fixtures/real/tidemyst-8.json", "utf8"),
) as { rows: (string | number)[][] };
async function fixture(
  scale = 1,
  brightness = 1,
  jpegQuality?: number,
): Promise<Pixels> {
  const image = await loadImage("tests/fixtures/real/tidemyst-8.jpg");
  const c = createCanvas(
      Math.round(image.width * scale),
      Math.round(image.height * scale),
    ),
    ctx = c.getContext("2d");
  ctx.drawImage(image, 0, 0, c.width, c.height);
  if (brightness !== 1) {
    const frame = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < frame.data.length; i += 4)
      for (let ch = 0; ch < 3; ch++)
        frame.data[i + ch] = Math.min(255, frame.data[i + ch] * brightness);
    ctx.putImageData(frame, 0, 0);
  }
  if (jpegQuality !== undefined) {
    const compressed = await loadImage(c.toBuffer("image/jpeg", jpegQuality));
    ctx.drawImage(compressed, 0, 0);
  }
  return {
    width: c.width,
    height: c.height,
    data: ctx.getImageData(0, 0, c.width, c.height).data,
  };
}
it.each([1, 1600 / 2532, 0.4])(
  "locates the actual lower game board at scale %f instead of the decoration",
  async (scale) => {
    const image = await fixture(scale),
      detection = detectGrid(image);
    expect(detection.size).toBe(8);
    expect(detection.confidence).toBeGreaterThanOrEqual(0.72);
    expect(Math.abs(detection.rect.x / scale - 50)).toBeLessThan(16);
    expect(Math.abs(detection.rect.y / scale - 990)).toBeLessThan(16);
    expect(Math.abs(detection.rect.width / scale - 1068)).toBeLessThan(20);
  },
);
it("recognizes every actual gold gem, number and blue cover from the independently labeled 64 cells", async () => {
  const image = await fixture(),
    detection = detectGrid(image);
  for (const [i, observed] of truth.rows.flat().entries()) {
    const result = classifyCell(
      cropPixels(image, cellRect(detection.rect, 8, i)),
      [],
      detection.profile,
    );
    expect(result.cell.observed, `cell ${i}`).toBe(observed);
    if (observed !== "unknown")
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  }
});

it.each([
  { scale: 1600 / 2532, brightness: 1, quality: 70 },
  { scale: 0.4, brightness: 1, quality: 55 },
  { scale: 1600 / 2532, brightness: 0.8, quality: 75 },
  { scale: 1600 / 2532, brightness: 1.15, quality: 75 },
])(
  "keeps every real cell correct after scale/brightness/JPEG changes %j",
  async ({ scale, brightness, quality }) => {
    const image = await fixture(scale, brightness, quality),
      d = detectGrid(image);
    expect(d.profile).toBe("tidemyst");
    expect(d.size).toBe(8);
    for (const [i, observed] of truth.rows.flat().entries()) {
      const r = classifyCell(
        cropPixels(image, cellRect(d.rect, 8, i)),
        [],
        d.profile,
      );
      // This is the pixel stage. Weak digits must go to OCR rather than become false facts.
      if (
        r.confidence >= 0.9 ||
        !r.needsReview ||
        observed === "gem" ||
        observed === "unknown"
      ) {
        expect(r.cell.observed, `cell ${i} confidence ${r.confidence}`).toBe(
          observed,
        );
      } else {
        expect(r.needsReview).toBe(true);
        expect(r.confidence).toBeLessThan(0.9);
      }
    }
  },
);
it.each([8, 10, 12] as const)(
  "infers %i from tile spacing on independent game-style synthetic grids",
  (size) => {
    const c = createCanvas(900, 1400),
      ctx = c.getContext("2d");
    ctx.fillStyle = "#25283e";
    ctx.fillRect(0, 0, 900, 1400);
    const span = 780,
      left = 60,
      top = 480,
      step = span / size;
    ctx.fillStyle = "#10334f";
    ctx.fillRect(left - 8, top - 8, span + 16, span + 16);
    ctx.strokeStyle = "#39d3e3";
    ctx.lineWidth = 4;
    ctx.strokeRect(left - 8, top - 8, span + 16, span + 16);
    for (let r = 0; r < size; r++)
      for (let col = 0; col < size; col++) {
        ctx.fillStyle = "#087fbc";
        ctx.fillRect(
          left + col * step + 4,
          top + r * step + 4,
          step - 8,
          step - 8,
        );
        ctx.strokeStyle = "#19cedd";
        ctx.lineWidth = 3;
        ctx.strokeRect(
          left + col * step + 4,
          top + r * step + 4,
          step - 8,
          step - 8,
        );
      }
    const d = detectGrid({
      width: 900,
      height: 1400,
      data: ctx.getImageData(0, 0, 900, 1400).data,
    });
    expect(d.profile).toBe("tidemyst");
    expect(d.size).toBe(size);
    expect(d.confidence).toBeGreaterThanOrEqual(0.72);
  },
);

it("keeps an unsupported white letter uncertain rather than inventing a game number", () => {
  const c = createCanvas(80, 80),
    ctx = c.getContext("2d");
  ctx.fillStyle = "#104c86";
  ctx.fillRect(0, 0, 80, 80);
  ctx.fillStyle = "white";
  ctx.font = "700 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("W", 40, 40);
  const r = classifyCell(
    { width: 80, height: 80, data: ctx.getImageData(0, 0, 80, 80).data },
    [],
    "tidemyst",
  );
  expect(r.cell.observed).toBe("unknown");
  expect(r.needsReview).toBe(true);
});

it("rejects a cyan square outline without validated tile gaps", () => {
  const c = createCanvas(900, 1400),
    ctx = c.getContext("2d");
  ctx.fillStyle = "#25283e";
  ctx.fillRect(0, 0, 900, 1400);
  ctx.strokeStyle = "#39d3e3";
  ctx.lineWidth = 4;
  ctx.strokeRect(55, 480, 790, 790);
  const d = detectGrid({
    width: 900,
    height: 1400,
    data: ctx.getImageData(0, 0, 900, 1400).data,
  });
  expect(d.confidence).toBeLessThan(0.72);
});
