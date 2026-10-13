import {
  neighbors,
  type Board,
  type SolveResult,
  type Recommendation,
} from "./models";
import { solveBoard, choose } from "./solver";
function candidates(board: Board, result: SolveResult): Recommendation {
  const empty: Recommendation = {
    best: [],
    next: [],
    information: [],
    max: 0,
    strategy: "neighbor-coverage",
  };
  if (result.status !== "exact") return empty;
  const available = board.cells.flatMap((c, i) =>
    c.observed === "unknown" && (result.probabilities[i] ?? 0) > 0 ? [i] : [],
  );
  const max = Math.max(0, ...available.map((i) => result.probabilities[i]!));
  const coverage = (i: number) =>
    neighbors(i, board.size).filter(
      (n) =>
        board.cells[n].observed === "unknown" &&
        result.probabilities[n] !== 0 &&
        result.probabilities[n] !== 1,
    ).length;
  const best = available
    .filter((i) => result.probabilities[i] === max)
    .sort((a, b) => coverage(b) - coverage(a) || a - b);
  const information = board.cells
    .flatMap((c, i) =>
      c.observed === "unknown" && result.probabilities[i] !== 1 ? [i] : [],
    )
    .sort((a, b) => coverage(b) - coverage(a) || a - b)
    .slice(0, 3);
  return {
    best,
    next: max === 1 ? best : best.slice(0, 1),
    information,
    max,
    strategy: max === 1 ? "certain" : "neighbor-coverage",
  };
}
export function recommend(board: Board, result: SolveResult): Recommendation {
  return result.recommendation ?? candidates(board, result);
}
const entropy = (counts: bigint[], total: bigint) =>
  counts.reduce((h, count) => {
    if (!count) return h;
    const p = Number(count) / Number(total);
    return h - p * Math.log2(p);
  }, 0);
/** Highest true gem probability first; maximize entropy of GEM / 0..8 among ties.
 * All outcome counts must finish before this ranking is published. A budget
 * interruption falls back to explicit neighborhood coverage, never partial entropy.
 */
export function rankRecommendations(
  board: Board,
  result: SolveResult,
  options: { maxMs?: number; maxNodes?: number } = {},
): Recommendation {
  const base = candidates(board, result);
  if (!base.best.length || base.max === 1) return base;
  const start = performance.now(),
    maxMs = options.maxMs ?? 1800;
  const total = BigInt(result.layouts);
  const active = board.cells.flatMap((c, i) =>
    c.observed === "unknown" &&
    result.probabilities[i]! > 0 &&
    result.probabilities[i]! < 1
      ? [i]
      : [],
  );
  const fixedGems = board.cells.filter(
    (c, i) =>
      c.observed === "gem" ||
      (c.observed === "unknown" && result.probabilities[i] === 1),
  ).length;
  const remaining = board.totalGems - fixedGems;
  // Equal cardinality proves every placement among active variables is legal.
  const exchangeable = choose(active.length, remaining) === total;
  const activeSet = new Set(active),
    scores = new Map<number, number>();
  const cache = new Map<string, number>();
  for (const i of base.best) {
    if (performance.now() - start >= maxMs) return base;
    const ns = neighbors(i, board.size);
    const known = ns.filter(
      (n) =>
        board.cells[n].observed === "gem" ||
        (board.cells[n].observed === "unknown" &&
          result.probabilities[n] === 1),
    ).length;
    const freeNeighbors = ns.filter((n) => activeSet.has(n)).length;
    let counts: bigint[];
    if (exchangeable) {
      const key = `${known}/${freeNeighbors}`;
      if (cache.has(key)) {
        scores.set(i, cache.get(key)!);
        continue;
      }
      counts = [choose(active.length - 1, remaining - 1)];
      for (let n = 0; n <= 8; n++)
        counts.push(
          choose(freeNeighbors, n - known) *
            choose(active.length - 1 - freeNeighbors, remaining - (n - known)),
        );
      const h = entropy(counts, total);
      cache.set(key, h);
      scores.set(i, h);
    } else {
      counts = [];
      for (const observed of ["gem", 0, 1, 2, 3, 4, 5, 6, 7, 8] as const) {
        const left = maxMs - (performance.now() - start);
        if (left <= 0) return base;
        const conditional: Board = {
          ...board,
          cells: board.cells.map((c, n) =>
            n === i ? { observed, flagged: c.flagged } : c,
          ),
        };
        const outcome = solveBoard(conditional, {
          maxMs: Math.min(left, 120),
          maxNodes: options.maxNodes ?? 80000,
        });
        if (outcome.status === "limited") return base;
        counts.push(outcome.status === "exact" ? BigInt(outcome.layouts) : 0n);
      }
      if (counts.reduce((a, b) => a + b, 0n) !== total) return base;
      scores.set(i, entropy(counts, total));
    }
  }
  const best = [...base.best].sort((a, b) => {
    const difference = scores.get(b)! - scores.get(a)!;
    return Math.abs(difference) > 1e-10 ? difference : a - b;
  });
  return {
    ...base,
    best,
    next: best.slice(0, 1),
    strategy: "exact-information",
  };
}
