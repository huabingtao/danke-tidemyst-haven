import {
  validateBoards,
  type Board,
  type Cell,
  type Observation,
} from "../../core/models";
const STATES: Observation[] = [
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
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWX";
const invalid = () => new Error("分享链接无效或不完整，请重新复制链接");
function fingerprint(text: string): string {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(text))
    hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 0x100000001b3n);
  return hash.toString(16).padStart(16, "0");
}
export function toolLink(base: string): string {
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw invalid();
  url.hash = "";
  url.search = "";
  return url.href;
}
/** A snapshot of ONE room; no image, candidate recognition, IDs or calculated probabilities. */
export function progressLink(board: Board, base: string): string {
  const b = validateBoards({ version: 1, boards: [board] })[0];
  const cells = b.cells
    .map((c) => ALPHABET[STATES.indexOf(c.observed) + (c.flagged ? 12 : 0)])
    .join("");
  const bytes = new TextEncoder().encode(
    JSON.stringify([1, b.size, b.totalGems, b.room, cells]),
  );
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const url = new URL(toolLink(base));
  url.hash = `progress=${token}`;
  return url.href;
}
export function sharedBoard(link: string): Board | null {
  const url = new URL(link);
  if (!url.hash.startsWith("#progress=")) return null;
  try {
    const token = url.hash.slice(10);
    if (!token || token.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(token))
      throw invalid();
    const raw = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const payload: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(raw, (ch) => ch.charCodeAt(0)),
      ),
    );
    if (!Array.isArray(payload) || payload.length !== 5 || payload[0] !== 1)
      throw invalid();
    const [, size, totalGems, room, encoded] = payload;
    if (
      typeof size !== "number" ||
      ![8, 10, 12].includes(size) ||
      typeof encoded !== "string" ||
      encoded.length !== size * size
    )
      throw invalid();
    const cells: Cell[] = Array.from(encoded, (ch) => {
      const code = ALPHABET.indexOf(ch);
      if (code < 0) throw invalid();
      return { observed: STATES[code % 12], flagged: code >= 12 };
    });
    return validateBoards({
      version: 1,
      boards: [
        {
          id: `shared-${fingerprint(token)}`,
          size,
          totalGems,
          room,
          cells,
          updatedAt: Date.now(),
        },
      ],
    })[0];
  } catch {
    throw invalid();
  }
}
export function publicLink(link: string): boolean {
  const url = new URL(link),
    host = url.hostname;
  return !(
    host === "localhost" ||
    host === "[::1]" ||
    /^(127\.|0\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  );
}
