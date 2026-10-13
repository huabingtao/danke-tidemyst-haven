// Offline template preparation from labeled, user-authorized samples. Never runs in the app.
import { createServer } from "vite";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import { writeFile, readFile } from "node:fs/promises";
const imagePath = process.argv[2] ?? "tests/fixtures/real/tidemyst-8.jpg";
const labelsPath = process.argv[3] ?? "tests/fixtures/real/tidemyst-8.json";
const labels = JSON.parse(await readFile(labelsPath, "utf8"));
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { detectGrid, cropPixels, cellRect } = await server.ssrLoadModule(
    "/src/features/image-recognition/pixels.ts",
  );
  const { gameFeatures } = await server.ssrLoadModule(
    "/src/features/image-recognition/gameBoard.ts",
  );
  const img = await loadImage(imagePath),
    entries = [];
  const sampleIndices = new Map();
  labels.rows.flat().forEach((value, i) => {
    if (
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 8 &&
      !sampleIndices.has(value)
    )
      sampleIndices.set(value, i);
  });
  for (const scale of [
    1,
    Math.min(1, 1600 / Math.max(img.width, img.height)),
  ]) {
    const c = createCanvas(
        Math.round(img.width * scale),
        Math.round(img.height * scale),
      ),
      ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const image = {
        width: c.width,
        height: c.height,
        data: ctx.getImageData(0, 0, c.width, c.height).data,
      },
      d = detectGrid(image);
    if (
      d.profile !== "tidemyst" ||
      d.size !== labels.size ||
      d.confidence < 0.72
    )
      throw new Error(
        "Labeled sample must contain a reliably detected full game board",
      );
    for (const [digit, index] of sampleIndices)
      entries.push({
        digit,
        mask: gameFeatures(
          cropPixels(image, cellRect(d.rect, d.size, index)),
        ).mask.join(""),
      });
  }
  const source =
    '// White glyph masks from one labeled example per digit at two raster sizes.\n// Regenerate: node scripts/calibrate-game-glyphs.mjs [image] [labels]\n// No image, screenshot coordinates, or board answers ship in the app.\nimport type { GlyphTemplate } from "./pixels";\nconst patterns = ' +
    JSON.stringify(entries, null, 2) +
    ';\nexport const GAME_DIGIT_TEMPLATES: GlyphTemplate[] = patterns.map(p => ({digit:p.digit,font:"tidemyst-white-glyph",mask:Array.from(p.mask, Number)}));\n';
  await writeFile(
    "src/features/image-recognition/gameDigitTemplates.ts",
    source,
  );
  console.log(
    `Calibrated ${entries.length} glyph masks; digits ${[...sampleIndices.keys()].join(", ")}. Other digits use generated fonts/OCR.`,
  );
} finally {
  await server.close();
}
