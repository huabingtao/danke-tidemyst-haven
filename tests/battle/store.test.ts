import { beforeEach, it, expect, vi } from "vitest";
import { createBoard } from "../../src/core/models";
const memory = new Map<string, string>();
beforeEach(() => {
  vi.resetModules();
  memory.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
  });
});
it("migrates v1 without dropping rooms, active selection or flags", async () => {
  const a = createBoard(),
    b = createBoard(12, "旧房间");
  delete a.roundId;
  delete b.roundId;
  b.cells[4] = { observed: 2, flagged: true };
  memory.set(
    "tidemyst-boards-v1",
    JSON.stringify({ version: 1, boards: [a, b], activeId: b.id }),
  );
  const { useBoards } = await import("../../src/stores/boards");
  const s = useBoards.getState();
  expect(s.activeId).toBe(b.id);
  expect(s.boards[1].cells[4]).toEqual(b.cells[4]);
  expect(s.boards[1].roundId).toBe(b.id);
  expect(s.records).toEqual([]);
  expect(JSON.parse(memory.get("tidemyst-boards-v2")!).version).toBe(2);
  expect(JSON.parse(memory.get("tidemyst-boards-v1")!).version).toBe(1);
});
it("freezes final records, replaces re-settlements, and creates a new round on whole-board reset", async () => {
  const { useBoards, STORAGE_KEY } = await import("../../src/stores/boards");
  const s = () => useBoards.getState(),
    b = s().boards[0];
  s().setCell(b.id, 0, { observed: "gem", flagged: false });
  s().settle(b.id);
  const first = s().records[0];
  expect(first.spent).toBe(1);
  s().setCell(b.id, 0, { observed: 0, flagged: false });
  expect(s().records[0].found).toBe(1);
  s().settle(b.id);
  expect(s().records).toHaveLength(1);
  expect(s().records[0].found).toBe(0);
  s().reset(b.id);
  expect(s().boards[0].roundId).not.toBe(first.roundId);
  expect(s().records).toHaveLength(1);
  s().setCell(b.id, 0, { observed: "gem", flagged: false });
  s().settle(b.id);
  expect(s().records).toHaveLength(2);
  s().remove(b.id);
  expect(s().records).toHaveLength(2);
  expect(s().boards).toHaveLength(0);
  vi.resetModules();
  const restored = await import("../../src/stores/boards");
  expect(restored.useBoards.getState().records).toHaveLength(2);
  expect(JSON.parse(memory.get(STORAGE_KEY)!).records).toHaveLength(2);
});
it("includes records in undo/redo and v2 backup and rejects corrupted records atomically", async () => {
  const { useBoards, exportData } = await import("../../src/stores/boards");
  const s = () => useBoards.getState(),
    b = s().boards[0];
  s().settle(b.id);
  s().undo();
  expect(s().records).toHaveLength(0);
  s().redo();
  expect(s().records).toHaveLength(1);
  const data = exportData(s().boards, s().activeId, s().records);
  s().importData(data);
  expect(s().records).toEqual(data.records);
  const before = s().boards;
  expect(() =>
    s().importData({ ...data, records: [{ ...data.records[0], found: 999 }] }),
  ).toThrow();
  expect(s().boards).toBe(before);
});
