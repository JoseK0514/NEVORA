import { open, BASE, S } from "../../tools/common.mjs";
export { BASE };
export const SHOT = `${S}/review50/shots`;
export async function start(acct, w, opts = {}) {
  const tablet = w >= 768 && w < 1024 && opts.touch;
  let r;
  if (tablet) {
    const { chromium } = await import("/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs");
    const b = await chromium.launch();
    const c = await b.newContext({ storageState: `${S}/preview/state/${acct}.json`, viewport: { width: w, height: opts.height ?? 1024 }, hasTouch: true, isMobile: true, serviceWorkers: "block" });
    const p = await c.newPage(); p.setDefaultTimeout(30000); r = { b, c, p };
  } else r = await open(acct, w, opts);
  const log = { console: [], pageerr: [], bad: [], blocked: [] };
  r.p.on("console", m => { if (m.type() === "error" || m.type() === "warning") log.console.push(m.type() + ": " + m.text().slice(0, 300)); });
  r.p.on("pageerror", e => log.pageerr.push(String(e).slice(0, 300)));
  r.p.on("response", res => { if (res.status() >= 400) log.bad.push(res.status() + " " + res.request().method() + " " + res.url().replace(BASE, "").slice(0, 160)); });
  await r.c.route("**/*", route => {
    const req = route.request();
    if (req.method() !== "GET" && req.method() !== "HEAD" && req.method() !== "OPTIONS") {
      log.blocked.push(req.method() + " " + req.url().replace(BASE, "").slice(0, 120) + " action=" + (req.headers()["next-action"] ? "yes" : "no"));
      return route.abort();
    }
    return route.continue();
  });
  r.p.setDefaultTimeout(45000);
  return { ...r, log };
}
export async function go(p, path) { await p.goto(BASE + path, { waitUntil: "networkidle" }).catch(e => console.log("goto", String(e).slice(0, 100))); await p.waitForTimeout(800); }
export async function shot(p, name, full = false) { await p.screenshot({ path: `${SHOT}/qa48-${name}.png`, fullPage: full }); }
export async function overflow(p) { return p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })); }
export function dump(log) { console.log(JSON.stringify(log, null, 1)); }
