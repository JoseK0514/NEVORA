// Scheduling restrictions (U02): the two new routes keep their own frame while they load.
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/owner-b/owner-b.css", () => ({}));
import { loadingShape } from "@/components/owner-b/b-loading";

describe("loading placeholders for the agreement pages", () => {
  it("management: back row, title and name on the 224 band, one reading column, the week card first", () => {
    const shape = loadingShape("/app/employees/QA-1/restrictions", false);
    expect(shape).toMatchObject({ title: "When they can be scheduled", back: true, sub: true, band: "sub", frame: "read", lift: false });
    expect(shape.cards?.[0]).toEqual({ head: true, rows: 7 });
    // The person's own page keeps its entry.
    expect(loadingShape("/app/employees/QA-1", false).title).toBeUndefined();
    expect(loadingShape("/app/employees/new", false).cards).toEqual([{ head: true, lines: 4 }]);
  });
  it("Employee and Lead: Agreed times under Availability, without changing Availability's own frame", () => {
    expect(loadingShape("/app/availability/agreement", true)).toMatchObject({ title: "Agreed times", back: true, sub: true, band: "sub", frame: "read", lift: false });
    expect(loadingShape("/app/availability", true)).toMatchObject({ title: "Availability", frame: "wide" });
  });
});
