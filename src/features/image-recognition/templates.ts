import { normalizeMask, type GlyphTemplate } from "./pixels";
export function makeTemplates(): GlyphTemplate[] {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 80;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const templates: GlyphTemplate[] = [];
  for (const font of ["Arial", "Verdana", "Tahoma", "Georgia", "system-ui"])
    for (const weight of ["400", "700"])
      for (let digit = 0; digit <= 8; digit++) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 64, 80);
        ctx.fillStyle = "black";
        ctx.font = `${weight} 54px ${font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(digit), 32, 42);
        const pixels = ctx.getImageData(0, 0, 64, 80).data,
          binary: number[] = [];
        for (let i = 0; i < 64 * 80; i++)
          binary.push(pixels[i * 4] < 128 ? 1 : 0);
        templates.push({
          digit,
          font: `${weight} ${font}`,
          mask: normalizeMask(binary, 64, 80),
        });
      }
  for (const [symbol, digit] of [
    ["✓", "safe"],
    ["✔", "safe"],
    ["⚑", "flag"],
  ] as const) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 64, 80);
    ctx.fillStyle = "black";
    ctx.font = "400 48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, 32, 42);
    const pixels = ctx.getImageData(0, 0, 64, 80).data,
      binary: number[] = [];
    for (let i = 0; i < 64 * 80; i++) binary.push(pixels[i * 4] < 128 ? 1 : 0);
    templates.push({
      digit,
      font: "symbol",
      mask: normalizeMask(binary, 64, 80),
    });
  }
  return templates;
}
