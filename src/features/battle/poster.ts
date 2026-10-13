import QRCode from "qrcode";
import { battleDate, battleLabel, rate, type BattleShare } from "./stats";
export const POSTER = {
  width: 1080,
  height: 1440,
  blue: "#1762D8",
  navy: "#112B5F",
  yellow: "#FFCA28",
  paper: "#FFF9E7",
};
/** Draw the same immutable snapshot used by the URL. No external image or API request. */
export async function paintPoster(
  canvas: HTMLCanvasElement,
  share: BattleShare,
  url: string,
): Promise<void> {
  if (typeof document !== "undefined") await document.fonts?.ready;
  canvas.width = POSTER.width;
  canvas.height = POSTER.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("浏览器无法生成图片，请改用战绩链接");
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    color = POSTER.navy,
    weight = 800,
    maxWidth = 1008 - x,
  ) => {
    ctx.font = `${weight} ${size}px "Nunito Variable", "PingFang SC", "Microsoft YaHei", sans-serif`;
    const measured = ctx.measureText(value).width;
    if (measured > maxWidth)
      ctx.font = `${weight} ${(size * maxWidth) / measured}px "Nunito Variable", "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  };
  ctx.fillStyle = POSTER.paper;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = POSTER.blue;
  ctx.fillRect(0, 0, 1080, 284);
  text("我的潮汐秘境战绩", 72, 128, 66, "#FFFFFF");
  text(battleLabel(share), 72, 215, 36, "#FFF0A8");
  // Original geometric gem emblem, independent of the game's artwork.
  ctx.beginPath();
  ctx.moveTo(937, 68);
  ctx.lineTo(997, 120);
  ctx.lineTo(937, 190);
  ctx.lineTo(877, 120);
  ctx.closePath();
  ctx.fillStyle = POSTER.yellow;
  ctx.fill();
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = POSTER.yellow;
  ctx.fillRect(52, 332, 976, 256);
  text("花费棋子", 86, 405, 36);
  text("找到宝石", 588, 405, 36);
  text(String(share.spent), 82, 548, 126, POSTER.navy, 800, 410);
  text(
    `${share.found}/${share.totalGems}`,
    586,
    548,
    112,
    POSTER.navy,
    800,
    420,
  );
  ctx.strokeStyle = POSTER.navy;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(536, 374);
  ctx.lineTo(536, 550);
  ctx.stroke();
  text("命中率", 78, 704, 38);
  text("收集完成率", 78, 862, 38);
  text(rate(share.found, share.spent), 636, 727, 92, POSTER.blue);
  text(rate(share.found, share.totalGems), 636, 885, 92, POSTER.blue);
  ctx.strokeStyle = "#B7CBE8";
  ctx.beginPath();
  ctx.moveTo(76, 776);
  ctx.lineTo(1004, 776);
  ctx.stroke();
  text("棋子消耗按已录入的宝石和数字格计算", 78, 964, 27, "#355383", 600);
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const count = qr.modules.size,
    scale = Math.floor(300 / (count + 8)),
    edge = (count + 8) * scale;
  const x = 78,
    y = 1032;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x, y, edge, edge);
  ctx.fillStyle = POSTER.navy;
  for (let row = 0; row < count; row++)
    for (let col = 0; col < count; col++)
      if (qr.modules.get(row, col))
        ctx.fillRect(
          x + (col + 4) * scale,
          y + (row + 4) * scale,
          scale,
          scale,
        );
  text("扫码查看这份战绩", 440, 1100, 36);
  text("也来找到你的下一颗宝石", 440, 1157, 28, "#355383", 600);
  text(battleDate(share.createdAt), 440, 1231, 27, "#355383", 600);
  text("潮汐秘境 · 宝石推理助手", 78, 1380, 31);
}
export async function createPoster(share: BattleShare, url: string) {
  const canvas = document.createElement("canvas");
  await paintPoster(canvas, share, url);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("图片生成失败，请改用战绩链接")),
      "image/png",
    ),
  );
}
