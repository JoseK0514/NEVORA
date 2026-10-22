import { start, go, shot, overflow, dump } from "./h.mjs";
const [w, path, name] = [Number(process.argv[2]), process.argv[3], process.argv[4]];
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
await go(p, path);
console.log("url", p.url(), "h1", await p.locator("h1").allInnerTexts(), await overflow(p));
const items = await p.evaluate(() => [...document.querySelectorAll("a,button,[role=button],[role=tab],select,input,[role=option],[role=row]")].filter(e => e.getClientRects().length && !e.closest("nav[aria-label*='rimary'],aside")).map(e => { const r = e.getBoundingClientRect(); return `${e.tagName}${e.getAttribute("role") ? "/" + e.getAttribute("role") : ""} "${(e.getAttribute("aria-label") || e.innerText || e.value || "").replace(/\s+/g, " ").slice(0, 60)}" ${e.getAttribute("href") || ""} ${e.getAttribute("aria-selected") || e.getAttribute("aria-current") || e.getAttribute("aria-pressed") || ""} [${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]`; }));
console.log(items.join("\n"));
if (name) await shot(p, name);
dump(log); await b.close();
