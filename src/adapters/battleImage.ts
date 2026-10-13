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
