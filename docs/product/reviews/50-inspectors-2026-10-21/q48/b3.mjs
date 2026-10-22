import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
await go(p, "/app/schedule");
console.log("h1", await p.locator("h1").allInnerTexts(), await overflow(p));
const items = await p.evaluate(() => [...document.querySelectorAll("main a,main button,main [role=tab], header a, header button")].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return `${e.tagName} "${(e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").slice(0, 45)}" ${(e.getAttribute("href") || "").slice(0, 60)} ${e.getAttribute("aria-selected") || e.getAttribute("aria-current") || ""} [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]`; }));
console.log(items.slice(0, 45).join("\n"));
await shot(p, `sched-${w}`);
dump(log); await b.close();
