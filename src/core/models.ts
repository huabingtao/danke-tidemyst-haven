export type BoardSize = 8 | 10 | 12;
export type Observation = "unknown" | "gem" | "safe" | number;
export interface Cell {
  observed: Observation;
  flagged: boolean;
  recognition?: { suggested: Observation; confidence: number; reason: string };
}
export interface Recommendation {
  best: number[];
  next: number[];
  information: number[];
  max: number;
  strategy: "certain" | "exact-information" | "neighbor-coverage";
}
export interface Board {
  id: string;
  room: string;
  size: number;
  totalGems: number;
  cells: Cell[];
  updatedAt: number;
}
export interface SolveResult {
  status: "exact" | "conflict" | "limited";
  probabilities: (number | null)[];
  conflictCells: number[];
  message: string;
  remaining: number;
  layouts: string;
  nodes: number;
  elapsedMs: number;
  recommendation?: Recommendation;
}
export const DEFAULT_GEMS: Record<BoardSize, number> = {
  8: 20,
  10: 30,
  12: 45,
};
export const emptyCell = (): Cell => ({ observed: "unknown", flagged: false });
function boardId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
export function createBoard(size: BoardSize = 8, room = "1"): Board {
  return {
    id: boardId(),
    size,
    room,
    totalGems: DEFAULT_GEMS[size],
    cells: Array.from({ length: size * size }, emptyCell),
    updatedAt: Date.now(),
  };
}
export function neighbors(index: number, size: number): number[] {
  const row = Math.floor(index / size),
    col = index % size,
    result: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!(dr || dc)) continue;
      const r = row + dr,
        c = col + dc;
      if (r >= 0 && c >= 0 && r < size && c < size) result.push(r * size + c);
    }
  return result;
}
export function validateBoards(input: unknown): Board[] {
  if (
    !input ||
    typeof input !== "object" ||
    !("version" in input) ||
    input.version !== 1 ||
    !("boards" in input) ||
    !Array.isArray(input.boards)
  )
    throw new Error("不是有效的潮汐秘境 v1 数据文件");
  if (input.boards.length > 100) throw new Error("最多支持 100 个房间");
  const ids = new Set<string>();
  return input.boards.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("房间数据不完整");
    const b = value as Record<string, unknown>;
    if (
      typeof b.id !== "string" ||
      !b.id ||
      b.id.length > 100 ||
      ids.has(b.id) ||
      typeof b.room !== "string" ||
      !b.room.trim() ||
      b.room.length > 24 ||
      ![8, 10, 12].includes(Number(b.size)) ||
      typeof b.size !== "number" ||
      typeof b.totalGems !== "number" ||
      !Number.isInteger(b.totalGems) ||
      b.totalGems < 0 ||
      b.totalGems > b.size ** 2 ||
      !Array.isArray(b.cells) ||
      b.cells.length !== b.size ** 2
    )
      throw new Error("房间编号、尺寸、总数或格子数据无效");
    ids.add(b.id);
    const cells: Cell[] = b.cells.map((value: unknown) => {
      if (!value || typeof value !== "object") throw new Error("格子数据无效");
      const c = value as Record<string, unknown>;
      const o = c.observed;
      if (
        !(
          o === "unknown" ||
          o === "gem" ||
          o === "safe" ||
          (typeof o === "number" && Number.isInteger(o) && o >= 0 && o <= 8)
        ) ||
        typeof c.flagged !== "boolean"
      )
        throw new Error("格子状态无效");
      const cell: Cell = { observed: o, flagged: c.flagged };
      if (c.recognition !== undefined) {
        const r = c.recognition;
        if (!r || typeof r !== "object") throw new Error("识别标记无效");
        const record = r as Record<string, unknown>;
        const suggested = record.suggested;
        if (
          !(
            suggested === "unknown" ||
            suggested === "gem" ||
            suggested === "safe" ||
            (typeof suggested === "number" &&
              Number.isInteger(suggested) &&
              suggested >= 0 &&
              suggested <= 8)
          ) ||
          typeof record.confidence !== "number" ||
          !Number.isFinite(record.confidence) ||
          record.confidence < 0 ||
          record.confidence > 1 ||
          typeof record.reason !== "string" ||
          record.reason.length > 250
        )
          throw new Error("识别标记无效");
        cell.recognition = {
          suggested,
          confidence: record.confidence,
          reason: record.reason,
        };
      }
      return cell;
    });
    return {
      id: b.id,
      room: b.room.trim(),
      size: b.size,
      totalGems: b.totalGems,
      cells,
      updatedAt: Date.now(),
    };
  });
}
