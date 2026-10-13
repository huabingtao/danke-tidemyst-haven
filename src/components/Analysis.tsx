import {
  Gem,
  ArrowUpRight,
  CircleCheck,
  AlertTriangle,
  Info,
  RotateCw,
} from "lucide-react";
import { recommend } from "../core/recommendations";
import type { Board, SolveResult } from "../core/models";
import { coordinate, percent } from "./BoardGrid";
interface Props {
  board: Board;
  result: SolveResult | null;
  busy: boolean;
  error: string;
  onSelect: (i: number) => void;
  retry: () => void;
  cancel: () => void;
}
export function Analysis({
  board,
  result,
  busy,
  error,
  onSelect,
  retry,
  cancel,
}: Props) {
  const found = board.cells.filter((c) => c.observed === "gem").length,
    remaining = board.totalGems - found;
  const rec = result ? recommend(board, result) : null,
    unknown = board.cells.flatMap((c, i) =>
      c.observed === "unknown" ? [i] : [],
    );
  const certain =
      result?.status === "exact"
        ? unknown.filter((i) => result.probabilities[i] === 1)
        : [],
    safe =
      result?.status === "exact"
        ? unknown.filter((i) => result.probabilities[i] === 0)
        : [];
  return (
    <section className="analysis-panel">
      <div className="analysis-heading">
        <h2>下一步怎么走</h2>
        <Gem size={20} />
      </div>
      <div className="gem-summary">
        <div>
          <span>剩余宝石</span>
          <strong>
            {remaining}
            <small> / {board.totalGems}</small>
          </strong>
        </div>
        <div>
          <span>已发现</span>
          <strong>
            {found}
            <small> 颗</small>
          </strong>
        </div>
      </div>
      {busy ? (
        <div className="solve-loading" aria-live="polite">
          <div className="skeleton" />
          <div className="skeleton short" />
          <p>正在后台分析棋盘…</p>
          <button className="text-button" onClick={cancel}>
            取消计算
          </button>
        </div>
      ) : error || result?.status !== "exact" ? (
        <div className="error-callout" role="alert">
          <AlertTriangle size={18} />
          <p>{error || result?.message || "等待计算"}</p>
          <button onClick={retry} className="text-button">
            <RotateCw size={14} />
            重算
          </button>
        </div>
      ) : (
        <>
          <div className="recommendation">
            <span className="recommendation-label">最可能发现宝石</span>
            {rec?.best.length ? (
              <>
                <div className="recommendation-main">
                  <strong>{percent(rec.max)}</strong>
                  <span>{rec.max === 1 ? "确定有宝石" : "宝石概率"}</span>
                </div>
                <div className="coordinate-list">
                  {rec.best.slice(0, 12).map((i) => (
                    <button key={i} onClick={() => onSelect(i)}>
                      {coordinate(i, board.size)}
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
                {rec.best.length > 12 && (
                  <small>
                    共 {rec.best.length} 个位置并列，以上展示前 12 个
                  </small>
                )}
              </>
            ) : (
              <p>
                {remaining === 0 ? "宝石已全部找到" : "没有可推荐的未知位置"}
              </p>
            )}
          </div>
          <div className="certainty-summary">
            <span>
              <i className="legend-dot gem-dot" />
              必有宝石 <b>{certain.length}</b>
            </span>
            <span>
              <i className="legend-dot safe-dot" />
              必为空 <b>{safe.length}</b>
            </span>
          </div>
          <details className="information-details">
            <summary>
              <Info size={15} />
              探索信息参考
            </summary>
            <p>
              优先覆盖更多未定邻居的格子，属于邻域覆盖启发式；不等于精确的信息增益，也不保证获得宝石。
            </p>
            <div className="coordinate-list">
              {rec?.information.map((i) => (
                <button key={i} onClick={() => onSelect(i)}>
                  {coordinate(i, board.size)}
                </button>
              ))}
            </div>
          </details>
          <div className="solve-status">
            <CircleCheck size={14} />
            <span>精确计算 · {result.elapsedMs.toFixed(0)} ms</span>
          </div>
          <details className="layout-details">
            <summary>计算详情</summary>
            <p>
              {result.layouts} 种合法布局
              <br />
              {result.nodes.toLocaleString()} 个枚举节点
            </p>
          </details>
        </>
      )}
    </section>
  );
}
