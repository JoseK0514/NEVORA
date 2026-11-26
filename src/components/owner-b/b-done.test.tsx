// Phase 7 (moments): the one success pattern. The kit's done state, its mark, its two sizes, its words in both
// languages, and the rules its sheet must keep (motion behind the preference, transform and opacity only, tokens only).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...rest }: { href: string; children: React.ReactNode; prefetch?: boolean }) => <a href={href} {...rest}>{children}</a> }));

import { BDoneMark, BState } from "./b-kit";
import { MOMENTS_COPY, momentsCopy } from "./moments-copy";
import { Celebration } from "../celebration";

const root = join(__dirname, "..", "..");
const sheet = readFileSync(join(root, "app/app/b-moments.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("the done state (BState kind=\"done\")", () => {
  it("inline: the mark, a title that names what is true, one line, one tinted next step, announced once", () => {
    const html = renderToStaticMarkup(<BState kind="done" title="Request sent" line="Your manager decides." action={{ label: "View my request", href: "/app/requests" }} />);
    expect(html).toContain('<div class="b-statecard" data-kind="done" data-size="inline" role="status">');
    expect(html).toContain('<span class="b-ico b-ico--green b-donemark" aria-hidden="true">');
    expect(html).toContain('<p class="b-statecard__t">Request sent</p><p class="b-statecard__s">Your manager decides.</p>');
    // The page keeps its one filled button: an inline result's step is the tinted pill.
    expect(html).toContain('<a href="/app/requests" class="b-btn b-btn--ghost">View my request</a>');
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html.match(/class="b-btn/g)).toHaveLength(1);
  });
  it("finish: the end of a flow carries the one filled button", () => {
    const html = renderToStaticMarkup(<BState kind="done" size="finish" title="Amounts saved" line="Nobody has been paid." action={{ label: "Review payroll", href: "/app/payroll" }} />);
    expect(html).toContain('data-kind="done" data-size="finish" role="status"');
    expect(html).toContain('class="b-btn b-btn--teal"');
  });
  it("a title that takes focus is what is read, so the card has no live region", () => {
    const ref = createRef<HTMLElement>();
    const html = renderToStaticMarkup(<BState kind="done" heading titleRef={ref} title="Request sent" />);
    expect(html).not.toContain("role=");
    expect(html).toContain('<h2 class="b-statecard__t" tabindex="-1">Request sent</h2>');
  });
  it("silent: a screen that already says the result in its own live line adds no second announcement", () => {
    expect(renderToStaticMarkup(<BState silent kind="done" title="Payroll approved" />)).not.toContain("role=");
  });
  it("a second way on is a quiet text control, never a second pill", () => {
    const html = renderToStaticMarkup(<BState kind="done" title="Request sent" action={{ label: "View my request", href: "/a" }} quiet={<button type="button" className="b-done__quiet">Make another request</button>} />);
    expect(html.match(/class="b-btn/g)).toHaveLength(1);
    expect(html).toContain('<button type="button" class="b-done__quiet">Make another request</button>');
  });
  it("the other kinds are unchanged: no size, the teal recovery pill, their own icon", () => {
    const html = renderToStaticMarkup(<BState kind="paused" title="Not confirmed" action={{ label: "Check", onClick: () => {} }} />);
    expect(html).toContain('<div class="b-statecard" data-kind="paused" role="status">');
    expect(html).toContain("b-ico--amber");
    expect(html).not.toContain("b-donemark");
    expect(html).toContain('class="b-btn b-btn--teal"');
  });
  it("the mark is decorative, still when the state was already true, and white on a tinted block", () => {
    expect(renderToStaticMarkup(<BDoneMark />)).toMatch(/^<span class="b-ico b-ico--green b-donemark" aria-hidden="true"><svg/);
    expect(renderToStaticMarkup(<BDoneMark still />)).toContain('data-still=""');
    expect(renderToStaticMarkup(<BDoneMark on="tint" />)).toContain('data-on="tint"');
  });
});

describe("the celebration is the same mark with one ring", () => {
  it("draws a single ring inside the mark and nothing else", () => {
    const html = renderToStaticMarkup(<BState kind="done" title="Week confirmed" extra={<Celebration kind="SCHEDULE_CONFIRMED" eventKey="2026-11-16:r1" confirmed />} />);
    expect(html).toContain('<span class="nevora-celebration" data-celebration="SCHEDULE_CONFIRMED" aria-hidden="true"><i></i></span></span>');
    expect(html.match(/<i>/g)).toHaveLength(1);
    expect(html).not.toContain("data-playing");
    expect(html).not.toContain("data-tone");
  });
  it("retires the particle burst", () => {
    const old = readFileSync(join(root, "app/app/portal-motion.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(old).not.toMatch(/@keyframes nevora-celebrate/);
    expect(old).not.toMatch(/nevora-celebration i\[data-tone/);
  });
});

describe("b-moments.css keeps the motion rules", () => {
  /** The at-rule preludes around each place `needle` appears. */
  function contexts(needle: RegExp) {
    const found: string[][] = [], stack: string[] = [];
    let start = 0;
    for (let index = 0; index < sheet.length; index++) {
      const char = sheet[index];
      if (char === "{") { stack.push(sheet.slice(start, index).trim()); start = index + 1; }
      else if (char === "}") { stack.pop(); start = index + 1; }
      else if (char === ";") start = index + 1;
      if (needle.test(sheet.slice(index, index + 24))) found.push(stack.filter(prelude => prelude.startsWith("@")));
    }
    return found;
  }
  it("runs every animation, transition and keyframe only when motion is allowed", () => {
    // "animation: none" switches another sheet's entrance off for a result's card; it starts nothing.
    const places = [...contexts(/^animation: (?!none)/), ...contexts(/^@keyframes /), ...contexts(/^transition:/)];
    expect(places.length).toBeGreaterThanOrEqual(6);
    for (const context of places) expect(context.some(prelude => /prefers-reduced-motion:\s*no-preference/.test(prelude)), context.join(" > ")).toBe(true);
  });
  it("animates transform and opacity only, once, on the settle tokens", () => {
    const frames = [...sheet.matchAll(/@keyframes ([\w-]+) \{((?:[^{}]*\{[^{}]*\})+)\s*\}/g)];
    expect(frames.map(match => match[1]).sort()).toEqual(["b-done-check", "b-done-ring", "b-done-settle"]);
    for (const [, name, body] of frames) {
      const props = [...body.matchAll(/([a-z-]+):/g)].map(match => match[1]);
      // Final polish (Nov 21, 2026): the tick is drawn, so its keyframe moves the stroke's dash offset and nothing else.
      const allowed = name === "b-done-check" ? ["stroke-dashoffset"] : ["opacity", "transform"];
      expect(props.every(prop => allowed.includes(prop)), `${name}: ${props.join(", ")}`).toBe(true);
    }
    const runs = [...sheet.matchAll(/animation: ([^;]+);/g)].map(match => match[1]).filter(run => run !== "none !important");
    // Refinement (Nov 20, 2026): the circle settles, the check follows, one ring leaves (and the celebrated ring), each
    // on its own token and the settle curve.
    expect(runs).toHaveLength(4);
    for (const run of runs) expect(run).toMatch(/^b-done-(settle|check|ring) var\(--b-dur-(settle|draw|ring)\) var\(--b-ease-settle\)( var\(--b-delay-(draw|ring)\))? both$/);
    expect(sheet).not.toMatch(/infinite|cubic-bezier|\d+ms|transition: all|filter:|blur\(/);
  });
  it("a result's card is there at once: the Employee card entrance (300ms wait, rise) is off for it", () => {
    expect(sheet).toMatch(/\.b-keep:has\(> \.b-statecard\[data-kind="done"\]\) \{ animation: none !important; \}/);
  });
  it("a done state that was already true does not move", () => {
    expect(sheet).toMatch(/\.b-donemark:not\(\[data-still\]\) \{ animation:/);
    expect(sheet).not.toMatch(/\.b-donemark \{ animation:/);
  });
  it("takes its colours from the tokens", () => {
    const literals = [...sheet.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(match => match[0].toUpperCase()).filter(value => value !== "#FFFFFF");
    expect(literals).toEqual([]);
  });
});

describe("words (English and Spanish)", () => {
  const flat = (copy: Record<string, unknown>): Record<string, string> => Object.fromEntries(Object.entries(copy).flatMap(([key, value]): [string, string][] =>
    typeof value === "function" ? [[key, String((value as (...args: unknown[]) => string)(3, 5))], [`${key}:1`, String((value as (...args: unknown[]) => string)(1, 1))]]
      : typeof value === "object" && value ? Object.entries(value as Record<string, string>).map(([inner, word]) => [`${key}.${inner}`, word] as [string, string]) : [[key, String(value)]]));
  const en = flat(MOMENTS_COPY.en), es = flat(MOMENTS_COPY.es);
  it("has every key in both languages and no English sentence left in Spanish", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
    for (const key of Object.keys(en)) { expect(es[key], key).toBeTruthy(); expect(es[key], key).not.toBe(en[key]); }
    expect(Object.values(es).join(" ")).not.toMatch(/\b(the|your|request|sent|shift|schedule|manager|approved|saved)\b/i);
  });
  it.each(Object.entries({ en, es }))("%s: short, sentence case, no filler, no exclamation marks or em dashes", (_lang, copy) => {
    for (const [key, value] of Object.entries(copy)) {
      expect(value, key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops|simplemente|exitosamente)\b/i);
      expect(value.length, key).toBeLessThanOrEqual(90);
      // A Spanish question opens with ¿ ("¿Aprobar 3 registros de horas?").
      expect(value[0] === "¿" ? value[1] : value[0], key).toMatch(/[A-ZÁÉÍÓÚÑ0-9]/);
    }
  });
  it("sent is not approved: a request's title never says it was approved or paid", () => {
    for (const lang of ["en", "es"] as const) {
      const copy = momentsCopy(lang);
      for (const title of [copy.requestSent, copy.calloutSent, copy.swapSent, copy.coverSent, copy.pickupSent, copy.correctionSent]) expect(title).not.toMatch(/approved|aprobad|paid|pagad|done|hech/i);
    }
  });
  it("renders the main results in Spanish with no English leaking in", () => {
    const copy = momentsCopy("es");
    const html = [
      <BState key="a" kind="done" title={copy.requestSent} line={copy.timeOffLine} action={{ label: copy.viewRequest, href: "/a" }} quiet={<button type="button" className="b-done__quiet">{copy.anotherRequest}</button>} />,
      <BState key="b" kind="done" size="finish" title={copy.correctionSent} line={copy.correctionLine} action={{ label: copy.viewRequest, href: "/a" }} />,
      <BState key="c" kind="done" title={copy.pickupSent} line={copy.pickupSentLine} action={{ label: copy.viewRequests, href: "/a" }} />,
      <BState key="d" kind="done" title={copy.published("Café Norte")} line={copy.publishedLine("16–22 nov")} action={{ label: copy.sendUpdate, href: "/a" }} />,
      <BState key="e" kind="done" title={copy.batchAllApproved(3)} line={copy.batchLine} />,
      <BState key="f" kind="paused" title={copy.changeClosed} line={copy.changeClosedLine} action={{ label: copy.viewRequest, href: "/a" }} />,
    ].map(node => text(renderToStaticMarkup(node))).join(" ");
    expect(html).toContain("Solicitud enviada Su gerente decide.");
    expect(html).toContain("3 tarjetas de tiempo aprobadas");
    expect(html).not.toMatch(/\b(Request|View|Your|manager|Send|sent|Checking)\b/);
  });
});
