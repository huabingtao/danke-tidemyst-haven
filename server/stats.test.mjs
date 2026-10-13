import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createStatsServer } from "./stats.mjs";
test("online clients expire, completed rounds deduplicate and persist across restarts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tidemyst-stats-test-")),
    file = join(dir, "stats.sqlite");
  let now = 1770000000000;
  let app = createStatsServer({ databasePath: file, clock: () => now });
  const listen = async () => {
    await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${app.server.address().port}/api/stats`;
  };
  let base = await listen();
  const post = (path, body, origin) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(body),
    });
  try {
    assert.deepEqual(await (await fetch(base)).json(), {
      online: 0,
      totalCompleted: 0,
    });
    await post("/heartbeat", { clientId: "player-a" });
    await post("/heartbeat", { clientId: "player-a" });
    await post("/heartbeat", { clientId: "player-b" });
    assert.equal((await (await fetch(base)).json()).online, 2);
    for (let i = 0; i < 3; i++)
      await post("/completed", { clientId: "player-a", roundId: "round-a" });
    assert.equal((await (await fetch(base)).json()).totalCompleted, 1);
    await post("/completed", { clientId: "player-a", roundId: "round-b" });
    assert.equal((await (await fetch(base)).json()).totalCompleted, 2);
    now += 90001;
    assert.equal((await (await fetch(base)).json()).online, 0);
    assert.equal(
      (await post("/completed", { clientId: "player-a" })).status,
      400,
    );
    assert.equal(
      (await post("/heartbeat", { clientId: "a" }, "https://evil.example"))
        .status,
      403,
    );
    assert.equal(
      (await post("/heartbeat", { clientId: "x".repeat(4000) })).status,
      413,
    );
    await app.close();
    app = createStatsServer({ databasePath: file, clock: () => now });
    base = await listen();
    assert.deepEqual(await (await fetch(base)).json(), {
      online: 0,
      totalCompleted: 2,
    });
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI starts through a release symlink and terminates cleanly", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tidemyst-stats-cli-")),
    entry = join(dir, "current.mjs");
  symlinkSync(fileURLToPath(new URL("./stats.mjs", import.meta.url)), entry);
  const child = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      PORT: "0",
      DATABASE_PATH: join(dir, "stats.sqlite"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exited = once(child, "exit");
  try {
    const port = await new Promise((resolvePort, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("CLI did not listen")),
        5000,
      );
      let output = "";
      child.stdout.on("data", (chunk) => {
        output += chunk.toString();
        const found = output.match(/localhost:(\d+)/);
        if (found) {
          clearTimeout(timeout);
          resolvePort(Number(found[1]));
        }
      });
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`CLI exited before listening: ${code}`));
      });
    });
    assert.deepEqual(
      await (await fetch(`http://127.0.0.1:${port}/api/stats`)).json(),
      { online: 0, totalCompleted: 0 },
    );
    child.kill("SIGTERM");
    const [code] = await exited;
    assert.equal(code, 0);
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
