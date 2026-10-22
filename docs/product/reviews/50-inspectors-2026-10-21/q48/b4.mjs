import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
const txt = async (sel = "main") => (await p.locator(sel).first().innerText()).replace(/\s+/g, " ");
await go(p, "/app/schedule");
// tap Saturday
await p.getByRole("button", { name: /^Saturday/ }).tap(); await p.waitForTimeout(700);
console.log("sat url", p.url().split("schedule")[1], "pressed", await p.getByRole("button", { name: /^Saturday/ }).getAttribute("aria-pressed"), await p.getByRole("button", { name: /^Saturday/ }).getAttribute("aria-current"));
const t = await txt(); console.log("sat list", t.slice(t.indexOf("SATURDAY") > -1 ? t.indexOf("SATURDAY") : t.indexOf("Saturday"), t.indexOf("SATURDAY") + 200));
await p.getByRole("button", { name: /Show \d+ more/ }).first().tap(); await p.waitForTimeout(500);
console.log("after show more:", (await txt()).slice(-500));
await shot(p, `sched-sat-expanded-${w}`, true);
// More sheet
await p.getByRole("button", { name: "More schedule actions" }).tap(); await p.waitForTimeout(700);
const sheet = await p.evaluate(() => [...document.querySelectorAll("[role=dialog],dialog,[popover]")].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { tag: e.tagName, role: e.getAttribute("role"), modal: e.getAttribute("aria-modal"), label: e.getAttribute("aria-label"), y: Math.round(r.y), h: Math.round(r.height), text: e.innerText.replace(/\s+/g, " ").slice(0, 400) }; }));
console.log("sheet", JSON.stringify(sheet));
await shot(p, `sched-more-${w}`);
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
console.log("sheet after esc", await p.locator("[role=dialog]:visible, dialog[open]").count());
dump(log); await b.close();
