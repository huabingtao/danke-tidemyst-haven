import { create } from "zustand";
import {
  createBoard,
  emptyCell,
  validateBoards,
  type Board,
  type BoardSize,
  type Cell,
} from "../core/models";
export const STORAGE_KEY = "tidemyst-boards-v1";
interface Snapshot {
  boards: Board[];
  activeId: string;
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
  undo: () => void;
  redo: () => void;
  importData: (data: unknown) => void;
  addRecognized: (board: Board) => void;
  clearNotice: () => void;
}
function load(): Snapshot & { notice: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const input: unknown = JSON.parse(raw);
      const boards = validateBoards(input);
      const activeId =
        typeof input === "object" &&
        input &&
        "activeId" in input &&
        typeof input.activeId === "string" &&
        boards.some((b) => b.id === input.activeId)
          ? input.activeId
          : (boards[0]?.id ?? "");
      return { boards, activeId, notice: "" };
    }
  } catch {
    const b = createBoard();
    return {
      boards: [b],
      activeId: b.id,
      notice: "无法读取本地存档，已创建空棋盘。可导入之前导出的备份。",
    };
  }
  const board = createBoard();
  return { boards: [board], activeId: board.id, notice: "" };
}
export function exportData(boards: Board[], activeId: string) {
  return { version: 1, boards, activeId };
}
export const useBoards = create<BoardStore>((set, get) => {
  const save = (snapshot: Snapshot) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(exportData(snapshot.boards, snapshot.activeId)),
      );
      return "";
    } catch {
      return "浏览器无法保存数据，请导出 JSON 备份。";
    }
  };
  const commit = (snapshot: Snapshot) => {
    const old = get();
    set({
      ...snapshot,
      past: [...old.past, { boards: old.boards, activeId: old.activeId }].slice(
        -80,
      ),
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
        const snapshot = { boards: s.boards, activeId: id };
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
        cells: Array.from({ length: b.size * b.size }, emptyCell),
      })),
    undo: () => {
      const s = get(),
        previous = s.past.at(-1);
      if (previous)
        set({
          ...previous,
          past: s.past.slice(0, -1),
          future: [{ boards: s.boards, activeId: s.activeId }, ...s.future],
          notice: save(previous),
        });
    },
    redo: () => {
      const s = get(),
        next = s.future[0];
      if (next)
        set({
          ...next,
          past: [...s.past, { boards: s.boards, activeId: s.activeId }],
          future: s.future.slice(1),
          notice: save(next),
        });
    },
    importData: (data) => {
      const boards = validateBoards(data);
      commit({ boards, activeId: boards[0]?.id ?? "" });
    },
    addRecognized: (board) => {
      const s = get();
      if (s.boards.length >= 100) throw new Error("最多支持 100 个房间");
      commit({ boards: [...s.boards, board], activeId: board.id });
    },
    clearNotice: () => set({ notice: "" }),
  };
});
