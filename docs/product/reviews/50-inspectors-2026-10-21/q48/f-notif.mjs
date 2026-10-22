import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
const main = async () => (await p.locator("main").first().innerText()).replace(/\s+/g, " ");
await go(p, "/app/notifications");
console.log("row hrefs", await p.locator("main a").evaluateAll(as => as.map(a => (a.innerText.replace(/\s+/g, " ").slice(0, 30)) + " -> " + a.getAttribute("href"))));
for (const t of ["Unread", "Needs action", "All"]) { await p.getByRole("button", { name: new RegExp("^" + t) }).first().click(); await p.waitForTimeout(500); console.log("tab", t, p.url().split("/app")[1], (await main()).slice(140, 420)); if (t === "Needs action") await shot(p, `notif-needsaction-${w}`); }
const s = p.locator("main input[type=search], main input").first();
await s.fill("zzz"); await p.waitForTimeout(600); console.log("search zzz:", (await main()).slice(140, 500)); await shot(p, `notif-search-empty-${w}`);
await s.fill("schedule"); await p.waitForTimeout(600); console.log("search schedule:", (await main()).slice(140, 400));
await go(p, "/app/updates");
const u = p.locator("main a[href*='/app/updates/']").first(); const href = await u.getAttribute("href"); console.log("update href", href);
await go(p, href); console.log("update detail", (await main()).slice(0, 700)); 
console.log("detail ctrls", await p.evaluate(() => [...document.querySelectorAll("main a,main button")].filter(e => e.getClientRects().length).map(e => (e.getAttribute("aria-label") || e.innerText).replace(/\s+/g, " ").slice(0, 40) + (e.disabled ? "(dis)" : ""))));
await shot(p, `update-detail-${w}`, true);
for (const f of ["Required", "Optional"]) { await go(p, "/app/updates"); await p.getByRole("button", { name: new RegExp("^" + f) }).first().click(); await p.waitForTimeout(500); console.log("updates", f, (await main()).slice(60, 300)); if (f === "Optional") await shot(p, `updates-optional-${w}`); }
console.log("blocked", log.blocked, "bad", log.bad.filter(x => !x.includes("fonts")), "pageerr", log.pageerr);
await b.close();
