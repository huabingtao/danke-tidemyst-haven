import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { imageDimensions } from "../../src/features/image-recognition/dimensions";
it("reads PNG dimensions before allocating decoded pixels", () => {
  expect(
    imageDimensions(readFileSync("tests/fixtures/board-8.png").subarray(0, 24)),
  ).toEqual({ width: 464, height: 494 });
});
it("reads JPEG SOF and handles truncated input", () => {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0, 8, 8, 0, 100, 0, 120, 0,
  ]);
  expect(imageDimensions(bytes)).toEqual({ width: 120, height: 100 });
  expect(imageDimensions(new Uint8Array([1, 2]))).toBeNull();
  expect(imageDimensions(bytes.subarray(0, 5))).toBeNull();
});
