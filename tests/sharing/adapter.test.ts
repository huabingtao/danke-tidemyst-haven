import { it, expect, vi, afterEach } from "vitest";
import { shareLink } from "../../src/adapters/sharing";
import { setHostAdapter } from "../../src/adapters/environment";
import {
  installWechatSharing,
  type WechatSdk,
} from "../../src/adapters/wechatSharing";
const payload = {
  title: "工具",
  text: "分享进度",
  url: "https://example.com/#progress=abc",
};
afterEach(() => {
  vi.unstubAllGlobals();
  setHostAdapter({});
});
it("opens supported system share directly without copying", async () => {
  const share = vi.fn().mockResolvedValue(undefined),
    writeText = vi.fn();
  vi.stubGlobal("navigator", {
    share,
    canShare: () => true,
    clipboard: { writeText },
  });
  expect((await shareLink(payload)).method).toBe("native");
  expect(share).toHaveBeenCalledWith(payload);
  expect(writeText).not.toHaveBeenCalled();
});
it("canceling native sharing never copies or claims success", async () => {
  const writeText = vi.fn();
  vi.stubGlobal("navigator", {
    share: () => Promise.reject({ name: "AbortError" }),
    clipboard: { writeText },
  });
  expect((await shareLink(payload)).method).toBe("canceled");
  expect(writeText).not.toHaveBeenCalled();
});
it("public URLs fall back to a clipboard link", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  expect((await shareLink(payload)).method).toBe("copied");
  expect(writeText).toHaveBeenCalledWith(payload.url);
});
it("local URLs offer a test link without pretending group access", async () => {
  const share = vi.fn(),
    writeText = vi.fn();
  vi.stubGlobal("navigator", { share, clipboard: { writeText } });
  expect(
    (await shareLink({ ...payload, url: "http://localhost:5173/" })).method,
  ).toBe("manual");
  expect(share).not.toHaveBeenCalled();
  expect(writeText).not.toHaveBeenCalled();
});
it("WeChat SDK setup configures menu metadata and never reports an actual sent message", async () => {
  const config = vi.fn(),
    update = vi.fn((o: Parameters<WechatSdk["updateAppMessageShareData"]>[0]) =>
      o.success(),
    );
  installWechatSharing(
    {
      config,
      ready: (fn) => fn(),
      error: () => {},
      updateAppMessageShareData: update,
    },
    {
      appId: "public-app-id",
      timestamp: 1,
      nonceStr: "nonce",
      signature: "server-provided-signature",
    },
    "https://example.com/share.png",
  );
  expect(config).toHaveBeenCalledWith(
    expect.objectContaining({ jsApiList: ["updateAppMessageShareData"] }),
  );
  const result = await shareLink(payload);
  expect(result.method).toBe("menu");
  expect(result.message).toContain("右上角");
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({
      link: payload.url,
      title: payload.title,
      desc: payload.text,
    }),
  );
});

it("a canShare exception falls back to a copied link", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", {
    share: vi.fn(),
    canShare: () => {
      throw new Error("unsupported");
    },
    clipboard: { writeText },
  });
  expect((await shareLink(payload)).method).toBe("copied");
});
