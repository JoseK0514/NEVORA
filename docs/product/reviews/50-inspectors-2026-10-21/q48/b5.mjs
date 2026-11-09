import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]), h = Number(process.argv[3] || 844);
const { b, p, log } = await start("AUDIT-M", w, { touch: true, height: h });
await go(p, "/app/schedule");
await p.getByRole("button", { name: "More schedule actions" }).click(); await p.waitForTimeout(700);
const info = await p.evaluate(() => {
  const s = document.querySelector('[aria-label="More schedule actions"]:not(button)');
  const sc = [s, ...s.querySelectorAll("*")].filter(e => e.scrollHeight > e.clientHeight + 2 && getComputedStyle(e).overflowY !== "visible");
  const inp = s.querySelector('input'); const close = [...s.querySelectorAll("button")].find(x => /Close/.test(x.innerText)); const set = [...s.querySelectorAll("button")].find(x => /Set deadline/.test(x.innerText));
  const r = e => { const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; };
  return { scrollers: sc.map(e => e.className.toString().slice(0, 60) + " " + e.scrollHeight + "/" + e.clientHeight), input: inp && r(inp), close: close && r(close), set: set && r(set), inpType: inp?.type };
});
console.log(JSON.stringify(info));
await p.evaluate(() => { const s = document.querySelector('[aria-label="More schedule actions"]:not(button)'); [s, ...s.querySelectorAll("*")].forEach(e => e.scrollTop = 99999); });
await p.waitForTimeout(400);
const info2 = await p.evaluate(() => { const s = document.querySelector('[aria-label="More schedule actions"]:not(button)'); const inp = s.querySelector('input'); const close = [...s.querySelectorAll("button")].find(x => /Close/.test(x.innerText)); const set = [...s.querySelectorAll("button")].find(x => /Set deadline/.test(x.innerText)); const r = e => { const q = e.getBoundingClientRect(); return [Math.round(q.top), Math.round(q.bottom)]; }; const cx = inp.getBoundingClientRect(); const hit = document.elementFromPoint(cx.left + cx.width / 2, cx.top + cx.height / 2); return { input: r(inp), close: r(close), set: r(set), hitIsInput: hit === inp, hit: hit?.tagName + " " + (hit?.innerText || "").slice(0, 20) }; });
console.log("after scroll", JSON.stringify(info2));
await shot(p, `sched-more-scrolled-${w}x${h}`);
dump(log); await b.close();
