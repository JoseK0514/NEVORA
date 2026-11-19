// Phase 7 (package C): loading. Every placeholder in the table still draws its page's shape, the one shimmer comes from the
// shared placeholder and never from a page, there is one spinner keyframe, and a busy button keeps its width and its words.
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
rs.mock("./owner-b.css", () => ({}));

import { BBusyLabel, BButton, BLoadingScreen, BSpin, BState, type BLoadingShape } from "./b-kit";
import { B_LOADING_TABLE, BRouteLoading, loadingShape } from "./b-loading";

const src = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(join(src, path), "utf8");
const strip = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const shimmer = strip(read("app/app/b-shimmer.css"));
const count = (html: string, text: string) => html.split(text).length - 1;
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path, out); else out.push(path); }
  return out;
};

/* An address for each pattern in the table, so a pattern without one fails here instead of going unchecked. */
const SAMPLES: Record<string, string> = {
  "^\\/app\\/schedule\\/.+": "/app/schedule/coverage",
  "^\\/app\\/payroll\\/.+": "/app/payroll/runs/1",
  "^\\/app\\/employees\\/[^/]+\\/restrictions$": "/app/employees/E1/restrictions",
  "^\\/app\\/employees\\/[^/]+\\/pay$": "/app/employees/E1/pay",
  "^\\/app\\/employees\\/[^/]+\\/clocker-pin$": "/app/employees/E1/clocker-pin",
  "^\\/app\\/employees\\/.+": "/app/employees/E1",
  "^\\/app\\/updates\\/.+": "/app/updates/7",
  "^\\/app\\/settings\\/.+": "/app/settings/positions",
  "^\\/app\\/exchange\\/.+": "/app/exchange/swap",
  "^\\/app\\/profile\\/.+": "/app/profile/alerts",
};
const rows = (["management", "employee"] as const).flatMap(shell => B_LOADING_TABLE[shell].map(([match, shape]) => {
  const path = typeof match === "string" ? match : SAMPLES[match.source];
  return [shell, typeof match === "string" ? match : String(match), path, shape] as [string, string, string | undefined, BLoadingShape];
}));

describe("every entry in the loading table still draws its page's shape", () => {
  it("has entries for both shells, the newer routes included", () => {
    expect(B_LOADING_TABLE.management.length).toBeGreaterThanOrEqual(44);
    expect(B_LOADING_TABLE.employee.length).toBeGreaterThanOrEqual(18);
    // Nov 17 and Phase 6 routes.
    for (const path of ["/app/payroll/import", "/app/payroll-export/paid-time", "/app/employees/E1/restrictions", "/app/employees/E1/clocker-pin", "/app/settings/clocker", "/app/settings/clocker/pins", "/app/settings/clocker/photos", "/app/settings/clocker/photos/review", "/app/clocker-recovery"])
      expect(loadingShape(path, false).cards?.length, path).toBeGreaterThan(0);
    expect(loadingShape("/app/availability/agreement", true).title).toBe("Agreed times");
  });
  it.each(rows)("%s %s", (shell, _name, path, shape) => {
    expect(path, "add a sample address for this pattern").toBeTruthy();
    // The table finds this entry (or an earlier, more specific one) for its own address.
    const found = loadingShape(path!, shell === "employee");
    expect(found.cards?.length ?? 0).toBeGreaterThan(0);
    const html = renderToStaticMarkup(<BLoadingScreen {...shape} />);
    expect(html).toContain('data-b-load=""');
    // The band rung, the frame and whether the first card lifts.
    if (typeof shape.band === "string") expect(html).toContain(`data-b-band="${shape.band}"`);
    else if (typeof shape.band === "number") expect(html).toContain(`data-b-band="own" style="--b-band-own:${shape.band}px"`);
    else expect(html).not.toContain("data-b-band");
    expect(html).toContain(`data-b-frame="${shape.frame ?? "rail"}"`);
    expect(html.includes('data-b-lift=""')).toBe(shape.lift !== false);
    expect(html.includes('data-b-under=""')).toBe(shape.lift === false);
    // The band's parts: back row, title (the word, or a bar), sub-line, action, strip or figures.
    expect(count(html, "b-skel--back")).toBe(shape.back ? 1 : 0);
    if (shape.title) expect(html).toContain(`<h1>${shape.title}<span class="b-sr"> Loading…</span></h1>`);
    else expect(html).toContain('<h1><span class="b-skel b-skel--title" aria-hidden="true"></span><span class="b-sr">Loading…</span></h1>');
    expect(count(html, "b-skel--sub")).toBe(shape.sub ? 1 : 0);
    expect(count(html, "b-skel--action")).toBe(shape.action ? 1 : 0);
    expect(count(html, "b-skel--strip")).toBe(shape.strip === true ? 1 : 0);
    expect(count(html, "b-skel--figures")).toBe(shape.strip === "figures" ? 1 : 0);
    // The cards: how many, which sit in the rail, and their rows, lines and figures.
    const cards = shape.cards ?? [];
    expect(count(html, '<section class="b-card"')).toBe(cards.length);
    expect(count(html, 'data-b-rail=""')).toBe(cards.filter(card => card.rail).length);
    expect(count(html, 'class="b-skel-row"')).toBe(cards.reduce((sum, card) => sum + (card.rows ?? 0), 0));
    expect(count(html, "b-skel--head")).toBe(cards.filter(card => card.head).length);
    expect(count(html, "b-skel--av")).toBe(cards.reduce((sum, card) => sum + (card.avatar ? card.rows ?? 0 : 0), 0));
    expect(count(html, "b-skel--figure\"")).toBe(cards.reduce((sum, card) => sum + (card.stats ?? 0), 0));
    // Placeholders are never read aloud twice and never take focus.
    expect(count(html, "Loading…")).toBe(1);
    expect(html).not.toMatch(/<a |<button/);
  });
});

describe("one shimmer, from the shared placeholder", () => {
  it("every block the placeholder draws is a .b-skel inside [data-b-load], which is what the sheet keys on", () => {
    const html = renderToStaticMarkup(<BLoadingScreen {...loadingShape("/app/inbox", false)} />);
    expect(html).toContain('data-b-load=""');
    // Nothing in the markup asks for motion: no shimmer class, no inline animation.
    expect(html).not.toMatch(/shimmer|animation|b-shim/);
    expect(count(html, 'class="b-skel')).toBeGreaterThan(10);
    expect(shimmer).toMatch(/\.b-screen\[data-b-load\] \.b-skel, [^{]*\)::after \{[^}]*animation: b-shimmer var\(--b-dur-shimmer\) linear var\(--b-delay-shimmer\) infinite;/);
  });
  it("no page, loading file or table entry applies it: only the sheet names the shimmer", () => {
    const files = walk(src).filter(path => /\.(tsx?|css)$/.test(path) && !/\.test\.tsx?$/.test(path));
    const naming = files.filter(path => /b-shimmer(?!\.css)|--b-shimmer/.test(readFileSync(path, "utf8"))).map(path => path.slice(src.length + 1));
    expect(naming.sort()).toEqual(["app/app/b-shimmer.css"]);
    // The table and the kit placeholder carry no animation of their own.
    expect(read("components/owner-b/b-loading.tsx")).not.toMatch(/animation|shimmer"/);
  });
  it("is one keyframe that moves a pseudo-element by transform only, slowly, after a wait", () => {
    expect([...shimmer.matchAll(/@keyframes ([\w-]+)/g)].map(match => match[1])).toEqual(["b-shimmer", "b-arrive"]);
    expect(shimmer).toContain("@keyframes b-shimmer { from { transform: translateX(-100%); } to { transform: translateX(var(--b-shimmer-span)); } }");
    expect(readFileSync(join(process.cwd(), 'src/app/b-tokens.css'), 'utf8')).toMatch(/--b-dur-shimmer: 1600ms; --b-delay-shimmer: 300ms; --b-dur-spin: 800ms;/);
    // Before the wait is over the band sits outside its block.
    expect(shimmer).toMatch(/::after \{[^}]*transform: translateX\(-100%\); animation: b-shimmer/);
    expect(shimmer).not.toMatch(/background-position|transition: all|filter|blur/);
  });
  it("runs only when motion is allowed: with reduced motion the band is not drawn at all", () => {
    // Every animation declaration and the pseudo-element itself sit inside a no-preference block.
    const outside = shimmer.replace(/@media \(prefers-reduced-motion: no-preference\) \{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g, "");
    expect(outside).not.toMatch(/animation|::after|@keyframes/);
    expect(shimmer).not.toMatch(/prefers-reduced-motion: reduce/);
  });
  it("tints the band's blocks with the glass edge, not white", () => {
    expect(shimmer).toContain(".b-screen[data-b-load] .b-hero .b-skel::after { background: linear-gradient(90deg, transparent, var(--b-glass-edge) 50%, transparent); }");
  });
  it("hands over without a blink: the page's frame appears at once and only the cards' contents fade, opacity only", () => {
    expect(shimmer).toContain("html[data-c-arrived] .app-shell[data-nv-b] main.page-frame > :not(.route-skeleton):not(.section-tabs) { animation: none; }");
    const arrived = ":is(html[data-c-arrived] .b-screen, .b-screen[data-b-arrived])";
    expect(shimmer).toContain(`main.page-frame ${arrived}:not([data-b-load]) > .b-stack .b-card > * { animation: b-arrive var(--b-dur-hover) var(--b-ease-out) both; }`);
    expect(shimmer).toContain("@keyframes b-arrive { from { opacity: 0; } to { opacity: 1; } }");
    // The page's usual rise is skipped at that moment, Home's columns included.
    expect(shimmer).toContain(`main.page-frame :is(${arrived} :is(.b-hero > .b-title, .b-stack > *), .c-page:has(> ${arrived}) > :is(.eb-fix, .b-keep), .c-page.eb-host:has(> ${arrived}) ~ .b-keep) { animation: none !important; }`);
    expect(shimmer).toContain(`.c-page.c-home > ${arrived} .b-home-col > :not(#b-home-on)`);
    // As it leaves, the placeholder marks the moment on <html>, and before that mark comes off the screens that arrived
    // are marked themselves. The screen's own mark is never removed: a rule that stopped matching would start the rise late.
    const loading = read("components/owner-b/b-loading.tsx");
    expect(loading).toMatch(/root\.setAttribute\("data-c-arrived", ""\);\s*window\.setTimeout\(\(\) => \{ for \(const screen of document\.querySelectorAll\("main\.page-frame \.b-screen"\)\) screen\.setAttribute\("data-b-arrived", ""\); \}, 150\);\s*window\.setTimeout\(\(\) => root\.removeAttribute\("data-c-arrived"\), 250\);/);
    expect(loading).not.toContain('removeAttribute("data-b-arrived")');
  });
  it("every route's loading file draws the one placeholder: no page keeps an older one", () => {
    const loading = walk(join(src, "app", "app")).filter(path => path.endsWith("/loading.tsx")).map(path => [path.slice(src.length + 1), readFileSync(path, "utf8")] as const);
    expect(loading.length).toBeGreaterThanOrEqual(52);
    // Home's takes the destination's shape (RootLoading), a sheet keeps a sheet-shaped one; every other file is RouteSkeleton.
    const other = loading.filter(([, text]) => !/<RouteSkeleton /.test(text)).map(([path]) => path).sort();
    expect(other).toEqual(["app/app/@sheet/(.)exchange/loading.tsx", "app/app/loading.tsx"]);
    expect(read("app/app/root-loading.tsx")).toContain("<RouteSkeleton ");
    // The older Settings placeholder (Wave C) is gone: it drew no band on a phone.
    expect(walk(join(src, "app", "app", "settings")).filter(path => /wave-c-.*loading\.tsx$/.test(path))).toEqual([]);
  });
  it("a placeholder says which address it stands in for, so one page's phone band can be set from the sheet", () => {
    const html = renderToStaticMarkup(<BRouteLoading pathname="/app/schedule" />);
    expect(count(html, 'data-b-for="/app/schedule"')).toBe(2);
    expect(shimmer).toContain('.b-screen[data-b-load][data-b-shell="management"][data-b-for="/app/schedule"] { --b-ph-band: 503px; }');
    expect(shimmer).toContain('.b-screen[data-b-load][data-b-shell="management"][data-b-for="/app/timecards"] { --b-ph-band: 358px; }');
    expect(shimmer).toContain('.b-screen[data-b-load][data-b-shell="management"][data-b-for="/app/inbox"] { --b-ph-band: 251px; }');
    expect(shimmer).toMatch(/\[data-b-shell="employee"\]\[data-b-for="\/app\/more"\] \.b-hero \.b-skel--strip \{ height: 132px;/);
  });
});

describe("one spinner", () => {
  const sheets = walk(src).filter(path => path.endsWith(".css"));
  const keyframes = sheets.flatMap(path => [...strip(readFileSync(path, "utf8")).matchAll(/@keyframes ([\w-]*[sS]pin[\w-]*)/g)].map(match => `${path.slice(src.length + 1)}:${match[1]}`));
  it("turns on one keyframe; the Clocker keeps its own", () => {
    expect(keyframes.sort()).toEqual(["components/clocker.module.css:ckSpin", "components/signature/components.css:b-spin"]);
  });
  it("is drawn in the current text colour and only turns when motion is allowed", () => {
    const root = strip(read("components/signature/components.css")), foundation = strip(read("app/app/b-foundation.css"));
    expect(root).toMatch(/\.sig-btn__spin \{[^}]*border: 2px solid currentColor; border-right-color: transparent; \}/);
    expect(root).toContain("@media (prefers-reduced-motion: no-preference) { .sig-btn__spin { animation: b-spin 800ms linear infinite; } }");
    expect(foundation).toMatch(/\.b-spin \{[^}]*border: 2\.5px solid currentColor; border-right-color: transparent; \}/);
    expect(foundation).toContain("@media (prefers-reduced-motion: no-preference) { :is(#c-root, html) body .app-shell[data-nv-b] .b-spin { animation: b-spin var(--b-dur-spin, 800ms) linear infinite; } }");
    for (const text of [root, foundation, shimmer]) expect(text).not.toMatch(/prefers-reduced-motion: reduce\) \{[^}]*spin/);
  });
  it("has two sizes: 20px in a state card and 16px beside words", () => {
    expect(renderToStaticMarkup(<BSpin />)).toBe('<span class="b-spin" aria-hidden="true"></span>');
    expect(renderToStaticMarkup(<BSpin small />)).toBe('<span class="b-spin b-spin--sm" aria-hidden="true"></span>');
    expect(shimmer).toMatch(/\.b-spin--sm \{ width: 16px; height: 16px; border-width: 2px; flex: none; \}/);
  });
  it("is never alone: the loading state card says what is happening and is announced", () => {
    const html = renderToStaticMarkup(<BState kind="loading" title="Sending your file" line="Keep this page open." />);
    expect(html).toContain('role="status" aria-busy="true"');
    expect(html).toContain('<span class="b-spin" aria-hidden="true"></span>');
    expect(html).toContain("Sending your file");
  });
});

describe("a busy button", () => {
  const open = (html: string) => html.slice(0, html.indexOf(">") + 1);
  it("idle: the label shows, the busy words are in the same cell, hidden and unread, with the spinner's place kept", () => {
    const html = renderToStaticMarkup(<BButton busy={false} busyLabel="Saving…">Save</BButton>);
    expect(open(html)).not.toContain("aria-busy");
    expect(open(html)).not.toContain("disabled");
    expect(html).toContain('<span class="b-busy"><span class="b-busy__idle">Save</span><span class="b-busy__on" data-b-off="" aria-hidden="true"><span class="b-spin-slot" aria-hidden="true"></span>Saving…</span></span>');
    expect(html).not.toContain('class="b-spin b-spin--sm"');
  });
  it("busy: aria-busy, no second press, the busy words and the spinner show, and the label is still there to hold the width", () => {
    const html = renderToStaticMarkup(<BButton busy busyLabel="Saving…">Save</BButton>);
    expect(open(html)).toContain('aria-busy="true"');
    expect(open(html)).toContain('disabled=""');
    expect(html).toContain('<span class="b-busy__idle" data-b-off="">Save</span>');
    expect(html).toContain('<span class="b-busy__on"><span class="b-spin b-spin--sm" aria-hidden="true"></span>Saving…</span>');
  });
  it("has the same markup shape idle and busy, so its width cannot change", () => {
    const shape = (html: string) => html.replace(/ (data-b-off|aria-hidden|aria-busy|disabled)="[^"]*"/g, "").replace(/b-spin b-spin--sm|b-spin-slot/g, "SPIN");
    expect(shape(renderToStaticMarkup(<BButton busy busyLabel="Saving…">Save</BButton>))).toBe(shape(renderToStaticMarkup(<BButton busy={false} busyLabel="Saving…">Save</BButton>)));
    // Both labels share one grid cell and the hidden one keeps its box; the spinner and its empty place are both 16px.
    expect(shimmer).toMatch(/\.b-busy \{ display: inline-grid;/);
    expect(shimmer).toMatch(/\.b-busy > \* \{ grid-area: 1 \/ 1;/);
    expect(shimmer).toMatch(/\.b-busy > \[data-b-off\] \{ visibility: hidden; \}/);
    expect(shimmer).toMatch(/\.b-spin-slot \{ display: block; flex: none; width: 16px; height: 16px; \}/);
  });
  it("without busy words it keeps its own label beside the spinner", () => {
    expect(renderToStaticMarkup(<BBusyLabel busy>Approve</BBusyLabel>)).toContain('<span class="b-busy__on"><span class="b-spin b-spin--sm" aria-hidden="true"></span>Approve</span>');
  });
  it("a button that never waits is unchanged", () => {
    expect(renderToStaticMarkup(<BButton>Save</BButton>)).toBe('<button class="b-btn b-btn--teal" type="button">Save</button>');
  });
  it("the state card's retry keeps its label's place while it checks", () => {
    const idle = renderToStaticMarkup(<BState kind="failed" title="Couldn’t load" action={{ label: "Try again", onClick: () => {}, busy: false }} />);
    const busy = renderToStaticMarkup(<BState kind="failed" title="Couldn’t load" action={{ label: "Try again", onClick: () => {}, busy: true }} />);
    expect(idle).toContain('<span class="b-busy__idle">Try again</span>');
    // The kit's default busy words are English, so they are written only while busy: an idle card holds no stray word.
    expect(idle).not.toContain("Checking…");
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('<span class="b-busy__on"><span class="b-spin b-spin--sm" aria-hidden="true"></span>Checking…</span>');
    // A card whose retry never reports busy draws the plain button.
    expect(renderToStaticMarkup(<BState kind="failed" title="Couldn’t load" action={{ label: "Try again", onClick: () => {} }} />)).toContain(">Try again</button>");
  });
});
