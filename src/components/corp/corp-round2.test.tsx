import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CorpDuration, CorpSegments, CorpTime, timeRangeText } from "./corp";
import { hoursText, payDay, periodRange } from "./corp-format";

describe("round 2 kit helpers", () => {
  it("sets a range with thin spaces round the en dash and a quiet AM/PM", () => {
    const html = renderToStaticMarkup(<CorpTime>{"8:00 AM – 4:00 PM"}</CorpTime>);
    expect(html).toBe('<span class="c-time">8:00 <span class="c-ampm">AM</span> – 4:00 <span class="c-ampm">PM</span></span>');
    expect(renderToStaticMarkup(<CorpTime start="12a" end="6a" />)).toBe('<span class="c-time">12<span class="c-ampm">a</span> – 6<span class="c-ampm">a</span></span>');
    expect(timeRangeText("9:00 AM", "5:00 PM")).toBe("9:00 AM – 5:00 PM");
  });
  it("leaves words alone", () => {
    expect(renderToStaticMarkup(<CorpTime>{"Mon, Nov 2 · 4 people"}</CorpTime>)).toBe('<span class="c-time">Mon, Nov 2 · 4 people</span>');
  });
  it("sets duration units", () => {
    expect(renderToStaticMarkup(<CorpDuration>{"8 h 2 min"}</CorpDuration>)).toBe('<span class="c-num">8 <span class="c-unit">h</span> 2 <span class="c-unit">min</span></span>');
  });
  it("gives the segmented control its thumb position", () => {
    const html = renderToStaticMarkup(<CorpSegments label="Week" items={[{ key: "a", label: "A", onSelect: () => {} }, { key: "b", label: "B", current: true, onSelect: () => {} }, { key: "c", label: "C", onSelect: () => {} }]} />);
    expect(html).toContain('style="--n:3;--i:1"');
    expect(html).toContain('data-slide=""');
    expect(renderToStaticMarkup(<CorpSegments label="Week" items={[{ key: "a", label: "A", onSelect: () => {} }]} />)).toContain("data-slide-none");
  });
  it("matches Payroll's formats", () => {
    expect(periodRange("2026-10-12", "2026-10-18")).toBe("Oct 12 – 18");
    expect(periodRange("2026-09-28", "2026-10-04")).toBe("Sep 28 – Oct 4");
    expect(payDay("2026-10-20")).toBe("Tue, Oct 20");
    expect(hoursText(String(BigInt(24 * 60 + 7) * BigInt(60_000_000_000)))).toBe("24 h 7 min");
    expect(hoursText("0")).toBe("0 h");
  });
});
