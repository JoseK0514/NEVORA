import { open, BASE } from "../../tools/common.mjs";
const pages = [["home","/app"],["schedule","/app/schedule"],["timecards","/app/timecards"],["team","/app/employees"],["inbox","/app/inbox?filter=requests"],["timeoff","/app/requests"],["exchange","/app/exchange"],["payroll","/app/payroll"],["availability","/app/availability"],["person","/app/employees/AUDIT-LONG"]];
for (const w of [1440, 390, 320]) {
  const { b, p } = await open("QAOWNER", w);
  for (const [key, path] of pages) {
    await p.goto(BASE + path, { waitUntil: "networkidle" }).catch(()=>{});
    await p.waitForTimeout(1200);
    const r = await p.evaluate(() => {
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n; while ((n = walker.nextNode())) {
        if (!/With A Long Name/.test(n.textContent)) continue;
        let el = n.parentElement; const cs = getComputedStyle(el);
        if (el.closest(".sr-only,.nv-sr,[hidden]")) continue;
        const rect = el.getBoundingClientRect(); if (!rect.width) continue;
        // find nearest clipping ancestor
        let clip = el, truncated = false;
        for (let a = el; a && a !== document.body; a = a.parentElement) { if (a.scrollWidth > a.clientWidth + 1 && getComputedStyle(a).overflowX !== "visible") { truncated = true; clip = a; break; } }
        out.push({ tag: el.tagName, cls: el.className.toString().slice(0,40), w: Math.round(rect.width), h: Math.round(rect.height), lines: Math.round(rect.height / parseFloat(cs.lineHeight || 20)), truncated, ellipsis: getComputedStyle(clip).textOverflow, title: !!el.closest("[title]"), right: Math.round(rect.right) });
      }
      return { out, docW: document.documentElement.scrollWidth };
    });
    console.log(w, key, "docW", r.docW, JSON.stringify(r.out));
  }
  await b.close();
}
