import { toolLink } from "../sharing/links";
import { validateStats, type BattleShare } from "./stats";
function validateShare(value: unknown): BattleShare {
  const stats = validateStats(value),
    s = value as Record<string, unknown>;
  if (
    !["progress", "final", "aggregate"].includes(String(s.kind)) ||
    typeof s.room !== "string" ||
    s.room.length > 24 ||
    typeof s.rounds !== "number" ||
    !Number.isInteger(s.rounds) ||
    s.rounds < 1 ||
    s.rounds > 1000 ||
    (s.kind !== "aggregate" &&
      (!s.room.trim() ||
        s.rounds !== 1 ||
        stats.spent > 144 ||
        stats.totalGems > 144)) ||
    typeof s.createdAt !== "number" ||
    s.createdAt <= 0 ||
    !Number.isFinite(new Date(s.createdAt).getTime())
  )
    throw new Error("战绩链接无效或不完整");
  return {
    ...stats,
    kind: s.kind as BattleShare["kind"],
    room: s.room,
    rounds: s.rounds,
    createdAt: s.createdAt,
  };
}
export function battleLink(value: BattleShare, base: string): string {
  const s = validateShare(value);
  const bytes = new TextEncoder().encode(
    JSON.stringify([
      1,
      s.kind,
      s.room,
      s.rounds,
      s.spent,
      s.found,
      s.totalGems,
      s.createdAt,
    ]),
  );
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${toolLink(base)}#battle=${token}`;
}
export function readBattleLink(link: string): BattleShare | null {
  const hash = new URL(link).hash;
  if (!hash.startsWith("#battle=")) return null;
  try {
    const token = hash.slice(8);
    if (!token || token.length > 1536 || !/^[A-Za-z0-9_-]+$/.test(token))
      throw new Error();
    const raw = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const value: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(raw, (ch) => ch.charCodeAt(0)),
      ),
    );
    if (!Array.isArray(value) || value.length !== 8 || value[0] !== 1)
      throw new Error();
    const [, kind, room, rounds, spent, found, totalGems, createdAt] = value;
    return validateShare({
      kind,
      room,
      rounds,
      spent,
      found,
      totalGems,
      createdAt,
    });
  } catch {
    throw new Error("战绩链接无效或不完整，请重新复制");
  }
}
