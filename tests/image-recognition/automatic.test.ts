import { it, expect } from "vitest";
import { automaticCells } from "../../src/features/image-recognition/automatic";
import { createBoard, validateBoards } from "../../src/core/models";
it("auto import fills strong digits and retains uncertain suggestions as unknown", () => {
  const cells = automaticCells([
    {
      cell: { observed: 3, flagged: false },
      confidence: 0.95,
      needsReview: false,
      reason: "模板数字",
    },
    {
      cell: { observed: "gem", flagged: false },
      confidence: 0.7,
      needsReview: true,
      reason: "宝石候选",
    },
    {
      cell: { observed: "unknown", flagged: false },
      confidence: 0.65,
      needsReview: true,
      reason: "未翻开",
    },
  ]);
  expect(cells[0].observed).toBe(3);
  expect(cells[1].observed).toBe("unknown");
  expect(cells[1].recognition?.suggested).toBe("gem");
  expect(cells[2].recognition).toBeUndefined();
});
it("pending recognition survives validated JSON round trip", () => {
  const b = createBoard();
  b.cells[0] = {
    observed: "unknown",
    flagged: false,
    recognition: { suggested: "gem", confidence: 0.7, reason: "宝石候选" },
  };
  expect(
    validateBoards({ version: 1, boards: [b] })[0].cells[0].recognition
      ?.suggested,
  ).toBe("gem");
});
