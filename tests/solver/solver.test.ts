import { describe, it, expect } from "vitest";
import {
  createBoard,
  emptyCell,
  neighbors,
  type Board,
} from "../../src/core/models";
import { solveBoard, choose } from "../../src/core/solver";
function small(size: number, totalGems: number): Board {
  return {
    ...createBoard(),
    size,
    totalGems,
    cells: Array.from({ length: size * size }, emptyCell),
  };
}
function brute(board: Board): number[] | null {
  const unknown = board.cells.flatMap((c, i) =>
      c.observed === "unknown" ? [i] : [],
    ),
    hits = board.cells.map(() => 0);
  let layouts = 0;
  for (let mask = 0; mask < 2 ** unknown.length; mask++) {
    const gems = new Set(
      board.cells.flatMap((c, i) => (c.observed === "gem" ? [i] : [])),
    );
    unknown.forEach((i, k) => {
      if (mask & (1 << k)) gems.add(i);
    });
    if (gems.size !== board.totalGems) continue;
    if (
      board.cells.some(
        (c, i) =>
          typeof c.observed === "number" &&
          neighbors(i, board.size).filter((n) => gems.has(n)).length !==
            c.observed,
      )
    )
      continue;
    layouts++;
    for (const i of gems) hits[i]++;
  }
  return layouts ? hits.map((v) => v / layouts) : null;
}
describe("exact solver", () => {
  it.each([
    [8, 20, 0.3125],
    [10, 30, 0.3],
    [12, 45, 0.3125],
  ] as const)("blank %i board", (size, total, p) => {
    const b = createBoard(size);
    b.totalGems = total;
    const r = solveBoard(b);
    expect(r.status).toBe("exact");
    r.probabilities.forEach((x) => expect(x).toBeCloseTo(p, 12));
  });
  it("deducts observed gems; ignores guesses", () => {
    const b = small(3, 3);
    b.cells[0].observed = "gem";
    b.cells[1].flagged = true;
    const r = solveBoard(b);
    expect(r.remaining).toBe(2);
    expect(r.probabilities[1]).toBe(0.25);
  });
  it("zero clue proves surrounding cells empty", () => {
    const b = small(3, 1);
    b.cells[0].observed = 0;
    const r = solveBoard(b);
    expect(r.status).toBe("exact");
    for (const i of [1, 3, 4]) expect(r.probabilities[i]).toBe(0);
    expect(r.probabilities[8]).toBe(0.2);
  });
  it("full clue proves gems", () => {
    const b = small(3, 3);
    b.cells[0].observed = 3;
    for (const i of [1, 3, 4]) expect(solveBoard(b).probabilities[i]).toBe(1);
  });
  it("observed neighbor equals clue proves others empty", () => {
    const b = small(3, 1);
    b.cells[0].observed = 1;
    b.cells[1].observed = "gem";
    expect(solveBoard(b).probabilities[3]).toBe(0);
  });
  it("rejects mutually contradictory shared clues", () => {
    const b = small(2, 1);
    b.cells[0].observed = 0;
    b.cells[1].observed = 1;
    expect(solveBoard(b).status).toBe("conflict");
    expect(solveBoard(b).probabilities.every((p) => p === null)).toBe(true);
  });
  it("rejects globally impossible total", () => {
    const b = small(3, 0);
    b.cells[0].observed = 1;
    expect(solveBoard(b).status).toBe("conflict");
  });
  it("does not publish incomplete enumeration", () => {
    const b = small(4, 3);
    b.cells[0].observed = 1;
    const r = solveBoard(b, { maxNodes: 1 });
    expect(r.status).toBe("limited");
    expect(r.probabilities.every((p) => p === null)).toBe(true);
  });
  it("BigInt binomial coefficients", () => {
    expect(choose(64, 20)).toBe(19619725782651120n);
    expect(choose(3, 5)).toBe(0n);
  });
  it("checks independent components and unbounded cells with different global totals against brute force", () => {
    for (const total of [2, 3, 4, 5]) {
      const b = small(4, total);
      b.cells[0].observed = 1;
      b.cells[15].observed = 1;
      const expected = brute(b)!;
      const r = solveBoard(b);
      expect(r.status).toBe("exact");
      r.probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 12));
    }
  });
  it("weights variable gem counts within overlapping regions by global combinations", () => {
    for (const total of [2, 3, 4, 5]) {
      const b = small(4, total);
      b.cells[0].observed = 1;
      b.cells[2].observed = 1;
      for (const i of [8, 9, 10, 11]) b.cells[i].observed = "safe";
      b.cells[14].observed = 1;
      const expected = brute(b);
      const r = solveBoard(b);
      if (!expected) {
        expect(r.status).toBe("conflict");
        continue;
      }
      expect(r.status).toBe("exact");
      r.probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 12));
    }
  });
  it("exhaustive valid small-board observation combinations match oracle", () => {
    for (let mask = 0; mask < 512; mask += 3) {
      const b = small(3, 0),
        gems = new Set<number>();
      for (let i = 0; i < 9; i++) if (mask & (1 << i)) gems.add(i);
      b.totalGems = gems.size;
      for (const i of [0, 2, 4, 6])
        b.cells[i].observed = gems.has(i)
          ? "gem"
          : neighbors(i, 3).filter((n) => gems.has(n)).length;
      const expected = brute(b)!;
      const r = solveBoard(b);
      expect(r.status).toBe("exact");
      r.probabilities.forEach((p, i) => expect(p).toBeCloseTo(expected[i], 12));
    }
  });
});
