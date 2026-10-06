import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it, vi } from "vitest";
import ScheduleSettingsPage from "./page";
import { listLocations } from "@/lib/data/employees";
import { listLocationStaffingSettings } from "@/lib/data/schedule-health";
import {
  fuelRuleLocations,
  fuelRuleStaffing,
  fuelRuleCoverageWindows,
} from "../../../../test/fixtures/fuel-scheduling-rules";
import { calculateScheduleHealth } from "../../../../lib/scheduling/schedule-health";

vi.mock("@/lib/data/positions",()=>({listPositions:async()=>[]}));
vi.mock("@/components/configuration-form",()=>import("../../../../components/configuration-form"));
vi.mock("@/components/position-quota-fields",()=>import("../../../../components/position-quota-fields"));
vi.mock("@/lib/auth/permissions", () => ({
  MANAGER_ROLES: ["OWNER", "MANAGER"],
  requireRoles: vi.fn(async()=>({id:"reviewer",role:"MANAGER"})),
}));
vi.mock(
  "@/components/page-header",
  () => import("../../../../components/page-header"),
);
vi.mock("@/lib/date-utils", () => import("../../../../lib/date-utils"));
vi.mock("@/lib/data/employees", () => ({
  listLocations: vi.fn(async () => fuelRuleLocations),
}));
vi.mock("@/lib/data/schedule-health", () => ({
  listLocationStaffingSettings: vi.fn(),
  listEmployeeHourTargets: async () => [],
  listCoverageWindows: async () => fuelRuleCoverageWindows,
}));
vi.mock("@/app/app/schedule/settings/actions", () => ({
  saveScheduleHealthSettingsAction: vi.fn(),
  saveScheduleHealthSettingsFormAction: vi.fn(),
  addCoverageWindowFormAction: vi.fn(),
  replaceCoverageWindowPositionRequirementsAction: vi.fn(),
  addCoverageWindowAction: vi.fn(),
  deleteCoverageWindowAction: vi.fn(),
  saveShiftChangePolicyAction:async()=>({status:'conflict'}),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) =>
    createElement("a", { href, ...props }, children),
}));

beforeEach(() => {
  vi.mocked(listLocations).mockResolvedValue(fuelRuleLocations);
  vi.mocked(listLocationStaffingSettings).mockResolvedValue(
    fuelRuleStaffing.map((s, i) => ({ ...s, locationName: `Fuel ${i + 1}` })),
  );
});

it("resolves staffing, selector and expected-period labels from the same canonical location identity", async () => {
  const html = renderToStaticMarkup(
    await ScheduleSettingsPage({ searchParams: Promise.resolve({}) }),
  );
  expect(html).toContain("FUEL – 2");
  expect(html).toContain("FUEL – 110");
  expect(html).not.toMatch(/Fuel [12]|FUEL - (?:2|110)/);
  expect(html).toMatch(/name="staffing-loc-1"[^>]*value="2"/);
  expect(html).toMatch(/name="staffing-loc-2"[^>]*value="6"/);
  expect(html).toContain("6:30 AM – 2:00 PM");
  expect(html).toContain("2:00 PM – 9:00 PM");
  expect(html).not.toContain("6:00 AM – 2:00 PM");
});

it("renders configured staffing and Lead values rather than hardcoding business defaults", async () => {
  vi.mocked(listLocationStaffingSettings).mockResolvedValue([
    {
      ...fuelRuleStaffing[0],
      minimumStaffPerShift: 3,
      requiresDesignatedLead: false,
    },
    {
      ...fuelRuleStaffing[1],
      minimumStaffPerShift: 8,
      requiresDesignatedLead: true,
    },
  ]);
  const html = renderToStaticMarkup(
    await ScheduleSettingsPage({ searchParams: Promise.resolve({}) }),
  );
  expect(html).toMatch(/name="staffing-loc-1"[^>]*value="3"/);
  expect(html).toMatch(/name="staffing-loc-2"[^>]*value="8"/);
  expect(html).not.toMatch(/name="lead-loc-1"[^>]*checked/);
  expect(html).toMatch(/name="lead-loc-2"[^>]*checked/);
});

it("evaluates all confirmed periods without inventing FUEL – 110 weekdays or subtracting breaks", () => {
  const health = calculateScheduleHealth({
    shifts: [],
    employees: [],
    locations: fuelRuleStaffing.map((s) => ({
      id: s.locationId,
      name: s.locationName,
      minimumStaffPerShift: s.minimumStaffPerShift,
      requiresDesignatedLead: s.requiresDesignatedLead,
    })),
    coverageWindows: fuelRuleCoverageWindows,
    weekDates: [
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ],
  });
  const fuel2 = health.coverageBlocks.filter((b) => b.locationId === "loc-1");
  expect(fuel2).toHaveLength(14);
  for (const date of [
    "2026-10-05",
    "2026-10-06",
    "2026-10-07",
    "2026-10-08",
    "2026-10-09",
  ])
    expect(
      fuel2
        .filter((b) => b.date === date)
        .map((b) => [b.startTime, b.endTime, b.gap]),
    ).toEqual([
      ["06:30", "14:00", 2],
      ["14:00", "21:00", 2],
    ]);
  for (const date of ["2026-10-10", "2026-10-11"])
    expect(
      fuel2
        .filter((b) => b.date === date)
        .map((b) => [b.startTime, b.endTime, b.gap]),
    ).toEqual([
      ["07:00", "14:00", 2],
      ["14:00", "21:00", 2],
    ]);
  const fuel110 = health.coverageBlocks.filter((b) => b.locationId === "loc-2");
  expect(fuel110).toHaveLength(4);
  for (const date of ["2026-10-10", "2026-10-11"])
    expect(
      fuel110
        .filter((b) => b.date === date)
        .map((b) => [b.startTime, b.endTime, b.gap]),
    ).toEqual([
      ["07:00", "13:30", 6],
      ["13:30", "20:00", 6],
    ]);
});

it("keeps FUEL – 2 staff isolated from FUEL – 110 during the confirmed weekend periods", () => {
  const health = calculateScheduleHealth({
    shifts: ["lead", "barista"].map((employeeId) => ({
      id: employeeId,
      employeeId,
      locationId: "loc-1",
      date: "2026-10-10",
      startTime: "07:00",
      endTime: "14:00",
      isDesignatedLead: employeeId === "lead",
    })),
    employees: [
      { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [],
        id: "lead",
        name: "Lead",
        role: "LEAD",
        active: true,
        targetWeeklyHours: 7,
      },
      { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [],
        id: "barista",
        name: "Barista",
        role: "EMPLOYEE",
        active: true,
        targetWeeklyHours: 7,
      },
    ],
    locations: fuelRuleStaffing.map((s) => ({
      id: s.locationId,
      name: s.locationName,
      minimumStaffPerShift: s.minimumStaffPerShift,
      requiresDesignatedLead: s.requiresDesignatedLead,
    })),
    coverageWindows: fuelRuleCoverageWindows,
    weekDates: ["2026-10-10"],
  });
  expect(
    health.coverageBlocks.find(
      (b) => b.locationId === "loc-1" && b.startTime === "07:00",
    ),
  ).toMatchObject({ assignedStaff: 2, gap: 0, covered: true });
  expect(
    health.coverageBlocks
      .filter((b) => b.locationId === "loc-2")
      .map((b) => [
        b.startTime,
        b.endTime,
        b.assignedStaff,
        b.gap,
        b.leadCovered,
      ]),
  ).toEqual([
    ["07:00", "13:30", 0, 6, false],
    ["13:30", "20:00", 0, 6, false],
  ]);
  expect(health.hourBalances.map((b) => b.scheduledHours)).toEqual([7, 7]);
});

it('unconfigured staffing displays a blank explicit required Lead choice',async()=>{vi.mocked(listLocationStaffingSettings).mockResolvedValue([{locationId:'new',locationName:'New',minimumStaffPerShift:null,requiresDesignatedLead:null}]);const html=renderToStaticMarkup(await ScheduleSettingsPage({searchParams:Promise.resolve({})}));expect(html).toMatch(/select[^>]*name="lead-choice-new"[^>]*required/);expect(html).toContain('Choose a Lead rule');expect(html).not.toMatch(/name="staffing-new"[^>]*value="[0-9]/);});

it("preserves configured customer location names without Fuel-specific normalization", async () => {
  vi.mocked(listLocations).mockResolvedValue(fuelRuleLocations.map(l => ({...l, shortName: l.id === "loc-1" ? "FUEL - 2" : "Northside West"})));
  const html = renderToStaticMarkup(await ScheduleSettingsPage({searchParams:Promise.resolve({})}));
  expect(html).toContain("FUEL - 2");
  expect(html).toContain("Northside West");
  expect(html).not.toContain("FUEL – 2");
});

vi.mock('@/lib/data/shift-change-policy',()=>({readShiftChangePolicy:async()=>null}));
vi.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
vi.mock('@/components/shift-change-policy-fields',()=>import('../../../../components/shift-change-policy-fields'));
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
