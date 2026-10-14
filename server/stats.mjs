import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { dirname, resolve } from "node:path";
import { mkdirSync, realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createBattleImages } from "./battle-images.mjs";
import { join } from "node:path";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const validId = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 100 &&
  !/[\u0000-\u001f]/.test(value);
export function createStatsServer({ databasePath, clock = Date.now }) {
  mkdirSync(dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS completions (id TEXT PRIMARY KEY, completed_at INTEGER NOT NULL)",
  );
  const add = db.prepare(
      "INSERT OR IGNORE INTO completions (id, completed_at) VALUES (?, ?)",
    ),
    total = db.prepare("SELECT COUNT(*) AS count FROM completions");
  const online = new Map();
  const snapshot = () => {
    for (const [id, expiry] of online) if (expiry <= clock()) online.delete(id);
    return { online: online.size, totalCompleted: Number(total.get().count) };
  };
  const images = createBattleImages({
    directory: join(dirname(databasePath), "posters"),
    clock,
  });
  const server = createServer(async (req, res) => {
    if (await images.handle(req, res)) return;
    const reply = (code, body) => {
      res.writeHead(code, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && req.url === "/api/stats")
      return reply(200, snapshot());
    if (
      req.method !== "POST" ||
      !["/api/stats/heartbeat", "/api/stats/completed"].includes(req.url)
    )
      return reply(404, { error: "Not found" });
    try {
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        return reply(403, { error: "Origin denied" });
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return reply(415, { error: "JSON required" });
      if (Number(req.headers["content-length"]) > 2048) {
        req.resume();
        return reply(413, { error: "Body too large" });
      }
      let data = "";
      for await (const chunk of req) {
        data += chunk.toString();
        if (Buffer.byteLength(data) > 2048)
          return reply(413, { error: "Body too large" });
      }
      const value = JSON.parse(data);
      if (!value || !validId(value.clientId))
        return reply(400, { error: "Invalid client" });
      if (req.url === "/api/stats/heartbeat") {
        snapshot();
        if (online.size >= 50000 && !online.has(hash(value.clientId)))
          return reply(503, { error: "Busy" });
        online.set(hash(value.clientId), clock() + 90000);
      } else {
        if (!validId(value.roundId))
          return reply(400, { error: "Invalid round" });
        add.run(hash(JSON.stringify([value.clientId, value.roundId])), clock());
      }
      reply(200, snapshot());
    } catch {
      reply(400, { error: "Invalid request" });
    }
  });
  return {
    server,
    close: async () => {
      images.close();
      if (server.listening) {
        server.closeIdleConnections();
        await new Promise((resolveClose, reject) =>
          server.close((error) => (error ? reject(error) : resolveClose())),
        );
      }
      db.close();
    },
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(resolve(process.argv[1]))).href
) {
  const app = createStatsServer({
    databasePath: process.env.DATABASE_PATH ?? "/tmp/tidemyst-stats-dev.sqlite",
  });
  app.server.listen(Number(process.env.PORT ?? 3009), "127.0.0.1", () =>
    console.log(
      `Tidemyst stats listening on localhost:${app.server.address().port}`,
    ),
  );
  const stop = () => {
    app
      .close()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
