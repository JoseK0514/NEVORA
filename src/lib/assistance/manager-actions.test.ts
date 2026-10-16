import { describe, expect, it } from "vitest";
import { buildManagerActionItems } from "./manager-actions";
import { parseCoverageRepairLocator } from '../scheduling/coverage-repair';

describe("buildManagerActionItems", () => {
  it("prioritizes an upcoming coverage gap ahead of missing setup", () => {
    const items = buildManagerActionItems({
      weekStart: "2026-09-28",
      coverageGaps: [
        {
          key: "gap-1",
          locationId: "loc-2",
          locationName: "FUEL - 110",
          date: "2026-09-29",
          startTime: "08:00",
          endTime: "12:00",
          gap: 1,
        },
      ],
      missingAvailability: [
        { employeeId: "E-2", employeeName: "Maria Lopez" },
      ],
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
    });

    expect(items[0]).toMatchObject({
      type: "COVERAGE_GAP",
      priority: "URGENT",
      locationId: "loc-2",
    });
    expect(items[1]).toMatchObject({
      type: "AVAILABILITY_MISSING",
      priority: "MISSING_INPUT",
      employeeId: "E-2",
    });
  });

  it("sorts older approvals before newer approvals in the same priority", () => {
    const items = buildManagerActionItems({
      weekStart: "2026-09-28",
      pendingRequests: [
        {
          id: "newer",
          kind: "TIME_OFF",
          employeeName: "Newer Person",
          createdAt: "2026-09-28T15:00:00Z",
        },
        {
          id: "older",
          kind: "CALLOUT",
          employeeName: "Older Person",
          createdAt: "2026-09-28T10:00:00Z",
        },
      ],
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
    });

    expect(items.map((item) => item.id)).toEqual([
      "CALLOUT:older",
      "TIME_OFF:newer",
    ]);
  });

  it("preserves exact scheduling context in action links", () => {
    const items = buildManagerActionItems({
      weekStart: "2026-09-28",
      coverageGaps: [
        {
          key: "gap-1",
          locationId: "loc-2",
          locationName: "FUEL - 110",
          date: "2026-09-30",
          startTime: "09:00",
          endTime: "17:00",
          gap: 2,
        },
      ],
      pendingRequests: [
        {
          id: "request-7",
          kind: "TIME_OFF",
          employeeName: "Ana Soto",
          createdAt: "2026-09-28T11:00:00Z",
        },
      ],
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
    });

    const href = items.find((item) => item.type === "COVERAGE_GAP")!.href;
    const url = new URL(href, 'http://localhost');
    expect(url.pathname).toBe('/app/schedule/coverage');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ week: '2026-09-28', date: '2026-09-30', locationId: 'loc-2', start: '09:00', end: '17:00' });
    expect(parseCoverageRepairLocator(url.searchParams.get('repair'))).toMatchObject({ target: 'STAFFING', reported: { missingStaff: 2, requiresLead: false, positions: [] } });
    expect(items.find((item) => item.type === "TIME_OFF")?.href).toBe(
      "/app/requests?tab=pending&requestId=request-7",
    );
  });

  it("creates employee-targeted missing availability detail", () => {
    const [item] = buildManagerActionItems({
      weekStart: "2026-09-28",
      missingAvailability: [
        { employeeId: "E-9", employeeName: "Luis Rivera" },
      ],
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
    });

    expect(item).toMatchObject({
      id: "AVAILABILITY:E-9",
      type: "AVAILABILITY_MISSING",
      title: "Availability not submitted",
      detail: "Luis Rivera has not submitted availability for this week.",
      employeeId: "E-9",
      href: "/app/availability?week=2026-09-28&employeeId=E-9",
    });
  });

  it("links hour and setup issues to the exact resolution surface", () => {
    const items = buildManagerActionItems({
      weekStart: "2026-09-28",
      hourIssues: [
        {
          employeeId: "E-1",
          employeeName: "Alex Cruz",
          kind: "UNDER",
          scheduledHours: 24,
          targetHours: 32,
        },
        {
          employeeId: "E-2",
          employeeName: "Mia Perez",
          kind: "TARGET_MISSING",
        },
      ],
      availabilityDeadlineSet: false,
      coverageRulesConfigured: false,
    });

    expect(items.find((item) => item.id === "HOURS:E-1")).toMatchObject({
      priority: "REVIEW",
      href: "/app/schedule?week=2026-09-28&employeeId=E-1",
    });
    expect(items.find((item) => item.id === "HOURS:E-2")).toMatchObject({
      priority: "MISSING_INPUT",
      href: "/app/schedule/settings?employeeId=E-2",
    });
    expect(items.find((item) => item.type === "DEADLINE_MISSING")?.href).toBe(
      "/app/schedule?week=2026-09-28",
    );
    expect(items.find((item) => item.type === "COVERAGE_RULES_MISSING")?.href).toBe(
      "/app/schedule/settings",
    );
  });

  it("describes lead-only coverage gaps without claiming zero employees are needed", () => {
    const [item] = buildManagerActionItems({
      weekStart: "2026-09-28",
      coverageGaps: [
        {
          key: "lead-gap",
          locationId: "loc-1",
          locationName: "FUEL - 2",
          date: "2026-09-30",
          startTime: "08:00",
          endTime: "12:00",
          gap: 0,
        },
      ],
      availabilityDeadlineSet: true,
      coverageRulesConfigured: true,
    });

    expect(item).toMatchObject({
      type: "COVERAGE_GAP",
      title: "Lead coverage missing at FUEL - 2",
      detail: "2026-09-30 · 08:00–12:00 · Designated lead required",
    });
  });

  it("returns no actions when there are no issues", () => {
    expect(
      buildManagerActionItems({
        weekStart: "2026-09-28",
        availabilityDeadlineSet: true,
        coverageRulesConfigured: true,
      }),
    ).toEqual([]);
  });
});

it("preserves the Lead requirement in the suggestion link for a Lead-only gap", () => {
 const [item] = buildManagerActionItems({ weekStart: "2026-09-28", coverageGaps: [{ key: "lead", locationId: "loc-1", locationName: "FUEL – 2", date: "2026-09-30", startTime: "08:00", endTime: "12:00", gap: 0 }], availabilityDeadlineSet: true, coverageRulesConfigured: true });
 expect(item.href).toContain("&lead=1");
});
it('unconfigured staffing prompts setup without invented missing staff or Lead',()=>{const [item]=buildManagerActionItems({weekStart:'2026-09-28',coverageGaps:[{key:'new',locationId:'new',locationName:'New',date:'2026-09-28',startTime:'08:00',endTime:'12:00',gap:null,requiresLead:null}],availabilityDeadlineSet:true,coverageRulesConfigured:true});expect(item.title).toBe('Staffing setup needed at New');expect(item.detail).toContain('Configure');expect(item.href).toBe('/app/schedule/settings');});

it('position-only shortage names the required position without claiming a missing Lead',()=>{
 const [item]=buildManagerActionItems({weekStart:'2026-10-05',coverageGaps:[{key:'position',locationId:'l',locationName:'Shop',date:'2026-10-05',startTime:'08:00',endTime:'12:00',gap:0,requiresLead:false,positionCoverage:[{positionId:'b',positionName:'Barista',missing:1}]}],availabilityDeadlineSet:true,coverageRulesConfigured:true});
 expect(item.title).toBe('Position coverage missing at Shop');
 expect(item.detail).toContain('Barista: 1 missing');
 const url = new URL(item.href, 'http://localhost');
 expect(url.pathname).toBe('/app/schedule/coverage');
 expect(Object.fromEntries(url.searchParams)).toMatchObject({ week: '2026-10-05', locationId: 'l', date: '2026-10-05', start: '08:00', end: '12:00', positionId: 'b' });
 expect(parseCoverageRepairLocator(url.searchParams.get('repair'))).toMatchObject({ target: 'POSITION', positionId: 'b', reported: { missingStaff: 0, requiresLead: false, positions: [{positionId:'b',missing:1}] } });
 expect(item.detail).not.toContain('Designated lead');
});
