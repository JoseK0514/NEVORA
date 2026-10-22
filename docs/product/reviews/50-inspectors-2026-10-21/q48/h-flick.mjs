import { start, BASE, shot } from "./h.mjs";
const w = Number(process.argv[2]); const path = process.argv[3]; const runs = Number(process.argv[4] || 3);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
for (let i = 0; i < runs; i++) {
  const t0 = Date.now(); const seq = [];
  await p.goto(BASE + path, { waitUntil: "commit" });
  let last = "";
  while (Date.now() - t0 < 9000) {
    const s = await p.evaluate(() => { const m = document.querySelector("main"); if (!m) return "nomain"; const t = m.innerText; return /Couldn.t load|isn.t available/.test(t) ? "ERROR" : /Loading|aria-busy/.test(t) || m.querySelector("[aria-busy=true]") ? "loading" : "content:" + t.replace(/\s+/g, " ").slice(0, 40); }).catch(() => "nav");
    if (s !== last) { seq.push(`${Date.now() - t0}ms ${s}`); last = s; if (s === "ERROR") await shot(p, `flicker-${path.replace(/\W+/g, "_")}-${w}-${i}`); }
    await p.waitForTimeout(80);
  }
  console.log("run", i, seq.join(" | "));
}
console.log("blocked", log.blocked);
await b.close();
