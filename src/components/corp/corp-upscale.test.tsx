import { readFileSync } from "node:fs";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const nav = vi.hoisted(() => ({ pathname: "/app/schedule" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ refresh: () => undefined, push: () => undefined, replace: () => undefined }) }));

import { CORP_NO_VALUE, CorpCard, CorpEmpty, CorpEmptyRow, CorpLoadFailed, CorpPill, CorpSection, CorpSegments, CorpStats, countLabel } from "./corp";
import { CorpSkeleton } from "./corp-client";

const css = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const kit = css("./corp.css");
const employeeBridge = css("../../app/app/corp-employee-bridge.css");
const quietBridge = css("../../app/app/corp-quiet-bridge.css");
const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

describe("Nov 1 upscale: one count style", () => {
  it("writes every count as \"Label N\", the figure in the kit's count style and never in parentheses", () => {
    expect(html(<>{countLabel("Team (9)")}</>)).toBe('Team<span class="c-count c-num">9</span>');
    expect(html(<>{countLabel("Open shifts")}</>)).toBe("Open shifts");
    expect(html(<CorpCard id="t" label="Tablets (2)"><p /></CorpCard>)).toContain('id="t-label">Tablets<span class="c-count c-num">2</span></h2>');
    expect(html(<CorpCard id="w" label="Waiting" count={2}><p /></CorpCard>)).toContain('id="w-label">Waiting<span class="c-count c-num">2</span></h2>');
    expect(html(<CorpSection id="s" label="Inactive (1)"><p /></CorpSection>)).toContain('id="s-label">Inactive<span class="c-count c-num">1</span></h2>');
    const seg = html(<CorpSegments label="Filter" items={[{ key: "a", label: "Not sent (1)", current: true, onSelect: () => {} }, { key: "b", label: "Sent (2)", onSelect: () => {} }]} />);
    expect(seg).toContain('>Not sent<span class="c-count c-num">1</span></button>');
    expect(seg).not.toMatch(/\(\d+\)/);
    expect(kit).toMatch(/span\.c-count\.c-count \{[^}]*margin-left: 6px; font-size: 13px; line-height: 18px; font-weight: 600;[^}]*color: var\(--c-grey, #6B7075\)/);
  });
});

describe("Nov 1 upscale: section labels, rows and hover", () => {
  it("puts section labels on the card's edge, 8px above the card, at 13/18 500 grey", () => {
    expect(kit).toContain(":is(#c-root, html) .c-section__label { margin: 0 0 -4px; font-size: 13px; line-height: 18px; font-weight: 500;");
    expect(kit).toContain(":is(#c-root, html) .c-sec-label { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 0 -4px; }");
    expect(quietBridge).toContain(".q-grp { margin: 32px 16px 8px; font-size: 13px; line-height: 18px; font-weight: 500; color: #6B7075;");
  });
  it("draws rows 60px for two lines and 52px for one, titles 15/500 and values 15/400 grey", () => {
    expect(kit).toMatch(/\.c-row \{[^}]*min-height: 60px;/);
    expect(kit).toContain(":is(#c-root, html) .c-row--one { min-height: 52px; }");
    expect(kit).toMatch(/\.c-row__title \{[^}]*font-size: 15px; line-height: 20px; font-weight: 500;/);
    expect(kit).toMatch(/\.c-row__value \{[^}]*font-size: 15px; line-height: 20px; font-weight: 400; color: var\(--c-grey\);/);
    expect(quietBridge).toContain(".q-rt b { font-size: 15px; line-height: 20px; font-weight: 500; }");
    expect(quietBridge).toContain(".q-row { min-height: 60px;");
    // Employee rows: no 15/600 titles left (20/600 figures stay).
    expect(employeeBridge).not.toMatch(/(strong|dt) \{[^}]*font-size:15px !important; line-height:20px !important; font-weight:600 !important;/);
  });
  it("gives every clickable row one hover (#F2F4F4) and pressed fill (#EDEEEF), 120ms ease-out, none with reduced motion", () => {
    expect(kit).toContain("--c-row-hover: #F2F4F4; --c-row-press: #EDEEEF; --c-dur-row: 120ms;");
    expect(kit).toContain("transition: background-color var(--c-dur-row) ease-out;");
    expect(kit).toMatch(/:is\(a, button, label, summary\)\.c-row:hover, [^{]*\{ background: var\(--c-row-hover\); \}/);
    expect(kit).toMatch(/:is\(a, button, label, summary\)\.c-row:active, [^{]*\{ background: var\(--c-row-press\); transition: none; \}/);
    expect(kit).not.toContain("background: #F7F8F8; transition-duration");
    expect(quietBridge).toContain(".q-row:hover { background: #F2F4F4; }");
  });
});

describe("Nov 1 upscale: calm Employee statuses", () => {
  it("retires the blue tokens and draws Employee amber and blue pills as grey text", () => {
    for (const sheet of [kit, employeeBridge]) expect(sheet).not.toMatch(/#EAF0FD|#1D4ED8|--c-blue/i);
    expect(employeeBridge).toMatch(/#employee-mobile\[data-nv-corp\] \.c-pill:is\(\.c-pill--amber, \.c-pill--blue\) \{\s*height:auto; padding:0; gap:0; border-radius:0; background:none; color:#6B7075; font-size:13px; line-height:18px; font-weight:500;/);
    // The pill keeps its words and its class (a page passes the same markup); only its look changes.
    expect(html(<CorpPill tone="blue">Correction</CorpPill>)).toBe('<span class="c-pill c-pill--blue">Correction</span>');
  });
});

describe("Nov 1 upscale: one empty state and one partial-failure line", () => {
  it("draws a left-aligned card with a title, one line and a teal next step", () => {
    const out = html(<CorpEmpty title="No open shifts right now" body="When a teammate offers a shift, it shows here." link={{ href: "/app/profile/device-alerts", label: "Get alerts" }} />);
    expect(out).toContain('<span class="c-empty__title">No open shifts right now</span><span class="c-empty__body">When a teammate offers a shift, it shows here.</span>');
    expect(out).toContain('<span class="c-empty__next"><a href="/app/profile/device-alerts" class="c-link">Get alerts<svg');
    expect(kit).toMatch(/\.c-empty--card \{[^}]*align-items: flex-start;[^}]*text-align: left; \}/);
    expect(html(<CorpEmptyRow as="li">No decided requests yet</CorpEmptyRow>)).toBe('<li class="c-empty c-empty--row">No decided requests yet</li>');
    expect(kit).toMatch(/\.c-empty--row \{[^}]*min-height: 56px;[^}]*color: var\(--c-grey\);/);
  });
  it("says \"Couldn't load · Try again\" in a card header and shows an em dash for a missing figure", () => {
    const card = html(<CorpCard id="today" label="Today" failed aside={<a href="/x">Who’s working</a>}><p /></CorpCard>);
    expect(card).toContain('<div class="c-card__aside"><span class="c-fail"><span class="c-fail__text" role="status">Couldn’t load</span><span class="c-fail__dot" aria-hidden="true">·</span><button type="button" class="c-link c-fail__retry">Try again</button></span></div>');
    expect(card).not.toContain("Who’s working");
    expect(html(<CorpLoadFailed busy />)).toContain('aria-disabled="true">Trying…</button>');
    const stats = html(<CorpStats items={[{ label: "Missed", value: "…" }, { label: "Late", value: null }, { label: "Open", value: 3 }]} />);
    expect(stats.match(/<dd class="c-stat__value c-stat__value--none">—<\/dd>/g)).toHaveLength(2);
    expect(stats).toContain('<dd class="c-stat__value">3</dd>');
    expect(CORP_NO_VALUE).toBe("—");
    expect(kit).toContain(".c-stat__value.c-stat__value--none { color: var(--c-faint); font-weight: 500; }");
  });
});

describe("Nov 1 upscale: loading placeholders shaped like each page", () => {
  it("draws the page's own title and each role's shape for a route both roles open", () => {
    nav.pathname = "/app/schedule";
    const out = html(<CorpSkeleton route="schedule" label="schedule" />);
    expect(out).toContain('class="c-skel__v c-skel__v--owner"');
    expect(out).toContain('class="c-skel__v c-skel__v--employee"');
    expect(out.match(/<span class="c-skel__title">Schedule<\/span>/g)).toHaveLength(2);
    expect(out).toContain('class="c-skel__strip"');
    expect(kit).toContain(":is(#c-root, html) #employee-mobile .c-skel__v--employee { display: flex; }");
  });
  for (const [route, owner, employee] of [["home", null, null], ["timecards", "Timecards", "Time"], ["payroll", "Payroll", null], ["mypay", null, "Pay"], ["review", "Time off", "Time off"], ["hub", null, "Requests"], ["mytime", null, "Time"], ["inbox", "Things to do", null]] as const) {
    it(`covers ${route}`, () => {
      const out = html(<CorpSkeleton route={route} label={route} />);
      if (owner) expect(out).toContain(`<span class="c-skel__title">${owner}</span>`);
      if (employee) expect(out).toContain(`<span class="c-skel__title">${employee}</span>`);
      // Home's greeting is personal: a title-shaped bar until the person has seen it once.
      if (!owner && !employee) expect(out).toContain('class="c-skel__titlebar"');
      expect(out).toContain('class="c-skel__shapes"');
      expect(out).toContain('aria-hidden="true"');
    });
  }
  it("uses 13px and 20px bars in #EDEEEF at radius 4, a shimmer only with motion, and a 150ms arrival", () => {
    expect(kit).toContain(".c-skel__bar { display: inline-block; flex: none; max-width: 100%; height: 13px; border-radius: 4px; background: var(--c-neutral-bg);");
    expect(kit).toContain(":is(#c-root, html) .c-skel__bar--20 { height: 20px; }");
    expect(kit).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*:is\(#c-root, html\) \.c-skel__shapes \{ animation-duration: 1ms; \}\s*:is\(#c-root, html\) \.c-skel__card::after \{ display: none; animation: none; \}/);
    expect(kit).toMatch(/@keyframes c-skel-shimmer \{ from \{ transform: translateX\(-100%\); \} to \{ transform: translateX\(100%\); \} \}/);
    expect(kit).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*html\[data-c-arrived\] main\.page-frame > [^{]*\{ animation: c-arrive 150ms ease-out both; \}/);
    expect(kit).toContain("@keyframes c-arrive { from { opacity: 0; } to { opacity: 1; } }");
  });
});
