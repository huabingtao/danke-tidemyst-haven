import { useEffect, useRef, useState } from "react";
import { X, Copy, Share2 } from "lucide-react";
import {
  copyLink,
  type SharePayload,
  type ShareResult,
} from "../adapters/sharing";
import { publicLink } from "../features/sharing/links";
export function ShareDialog({
  payload,
  result,
  onClose,
}: {
  payload: SharePayload;
  result: ShareResult;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [message, setMessage] = useState(result.message);
  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);
  const local = !publicLink(payload.url);
  return (
    <dialog
      ref={dialog}
      className="share-dialog"
      aria-label="分享链接"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="editor-header">
        <h2>
          <Share2 size={18} />
          分享链接
        </h2>
        <button className="icon-button" aria-label="关闭分享" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <strong className="share-title">{payload.title}</strong>
      <p className="share-description">{payload.text}</p>
      <p className="share-message" role="status">
        {message}
      </p>
      <textarea
        aria-label="分享链接地址"
        readOnly
        value={payload.url}
        rows={4}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button
        className="primary-button"
        onClick={async () =>
          setMessage(
            (await copyLink(payload.url))
              ? local
                ? "测试链接已复制，公开分享需先部署。"
                : "链接已复制，可粘贴到微信。"
              : "复制未获允许，请长按上方链接手动复制。",
          )
        }
      >
        <Copy size={16} />
        {local ? "复制测试链接" : "复制链接"}
      </button>
      {payload.url.includes("#progress=") && (
        <p className="share-footnote">
          链接保存这一刻的当前房间，后续修改不会同步。未确认的识别位置保持未知，截图不随链接发送。
        </p>
      )}
    </dialog>
  );
}
