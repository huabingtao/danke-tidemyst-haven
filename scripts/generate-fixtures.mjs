import { createCanvas } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("tests/fixtures", { recursive: true });
for (const size of [8, 10, 12]) {
  const side = 48,
    offset = 40,
    width = size * side + 80,
    height = size * side + 110,
    canvas = createCanvas(width, height),
    ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  const top = 60,
    gems = new Set([size * 2 + 2, size * 3 + 3]),
    observed = new Set([
      0,
      1,
      size,
      size + 1,
      size + 2,
      size * 2 + 1,
      size * 2 + 3,
      size * 3 + 2,
    ]);
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      const i = r * size + c,
        x = offset + c * side,
        y = top + r * side;
      ctx.fillStyle = observed.has(i) ? "#f5f5f5" : "#d7dce9";
      ctx.fillRect(x, y, side, side);
      if (gems.has(i)) {
        ctx.fillStyle = "#22d4cf";
        ctx.beginPath();
        ctx.moveTo(x + 24, y + 6);
        ctx.lineTo(x + 43, y + 24);
        ctx.lineTo(x + 24, y + 43);
        ctx.lineTo(x + 6, y + 24);
        ctx.closePath();
        ctx.fill();
      } else if (observed.has(i)) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++)
            if (
              (dr || dc) &&
              r + dr >= 0 &&
              c + dc >= 0 &&
              r + dr < size &&
              c + dc < size &&
              gems.has((r + dr) * size + c + dc)
            )
              n++;
        ctx.font = "700 30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#252c52";
        ctx.fillText(String(n), x + 24, y + 25);
      }
    }
  ctx.strokeStyle = "#4d556d";
  ctx.lineWidth = 2;
  for (let k = 0; k <= size; k++) {
    ctx.beginPath();
    ctx.moveTo(offset + k * side, top);
    ctx.lineTo(offset + k * side, top + size * side);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offset, top + k * side);
    ctx.lineTo(offset + size * side, top + k * side);
    ctx.stroke();
  }
  await writeFile(
    `tests/fixtures/board-${size}.png`,
    canvas.toBuffer("image/png"),
  );
}
// A separate high-resolution numeric glyph exercises actual OCR, not template matching.
const digit = createCanvas(64, 80),
  ctx = digit.getContext("2d");
ctx.fillStyle = "white";
ctx.fillRect(0, 0, 64, 80);
ctx.font = "700 54px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillStyle = "black";
ctx.fillText("5", 32, 42);
await writeFile("tests/fixtures/digit-5.png", digit.toBuffer("image/png"));
console.log("生成 3 张合成棋盘与独立 OCR 数字样本");
const ambiguous = createCanvas(464, 494),
  amb = ambiguous.getContext("2d");
amb.fillStyle = "white";
amb.fillRect(0, 0, 464, 494);
for (let r = 0; r < 8; r++)
  for (let c = 0; c < 8; c++) {
    const x = 40 + c * 48,
      y = 60 + r * 48;
    amb.fillStyle = "#f5f5f5";
    amb.fillRect(x, y, 48, 48);
    amb.strokeStyle = "#4d556d";
    amb.lineWidth = 2;
    amb.strokeRect(x, y, 48, 48);
    amb.fillStyle = "#252c52";
    amb.font = "700 30px Arial";
    amb.textAlign = "center";
    amb.textBaseline = "middle";
    amb.fillText("W", x + 24, y + 25);
  }
await writeFile(
  "tests/fixtures/board-ambiguous.png",
  ambiguous.toBuffer("image/png"),
);
