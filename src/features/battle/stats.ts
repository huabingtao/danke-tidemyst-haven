import type { Board } from "../../core/models";
export interface BattleStats {
  spent: number;
  found: number;
  totalGems: number;
}
export interface BattleRecord extends BattleStats {
  id: string;
  roundId: string;
  sourceBoardId: string;
  room: string;
  size: number;
  endedAt: number;
}
export interface BattleShare extends BattleStats {
  kind: "progress" | "final" | "aggregate";
  room: string;
  rounds: number;
  createdAt: number;
}
export function boardStats(board: Board): BattleStats {
  return {
    spent: board.cells.filter(
      (c) =>
        !c.recognition &&
        (c.observed === "gem" || typeof c.observed === "number"),
    ).length,
    found: board.cells.filter((c) => !c.recognition && c.observed === "gem")
      .length,
    totalGems: board.totalGems,
  };
}
export function rate(numerator: number, denominator: number): string {
  return denominator === 0
    ? "—"
    : `${Math.round((numerator / denominator) * 100)}%`;
}
export function validateStats(value: unknown): BattleStats {
  if (!value || typeof value !== "object") throw new Error("战绩数据不完整");
  const s = value as Record<string, unknown>;
  if (
    ![s.spent, s.found, s.totalGems].every(
      (n) =>
        typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 144000,
    ) ||
    Number(s.found) > Number(s.spent) ||
    Number(s.found) > Number(s.totalGems)
  )
    throw new Error("宝石数或消耗无效，请检查棋盘与宝石总数");
  return {
    spent: s.spent as number,
    found: s.found as number,
    totalGems: s.totalGems as number,
  };
}
export function validateRecords(value: unknown): BattleRecord[] {
  if (!Array.isArray(value) || value.length > 1000)
    throw new Error("战绩记录无效，最多保存 1000 局");
  const ids = new Set<string>();
  return value.map((item: unknown) => {
    const stats = validateStats(item),
      r = item as Record<string, unknown>;
    if (
      ![r.id, r.roundId, r.sourceBoardId].every(
        (s) => typeof s === "string" && s.length > 0 && s.length <= 100,
      ) ||
      r.id !== r.roundId ||
      ids.has(String(r.id)) ||
      typeof r.room !== "string" ||
      !r.room.trim() ||
      r.room.length > 24 ||
      typeof r.size !== "number" ||
      ![8, 10, 12].includes(r.size) ||
      stats.spent > r.size ** 2 ||
      stats.totalGems > r.size ** 2 ||
      typeof r.endedAt !== "number" ||
      !Number.isFinite(r.endedAt) ||
      r.endedAt <= 0 ||
      !Number.isFinite(new Date(r.endedAt).getTime())
    )
      throw new Error("最终战绩记录无效");
    ids.add(String(r.id));
    return {
      ...stats,
      id: r.id as string,
      roundId: r.roundId as string,
      sourceBoardId: r.sourceBoardId as string,
      room: r.room.trim(),
      size: r.size,
      endedAt: r.endedAt,
    };
  });
}
export function settleBoard(board: Board): BattleRecord {
  const roundId = board.roundId ?? board.id;
  return validateRecords([
    {
      ...boardStats(board),
      id: roundId,
      roundId,
      sourceBoardId: board.id,
      room: board.room,
      size: board.size,
      endedAt: Date.now(),
    },
  ])[0];
}
export function currentBattle(board: Board): BattleShare {
  return {
    ...validateStats(boardStats(board)),
    kind: "progress",
    room: board.room,
    rounds: 1,
    createdAt: Date.now(),
  };
}
export function finalBattle(record: BattleRecord): BattleShare {
  return {
    ...validateStats(record),
    kind: "final",
    room: record.room,
    rounds: 1,
    createdAt: record.endedAt,
  };
}
export function aggregateBattle(records: BattleRecord[]): BattleShare {
  if (!records.length) throw new Error("请先选择已结算战绩");
  const unique = [...new Map(records.map((r) => [r.id, r])).values()];
  const stats = unique.reduce(
    (sum, r) => ({
      spent: sum.spent + r.spent,
      found: sum.found + r.found,
      totalGems: sum.totalGems + r.totalGems,
    }),
    { spent: 0, found: 0, totalGems: 0 },
  );
  return {
    ...validateStats(stats),
    kind: "aggregate",
    room: "",
    rounds: unique.length,
    createdAt: Date.now(),
  };
}
export const battleLabel = (share: BattleShare) =>
  share.kind === "aggregate"
    ? `${share.rounds} 局累计战绩`
    : `房间 ${share.room} · ${share.kind === "final" ? "最终战绩" : "进行中"}`;
export const battleDate = (time: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(time);
