import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
await go(p, "/app/schedule");
const add = p.locator("a[href*=\"/app/schedule/new\"]:visible").first(); console.log("add href", await add.getAttribute("href"));
await add.click(); await p.waitForURL(/schedule\/new/, { timeout: 40000 }).catch(() => console.log("no nav")); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
console.log("url", p.url().split("/app")[1], "h1", await p.locator("h1").allInnerTexts(), await overflow(p));
const fields = await p.evaluate(() => [...document.querySelectorAll("main input,main select,main textarea,main button,main a, form button, form a")].filter(e => e.getClientRects().length && e.type !== "hidden").map(e => { const r = e.getBoundingClientRect(); const lab = e.labels?.[0]?.innerText || e.getAttribute("aria-label") || e.innerText || e.value; return `${e.tagName}:${e.type || ""} "${(lab || "").replace(/\s+/g, " ").slice(0, 40)}" val="${(e.value || "").slice(0, 30)}"${e.required ? " req" : ""}${e.disabled ? " dis" : ""} [${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}]`; }));
console.log(fields.join("\n"));
await shot(p, `addshift-${w}`, true);
// change a field (no submit), then cancel
const sel = p.locator("main select:visible").first();
if (await sel.count()) { const opts = await sel.locator("option").allInnerTexts(); console.log("first select options", opts.slice(0, 8)); if (opts.length > 1) await sel.selectOption({ index: 1 }); }
const cancel = p.getByRole("link", { name: /Cancel/ }).or(p.getByRole("button", { name: /Cancel/ })).filter({ visible: true }).first();
console.log("cancel count", await cancel.count());
let dialogSeen = false; p.on("dialog", async d => { dialogSeen = d.message(); await d.dismiss(); });
if (await cancel.count()) { await cancel.click(); await p.waitForTimeout(2500); }
console.log("after cancel url", p.url().split("/app")[1], "dialog:", dialogSeen, "h1", await p.locator("h1").allInnerTexts());
dump(log); await b.close();
