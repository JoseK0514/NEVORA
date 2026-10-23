import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
await go(p, "/app");
console.log("title", await p.title(), await overflow(p));
const items = await p.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=tab]")].filter(e => e.offsetParent || e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return `${e.tagName} ${(e.getAttribute("aria-label") || e.innerText || "").replace(/\s+/g, " ").slice(0, 50)} -> ${e.getAttribute("href") || ""} [${Math.round(r.width)}x${Math.round(r.height)}]`; }));
console.log(items.join("\n"));
await shot(p, `home-${w}`);
dump(log); await b.close();
