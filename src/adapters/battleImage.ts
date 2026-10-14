import type { ShareResult } from "./sharing";
export async function shareBattleImage(blob: Blob): Promise<ShareResult> {
  try {
    const file = new File([blob], "潮汐秘境战绩.png", { type: "image/png" });
    if (
      typeof navigator.share === "function" &&
      navigator.canShare?.({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file], title: "我的潮汐秘境战绩" });
        return { method: "native", message: "已交给系统分享" };
      } catch (error) {
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "AbortError"
        )
          return { method: "canceled", message: "已取消图片分享" };
      }
    }
  } catch {
    /* Preview/download work when the host cannot share files. */
  }
  return {
    method: "manual",
    message:
      "此浏览器未提供图片分享，请下载图片或长按预览保存，再发送到微信群。",
  };
}
export function saveBattleImage(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = "潮汐秘境战绩.png";
  a.click();
}

export interface PublishedBattleImage {
  url: string;
  expiresAt: number;
}
export async function uploadBattleImage(
  blob: Blob,
  signal?: AbortSignal,
): Promise<PublishedBattleImage> {
  const abort = new AbortController(),
    cancel = () => abort.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  if (signal?.aborted) abort.abort();
  const timer = setTimeout(cancel, 20000);
  try {
    const response = await fetch("/api/battle-images", {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: blob,
      signal: abort.signal,
    });
    if (!response.ok)
      throw new Error(
        response.status === 429
          ? "生成过于频繁，请稍后重试"
          : "微信图片准备失败，请点击下载图片重试",
      );
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("url" in data) ||
      typeof data.url !== "string" ||
      !/^\/api\/battle-images\/[a-f0-9]{32}\.png$/.test(data.url) ||
      !("expiresAt" in data) ||
      typeof data.expiresAt !== "number" ||
      !Number.isFinite(data.expiresAt) ||
      data.expiresAt <= Date.now()
    )
      throw new Error("微信图片地址无效，请重新下载");
    return {
      url: new URL(data.url, window.location.origin).href,
      expiresAt: data.expiresAt,
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", cancel);
  }
}
