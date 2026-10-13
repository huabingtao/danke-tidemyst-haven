import { create } from "zustand";
import {
  createBoard,
  emptyCell,
  validateBoards,
  newRoundId,
  type Board,
  type BoardSize,
  type Cell,
} from "../core/models";
import {
  settleBoard,
  validateRecords,
  type BattleRecord,
} from "../features/battle/stats";
export const STORAGE_KEY = "tidemyst-boards-v2";
export const LEGACY_STORAGE_KEY = "tidemyst-boards-v1";
interface Snapshot {
  boards: Board[];
  activeId: string;
  records: BattleRecord[];
}
interface BoardStore extends Snapshot {
  past: Snapshot[];
  future: Snapshot[];
  notice: string;
  add: (size: BoardSize) => void;
  remove: (id: string) => void;
  select: (id: string) => void;
  patch: (
    id: string,
    patch: Partial<Pick<Board, "room" | "totalGems">>,
  ) => void;
  setCell: (id: string, index: number, cell: Cell) => void;
  reset: (id: string) => void;
  settle: (id: string) => void;
  undo: () => void;
  redo: () => void;
  importData: (data: unknown) => void;
  addRecognized: (board: Board) => void;
  clearNotice: () => void;
}
export function validateSave(input: unknown): Snapshot {
  const boards = validateBoards(input);
  const root = input as Record<string, unknown>;
  const records = root.version === 2 ? validateRecords(root.records) : [];
  const activeId =
    typeof root.activeId === "string" &&
    boards.some((b) => b.id === root.activeId)
      ? root.activeId
      : (boards[0]?.id ?? "");
  return { boards, records, activeId };
}
function load(): Snapshot & { notice: string } {
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const input: unknown = JSON.parse(raw);
      const snapshot = validateSave(input);
      let notice = "";
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            exportData(snapshot.boards, snapshot.activeId, snapshot.records),
          ),
        );
      } catch {
        notice = "浏览器无法保存数据，请导出 JSON 备份。";
      }
      return { ...snapshot, notice };
    }
  } catch {
    const b = createBoard();
    return {
      boards: [b],
      records: [],
      activeId: b.id,
      notice: "无法读取本地存档，已创建空棋盘。可导入之前导出的备份。",
    };
  }
  const board = createBoard();
  return { boards: [board], records: [], activeId: board.id, notice: "" };
}
export function exportData(
  boards: Board[],
  activeId: string,
  records: BattleRecord[] = [],
) {
  return { version: 2, boards, activeId, records };
}
export const useBoards = create<BoardStore>((set, get) => {
  const save = (snapshot: Snapshot) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          exportData(snapshot.boards, snapshot.activeId, snapshot.records),
        ),
      );
      return "";
    } catch {
      return "浏览器无法保存数据，请导出 JSON 备份。";
    }
  };
  const commit = (
    input: Omit<Snapshot, "records"> & { records?: BattleRecord[] },
  ) => {
    const old = get();
    const snapshot = { ...input, records: input.records ?? old.records };
    set({
      ...snapshot,
      past: [
        ...old.past,
        { boards: old.boards, activeId: old.activeId, records: old.records },
      ].slice(-80),
      future: [],
      notice: save(snapshot),
    });
  };
  const update = (id: string, fn: (board: Board) => Board) => {
    const s = get();
    commit({
      boards: s.boards.map((b) =>
        b.id === id ? fn({ ...b, updatedAt: Date.now() }) : b,
      ),
      activeId: s.activeId,
    });
  };
  return {
    ...load(),
    past: [],
    future: [],
    add: (size) => {
      const s = get();
      if (s.boards.length >= 100) {
        set({ notice: "最多支持 100 个房间" });
        return;
      }
      const b = createBoard(size, String(s.boards.length + 1));
      commit({ boards: [...s.boards, b], activeId: b.id });
    },
    remove: (id) => {
      const s = get(),
        boards = s.boards.filter((b) => b.id !== id);
      commit({
        boards,
        activeId: s.activeId === id ? (boards[0]?.id ?? "") : s.activeId,
      });
    },
    select: (id) => {
      const s = get();
      if (s.boards.some((b) => b.id === id)) {
        const snapshot = { boards: s.boards, activeId: id, records: s.records };
        set({ activeId: id, notice: save(snapshot) });
      }
    },
    patch: (id, patch) => update(id, (b) => ({ ...b, ...patch })),
    setCell: (id, index, cell) =>
      update(id, (b) => ({
        ...b,
        cells: b.cells.map((c, i) => (i === index ? cell : c)),
      })),
    reset: (id) =>
      update(id, (b) => ({
        ...b,
        roundId: newRoundId(),
        cells: Array.from({ length: b.size * b.size }, emptyCell),
      })),
    settle: (id) => {
      const s = get(),
        board = s.boards.find((b) => b.id === id);
      if (!board) throw new Error("请先选择一个房间");
      const record = settleBoard(board),
        existing = s.records.some((r) => r.id === record.id);
      if (!existing && s.records.length >= 1000)
        throw new Error("最多保存 1000 局战绩，请导出备份");
      commit({
        boards: s.boards,
        activeId: s.activeId,
        records: existing
          ? s.records.map((r) => (r.id === record.id ? record : r))
          : [...s.records, record],
      });
    },
    undo: () => {
      const s = get(),
        previous = s.past.at(-1);
      if (previous)
        set({
          ...previous,
          past: s.past.slice(0, -1),
          future: [
            { boards: s.boards, activeId: s.activeId, records: s.records },
            ...s.future,
          ],
          notice: save(previous),
        });
    },
    redo: () => {
      const s = get(),
        next = s.future[0];
      if (next)
        set({
          ...next,
          past: [
            ...s.past,
            { boards: s.boards, activeId: s.activeId, records: s.records },
          ],
          future: s.future.slice(1),
          notice: save(next),
        });
    },
    importData: (data) => {
      commit(validateSave(data));
    },
    addRecognized: (board) => {
      const s = get();
      if (s.boards.length >= 100) throw new Error("最多支持 100 个房间");
      commit({ boards: [...s.boards, board], activeId: board.id });
    },
    clearNotice: () => set({ notice: "" }),
  };
});
