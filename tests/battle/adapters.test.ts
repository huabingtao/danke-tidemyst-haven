import { it, expect, vi, afterEach } from "vitest";
import { shareBattleImage } from "../../src/adapters/battleImage";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
it("shares a real PNG file when supported and treats native cancel separately", async () => {
  const native = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { share: native, canShare: () => true });
  const blob = new Blob([new Uint8Array([137, 80, 78, 71])], {
    type: "image/png",
  });
  expect((await shareBattleImage(blob)).method).toBe("native");
  expect(native.mock.calls[0][0].files[0].type).toBe("image/png");
  native.mockRejectedValue({ name: "AbortError" });
  expect((await shareBattleImage(blob)).method).toBe("canceled");
});
it("offers preview/download when file sharing is unsupported or denied", async () => {
  vi.stubGlobal("navigator", {});
  expect((await shareBattleImage(new Blob())).method).toBe("manual");
  vi.stubGlobal("navigator", {
    share: () => Promise.reject(new Error("denied")),
    canShare: () => true,
  });
  expect((await shareBattleImage(new Blob())).method).toBe("manual");
});
it("keeps offline completion IDs for retry and sends only anonymous client/round identifiers", async () => {
  const memory = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  });
  vi.stubGlobal("window", new EventTarget());
  const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
  vi.stubGlobal("fetch", fetcher);
  const { queueCompletion, refreshCommunity } =
    await import("../../src/adapters/communityStats");
  queueCompletion("round-a");
  queueCompletion("round-a");
  await expect(refreshCommunity()).rejects.toThrow();
  expect(JSON.parse(memory.get("tidemyst-pending-completions")!)).toEqual([
    "round-a",
  ]);
  fetcher.mockImplementation(
    async () =>
      new Response(JSON.stringify({ online: 2, totalCompleted: 1 }), {
        status: 200,
      }),
  );
  expect(await refreshCommunity()).toEqual({ online: 2, totalCompleted: 1 });
  expect(JSON.parse(memory.get("tidemyst-pending-completions")!)).toEqual([]);
  const payload = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(Object.keys(payload).sort()).toEqual(["clientId", "roundId"]);
  expect(payload.roundId).toBe("round-a");
});
