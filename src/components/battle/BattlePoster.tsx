import { useEffect, useState } from "react";
import { ImageDown, Share2, Copy, LoaderCircle } from "lucide-react";
import { createPoster } from "../../features/battle/poster";
import { battleLabel, type BattleShare } from "../../features/battle/stats";
import { shareBattleImage, saveBattleImage } from "../../adapters/battleImage";
import { copyLink, shareLink } from "../../adapters/sharing";
export function BattlePoster({
  share,
  url,
}: {
  share: BattleShare;
  url: string;
}) {
  const [image, setImage] = useState<{ blob: Blob; src: string } | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true,
      src = "";
    setImage(null);
    setMessage("");
    createPoster(share, url)
      .then((blob) => {
        if (live) {
          src = URL.createObjectURL(blob);
          setImage({ blob, src });
        }
      })
      .catch((e) => {
        if (live)
          setMessage(
            e instanceof Error ? e.message : "图片生成失败，请分享链接",
          );
      });
    return () => {
      live = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [share, url]);
  const run = async (kind: "image" | "link") => {
    setBusy(true);
    try {
      const result =
        kind === "image" && image
          ? await shareBattleImage(image.blob)
          : await shareLink({
              title: "我的潮汐秘境战绩",
              text: battleLabel(share),
              url,
            });
      setMessage(result.message);
    } catch {
      setMessage("分享暂不可用，请复制链接或保存图片");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="battle-poster" aria-label="战绩分享卡片">
      <div className="poster-preview">
        {image ? (
          <img
            src={image.src}
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
        <button
          className="primary-button"
          disabled={!image || busy}
          onClick={() => void run("image")}
        >
          <Share2 size={18} />
          分享战绩图片
        </button>
        <button
          className="secondary-button"
          disabled={!image}
          onClick={() => {
            if (image) {
              saveBattleImage(image.src);
              setMessage(
                "已请求保存图片；微信或手机中若未出现下载，请长按战绩图片保存。",
              );
            }
          }}
        >
          <ImageDown size={18} />
          下载图片
        </button>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => void run("link")}
        >
          <Share2 size={18} />
          分享战绩链接
        </button>
        <label className="battle-link-label">
          只读战绩链接
          <input
            aria-label="只读战绩链接"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        <button
          className="text-button"
          onClick={async () =>
            setMessage(
              (await copyLink(url))
                ? "战绩链接已复制"
                : "复制未获允许，请长按上方链接手动复制",
            )
          }
        >
          <Copy size={16} />
          复制战绩链接
        </button>
        <p role="status" className="poster-message">
          {message}
        </p>
        <p className="poster-help">手机可长按战绩图片保存，再发到微信群。</p>
      </div>
    </section>
  );
}
