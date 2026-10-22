import { expect, it } from "vitest";
import { createBoard, neighbors } from "../../src/core/models";
import { rankRecommendations } from "../../src/core/recommendations";
import { solveBoard } from "../../src/core/solver";
import fixture from "../fixtures/solver/12x12-g11.json";

export function screenshotBoard() {
  const board = createBoard(12, "4");
  board.totalGems = fixture.totalGems;
  board.cells = fixture.rows.flatMap((row) =>
    [...row].map((value) => ({
      observed:
        value === "."
          ? ("unknown" as const)
          : value === "g"
            ? ("gem" as const)
            : Number(value),
      flagged: false,
    })),
  );
  return board;
}
it("solves the screenshot after G11 is recorded as 2 within the existing budget", () => {
  const board = screenshotBoard();
  expect(board.cells.filter((cell) => cell.observed === "gem")).toHaveLength(
    20,
  );
  expect(
    board.cells.filter((cell) => cell.observed !== "unknown"),
  ).toHaveLength(39);
  const result = solveBoard(board);
  expect(result.nodes).toBeLessThan(10000);
  expect(result.status).toBe("exact");
  expect(
    result.probabilities.reduce<number>((sum, p) => sum + (p ?? 0), 0),
  ).toBeCloseTo(45, 10);
  for (let i = 0; i < board.cells.length; i++) {
    if (typeof board.cells[i].observed === "number")
      expect(
        neighbors(i, 12).reduce((sum, n) => sum + result.probabilities[n]!, 0),
      ).toBeCloseTo(board.cells[i].observed as number, 10);
  }
});

it("G11 outcomes partition the original exact layouts without losing combination weights", () => {
  const board = screenshotBoard();
  const g11 = 10 * 12 + 6;
  board.cells[g11].observed = "unknown";
  const parent = solveBoard(board);
  expect(parent.status).toBe("exact");
  const outcomes = (["gem", 0, 1, 2, 3, 4, 5, 6, 7, 8] as const).map(
    (observed) => {
      const conditional = {
        ...board,
        cells: board.cells.map((cell, i) =>
          i === g11 ? { ...cell, observed } : cell,
        ),
      };
      const result = solveBoard(conditional);
      expect(result.status).not.toBe("limited");
      return result;
    },
  );
  expect(
    outcomes.reduce((sum, result) => sum + BigInt(result.layouts), 0n),
  ).toBe(BigInt(parent.layouts));
  for (let i = 0; i < board.cells.length; i++) {
    const marginal = outcomes.reduce(
      (sum, outcome) =>
        sum +
        ((outcome.probabilities[i] ?? 0) * Number(outcome.layouts)) /
          Number(parent.layouts),
      0,
    );
    expect(marginal).toBeCloseTo(parent.probabilities[i]!, 10);
  }
  board.cells[g11].observed = 2;
  const result = solveBoard(board);
  const recommendation = rankRecommendations(board, result);
  expect(recommendation.next.length).toBeGreaterThan(0);
  for (const i of recommendation.next) {
    expect(board.cells[i].observed).toBe("unknown");
    expect(result.probabilities[i]).toBe(recommendation.max);
  }
});
