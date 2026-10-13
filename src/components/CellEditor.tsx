import { useEffect, useRef } from "react";
import { X, Gem } from "lucide-react";
import { coordinate } from "./BoardGrid";
import type { Cell } from "../core/models";
interface Props {
  selected: number;
  size: number;
  cell: Cell;
  onApply: (value: "gem" | number) => void;
  onClose: () => void;
}
export function CellEditor({ selected, size, cell, onApply, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const active = cell.recognition?.suggested ?? cell.observed;
  return (
    <dialog
      ref={dialog}
      className="cell-dialog"
      aria-label={`编辑 ${coordinate(selected, size)}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="editor-header">
        <div>
          <h3>
            这格显示什么？ <span>{coordinate(selected, size)}</span>
          </h3>
          <small>选择游戏中实际出现的内容</small>
        </div>
        <button
          className="icon-button"
          aria-label="关闭格子编辑"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      {cell.recognition && (
        <p className="recognition-hint">
          识别不确定：{cell.recognition.reason}。请对照原图确认。
        </p>
      )}
      <button
        className={`gem-choice ${active === "gem" ? "active" : ""}`}
        aria-label="记录宝石"
        onClick={() => onApply("gem")}
      >
        <Gem size={20} />
        已发现宝石
      </button>
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
      <p className="editor-note">数字表示周围八格中的宝石数量</p>
    </dialog>
  );
}
