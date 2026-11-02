import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OperationalInsightsPanel } from "./operational-insights-panel";
import { deriveOperationalInsights } from "@/lib/owner-advisor/operational-insights";
const insight = () => deriveOperationalInsights({ shifts: [], entries: [], cards: [], totals: { publishedShiftRecords: 0, effectiveEntryRecords: 0, timecardPeriodRecords: 0 } }, { startDate: "2026-10-05", endDate: "2026-11-01" }, "2026-11-01T12:00:00Z", "America/Puerto_Rico", "a".repeat(64));
it("renders empty history with dates, denominators, limits and a disabled refresh without invented opportunities", () => {
  const html = renderToStaticMarkup(<OperationalInsightsPanel insights={insight()} disabled refresh={() => {}} />);
  for (const value of ["Recorded operational patterns", "2026-10-05", "2026-11-01", "No records", "0 published shift records", "not establish absence", "Omitted", "Source version"]) expect(html).toContain(value);
  expect(html).toMatch(/disabled=""[^>]*>Refresh patterns/);
});
it("renders unavailable as unknown, without zero record claims", () => {
  const html = renderToStaticMarkup(<OperationalInsightsPanel insights={{ ...insight(), state: "unavailable", sourceVersion: null, denominators: null, omissions: null, partial: true }} disabled={false} refresh={() => {}} />);
  expect(html).toContain("Historical sources are unavailable"); expect(html).not.toContain("0 published shift records");
});
