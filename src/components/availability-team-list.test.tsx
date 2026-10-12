import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AvailabilityTeamList, matchesAvailabilityFilter, type AvailabilityReviewEmployee } from "./availability-team-list";

const base: AvailabilityReviewEmployee = { employeeId: "fictional-employee", employeeName: "Avery Rivera", state: "NOT_SUBMITTED", submitted: false, windowCount: 0, locationName: "Main Office", windows: [] };

describe("availability review filters", () => {
  it("keeps a missing submission distinct from an intentional unavailable submission", () => {
    const missing = base;
    const unavailable = { ...base, state: "SUBMITTED_UNAVAILABLE" as const, submitted: true };
    expect(matchesAvailabilityFilter(missing, "missing")).toBe(true);
    expect(matchesAvailabilityFilter(missing, "unavailable")).toBe(false);
    expect(matchesAvailabilityFilter(missing, "submitted")).toBe(false);
    expect(matchesAvailabilityFilter(unavailable, "missing")).toBe(false);
    expect(matchesAvailabilityFilter(unavailable, "unavailable")).toBe(true);
    expect(matchesAvailabilityFilter(unavailable, "submitted")).toBe(true);
  });
  it("retains submission status after the deadline locks the week", () => {
    const missing = { ...base, state: "LOCKED" as const };
    const submitted = { ...base, state: "LOCKED" as const, submitted: true, windowCount: 3 };
    const unavailable = { ...submitted, windowCount: 0 };
    expect(matchesAvailabilityFilter(missing, "missing")).toBe(true);
    expect(matchesAvailabilityFilter(submitted, "submitted")).toBe(true);
    expect(matchesAvailabilityFilter(submitted, "unavailable")).toBe(false);
    expect(matchesAvailabilityFilter(unavailable, "unavailable")).toBe(true);
    expect([missing, submitted, unavailable].every(item => matchesAvailabilityFilter(item, "all"))).toBe(true);
  });
  it("renders every submitted window, including two windows on the same day", () => {
    const html = renderToStaticMarkup(<AvailabilityTeamList employees={[{ ...base, state: "SUBMITTED", submitted: true, windowCount: 2, windows: [{ id: "am", dayOfWeek: 1, startTime: "06:00", endTime: "10:00" }, { id: "pm", dayOfWeek: 1, startTime: "18:00", endTime: "24:00" }] }]} employeeId={base.employeeId} />);
    expect(html).toContain('id="employee-fictional-employee"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("6:00 AM");
    expect(html).toContain("10:00 AM");
    expect(html).toContain("6:00 PM");
    expect(html).toContain("12:00 AM");
    expect(html.match(/<li>/g)).toHaveLength(2);
  });
  it("preserves the server-formatted update label across browser locales", () => {
    const html = renderToStaticMarkup(<AvailabilityTeamList employees={[{ ...base, updatedAt: "2026-10-12T12:15:00Z", updatedLabel: "Oct 12, 8:15 AM" }]} />);
    expect(html).toContain("Updated Oct 12, 8:15 AM");
    expect(html).not.toContain("Oct 12 at 8:15 AM");
  });
});
