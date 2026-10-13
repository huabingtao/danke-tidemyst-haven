import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import {
  detectGrid,
  cropPixels,
  cellRect,
  classifyCell,
  features,
  normalizeMask,
  type GlyphTemplate,
  type Pixels,
} from "../../src/features/image-recognition/pixels";
async function fixture(size: number): Promise<Pixels> {
  const image = await loadImage(
    readFileSync(`tests/fixtures/board-${size}.png`),
  );
  const canvas = createCanvas(image.width, image.height),
    ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return {
    width: image.width,
    height: image.height,
    data: ctx.getImageData(0, 0, image.width, image.height).data,
  };
}
it.each([8, 10, 12])(
  "locates synthetic %i grid automatically",
  async (size) => {
    const image = await fixture(size),
      d = detectGrid(image);
    expect(d.size).toBe(size);
    expect(d.confidence).toBeGreaterThan(0.65);
    expect(Math.abs(d.rect.x - 40)).toBeLessThan(3);
    expect(Math.abs(d.rect.y - 60)).toBeLessThan(3);
    expect(Math.abs(d.rect.width - size * 48)).toBeLessThan(3);
  },
);
it("classifies gem candidate with review and keeps blank unknown", async () => {
  const image = await fixture(8),
    rect = { x: 40, y: 60, width: 384, height: 384 };
  const gem = classifyCell(cropPixels(image, cellRect(rect, 8, 18)), []);
  expect(gem.cell.observed).toBe("gem");
  expect(gem.needsReview).toBe(true);
  expect(
    classifyCell(cropPixels(image, cellRect(rect, 8, 7)), []).cell.observed,
  ).toBe("unknown");
});
it("matching a strong digit shape returns a number", async () => {
  const image = await fixture(8),
    crop = cropPixels(
      image,
      cellRect({ x: 40, y: 60, width: 384, height: 384 }, 8, 0),
    );
  const t: GlyphTemplate = {
    digit: 0,
    font: "synthetic",
    mask: features(crop).mask,
  };
  expect(classifyCell(crop, [t]).cell.observed).toBe(0);
});
it("fails gracefully on flat blurry image and bounds crop", () => {
  const image: Pixels = {
    width: 100,
    height: 100,
    data: new Uint8ClampedArray(40000).fill(255),
  };
  expect(detectGrid(image).confidence).toBeLessThan(0.65);
  expect(classifyCell(image, []).needsReview).toBe(true);
  expect(
    cropPixels(image, { x: -10, y: -10, width: 1000, height: 1000 }).width,
  ).toBe(100);
  expect(normalizeMask([0, 0, 0, 0], 2, 2).every((p) => p === 0)).toBe(true);
});
