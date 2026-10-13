import { it, expect } from "vitest";
import { createBoard, validateBoards } from "../../src/core/models";
it("validates serializable round trip", () => {
  const b = createBoard();
  expect(
    validateBoards(JSON.parse(JSON.stringify({ version: 1, boards: [b] })))[0]
      .cells,
  ).toEqual(b.cells);
});
it("rejects illegal sizes, states, totals and duplicate IDs", () => {
  const b = createBoard();
  expect(() => validateBoards({ version: 1, boards: [b, b] })).toThrow();
  expect(() =>
    validateBoards({ version: 1, boards: [{ ...b, totalGems: -1 }] }),
  ).toThrow();
  expect(() =>
    validateBoards({ version: 1, boards: [{ ...b, cells: [] }] }),
  ).toThrow();
  b.cells[0].observed = 9;
  expect(() => validateBoards({ version: 1, boards: [b] })).toThrow();
});
