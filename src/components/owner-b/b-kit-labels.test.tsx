// Phase 9 (Nov 18, 2026): one status label, one inline count, one note anatomy, one glyph per meaning.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "@rstest/core";
import { BCallout, BCard, BChip, BCount, BEmail, BGlyph, BIcon, BList, BLive, BRow, BStatusText, BSwapNames, type BMeaning, type BTone } from "./b-kit";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const sheet = readFileSync(join(__dirname, "owner-b.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const foundation = readFileSync(join(__dirname, "../../app/app/b-foundation.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const svgOf = (markup: string) => markup.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? "";

describe("BChip", () => {
  it("keeps the markup pages already render when it has no dot and no glyph", () => {
    expect(html(<BChip tone="green">Clocked in</BChip>)).toBe('<span class="b-chip b-chip--green">Clocked in</span>');
    expect(html(<BChip>Draft</BChip>)).toBe('<span class="b-chip b-chip--grey">Draft</span>');
    expect(html(<BChip tone="amber" label="Clocked in late, 2 minutes">Late · 2 min</BChip>))
      .toBe('<span class="b-chip b-chip--amber"><span aria-hidden="true">Late · 2 min</span><span class="b-sr">Clocked in late, 2 minutes</span></span>');
  });
  it("marks a live state with a dot in its tone, hidden from screen readers", () => {
    const markup = html(<BChip tone="amber" dot>Not clocked in · 49 min</BChip>);
    expect(markup).toBe('<span class="b-chip b-chip--amber" data-dot=""><span class="b-ldot" data-tone="amber" aria-hidden="true"></span>Not clocked in · 49 min</span>');
  });
  it("leads a standalone red chip with WarningCircle and a green one with Check", () => {
    const stop = html(<BChip tone="red" icon="stop">Stops payroll</BChip>);
    const check = html(<BChip tone="green" icon="check">Published</BChip>);
    expect(stop).toContain('data-icon="stop"');
    expect(check).toContain('data-icon="check"');
    expect(svgOf(stop)).toBe(svgOf(html(<BGlyph meaning="stop" />)));
    expect(svgOf(check)).toBe(svgOf(html(<BGlyph meaning="done" />)));
    expect(stop).toMatch(/<svg[^>]*aria-hidden="true"/);
  });
});

describe("BStatusText and BCount", () => {
  it("says the normal state as quiet text, with an optional live dot", () => {
    expect(html(<BStatusText>Off today</BStatusText>)).toBe('<span class="b-status">Off today</span>');
    expect(html(<BStatusText dot="green">Clocked in</BStatusText>))
      .toBe('<span class="b-status" data-dot="green"><span class="b-ldot" data-tone="green" aria-hidden="true"></span>Clocked in</span>');
  });
  it("draws one count, teal unless it waits on the reader", () => {
    expect(html(<BCount>11</BCount>)).toBe('<span class="b-count">11</span>');
    expect(html(<BCount tone="amber" label="2 need your answer">2</BCount>))
      .toBe('<span class="b-count" data-tone="amber"><span aria-hidden="true">2</span><span class="b-sr">2 need your answer</span></span>');
  });
  it("keeps BCard's count markup (the same pill)", () => {
    expect(html(<BCard title="Things to do" count="At least 7" />)).toContain('Things to do<span class="b-pill">At least 7</span>');
  });
});

describe("BCallout", () => {
  const tones: BTone[] = ["teal", "amber", "red", "green", "grey"];
  it("draws the tone's own glyph, bare, beside a 600 title and the body", () => {
    const glyphs = tones.map(tone => svgOf(html(<BCallout tone={tone} title="Title">Body</BCallout>)));
    expect(new Set(glyphs).size).toBe(5);
    const note = html(<BCallout tone="teal" title="Este documento está solo en inglés">Si necesitas ayuda, escribe a <a href="mailto:support@thevelani.com"><BEmail address="support@thevelani.com" /></a>.</BCallout>);
    expect(note).toMatch(/^<div class="b-callout" data-tone="teal"><span class="b-callout__ic" aria-hidden="true"><svg/);
    expect(note).toContain('<p class="b-callout__t">Este documento está solo en inglés</p><div class="b-callout__b">Si necesitas ayuda, escribe a <a href="mailto:support@thevelani.com">support@<wbr/>thevelani.com</a>.</div>');
    expect(note).not.toContain("role=");
  });
  it("takes one glyph per meaning, and the triangle is amber's check, the circle red's stop", () => {
    const meanings: BMeaning[] = ["info", "privacy", "wait", "check", "unknown", "offline", "stop", "done", "locked", "empty"];
    expect(new Set(meanings.map(meaning => svgOf(html(<BGlyph meaning={meaning} />)))).size).toBe(meanings.length);
    expect(svgOf(html(<BCallout tone="amber">x</BCallout>))).toBe(svgOf(html(<BGlyph meaning="check" solid />)));
    expect(svgOf(html(<BCallout tone="red">x</BCallout>))).toBe(svgOf(html(<BGlyph meaning="stop" solid />)));
    expect(svgOf(html(<BCallout tone="teal" icon="privacy">x</BCallout>))).toBe(svgOf(html(<BGlyph meaning="privacy" solid />)));
    expect(svgOf(html(<BCallout tone="amber" icon="unknown">x</BCallout>))).toBe(svgOf(html(<BGlyph meaning="unknown" solid />)));
  });
  it("leaves the title out when there is none and draws at most one quiet action", () => {
    const linked = html(<BCallout tone="amber" icon="unknown" title="Not confirmed yet" action={{ label: "Check if it saved", href: "/app/payroll/import" }}>We don’t know if the import saved.</BCallout>);
    expect(linked).toContain('<a class="b-callout__a" href="/app/payroll/import">Check if it saved</a>');
    const pressed = html(<BCallout tone="grey" action={{ label: "Ask your Owner", onClick: () => undefined }}>Set by your Owner.</BCallout>);
    expect(pressed).not.toContain("b-callout__t");
    expect(pressed).toContain('<button type="button" class="b-callout__a">Ask your Owner</button>');
    const own = html(<BCallout tone="teal" action={<button type="submit">Try again</button>}>Body</BCallout>);
    expect(own).toContain('<div class="b-callout__act"><button type="submit">Try again</button></div>');
  });
  it("can announce itself when it appears after an action", () => {
    expect(html(<BCallout tone="green" role="status" title="Scheduling rules saved" />)).toContain('data-tone="green" role="status"');
  });
});

describe("Icons and rows", () => {
  it("BIcon keeps its 36px default markup and names the other five circles", () => {
    expect(html(<BIcon tone="grey"><i /></BIcon>)).toBe('<span class="b-ico b-ico--grey" aria-hidden="true"><i></i></span>');
    expect(html(<BIcon size={32}><i /></BIcon>)).toContain('data-size="32"');
    expect(html(<BIcon size={36}><i /></BIcon>)).not.toContain("data-size");
  });
  it("a row's chevron is 16px", () => {
    const chevron = html(<BList><BRow title="Maria" href="/app/employees/1" /></BList>).match(/<svg[^>]*class="b-chev"[^>]*>/)?.[0] ?? "";
    expect(chevron).toContain('width="16"');
    expect(chevron).toContain('height="16"');
  });
});

describe("BLive", () => {
  // Gaps G45 (Nov 23, 2026): a tile's text, as a screen reader (and axe) joins it, has a space between the label, the
  // figure and its line, and no aria-label rewrites it.
  const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/\u00a0/g, " ");
  it("names a tile by what it shows, with a space between the label and the figure", () => {
    const markup = html(<BLive label="Right now" items={[
      { label: "Not clocked in", value: 0, href: "/app/inbox#todo-not-clocked-in", dot: "warn" },
      { label: "Clocked in", value: 3, small: "/12" },
      { label: "This week", value: "32 h", meta: "Mon to Sun" },
    ]} />);
    expect(markup).not.toContain('aria-label="Not clocked in');
    // Final fixes K7: the space is screen-reader text, so a flex tile's name keeps it; a tile takes no aria-label.
    expect(markup).toContain('Not clocked in</span><span class="b-sr">\u00a0</span><span class="b-live__v">');
    expect(markup).not.toContain("aria-label=\"Clocked in");
    const tiles = [...markup.matchAll(/<li class="b-live__i">([\s\S]*?)<\/li>/g)].map(match => text(match[1]));
    expect(tiles).toEqual(["Not clocked in 0", "Clocked in 3/12", "This week 32 h Mon to Sun"]);
  });
});

describe("The stylesheet behind them", () => {
  it("a chip is 22px, 12/16 600 (in rem, so it grows with 200% text), one line, with its tone's 16% edge and a transparent outline for High Contrast", () => {
    const chip = sheet.match(/\.app-shell\[data-nv-b\] \.b-chip \{([^}]*)\}/)?.[1] ?? "";
    for (const part of ["height: max(var(--b-chip-h), 1.375rem)", "font-size: 0.75rem; line-height: 1rem; font-weight: 600", "white-space: nowrap", "inset 0 0 0 1px var(--b-chip-edge, transparent)", "outline: 1px solid transparent"]) expect(chip).toContain(part);
    // tabular figures where a figure ticks (a live chip, the quiet text, counts), not on every chip: in Inter they widen the hyphen
    expect(chip).not.toContain("tabular-nums");
    expect(sheet).toMatch(/\.b-chip\[data-dot\] \{[^}]*font-variant-numeric: tabular-nums;/);
    for (const tone of ["teal", "amber", "red", "green"]) expect(sheet).toContain(`.b-chip--${tone} { background: var(--b-${tone}-50); color: var(--b-${tone}); --b-chip-edge: var(--b-${tone}-edge); }`);
    expect(sheet).toContain(".b-chip--grey { background: var(--b-quiet); color: var(--b-ink2); --b-chip-edge: var(--b-quiet-edge); }");
    expect(sheet).toMatch(/\.b-hero \.b-chip \{ background: #FFFFFF; box-shadow: none; \}/);
  });
  it("no rule nests the shell inside the shell (a selector that can never match)", () => {
    for (const text of [sheet, foundation]) expect(text).not.toMatch(/\.app-shell\[data-nv-b\]\s+:is\(#c-root, html\)/);
  });
  it("the count is 20px, the status text 13.5/18 500 grey, the callout's edge a real border", () => {
    expect(sheet).toMatch(/:is\(\.b-pill, \.b-count\) \{[^}]*height: var\(--b-count-h\);[^}]*white-space: nowrap;/);
    expect(sheet).toMatch(/\.b-status \{[^}]*font-size: var\(--b-fs-meta\);[^}]*font-weight: 500;[^}]*color: var\(--b-grey\);/);
    expect(sheet).toMatch(/\.b-callout \{[^}]*border: 1px solid var\(--b-callout-edge/);
    expect(sheet).toMatch(/\.b-callout__ic \{[^}]*margin: 1px 0 0;/);
  });
  it("the toast is Direction B's surface and its mark is never the retired teal", () => {
    expect(foundation).toMatch(/\.nevora-toast,[\s\S]*?border-radius: var\(--b-radius-menu\) !important;[\s\S]*?box-shadow: var\(--b-elev-2\) !important;/);
    expect(foundation).not.toMatch(/077572/i);
  });
});


it("reads the Spanish swap in name order and allows a line break between family and given names", () => {
  const names = { a: "Gabriela Santos", b: "James Ortiz" };
  const spanish = html(<BSwapNames {...names} lang="es" />);
  expect(spanish).toContain("Gabriela Santos");
  expect(spanish).toContain('<span class="b-sr"> y </span>');
  expect(spanish).toContain("James Ortiz");
  expect(html(<BSwapNames {...names} b="Israel Rivera" lang="es" />)).toContain('<span class="b-sr"> e </span>');
  const english = html(<BSwapNames {...names} />);
  expect(english).toContain("Gabriela\u00a0Santos");
  expect(english).toContain('<span class="b-sr"> and </span>');
});
