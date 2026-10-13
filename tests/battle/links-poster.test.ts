import { it, expect } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { battleLink, readBattleLink } from "../../src/features/battle/links";
import { paintPoster } from "../../src/features/battle/poster";
import type { BattleShare } from "../../src/features/battle/stats";
const share: BattleShare = {
  kind: "progress",
  room: "黄蓝房间",
  rounds: 1,
  spent: 31,
  found: 14,
  totalGems: 20,
  createdAt: 1770000000000,
};
it("preserves an immutable Unicode snapshot, subfolder deployment and old-link separation", () => {
  const url = battleLink(
    share,
    "https://example.com/tool/?old=1#progress=test",
  );
  expect(url.startsWith("https://example.com/tool/#battle=")).toBe(true);
  expect(readBattleLink(url)).toEqual(share);
  expect(readBattleLink("https://example.com/#progress=test")).toBeNull();
  expect(() => readBattleLink("https://example.com/#battle=!!")).toThrow();
  expect(() =>
    readBattleLink(`https://example.com/#battle=${"A".repeat(2000)}`),
  ).toThrow();
  const broken = btoa(
    JSON.stringify([99, "final", "1", 1, 31, 14, 20, 1770000000000]),
  );
  expect(() =>
    readBattleLink(`https://example.com/#battle=${broken.replace(/=+$/, "")}`),
  ).toThrow();
});
it("generates a real 1080×1440 poster whose QR decodes to the exact battle URL", async () => {
  const canvas = createCanvas(1, 1),
    url = battleLink(share, "https://dankecxmj.guaguahub.cn/");
  await paintPoster(canvas as unknown as HTMLCanvasElement, share, url);
  expect([canvas.width, canvas.height]).toEqual([1080, 1440]);
  const pixels = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height);
  expect(jsQR(pixels.data, canvas.width, canvas.height)?.data).toBe(url);
  expect(canvas.toBuffer("image/png").length).toBeGreaterThan(10000);
});
