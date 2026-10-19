// Usage: PREVIEW_OUT=<your scratch folder> node login.mjs <account> [...]
// Signs in once per account and saves storage state under $PREVIEW_OUT/state/. Never prints the password.
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
const pwRequire = createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT ?? new URL("../../node_modules", import.meta.url).pathname, "package.json"));
const pwModule = await import(pathToFileURL(pwRequire.resolve("playwright")).href);
const { chromium, firefox, webkit } = pwModule.default ?? pwModule;
const out = process.env.PREVIEW_OUT; if (!out) throw Error("Set PREVIEW_OUT");
const runs = (await readdir(out)).filter(n => n.startsWith("evidence-")).sort();
const access = JSON.parse(await readFile(join(out, runs.at(-1), "access.json"), "utf8"));
await mkdir(join(out, "state"), { recursive: true });
const b = await chromium.launch();
for (const account of process.argv.slice(2)) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const p = await c.newPage(); p.setDefaultTimeout(30000);
  await p.goto(access.url + "/login"); await p.getByLabel("Employee ID", { exact: true }).fill(account); await p.getByLabel("Password", { exact: true }).fill(access.password);
  try { await Promise.all([p.waitForURL(u => u.pathname === "/app", { timeout: 20000 }), p.getByRole("button", { name: "Sign In", exact: true }).click()]);
    await c.storageState({ path: join(out, "state", `${account}.json`) }); console.log(account, "ok"); }
  catch { console.log(account, "failed at", p.url()); }
  await c.close();
}
await b.close();
console.log("preview", access.url);
