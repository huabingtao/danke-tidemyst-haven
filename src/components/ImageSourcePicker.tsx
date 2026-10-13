import { useEffect, useRef } from "react";
import { Camera, Images, X } from "lucide-react";
import type { ImageSource } from "../adapters/browserFiles";
export function ImageSourcePicker({
  onSelect,
  onClose,
}: {
  onSelect: (source: ImageSource) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      className="image-source-dialog"
      ref={dialog}
      aria-label="选择截图来源"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="editor-header">
        <h3>读取截图</h3>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="关闭来源选择"
        >
          <X size={18} />
        </button>
      </div>
      <button onClick={() => onSelect("album")}>
        <Images size={24} />
        <span>
          从相册选择<small>支持多张游戏截图</small>
        </span>
      </button>
      <button onClick={() => onSelect("camera")}>
        <Camera size={24} />
        <span>
          拍照<small>正对棋盘，保持画面清晰</small>
        </span>
      </button>
    </dialog>
  );
}
