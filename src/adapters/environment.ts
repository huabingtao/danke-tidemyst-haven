import type { SharePayload } from "./sharing";
export function detectEnvironment() {
  const ua = navigator.userAgent;
  return {
    wechat: /MicroMessenger/i.test(ua),
    miniProgram: /miniProgram/i.test(ua),
    touch: navigator.maxTouchPoints > 0,
    clipboard: !!navigator.clipboard?.read,
    worker: typeof Worker !== "undefined",
    offscreen: typeof OffscreenCanvas !== "undefined",
    file: typeof FileReader !== "undefined",
    cameraHint: /Android|iPhone|iPad/i.test(ua),
    mobile:
      /Android|iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  };
}
export interface HostAdapter {
  share?: (payload: SharePayload) => Promise<void>;
  back?: () => void;
  notifyBoardChanged?: (room: string) => void;
}
// Future host integration is injected here; core and UI never depend on a wx global.
let host: HostAdapter = {};
export function setHostAdapter(adapter: HostAdapter) {
  host = adapter;
}
export function getHostAdapter() {
  return host;
}
export function downloadJson(value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `潮汐秘境-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
