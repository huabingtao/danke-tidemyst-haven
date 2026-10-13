import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createBoard } from "../../src/core/models";
import {
  boardStats,
  rate,
  aggregateBattle,
  settleBoard,
  validateStats,
} from "../../src/features/battle/stats";
it("counts the actual screenshot as 31 pieces, 14 gems, 45% hit and 70% collected", () => {
  const b = createBoard(),
    rows = JSON.parse(
      readFileSync("tests/fixtures/real/tidemyst-8.json", "utf8"),
    ).rows as (string | number)[][];
  b.cells = rows
    .flat()
    .map((o) => ({
      observed: o === "gem" ? "gem" : typeof o === "number" ? o : "unknown",
      flagged: false,
    }));
  const s = boardStats(b);
  expect(s).toEqual({ spent: 31, found: 14, totalGems: 20 });
  expect(rate(s.found, s.spent)).toBe("45%");
  expect(rate(s.found, s.totalGems)).toBe("70%");
});
it("ignores guesses, safety and recognition candidates and counts zero as a revealed cell", () => {
  const b = createBoard();
  b.cells[0] = { observed: "unknown", flagged: true };
  b.cells[1].observed = "safe";
  b.cells[2] = {
    observed: "gem",
    flagged: false,
    recognition: { suggested: "gem", confidence: 0.5, reason: "未确认" },
  };
  b.cells[3].observed = 0;
  b.cells[4].observed = "gem";
  expect(boardStats(b)).toEqual({ spent: 2, found: 1, totalGems: 20 });
  expect(rate(0, 0)).toBe("—");
  expect(rate(0, 2)).toBe("0%");
});
it("aggregates raw quantities, deduplicates rounds and never averages percentages", () => {
  const a = settleBoard(createBoard()),
    b = settleBoard(createBoard());
  Object.assign(a, { spent: 31, found: 14, totalGems: 20 });
  Object.assign(b, { spent: 8, found: 5, totalGems: 10 });
  const total = aggregateBattle([a, b, a]);
  expect(total).toMatchObject({
    rounds: 2,
    spent: 39,
    found: 19,
    totalGems: 30,
  });
  expect(rate(total.found, total.spent)).toBe("49%");
  expect(rate(total.found, total.totalGems)).toBe("63%");
  expect(() => aggregateBattle([])).toThrow();
});
it("rejects impossible quantities rather than sharing percentages above 100%", () => {
  expect(() => validateStats({ spent: 1, found: 2, totalGems: 20 })).toThrow();
  expect(() => validateStats({ spent: 3, found: 2, totalGems: 1 })).toThrow();
  expect(() =>
    validateStats({ spent: 1.5, found: 1, totalGems: 20 }),
  ).toThrow();
});
