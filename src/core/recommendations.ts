import { neighbors, type Board, type SolveResult } from "./models";
export function recommend(board: Board, result: SolveResult) {
  if (result.status !== "exact")
    return { best: [] as number[], information: [] as number[], max: 0 };
  const candidates = board.cells.flatMap((c, i) =>
    c.observed === "unknown" && (result.probabilities[i] ?? 0) > 0 ? [i] : [],
  );
  const max = Math.max(0, ...candidates.map((i) => result.probabilities[i]!));
  const best = candidates.filter(
    (i) => Math.abs(result.probabilities[i]! - max) < 1e-12,
  );
  // This is neighborhood coverage, not entropy/information gain; expose that distinction in UI.
  const score = (i: number) =>
    neighbors(i, board.size).filter(
      (n) =>
        board.cells[n].observed === "unknown" &&
        result.probabilities[n] !== 0 &&
        result.probabilities[n] !== 1,
    ).length;
  const informationCandidates = board.cells.flatMap((c, i) =>
    c.observed === "unknown" && result.probabilities[i] !== 1 ? [i] : [],
  );
  const sorted = informationCandidates.sort(
    (a, b) =>
      score(b) - score(a) ||
      result.probabilities[a]! - result.probabilities[b]! ||
      a - b,
  );
  return { best, information: sorted.slice(0, 3), max };
}
