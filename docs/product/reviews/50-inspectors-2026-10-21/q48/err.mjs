import { start, go, shot } from "./h.mjs";
const [w, path, name] = [Number(process.argv[2]), process.argv[3], process.argv[4]];
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
const msgs = [];
p.on("console", m => { if (m.type() === "error" && m.text().includes("timeout")) msgs.push(m.text()); });
const t = Date.now(); await go(p, path); console.log("ms", Date.now() - t, "h1", await p.locator("h1").allInnerTexts());
for (const m of msgs) console.log(m.replace(/file:\/\/\/[^)]*\//g, "").slice(0, 1500));
if (name) await shot(p, name);
await b.close();
