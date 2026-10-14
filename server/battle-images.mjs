import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { join } from "node:path";
import {
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
  readFileSync,
  writeFileSync,
  utimesSync,
} from "node:fs";
const TTL = 24 * 60 * 60 * 1000,
  MAX_BODY = 2 * 1024 * 1024;
const TOKEN = /^[a-f0-9]{32}\.png$/;
function validPng(data) {
  if (
    data.length < 45 ||
    !data
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    data.toString("ascii", 12, 16) !== "IHDR" ||
    data.readUInt32BE(8) !== 13 ||
    data.readUInt32BE(16) !== 1080 ||
    data.readUInt32BE(20) !== 1440
  )
    return false;
  let at = 8,
    pixels = false;
  while (at + 12 <= data.length) {
    const size = data.readUInt32BE(at),
      type = data.toString("ascii", at + 4, at + 8);
    if (size > data.length - at - 12) return false;
    if (type === "IDAT") pixels = true;
    at += size + 12;
    if (type === "IEND") return size === 0 && at === data.length && pixels;
  }
  return false;
}
export function createBattleImages({
  directory,
  clock = Date.now,
  maxBytes = 128 * 1024 * 1024,
  maxFiles = 512,
  perHour = 60,
}) {
  mkdirSync(directory, { recursive: true });
  const rates = new Map();
  const clean = () => {
    let bytes = 0,
      files = 0;
    for (const name of readdirSync(directory)) {
      if (!TOKEN.test(name)) continue;
      const path = join(directory, name),
        info = statSync(path);
      if (info.mtimeMs + TTL <= clock()) unlinkSync(path);
      else {
        bytes += info.size;
        files++;
      }
    }
    for (const [ip, entry] of rates)
      if (entry.since + 3600000 <= clock()) rates.delete(ip);
    return { bytes, files };
  };
  clean();
  const timer = setInterval(() => {
    try {
      clean();
    } catch {
      /* Request path reports storage failure. */
    }
  }, 300000);
  timer.unref();
  const handle = async (req, res) => {
    if (!req.url?.startsWith("/api/battle-images")) return false;
    const pathname = new URL(req.url, "http://localhost").pathname;
    const reply = (code, error) => {
      res.writeHead(code, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(error));
    };
    try {
      const name = pathname.slice("/api/battle-images/".length);
      if (
        ["GET", "HEAD"].includes(req.method) &&
        pathname.startsWith("/api/battle-images/") &&
        TOKEN.test(name)
      ) {
        const path = join(directory, name);
        let info;
        try {
          info = statSync(path);
        } catch (e) {
          if (e.code === "ENOENT") {
            reply(404, { error: "Image expired or missing" });
            return true;
          }
          throw e;
        }
        if (info.mtimeMs + TTL <= clock()) {
          unlinkSync(path);
          reply(404, { error: "Image expired" });
          return true;
        }
        res.writeHead(200, {
          "Content-Type": "image/png",
          "Content-Length": info.size,
          "Content-Disposition": "inline; filename=tidemyst-battle.png",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, max-age=600",
        });
        res.end(req.method === "HEAD" ? undefined : readFileSync(path));
        return true;
      }
      if (req.method !== "POST" || req.url !== "/api/battle-images") {
        reply(404, { error: "Not found" });
        return true;
      }
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      ) {
        req.resume();
        reply(403, { error: "Origin denied" });
        return true;
      }
      if (req.headers["content-type"]?.split(";")[0] !== "image/png") {
        req.resume();
        reply(415, { error: "PNG required" });
        return true;
      }
      if (Number(req.headers["content-length"]) > MAX_BODY) {
        req.resume();
        reply(413, { error: "Image too large" });
        return true;
      }
      clean();
      const forwarded = req.headers["x-real-ip"],
        ip =
          req.socket.remoteAddress === "127.0.0.1" &&
          typeof forwarded === "string" &&
          isIP(forwarded)
            ? forwarded
            : req.socket.remoteAddress;
      const rate = rates.get(ip) ?? { since: clock(), count: 0 };
      if (rate.count >= perHour || (!rates.has(ip) && rates.size >= 5000)) {
        req.resume();
        reply(429, { error: "Too many images" });
        return true;
      }
      rate.count++;
      rates.set(ip, rate);
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY) {
          req.resume();
          reply(413, { error: "Image too large" });
          return true;
        }
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks);
      if (!validPng(data)) {
        reply(400, { error: "Invalid battle PNG" });
        return true;
      }
      const capacity = clean();
      if (
        capacity.bytes + data.length > maxBytes ||
        capacity.files >= maxFiles
      ) {
        reply(503, { error: "Image storage full" });
        return true;
      }
      const filename = randomBytes(16).toString("hex") + ".png",
        path = join(directory, filename);
      writeFileSync(path, data, { flag: "wx", mode: 0o600 });
      utimesSync(path, new Date(clock()), new Date(clock()));
      reply(201, {
        url: `/api/battle-images/${filename}`,
        expiresAt: clock() + TTL,
      });
    } catch {
      if (!res.headersSent) reply(503, { error: "Image storage unavailable" });
      else res.destroy();
    }
    return true;
  };
  return { handle, close: () => clearInterval(timer) };
}
