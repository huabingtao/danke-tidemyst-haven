import { useEffect, useRef, useState } from "react";
import { ScanLine, X, AlertTriangle } from "lucide-react";
import type { Board } from "../core/models";
import { recognizeScreenshot } from "../features/image-recognition/automatic";
interface Props {
  files: File[];
  firstRoom: number;
  onClose: () => void;
  onImport: (board: Board) => void;
}
export function ImageImporter({ files, firstRoom, onClose, onImport }: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    controller = useRef<AbortController | null>(null),
    callbacks = useRef({ onClose, onImport });
  callbacks.current = { onClose, onImport };
  const [progress, setProgress] = useState(0),
    [message, setMessage] = useState("正在读取截图…"),
    [error, setError] = useState(""),
    [position, setPosition] = useState(0);
  useEffect(() => {
    dialog.current?.showModal();
    const abort = new AbortController();
    controller.current = abort;
    void (async () => {
      try {
        for (let i = 0; i < files.length; i++) {
          setPosition(i);
          const board = await recognizeScreenshot(
            files[i],
            String(firstRoom + i),
            abort.signal,
            (p) => {
              setProgress((i + p.progress) / files.length);
              setMessage(p.message);
            },
          );
          if (abort.signal.aborted) return;
          callbacks.current.onImport(board);
        }
        if (!abort.signal.aborted) callbacks.current.onClose();
      } catch (e) {
        if (abort.signal.aborted) return;
        setError(e instanceof Error ? e.message : "截图识别失败，请重新上传");
      }
    })();
    return () => abort.abort();
  }, [files, firstRoom]);
  const close = () => {
    controller.current?.abort();
    onClose();
  };
  return (
    <dialog
      ref={dialog}
      className="automatic-import-dialog"
      aria-label="自动识别截图"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="dialog-header">
        <div>
          <h2>
            <ScanLine size={22} />
            自动识别截图
          </h2>
          <p>在此设备处理 · 无需设置棋盘参数</p>
        </div>
        <button
          className="icon-button"
          aria-label="关闭图片识别"
          onClick={close}
        >
          <X size={19} />
        </button>
      </div>
      <div className="automatic-progress">
        {error ? (
          <>
            <AlertTriangle size={28} />
            <p className="error-text" role="alert">
              {error}
            </p>
            <button className="secondary-button" onClick={close}>
              返回棋盘，重新上传
            </button>
          </>
        ) : (
          <>
            <div className="scan-indicator">
              <ScanLine size={34} />
            </div>
            <strong>{message}</strong>
            <span>
              {position + 1} / {files.length} 张 · {files[position]?.name}
            </span>
            <progress value={progress} max={1} />
            <p>识别完成后自动返回棋盘，待核对的格子会标记「?」。</p>
            <button className="text-button" onClick={close}>
              取消识别
            </button>
          </>
        )}
      </div>
    </dialog>
  );
}
