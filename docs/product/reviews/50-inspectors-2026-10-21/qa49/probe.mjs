import { open, S } from "../../tools/common.mjs";
const BASE = "http://127.0.0.1:59682", SH = `${S}/review50/shots`;
const id = "47a142df-be09-4569-a8bf-7cccbd12f56f";
const W = async (p, r) => { await p.goto(BASE + r, { waitUntil: "networkidle", timeout: 60000 }); await p.waitForTimeout(1200); };
// desktop
{ const { b, p } = await open("AUDIT-E", 1440);
  for (const r of ["/app/updates", `/app/updates/${id}`, "/app/notifications", "/app/profile", "/app/my-pay"]) {
    await W(p, r);
    console.log(r.slice(0,20), JSON.stringify(await p.evaluate(() => { const band = document.querySelector(".nv-pageband, .nv-masthead, header[class*=band]"); const m = document.querySelector("main"); const rc = e => e ? (r => `${Math.round(r.left)}-${Math.round(r.right)} w${Math.round(r.width)} t${Math.round(r.top)}`)(e.getBoundingClientRect()) : null; return { band: rc(band), bandCls: band?.className.slice(0,60), firstCard: rc(document.querySelector("main section, main article, main .premium-card")) }; })));
  }
  await W(p, "/app/notifications");
  console.log("notif times", JSON.stringify(await p.evaluate(() => [...document.querySelectorAll("main time, main [class*=time]")].filter(e=>e.offsetParent).slice(0,6).map(e => `${e.textContent.trim().slice(0,10)}@${Math.round(e.getBoundingClientRect().left)}-${Math.round(e.getBoundingClientRect().right)}`))));
  await W(p, "/app/schedule");
  console.log("whatchanged", await p.evaluate(() => { const e = [...document.querySelectorAll("main *")].find(x => x.children.length===0 && /What changed in your schedule/.test(x.textContent)); let c = e; const chain=[]; for (let i=0;i<4&&c;i++){chain.push(`${c.tagName}.${[...c.classList].slice(0,2).join(".")}`); c=c.parentElement;} return chain.join(" < ") + " open=" + e?.closest("details")?.open; }));
  await W(p, "/app");
  const foc = [];
  for (let i = 0; i < 9; i++) { await p.keyboard.press("Tab"); foc.push(await p.evaluate(() => { const e = document.activeElement; const s = getComputedStyle(e); const r=e.getBoundingClientRect(); return `${e.tagName}"${(e.textContent||e.getAttribute("aria-label")||"").trim().slice(0,18)}" ol=${s.outlineStyle}/${s.outlineWidth}/${s.outlineColor} bs=${s.boxShadow!=="none"} vis=${r.width>0&&r.top>=0&&r.top<900}`; })); }
  console.log("TAB\n " + foc.join("\n "));
  await p.keyboard.press("Tab"); await p.screenshot({ path: `${SH}/qa49-home-focus-1440.png` });
  await b.close(); }
// phone
{ const { b, p } = await open("AUDIT-E", 390);
  await W(p, "/app/requests");
  console.log("tabstrip", JSON.stringify(await p.evaluate(() => { const t = document.querySelector("a.section-tab")?.parentElement; const s = getComputedStyle(t); return { cls: t.className, sw: t.scrollWidth, cw: t.clientWidth, ox: s.overflowX, mask: s.maskImage || s.webkitMaskImage, end: t.getAttribute("data-end") }; })));
  await W(p, "/app/schedule");
  const more = p.locator(".mobile-nav >> text=More").first();
  if (await more.count()) { await more.click(); await p.waitForTimeout(900); await p.screenshot({ path: `${SH}/qa49-more-sheet-390.png` });
    console.log("more", JSON.stringify(await p.evaluate(() => { const d = [...document.querySelectorAll("dialog[open], [role=dialog], [role=menu]")].map(e => `${e.tagName}.${e.className.slice(0,50)} cm=${!!e.closest("[data-nv-clean]")}`); return d; })));
    await p.keyboard.press("Escape"); await p.waitForTimeout(400); }
  const so = p.getByRole("button", { name: /Shift options/ }).first();
  if (await so.count()) { await so.scrollIntoViewIfNeeded(); await so.click(); await p.waitForTimeout(900); await p.screenshot({ path: `${SH}/qa49-shift-options-390.png` }); await p.keyboard.press("Escape"); }
  await b.close(); }
// reduced motion
{ const { b, c, p } = await open("AUDIT-E", 390); await p.emulateMedia({ reducedMotion: "reduce" });
  for (const r of ["/app", "/app/updates", "/app/exchange"]) { await W(p, r); console.log("RM", r, await p.evaluate(() => [...document.querySelectorAll("body *")].filter(e => { const s = getComputedStyle(e); return (s.animationName !== "none" && parseFloat(s.animationDuration) > 0.02) ; }).slice(0,5).map(e => `${e.tagName}.${[...e.classList].slice(0,2).join(".")}:${getComputedStyle(e).animationName}/${getComputedStyle(e).animationDuration}`).join(", ") || "none")); }
  await b.close(); }
