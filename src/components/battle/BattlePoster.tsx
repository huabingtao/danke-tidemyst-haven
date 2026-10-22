import { useEffect, useRef, useState } from "react";
import { ImageDown, Copy, LoaderCircle } from "lucide-react";
import { createPoster } from "../../features/battle/poster";
import type { BattleShare } from "../../features/battle/stats";
import {
  saveBattleImage,
  uploadBattleImage,
  type PublishedBattleImage,
} from "../../adapters/battleImage";
import { copyLink } from "../../adapters/sharing";
import { detectEnvironment } from "../../adapters/environment";
import { BattleSavePreview, BattleCopyFallback } from "./BattleSavePreview";
export function BattlePoster({
  share,
  url,
  showDownload = true,
}: {
  share: BattleShare;
  url: string;
  showDownload?: boolean;
}) {
  const wechat = showDownload && detectEnvironment().wechat;
  const [image, setImage] = useState<{ blob: Blob; src: string } | null>(null),
    [remote, setRemote] = useState<PublishedBattleImage | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(""),
    [copyFallback, setCopyFallback] = useState(false);
  const controller = useRef<AbortController | null>(null),
    pending = useRef<Promise<PublishedBattleImage> | null>(null);
  const publish = (blob: Blob) => {
    if (pending.current) return pending.current;
    const task = uploadBattleImage(blob, controller.current?.signal);
    pending.current = task;
    void task
      .finally(() => {
        if (pending.current === task) pending.current = null;
      })
      .catch(() => {});
    return task;
  };
  useEffect(() => {
    let live = true,
      src = "";
    const abort = new AbortController();
    controller.current = abort;
    pending.current = null;
    setImage(null);
    setRemote(null);
    setMessage("");
    setPreview("");
    setCopyFallback(false);
    setBusy(wechat);
    createPoster(share, url)
      .then(async (blob) => {
        if (!live) return;
        src = URL.createObjectURL(blob);
        setImage({ blob, src });
        if (wechat) {
          try {
            const published = await publish(blob);
            if (live) setRemote(published);
          } catch {
            if (live)
              setMessage(
                "微信图片准备失败，请点击下载图片重试，或复制战绩链接。",
              );
          } finally {
            if (live) setBusy(false);
          }
        }
      })
      .catch(() => {
        if (live) {
          setMessage("图片生成失败，可复制战绩链接。");
          setBusy(false);
        }
      });
    return () => {
      live = false;
      abort.abort();
      if (src) URL.revokeObjectURL(src);
    };
  }, [share, url, wechat]);
  const download = async () => {
    if (!image || busy) return;
    if (!wechat) {
      saveBattleImage(image.src);
      setMessage("已请求下载图片；请查看浏览器下载记录。");
      return;
    }
    const active = controller.current;
    setBusy(true);
    try {
      const published =
        remote && remote.expiresAt > Date.now() + 1000
          ? remote
          : await publish(image.blob);
      if (active?.signal.aborted) return;
      setRemote(published);
      setPreview(published.url);
      setMessage("");
    } catch {
      if (!active?.signal.aborted)
        setMessage(
          "微信图片准备失败，请再次点击下载图片重试，或复制战绩链接。",
        );
    } finally {
      if (!active?.signal.aborted) setBusy(false);
    }
  };
  return (
    <section className="battle-poster" aria-label="战绩分享卡片">
      <div className="poster-preview">
        {image ? (
          <img
            src={remote?.url || image.src}
            alt="含棋子消耗、宝石数量、两种比例和二维码的战绩图片"
            data-testid="battle-poster"
          />
        ) : (
          <div className="poster-loading">
            <LoaderCircle size={26} />
            <p>{message || "正在生成战绩图片…"}</p>
          </div>
        )}
      </div>
      <div className="poster-tools">
        <h3>分享这一刻的战绩</h3>
        <p>图片和链接保存相同成绩，后续修改不会改变它。</p>
        {showDownload && (
          <button
            className="primary-button"
            disabled={!image || busy}
            onClick={() => void download()}
          >
            {busy ? <LoaderCircle size={18} /> : <ImageDown size={18} />}
            下载图片
          </button>
        )}
        <button
          className="secondary-button"
          onClick={async () => {
            if (await copyLink(url)) setMessage("战绩链接已复制");
            else {
              setMessage("请长按复制战绩链接");
              setCopyFallback(true);
            }
          }}
        >
          <Copy size={18} />
          复制战绩链接
        </button>
        <p role="status" className="poster-message">
          {busy && image ? "正在准备微信可保存的图片…" : message}
        </p>
        <p className="poster-help">
          {!showDownload
            ? "复制链接，可分享这份战绩。"
            : wechat
              ? "微信请点击下载图片后长按保存。战绩卡片临时托管 24 小时，游戏截图不上传。"
              : "下载图片后可发到微信群；复制链接可查看这一刻的成绩。"}
        </p>
      </div>
      {preview && (
        <BattleSavePreview url={preview} onClose={() => setPreview("")} />
      )}
      {copyFallback && (
        <BattleCopyFallback url={url} onClose={() => setCopyFallback(false)} />
      )}
    </section>
  );
}
