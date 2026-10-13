import { it, expect } from "vitest";
import {
  createBoard,
  emptyCell,
  neighbors,
  type Board,
} from "../../src/core/models";
import { solveBoard } from "../../src/core/solver";
import { recommend, rankRecommendations } from "../../src/core/recommendations";
function outcomeEntropy(b: Board, i: number): number {
  const vars = b.cells.flatMap((c, n) => (c.observed === "unknown" ? [n] : [])),
    counts = Array<number>(10).fill(0);
  let total = 0;
  for (let mask = 0; mask < 2 ** vars.length; mask++) {
    const gems = new Set(
      b.cells.flatMap((c, n) => (c.observed === "gem" ? [n] : [])),
    );
    vars.forEach((n, k) => {
      if (mask & (1 << k)) gems.add(n);
    });
    if (
      gems.size !== b.totalGems ||
      b.cells.some(
        (c, n) =>
          typeof c.observed === "number" &&
          neighbors(n, b.size).filter((v) => gems.has(v)).length !== c.observed,
      )
    )
      continue;
    total++;
    counts[
      gems.has(i) ? 9 : neighbors(i, b.size).filter((n) => gems.has(n)).length
    ]++;
  }
  return counts.reduce(
    (h, c) => (c ? h - (c / total) * Math.log2(c / total) : h),
    0,
  );
}
it.each([8, 10, 12] as const)(
  "blank %i recommends B2, preserves all probability ties",
  (size) => {
    const b = createBoard(size),
      r = rankRecommendations(b, solveBoard(b));
    expect(r.best).toHaveLength(size * size);
    expect(r.next).toEqual([size + 1]);
    expect(r.strategy).toBe("exact-information");
  },
);
it("conditional layout entropy matches independent brute-force ranking", () => {
  const b: Board = {
    ...createBoard(),
    size: 3,
    totalGems: 2,
    cells: Array.from({ length: 9 }, emptyCell),
  };
  b.cells[0].observed = 1;
  const result = solveBoard(b),
    r = rankRecommendations(b, result);
  const expected = recommend(b, result)
    .best.map((i) => ({ i, entropy: outcomeEntropy(b, i) }))
    .sort((a, b) => b.entropy - a.entropy || a.i - b.i)[0].i;
  expect(r.strategy).toBe("exact-information");
  expect(r.next).toEqual([expected]);
});
it("a zero clue still prefers an interior cell away from determined empty neighbors", () => {
  const b = createBoard();
  b.cells[26].observed = 0;
  const r = rankRecommendations(b, solveBoard(b));
  expect(r.next[0]).toBe(13);
});
it("strictly proven gems are all recommended before uncertain cells", () => {
  const b = createBoard();
  b.cells[0].observed = 3;
  const r = rankRecommendations(b, solveBoard(b));
  expect(r.strategy).toBe("certain");
  expect(r.next.sort((a, b) => a - b)).toEqual([1, 8, 9]);
});
it("information budget interruption explicitly falls back without changing probabilities", () => {
  const b = createBoard(),
    result = solveBoard(b),
    before = [...result.probabilities],
    r = rankRecommendations(b, result, { maxMs: 0 });
  expect(r.strategy).toBe("neighbor-coverage");
  expect(r.next).toEqual([9]);
  expect(result.probabilities).toEqual(before);
});
it("invalid boards receive no recommendation", () => {
  const b = createBoard();
  b.totalGems = 0;
  b.cells[0].observed = 3;
  expect(rankRecommendations(b, solveBoard(b)).next).toEqual([]);
});

it("display rounding and tiny differences never override the highest probability", () => {
  const b = createBoard(),
    result = solveBoard(b);
  result.probabilities[0] = 0.31250000000001;
  const rec = rankRecommendations(b, result, { maxMs: 0 });
  expect(rec.next).toEqual([0]);
  expect(rec.best).toEqual([0]);
});
