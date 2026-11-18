import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { bonusYear, type BonusRow, type ChristmasBonusReport } from "@/lib/reports/christmas-bonus";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const { ChristmasBonusView } = await import("./christmas-bonus-report");

const MINUTE = BigInt(60_000_000_000);
const row = (extra: Partial<BonusRow>): BonusRow => ({ employeeId: "E1", name: "Ana Rivera", active: true, hireDate: "2016-03-02", thresholdHours: 700,
  recordedNanoseconds: String(BigInt(750 * 60 + 30) * MINUTE), breakNanoseconds: "0", unfinalizedDays: 0, status: "REACHED", ...extra });
const report = (rows: BonusRow[]): ChristmasBonusReport => ({ year: bonusYear(2026), timeZone: "America/Puerto_Rico", observedAt: "2026-11-18T16:00:00Z", rows,
  summary: { people: rows.length, reached: rows.length, checkBreaks: 0, needsHireDate: 0, notConfirmed: 0, unfinalizedDays: 0, peopleWithUnfinalizedDays: 0 } });
const html = (rows: BonusRow[]) => renderToStaticMarkup(createElement(ChristmasBonusView, { report: report(rows), choices: [bonusYear(2026), bonusYear(2025)] }));

// Final verification F (Nov 18, 2026).
describe("Christmas bonus hours", () => {
  it("writes hours as Insights does (F19): hours and minutes, thousands grouped", () => {
    const out = html([row({}), row({ employeeId: "E2", name: "Luis Ortiz", thresholdHours: 1350, recordedNanoseconds: String(BigInt(1400 * 60 + 5) * MINUTE), status: "REACHED" })]).replace(/[  ]/g, " ");
    expect(out).toContain(">750 h 30 min of 700 h<");
    expect(out).toContain(">1,400 h 5 min of 1,350 h<");
    expect(out).not.toMatch(/h 0\d\b/);
  });
  it("joins a person's facts with the kit's facts line, so no line starts or ends with the dot (F07)", () => {
    const out = html([row({})]);
    expect(out).toContain('<span class="b-segs c-bonus__facts"><span class="b-segs__i"><span class="c-bonus__fact">');
    expect(out).not.toMatch(/<\/span> · <span class="c-bonus__fact">/);
  });
  it("shows an empty year as the empty state alone: no 0 count and no footnote (F20)", () => {
    const out = html([]);
    expect(out).toContain("No hours recorded in NEVORA for this bonus year");
    expect(out).toContain('<h2 class="c-card__label" id="bonus-people-label">People</h2>');
    expect(out).not.toContain('class="b-note"');
    expect(out).not.toContain('id="bonus-summary"');
  });
  it("titles the disclaimer with its first sentence, Jose's words unchanged (F18)", () => {
    const out = html([row({})]);
    expect(out).toContain('<p class="b-callout__t">Informational only</p><div class="b-callout__b">Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.</div>');
    expect(out).toContain('class="b-note"');
  });
  it("marks the shown year with the bold check (F17)", () => {
    const out = html([row({})]);
    expect(out.match(/c-bonus__yearcheck/g)).toHaveLength(2);
    expect(out).toMatch(/aria-current="true">Oct 2025 – Sep 2026<svg[^>]*class="c-bonus__yearcheck"/);
  });
});
