import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ActionBar, Button, Card, Duration, FilterPills, Freshness, Masthead, Money,
  NextUp, Progress, Row, Rows, StatGrid, Status,
} from "./kit";

const css = readFileSync("src/components/kit/kit.css", "utf8");

describe("kit tokens", () => {
  it("reads company brand keys before falling back to NEVORA teal", () => {
    expect(css).toContain("--nv-accent: var(--g-accent, #077572)");
    expect(css).toContain("--nv-masthead: var(--g-masthead, #1C4A47)");
    expect(css).toContain("--nv-accent-hover: var(--g-accent-hover, #055C5A)");
  });

  it("keeps phone type at the 15px floor except tab labels and number badges", () => {
    const phoneRoot = css.slice(css.indexOf(":root {"), css.indexOf("@media (min-width: 768px)"));
    const sizes = [...phoneRoot.matchAll(/--nv-t-([a-z0-9-]+): \d+ ([\d.]+)rem/g)].map(([, role, rem]) => [role, Number(rem) * 16] as const);
    expect(sizes.length).toBeGreaterThanOrEqual(9);
    for (const [role, px] of sizes) {
      if (role === "tab" || role === "badge") continue;
      expect(px, role).toBeGreaterThanOrEqual(15);
    }
  });

  it("uses only the agreed radii, one muted grey and teal-tinted shadows", () => {
    expect(css).toMatch(/--nv-r-card: 20px; --nv-r-control: 12px; --nv-r-inner: 8px; --nv-r-pill: 999px/);
    expect(css).toContain("--nv-muted: #5F666A");
    expect(css).not.toMatch(/rgba\(0, ?0, ?0/);
  });

  it("does not restyle existing classes", () => {
    const selectors = css.replace(/\/\*[^]*?\*\//g, "").match(/(^|\})\s*([^{}@]+)\{/g) ?? [];
    for (const raw of selectors) {
      const selector = raw.replace(/^\}?\s*/, "").replace(/\{$/, "").trim();
      if (selector === ":root" || /^(from|to|\d+%)/.test(selector)) continue;
      for (const part of selector.split(",")) expect(part.trim(), selector).toMatch(/^[a-z]*\.nv-/);
    }
  });

  it("removes motion when the reader asks for less", () => {
    expect(css).toMatch(/prefers-reduced-motion: reduce[^]*transition-duration: 0ms/);
  });
});

describe("kit components", () => {
  it("renders one h1 in the band with eyebrow, summary and a white wordmark", () => {
    const html = renderToStaticMarkup(<Masthead eyebrow="Saturday, Oct 18" title="Good morning, Morgan" summary="2 things need you." product="Manager" />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("nv-masthead__eyebrow");
    expect(html).toContain('aria-label="NEVORA"');
    expect(html).toContain("nv-masthead__mark");
  });

  it("names where Back goes and drops the wordmark there", () => {
    const html = renderToStaticMarkup(<Masthead back={{ href: "/app/inbox", label: "Inbox" }} title="Time off" />);
    expect(html).toMatch(/<a class="nv-masthead__back" href="\/app\/inbox">[^]*Inbox<\/a>/);
    expect(html).not.toContain('aria-label="NEVORA"');
  });

  it("pairs every status colour with a glyph and a word", () => {
    for (const tone of ["neutral", "review", "done", "urgent"] as const) {
      const html = renderToStaticMarkup(<Status tone={tone}>Published</Status>);
      expect(html).toContain(`data-tone="${tone}"`);
      expect(html).toContain("<svg");
      expect(html).toContain("Published");
    }
  });

  it("shows a chevron only on rows that go somewhere", () => {
    const html = renderToStaticMarkup(
      <Rows label="Today"><Row title="Alexandra Rivera" href="/app/requests" /><Row title="Coverage" meta="All day" /></Rows>,
    );
    expect(html.match(/nv-row__chev/g)).toHaveLength(1);
    expect(html).toContain('<ul class="nv-rows" aria-label="Today">');
    const withStatus = renderToStaticMarkup(<Rows><Row title="A" meta="Time off" status={<Status tone="review">Waiting</Status>} /></Rows>);
    expect(withStatus).toMatch(/nv-row__meta">Time off<\/span><span class="nv-row__status">/);
  });

  it("disables a blocked button and says why beside it", () => {
    const html = renderToStaticMarkup(<Button href="/app/timecards" blockedReason="Approve after Oct 18">Approve timecard</Button>);
    expect(html).toMatch(/<button[^>]*disabled=""/);
    expect(html).not.toContain('href="/app/timecards"');
    expect(html).toContain("Approve after Oct 18");
  });

  it("gives the card heading to its section landmark", () => {
    const html = renderToStaticMarkup(<Card id="week" title="This week" meta="Oct 12–18"><p>x</p></Card>);
    expect(html).toContain('aria-labelledby="week-title"');
    expect(html).toContain('<h2 class="nv-card__title" id="week-title">This week</h2>');
  });

  it("has exactly one primary action in Next up", () => {
    const html = renderToStaticMarkup(<NextUp title="Alexandra asked for Oct 28–29 off" action={{ href: "/app/requests?requestId=r1", label: "Review time off" }} />);
    expect(html.match(/data-kind="primary"/g)).toHaveLength(1);
    expect(html).toContain('href="/app/requests?requestId=r1"');
  });

  it("puts the count in words and keeps the bar decorative", () => {
    const html = renderToStaticMarkup(<Progress label="Availability" value={0} max={5} valueText="0 of 5 sent" />);
    expect(html).toContain("0 of 5 sent");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("width:0%");
    expect(renderToStaticMarkup(<Progress label="x" value={3} max={0} valueText="none" />)).toContain("width:100%");
  });

  it("speaks money and durations in full", () => {
    const money = renderToStaticMarkup(<Money amount={1234.5} />);
    expect(money).toContain('<span class="nv-sr">$1,234.50</span>');
    expect(money).not.toContain("aria-label");
    expect(money).toContain(">$1,234<");
    expect(money).toContain(">.50<");
    expect(renderToStaticMarkup(<Duration minutes={2310} />)).toContain('<span class="nv-sr">38 hours 30 minutes</span>');
    expect(renderToStaticMarkup(<Duration minutes={60} />)).toContain('<span class="nv-sr">1 hour</span>');
  });

  it("marks the current filter as the page and keeps every filter a link", () => {
    const html = renderToStaticMarkup(<FilterPills label="Inbox filters" items={[{ href: "?f=all", label: "All", current: true }, { href: "?f=req", label: "Requests" }]} />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html.match(/<a /g)).toHaveLength(2);
  });

  it("labels the stats by what they count and the action bar as a group", () => {
    const html = renderToStaticMarkup(<StatGrid stats={[{ label: "On shift now", value: 4 }, { label: "Late", value: 1, tone: "urgent", href: "/app/inbox" }]} />);
    expect(html).toContain("--nv-stat-cols:2");
    expect(html).toContain('data-tone="urgent"');
    const spoken = renderToStaticMarkup(<StatGrid stats={[{ label: "Late", value: 1, ariaLabel: "1 person late" }]} />);
    expect(spoken).toContain('<span class="nv-sr">1 person late</span>');
    expect(spoken).toMatch(/nv-stat__label" aria-hidden="true">Late/);
    expect(renderToStaticMarkup(<ActionBar><Button>Approve</Button></ActionBar>)).toContain('role="group"');
    expect(renderToStaticMarkup(<Freshness state="offline">Offline</Freshness>)).toContain('data-state="offline"');
  });
});
