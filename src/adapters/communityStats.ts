export interface CommunityNumbers {
  online: number;
  totalCompleted: number;
}
const CLIENT = "tidemyst-community-client",
  PENDING = "tidemyst-pending-completions";
let memoryClient = "",
  memoryPending: string[] = [],
  sending: Promise<void> | null = null;
function clientId() {
  if (memoryClient) return memoryClient;
  try {
    const old = localStorage.getItem(CLIENT);
    if (old && old.length <= 100) memoryClient = old;
  } catch {
    /* Memory fallback. */
  }
  if (!memoryClient) {
    memoryClient =
      globalThis.crypto?.randomUUID?.() ??
      `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      localStorage.setItem(CLIENT, memoryClient);
    } catch {
      /* No permission required. */
    }
  }
  return memoryClient;
}
function pending() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PENDING) ?? "[]");
    if (
      Array.isArray(value) &&
      value.length <= 1000 &&
      value.every(
        (s) => typeof s === "string" && s.length > 0 && s.length <= 100,
      )
    )
      return value as string[];
  } catch {
    /* Memory fallback. */
  }
  return memoryPending;
}
function savePending(value: string[]) {
  memoryPending = value;
  try {
    localStorage.setItem(PENDING, JSON.stringify(value));
  } catch {
    /* Battle records still work locally. */
  }
}
async function request(
  path: string,
  payload?: object,
): Promise<CommunityNumbers> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`/api/stats${path}`, {
      method: payload ? "POST" : "GET",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("统计暂不可用");
    const value: unknown = await response.json();
    if (
      !value ||
      typeof value !== "object" ||
      !("online" in value) ||
      !("totalCompleted" in value) ||
      ![value.online, value.totalCompleted].every(
        (n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0,
      )
    )
      throw new Error("统计响应无效");
    return value as CommunityNumbers;
  } finally {
    clearTimeout(timer);
  }
}
export function queueCompletion(roundId: string) {
  const ids = pending();
  if (!ids.includes(roundId)) savePending([...ids, roundId].slice(-1000));
  window.dispatchEvent(new Event("tidemyst-completed"));
}
async function flush() {
  if (sending) return sending;
  sending = (async () => {
    for (const roundId of [...pending()]) {
      await request("/completed", { clientId: clientId(), roundId });
      savePending(pending().filter((id) => id !== roundId));
    }
  })().finally(() => {
    sending = null;
  });
  return sending;
}
export async function refreshCommunity() {
  await flush();
  return request("/heartbeat", { clientId: clientId() });
}
