import { X, Paintbrush } from "lucide-react";
import { coordinate } from "./BoardGrid";
import type { Cell, Observation } from "../core/models";
export type Brush = Observation | "flag";
interface Props {
  selected: number | null;
  size: number;
  cell?: Cell;
  onApply: (value: Brush) => void;
  onClose: () => void;
  brush: boolean;
  onBrush: (v: boolean) => void;
  tool: Brush;
  review?: boolean;
}
export function CellEditor({
  selected,
  size,
  cell,
  onApply,
  onClose,
  brush,
  onBrush,
  tool,
  review,
}: Props) {
  if (selected === null)
    return (
      <div className="editor-idle">
        <Paintbrush size={21} />
        <p>点选格子，记录游戏结果</p>
        <small>输入真实数字或宝石后，概率会自动更新。</small>
      </div>
    );
  const active = brush ? tool : cell?.observed;
  return (
    <section className="cell-editor" aria-label="格子编辑面板">
      <div className="editor-header">
        <div>
          <h3>编辑 {coordinate(selected, size)}</h3>
          <small>
            {review ? "识别不确定，请对照截图" : "记录游戏实际显示的内容"}
          </small>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="关闭格子编辑"
        >
          <X size={18} />
        </button>
      </div>
      <div className="number-picker">
        {Array.from({ length: 9 }, (_, n) => (
          <button
            key={n}
            className={active === n ? "active" : ""}
            onClick={() => onApply(n)}
            aria-label={`记录数字 ${n}`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="state-picker">
        <button
          className={active === "gem" ? "active" : ""}
          onClick={() => onApply("gem")}
        >
          ◆ 宝石
        </button>
        <button
          className={active === "safe" ? "active" : ""}
          onClick={() => onApply("safe")}
        >
          ✓ 安全
        </button>
        <button
          className={active === "unknown" ? "active" : ""}
          onClick={() => onApply("unknown")}
        >
          ? 未知
        </button>
        <button
          className={cell?.flagged ? "active" : ""}
          onClick={() => onApply("flag")}
        >
          ⚑ 推测
        </button>
      </div>
      <label className="brush-toggle">
        <input
          type="checkbox"
          checked={brush}
          onChange={(e) => onBrush(e.target.checked)}
        />
        <span>连续录入</span>
        <small>选好状态后直接点格子</small>
      </label>
      <p className="editor-note">推测旗标仅做记录，不参与概率计算。</p>
    </section>
  );
}
