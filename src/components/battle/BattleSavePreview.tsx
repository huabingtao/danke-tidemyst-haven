import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function BattleSavePreview({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="battle-save-dialog"
      aria-label="保存战绩图片"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="editor-header">
        <h3>长按图片保存到手机</h3>
        <button
          className="icon-button"
          aria-label="关闭战绩图片预览"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p>长按下方图片，在微信菜单中选择“保存图片”。</p>
      <img
        src={url}
        alt="长按保存的高清战绩图片"
        data-testid="wechat-save-image"
      />
    </dialog>
  );
}
export function BattleCopyFallback({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-label="手动复制战绩链接"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="editor-header">
        <h3>长按复制战绩链接</h3>
        <button
          className="icon-button"
          aria-label="关闭手动复制"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p>微信未允许自动复制，请长按下方链接并选择复制。</p>
      <textarea
        aria-label="手动复制战绩链接地址"
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
      />
    </dialog>
  );
}
