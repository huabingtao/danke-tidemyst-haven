import { setHostAdapter, getHostAdapter } from "./environment";
import type { SharePayload } from "./sharing";
export interface WechatSdk {
  config(options: {
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
    jsApiList: string[];
  }): void;
  ready(callback: () => void): void;
  error(callback: (error: unknown) => void): void;
  updateAppMessageShareData(options: {
    title: string;
    desc: string;
    link: string;
    imgUrl: string;
    success: () => void;
    fail: (error: unknown) => void;
  }): void;
}
/** Call only after the deployment owner obtains a server signature and loads the official SDK.
 * Success means menu metadata was set. The user still chooses a recipient via WeChat.
 */
export function installWechatSharing(
  sdk: WechatSdk,
  config: {
    appId: string;
    timestamp: number;
    nonceStr: string;
    signature: string;
  },
  imageUrl: string,
) {
  let failure: unknown = null;
  sdk.error((e) => {
    failure = e;
  });
  sdk.config({ ...config, jsApiList: ["updateAppMessageShareData"] });
  setHostAdapter({
    ...getHostAdapter(),
    share: (payload: SharePayload) =>
      new Promise<void>((resolve, reject) => {
        if (failure) {
          reject(new Error("微信分享配置失败"));
          return;
        }
        const timer = setTimeout(
          () => reject(new Error("微信分享配置尚未就绪")),
          5000,
        );
        sdk.ready(() =>
          sdk.updateAppMessageShareData({
            title: payload.title,
            desc: payload.text,
            link: payload.url,
            imgUrl: imageUrl,
            success: () => {
              clearTimeout(timer);
              resolve();
            },
            fail: (e) => {
              clearTimeout(timer);
              reject(e);
            },
          }),
        );
      }),
  });
}
