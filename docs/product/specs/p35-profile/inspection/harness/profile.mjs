// Profile harness (read-only for the app's data). Serves the CODEX.md contract from fixtures by intercepting
// /api/management/profile in the browser, so every state can be shown without server code.
// PREVIEW_OUT defaults to the Profile session's preview. Usage:
//   node profile.mjs --account QAOWNER --w 390 --h 844 --fixture owner --out shot.png
//   [--browser chromium|firefox|webkit] [--landscape] [--zoom 1.25] [--full] [--read block|401|slow|hang]
//   [--save ok|fail|401|abort|slow] [--reduced] [--click "<css>" --after ms] [--eval "<js>"] [--path /app/profile] [--wait ms]
import pw from "/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const OUT = process.env.PREVIEW_OUT ?? "/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/preview";
const FIX = join(dirname(fileURLToPath(import.meta.url)), "../../fixtures");
const a = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => { if (v.startsWith("--")) acc.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]); return acc; }, []));
const runs = (await readdir(OUT)).filter(n => n.startsWith("evidence-")).sort();
const { url } = JSON.parse(await readFile(join(OUT, runs.at(-1), "access.json"), "utf8"));
const w = +(a.w ?? 390), h = +(a.h ?? 844), phone = w < 768 || !!a.landscape;
const browser = await pw[a.browser ?? "chromium"].launch();
const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...(a.browser === "firefox" ? {} : { isMobile: phone }), hasTouch: phone, serviceWorkers: "block", reducedMotion: a.reduced ? "reduce" : "no-preference", storageState: join(OUT, "state", `${a.account ?? "QAOWNER"}.json`) });
const page = await ctx.newPage(); page.setDefaultTimeout(30000);
const counts = { read: 0, save: 0 };
const fixture = a.fixture ? JSON.parse(await readFile(join(FIX, `${a.fixture}.json`), "utf8")) : null;
await page.route("**/api/management/profile", async route => {
  counts.read++;
  if (a.read === "block") return route.abort("failed");
  if (a.read === "401") return route.fulfill({ status: 401, body: "" });
  if (a.read === "hang") return; // never answers: the loading state (the client gives up after 10s)
  if (a.read === "slow") await new Promise(r => setTimeout(r, 4000));
  if (!fixture) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...fixture, observedAt: new Date().toISOString() }) });
});
await page.route("**/api/management/profile/alerts", async route => {
  counts.save++;
  const mode = a.save ?? "ok";
  if (mode === "slow") await new Promise(r => setTimeout(r, 4000));
  if (mode === "abort") return route.abort("failed");
  if (mode === "fail") return route.fulfill({ status: 500, body: "" });
  if (mode === "401") return route.fulfill({ status: 401, body: "" });
  const body = JSON.parse(route.request().postData() ?? "{}");
  if (fixture?.alerts) fixture.alerts = fixture.alerts.map(t => t.id === body.topicId ? { ...t, on: body.on } : t);
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
});
await page.goto(url + (a.path ?? "/app/profile"), { waitUntil: a.read === "hang" ? "load" : "networkidle" });
if (a.zoom) await page.evaluate(z => { document.documentElement.style.fontSize = `${Number(z) * 100}%`; }, a.zoom);
await page.waitForTimeout(+(a.wait ?? 1200));
if (a.click) { await page.locator(a.click).first().click(); await page.waitForTimeout(+(a.after ?? 600)); }
if (a.eval) console.log(JSON.stringify(await page.evaluate(a.eval)));
if (a.out) await page.screenshot({ path: a.out, fullPage: !!a.full });
console.log(JSON.stringify({ url: page.url(), counts }));
await browser.close();
