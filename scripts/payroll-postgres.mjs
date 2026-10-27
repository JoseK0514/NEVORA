import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { randomBytes } from "node:crypto";

// This runner never connects to an existing application or test server.
if (process.env.DATABASE_URL)
  throw new Error("Unset DATABASE_URL before running owned Clocker tests.");
const bin = process.env.NEVORA_TEST_PG_BIN;
if (
  !bin ||
  !existsSync(join(bin, "initdb")) ||
  !existsSync(join(bin, "pg_ctl"))
) {
  throw new Error(
    "NEVORA_TEST_PG_BIN must identify an existing local PostgreSQL bin directory.",
  );
}
const port = await new Promise((resolvePort, reject) => {
  const socket = createServer();
  socket.once("error", reject);
  socket.listen(0, "127.0.0.1", () => {
    const address = socket.address();
    socket.close(() => resolvePort(address.port));
  });
});
const owned = mkdtempSync(join(tmpdir(), "nevora-payroll-owned-"));
const data = join(owned, "data");
const marker = randomBytes(16).toString("hex");
writeFileSync(join(owned, "owner"), marker, { mode: 0o600 });
const evidence = resolve(".omo/evidence/payroll-backend");
mkdirSync(evidence, { recursive: true });
const run = (name, args) => {
  const result = spawnSync(join(bin, name), args, {
    encoding: "utf8",
    timeout: 45000,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `${name} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`,
    );
};
let exitCode = 1;
let started = false;
try {
  run("initdb", [
    "-D",
    data,
    "-U",
    "nevora_test",
    "--auth-local=trust",
    "--auth-host=trust",
    "--encoding=UTF8",
    "--no-locale",
  ]);
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    join(owned, "postgres.log"),
    "-w",
    "start",
    "-o",
    `-h 127.0.0.1 -p ${port} -k ${owned}`,
  ]);
  started = true;
  console.log(
    "[Payroll PostgreSQL] New owned loopback cluster started; no existing databases used.",
  );
  const config =
    process.argv[2] ?? "vitest.configurable-payroll-integration.config.mts";
  const prefix = ["vitest.passkeys-network.config.mts", "vitest.all-ui-browser.config.mts", "vitest.owner-advisor-browser.config.mts", "vitest.employee-mobile-phase1.config.mts"].includes(config)
    ? "nevora_exchange_test_" : "nevora_foundation_test_";
  const env = {
    ...process.env,
    FUEL_TEST_DATABASE_URL: `postgresql://nevora_test@127.0.0.1:${port}/${prefix}c1_${marker.slice(0, 12)}`,
    FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN: "yes",
  };
  delete env.DATABASE_URL;
  const args = ["node_modules/vitest/vitest.mjs", "run", "--config", config, ...process.argv.slice(3)];
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  exitCode = result.status ?? 1;
} finally {
  // pg_ctl may report failure after postmaster has already created its PID file.
  if (started || existsSync(join(data, "postmaster.pid"))) {
    run("pg_ctl", ["-D", data, "-w", "stop", "-m", "fast"]);
    console.log("[Payroll PostgreSQL] Owned cluster stopped.");
  }
  // mkdtemp-created directory belongs exclusively to this invocation.
  rmSync(owned, { recursive: true, force: true });
}
process.exitCode = exitCode;
