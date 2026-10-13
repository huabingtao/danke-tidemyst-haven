import { type CSSProperties } from "react";
import type { Board, SolveResult } from "../core/models";
export type BoardView = "standard" | "heatmap" | "recommendations";
export function percent(p: number) {
  if (p > 0 && p < 0.0001) return "<0.01%";
  if (p < 1 && p > 0.9999) return ">99.99%";
  return `${Number((p * 100).toFixed(2))}%`;
}
export function coordinate(index: number, size: number) {
  return `${String.fromCharCode(65 + (index % size))}${Math.floor(index / size) + 1}`;
}
interface Props {
  board: Board;
  result?: SolveResult | null;
  selected: number | null;
  onSelect: (i: number) => void;
  view?: BoardView;
  best?: number[];
  uncertain?: Set<number>;
  compact?: boolean;
}
export function BoardGrid({
  board,
  result,
  selected,
  onSelect,
  view = "standard",
  best = [],
  uncertain,
  compact,
}: Props) {
  return (
    <div
      className={`board-scroll ${compact ? "compact-board" : ""}`}
      tabIndex={0}
      aria-label="棋盘横向滚动区域"
    >
      <div
        className="board-grid"
        style={{ "--size": board.size } as CSSProperties}
        role="group"
        aria-label={`${board.size}乘${board.size}棋盘`}
      >
        <div className="axis-cell" />
        {Array.from({ length: board.size }, (_, c) => (
          <div key={`col${c}`} className="axis-cell">
            {String.fromCharCode(65 + c)}
          </div>
        ))}
        {Array.from({ length: board.size }, (_, r) => (
          <div className="board-row" key={r}>
            <div className="axis-cell">{r + 1}</div>
            {board.cells
              .slice(r * board.size, (r + 1) * board.size)
              .map((cell, c) => {
                const i = r * board.size + c,
                  o = cell.observed,
                  p =
                    result?.status === "exact" ? result.probabilities[i] : null;
                const isBest =
                    best.includes(i) && best.length < board.cells.length * 0.75,
                  isConflict = result?.conflictCells.includes(i),
                  review = uncertain?.has(i);
                const state =
                  o === "gem"
                    ? "gem"
                    : typeof o === "number"
                      ? "number"
                      : o === "safe"
                        ? "safe"
                        : p === 1
                          ? "certain"
                          : p === 0
                            ? "empty"
                            : "unknown";
                const text =
                  o === "gem"
                    ? "◆"
                    : typeof o === "number"
                      ? String(o)
                      : o === "safe"
                        ? "✓"
                        : p === 1
                          ? "◆"
                          : p === 0
                            ? "×"
                            : p !== null && p !== undefined
                              ? percent(p)
                              : "?";
                const label = `${coordinate(i, board.size)}，${o === "unknown" ? (p != null ? `宝石概率 ${percent(p)}` : "未知") : o === "gem" ? "已发现宝石" : o === "safe" ? "已知安全" : `数字 ${o}`}${cell.flagged ? "，推测旗标" : ""}${review ? "，需要核对" : ""}`;
                return (
                  <button
                    key={i}
                    type="button"
                    data-testid={`cell-${i}`}
                    aria-label={label}
                    aria-pressed={selected === i}
                    onClick={() => onSelect(i)}
                    className={`board-cell ${state} ${selected === i ? "selected" : ""} ${isBest ? "best" : ""} ${isConflict ? "conflict" : ""} ${review ? "review" : ""} ${view === "recommendations" && o === "unknown" && !isBest && p !== 1 ? "dimmed" : ""} ${view === "heatmap" && o === "unknown" ? "heat" : ""}`}
                    style={{ "--heat": p ?? 0 } as CSSProperties}
                  >
                    <span
                      className={
                        o === "unknown" && p !== 0 && p !== 1
                          ? "probability-value"
                          : ""
                      }
                    >
                      {text}
                    </span>
                    {cell.flagged && (
                      <span className="cell-flag" aria-hidden="true">
                        ⚑
                      </span>
                    )}
                    {state === "certain" && (
                      <span className="certainty-label">100%</span>
                    )}
                    {isConflict && (
                      <span className="cell-conflict" aria-hidden="true">
                        !
                      </span>
                    )}
                    {isBest && o === "unknown" && p !== 1 && (
                      <span className="cell-dot" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
