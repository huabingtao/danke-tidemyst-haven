import { it, expect } from "vitest";
import { createBoard } from "../../src/core/models";
import { solveBoard } from "../../src/core/solver";
import { recommend } from "../../src/core/recommendations";
it("shows all equal max-probability candidates and a separate coverage heuristic", () => {
  const b = createBoard(),
    r = recommend(b, solveBoard(b));
  expect(r.best).toHaveLength(64);
  expect(r.max).toBe(0.3125);
  expect(r.information[0]).toBe(9);
});
it("invalid boards receive no recommendation", () => {
  const b = createBoard();
  b.totalGems = 0;
  b.cells[0].observed = 3;
  expect(recommend(b, solveBoard(b)).best).toHaveLength(0);
});
