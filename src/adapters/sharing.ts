import { getHostAdapter } from "./environment";
import { publicLink } from "../features/sharing/links";
export interface SharePayload {
  title: string;
  text: string;
  url: string;
}
export interface ShareResult {
  method: "native" | "copied" | "manual" | "menu" | "canceled";
  message: string;
}
export async function copyLink(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Host may deny permission; offer selection fallback. */
  }
  const previous = document.activeElement,
    element = document.createElement("textarea");
  element.value = text;
  element.readOnly = true;
  element.style.cssText = "position:fixed;left:-9999px;top:0;";
  document.body.append(element);
  element.select();
  element.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    /* Manual copy remains available. */
  }
  element.remove();
  if (previous instanceof HTMLElement) previous.focus();
  return copied;
}
/** Never interpret configuring a menu or opening a share sheet as a sent WeChat message. */
export async function shareLink(payload: SharePayload): Promise<ShareResult> {
  if (!publicLink(payload.url))
    return {
      method: "manual",
      message: "当前是本地测试地址。部署后会自动使用正式地址，群友才能打开。",
    };
  const host = getHostAdapter();
  if (host.share) {
    try {
      await host.share(payload);
      return {
        method: "menu",
        message: "分享信息已准备，请点微信右上角“…”发送给朋友或微信群。",
      };
    } catch {
      /* Native/copy remain independent fallbacks. */
    }
  }
  let nativeAvailable = false;
  try {
    nativeAvailable =
      typeof navigator.share === "function" &&
      (!navigator.canShare || navigator.canShare({ url: payload.url }));
  } catch {
    /* Unsupported share payloads fall back to a link. */
  }
  if (nativeAvailable) {
    try {
      await navigator.share!(payload);
      return { method: "native", message: "已交给系统分享" };
    } catch (e) {
      if (
        e !== null &&
        typeof e === "object" &&
        "name" in e &&
        e.name === "AbortError"
      )
        return { method: "canceled", message: "已取消分享" };
    }
  }
  const copied = await copyLink(payload.url);
  return {
    method: copied ? "copied" : "manual",
    message: copied
      ? "链接已复制，粘贴到微信群即可。"
      : "请复制下方链接，粘贴到微信群。",
  };
}
