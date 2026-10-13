import { type CSSProperties } from "react";
import { useBoardLayout } from "../hooks/useBoardLayout";
import type { Board, SolveResult } from "../core/models";
export type BoardView = "standard" | "heatmap" | "recommendations";
export function percent(p: number) {
  return `${Math.round(p * 100)}%`;
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
  const { ref, layout } = useBoardLayout(board.size);
  return (
    <div
      className={`board-scroll ${compact ? "compact-board" : ""}`}
      ref={ref}
      aria-label="棋盘区域"
    >
      <div
        className="board-grid"
        style={
          {
            "--size": board.size,
            "--axis-size": `${layout.axis}px`,
            "--grid-gap": `${layout.gap}px`,
            "--grid-width": layout.width ? `${layout.width}px` : "100%",
            "--number-font": layout.cell ? `${layout.numberFont}px` : "16px",
            "--probability-font": layout.cell
              ? `${layout.probabilityFont}px`
              : "10px",
          } as CSSProperties
        }
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
                const isBest = best.includes(i),
                  isConflict = result?.conflictCells.includes(i),
                  review = uncertain?.has(i) || !!cell.recognition;
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
                          ? "100"
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
                    data-recommended={isBest ? "true" : undefined}
                    className={`board-cell ${state} ${cell.flagged ? "flagged" : ""} ${selected === i ? "selected" : ""} ${isBest ? "best" : ""} ${isConflict ? "conflict" : ""} ${review ? "review" : ""} ${view === "recommendations" && o === "unknown" && !isBest && p !== 1 ? "dimmed" : ""} ${view === "heatmap" && o === "unknown" ? "heat" : ""}`}
                    style={{ "--heat": p ?? 0 } as CSSProperties}
                  >
                    <span
                      className={
                        o === "unknown" && p !== 0 && p !== 1
                          ? "probability-value"
                          : ""
                      }
                      style={
                        o === "unknown" && p !== 0 && p !== 1 && layout.cell
                          ? {
                              fontSize: `${Math.min(layout.probabilityFont, (layout.cell - 4) / (text.length * 0.7))}px`,
                            }
                          : undefined
                      }
                    >
                      {text}
                    </span>
                    {cell.flagged && (
                      <span className="cell-flag" aria-hidden="true">
                        ⚑
                      </span>
                    )}
                    {review && (
                      <span className="cell-review-marker" aria-hidden="true">
                        ?
                      </span>
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
