import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { createStatsServer } from "./stats.mjs";
import { createServer } from "node:http";
import { createBattleImages } from "./battle-images.mjs";
const canvas = createCanvas(1080, 1440),
  png = canvas.toBuffer("image/png");
test("battle PNG bytes are public inline images, expire, and remain available after API restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tidemyst-images-"));
  let now = Date.now();
  let app = createStatsServer({
    databasePath: join(dir, "stats.sqlite"),
    clock: () => now,
  });
  const listen = async () => {
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    return `http://127.0.0.1:${app.server.address().port}`;
  };
  let base = await listen();
  const post = (body, type = "image/png", origin) =>
    fetch(base + "/api/battle-images", {
      method: "POST",
      headers: { "Content-Type": type, ...(origin ? { Origin: origin } : {}) },
      body,
    });
  try {
    const response = await post(png);
    assert.equal(response.status, 201);
    const data = await response.json();
    assert.match(data.url, /^\/api\/battle-images\/[a-f0-9]{32}\.png$/);
    assert.equal(data.expiresAt, now + 86400000);
    const image = await fetch(base + data.url + "?wx_fmt=png");
    assert.equal(image.status, 200);
    assert.equal(image.headers.get("content-type"), "image/png");
    assert.match(image.headers.get("content-disposition"), /^inline/);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const head = await fetch(base + data.url, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), String(png.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal(
      (await (await fetch(base + "/api/stats")).json()).totalCompleted,
      0,
    );
    assert.equal((await post(png, "image/jpeg")).status, 415);
    assert.equal((await post(Buffer.from("not png"))).status, 400);
    assert.equal(
      (await post(png, "image/png", "https://elsewhere.example")).status,
      403,
    );
    assert.equal((await post(Buffer.alloc(2097153))).status, 413);
    await app.close();
    app = createStatsServer({
      databasePath: join(dir, "stats.sqlite"),
      clock: () => now,
    });
    base = await listen();
    assert.equal((await fetch(base + data.url)).status, 200);
    now += 86400001;
    assert.equal((await fetch(base + data.url)).status, 404);
    assert.deepEqual(readdirSync(join(dir, "posters")), []);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("image quota and upload rate reject new files without corrupting existing PNGs", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tidemyst-quota-")),
    images = createBattleImages({ directory: dir, maxFiles: 1, perHour: 2 });
  const server = createServer((req, res) => void images.handle(req, res));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = () =>
    fetch(base + "/api/battle-images", {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: png,
    });
  try {
    const first = await post();
    const { url } = await first.json();
    assert.equal(first.status, 201);
    assert.equal((await post()).status, 503);
    assert.equal((await post()).status, 429);
    assert.equal((await fetch(base + url)).status, 200);
    assert.equal(readdirSync(dir).length, 1);
  } finally {
    images.close();
    server.closeIdleConnections();
    await new Promise((r) => server.close(r));
    rmSync(dir, { recursive: true, force: true });
  }
});
