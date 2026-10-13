import { beforeEach, it, expect, vi } from "vitest";
const memory = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => memory.set(k, v),
    removeItem: (k: string) => memory.delete(k),
  });
});
it("room CRUD, undo/redo and local restore preserve observations and flags", async () => {
  const { useBoards, STORAGE_KEY } = await import("../../src/stores/boards");
  const first = useBoards.getState().boards[0];
  useBoards.getState().setCell(first.id, 0, { observed: "gem", flagged: true });
  useBoards.getState().add(12);
  expect(useBoards.getState().boards).toHaveLength(2);
  useBoards.getState().undo();
  expect(useBoards.getState().boards).toHaveLength(1);
  useBoards.getState().redo();
  expect(useBoards.getState().boards).toHaveLength(2);
  useBoards.getState().remove(first.id);
  useBoards.getState().undo();
  expect(useBoards.getState().boards[0].cells[0]).toEqual({
    observed: "gem",
    flagged: true,
  });
  expect(JSON.parse(memory.get(STORAGE_KEY)!).boards).toHaveLength(2);
  vi.resetModules();
  const restored = await import("../../src/stores/boards");
  expect(restored.useBoards.getState().boards[0].cells[0].observed).toBe("gem");
});
it("refuses invalid import without replacing existing state", async () => {
  const { useBoards } = await import("../../src/stores/boards");
  const before = useBoards.getState().boards;
  expect(() =>
    useBoards.getState().importData({ version: 1, boards: [{}] }),
  ).toThrow();
  expect(useBoards.getState().boards).toBe(before);
});
it("handles empty persisted collection and corrupted data", async () => {
  memory.set(
    "tidemyst-boards-v1",
    JSON.stringify({ version: 1, boards: [], activeId: "" }),
  );
  const { useBoards } = await import("../../src/stores/boards");
  expect(useBoards.getState().boards).toHaveLength(0);
  vi.resetModules();
  memory.set("tidemyst-boards-v1", "broken");
  const broken = await import("../../src/stores/boards");
  expect(broken.useBoards.getState().notice).toContain("无法读取");
  expect(broken.useBoards.getState().boards).toHaveLength(1);
});
