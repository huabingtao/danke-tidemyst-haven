import { it, expect } from "vitest";
import { createBoard, type Observation } from "../../src/core/models";
import {
  progressLink,
  sharedBoard,
  toolLink,
  publicLink,
} from "../../src/features/sharing/links";
it.each([8, 10, 12] as const)(
  "roundtrips %i cells, Unicode room names and every observation/flag combination",
  (size) => {
    const b = createBoard(size, "潮汐十五");
    const states: Observation[] = [
      "unknown",
      "gem",
      "safe",
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
    ];
    b.cells = b.cells.map((_, i) => ({
      observed: states[i % 12],
      flagged: Math.floor(i / 12) % 2 === 1,
    }));
    b.cells[0].recognition = {
      suggested: 4,
      confidence: 0.8,
      reason: "private candidate",
    };
    const link = progressLink(
        b,
        "https://example.com/tidemyst/?tracking=1#old",
      ),
      r = sharedBoard(link)!;
    expect(link.length).toBeLessThan(600);
    expect(new URL(link).pathname).toBe("/tidemyst/");
    expect(r.room).toBe(b.room);
    expect(r.size).toBe(b.size);
    expect(r.totalGems).toBe(b.totalGems);
    expect(r.cells).toEqual(
      b.cells.map(({ observed, flagged }) => ({ observed, flagged })),
    );
    expect(r.id).toBe(sharedBoard(link)!.id);
    expect(r.id.length).toBeLessThan(100);
    const frozen = sharedBoard(link)!.cells[1].observed;
    b.cells[1].observed = "unknown";
    expect(sharedBoard(link)!.cells[1].observed).toBe(frozen);
  },
);
it("tool links remove progress and preserve the deployed subdirectory", () => {
  const link = progressLink(createBoard(), "https://example.com/h5/");
  expect(toolLink(link)).toBe("https://example.com/h5/");
  expect(sharedBoard(toolLink(link))).toBeNull();
});
it("rejects truncated, oversized and invalid schemas before importing", () => {
  for (const token of [
    "%",
    "a",
    "x".repeat(1025),
    btoa(JSON.stringify([1, 3, 1, "1", "A".repeat(9)])),
    btoa(JSON.stringify([1, 8, -1, "1", "A".repeat(64)])),
    btoa(JSON.stringify([1, 8, 20, "1", "@".repeat(64)])),
    btoa(JSON.stringify([1, 8, 20, "", "A".repeat(64)])),
  ])
    expect(() =>
      sharedBoard(`https://example.com/#progress=${token}`),
    ).toThrow();
  expect(() => toolLink("javascript:alert(1)")).toThrow();
  expect(() => toolLink("https://user:pass@example.com/")).toThrow();
});
it("distinguishes local testing addresses from public deployment URLs", () => {
  for (const host of [
    "localhost",
    "127.0.0.1",
    "192.168.1.2",
    "10.0.0.2",
    "172.20.1.2",
    "[::1]",
  ])
    expect(publicLink(`http://${host}/`)).toBe(false);
  expect(publicLink("https://example.com/h5/")).toBe(true);
  expect(publicLink("https://localhost-tools.example.com/")).toBe(true);
});
