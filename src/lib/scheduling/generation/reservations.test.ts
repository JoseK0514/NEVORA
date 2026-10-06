import { it, expect } from "vitest";
import {
  automaticWeek,
  automaticAssignment as shift,
} from "../../../test/fixtures/automatic-week";
import { deriveGenerationDemand } from "./demand";
import {
  allocateAutomaticCapacity,
  type CapacityCandidate,
} from "./reservations";
import type { GenerationInput, ConfiguredNeed } from "./types";
function reserve(
  i: GenerationInput,
  n: ConfiguredNeed,
  id = "x",
  start = n.needStart,
  end = n.needEnd,
) {
  i.exclusions.push({
    id,
    workspaceId: i.workspace.id,
    weekStart: i.weekStart,
    locationId: n.locationId,
    assignmentStart: start,
    assignmentEnd: end,
    positionId: n.positionId ?? null,
    claims: {
      version: 1,
      claims: [{ ...n, coveredStart: start, coveredEnd: end, quantity: 1 }],
    },
    deletedSourceShiftId: "deleted",
    createdBy: "manager",
    createdAt: "2026-10-01T00:00:00Z",
    clearedBy: null,
    clearedAt: null,
  });
}
const candidate = (
  id = "new",
  overrides: Partial<CapacityCandidate> = {},
): CapacityCandidate => ({ ...shift(id, id), ...overrides });
it("reserves capacity first, preserves real health and prevents a positionless or different-person bypass", () => {
  const i = automaticWeek();
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs[0]);
  const fixed = [shift("fixed", "e1")];
  const r = allocateAutomaticCapacity(i, d, fixed, [candidate("e2")]);
  expect(r.allowed).toBe(false);
  expect(r.issues[0].code).toBe("MANAGER_EXCLUDED");
  expect(deriveGenerationDemand(i, fixed).coverage.percentage).toBe(0);
  expect(
    deriveGenerationDemand(i, [...fixed, shift("manual", "e3")]).coverage
      .percentage,
  ).toBe(100);
});
it("matches the entire addition set so two candidates cannot take one unreserved unit", () => {
  const i = automaticWeek();
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs[0]);
  expect(allocateAutomaticCapacity(i, d, [], [candidate("a")]).allowed).toBe(
    true,
  );
  expect(
    allocateAutomaticCapacity(i, d, [], [candidate("a"), candidate("b")])
      .allowed,
  ).toBe(false);
});
it("applies partial exclusion intervals to enclosing/split candidates without changing denominator", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs[0], "x", "2026-10-05T10:00", "2026-10-05T12:00");
  expect(allocateAutomaticCapacity(i, d, [], [candidate()]).allowed).toBe(
    false,
  );
  expect(
    allocateAutomaticCapacity(
      i,
      d,
      [],
      [
        candidate("a", { endTime: "10:00" }),
        candidate("b", { startTime: "12:00" }),
      ],
    ).allowed,
  ).toBe(true);
  expect(deriveGenerationDemand(i).coverage.requiredMinutes).toBe(480);
});
it("keeps cosmetic splitting/renaming exclusions but ignores materially changed capacity, clearing, other weeks and locations", () => {
  const i = automaticWeek();
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs[0]);
  i.coverageWindows = [
    { ...i.coverageWindows[0], endTime: "12:00" },
    { ...i.coverageWindows[0], id: "second", startTime: "12:00" },
  ];
  i.locations[0].name = "Cosmetic";
  expect(
    allocateAutomaticCapacity(
      i,
      deriveGenerationDemand(i),
      [shift("f", "e1")],
      [candidate()],
    ).allowed,
  ).toBe(false);
  for (const mutate of [
    (x: GenerationInput) => {
      x.staffing[0].minimumStaffPerShift = 3;
    },
    (x: GenerationInput) => {
      x.exclusions[0].clearedAt = "2026-10-04T12:00:00Z";
    },
    (x: GenerationInput) => {
      x.exclusions[0].weekStart = "2026-09-28";
    },
    (x: GenerationInput) => {
      x.exclusions[0].locationId = "other";
    },
  ]) {
    const copy = structuredClone(i);
    mutate(copy);
    expect(
      allocateAutomaticCapacity(
        copy,
        deriveGenerationDemand(copy),
        [shift("f", "e1")],
        [candidate()],
      ).allowed,
    ).toBe(true);
  }
});
it("does not equate the same staffing residual with materially different named quotas", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 3;
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 1 },
  ];
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs.find((n) => n.kind === "STAFFING")!);
  i.staffing[0].minimumStaffPerShift = 4;
  i.coverageWindows[0].positionRequirements[0].quantity = 2;
  expect(
    allocateAutomaticCapacity(i, deriveGenerationDemand(i), [], [])
      .activeExclusionIds,
  ).toEqual([]);
});
it("counts duplicate entries or duplicate event rows only once per event interval", () => {
  const i = automaticWeek();
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs[0]);
  i.exclusions[0].claims.claims.push({ ...i.exclusions[0].claims.claims[0] });
  i.exclusions.push(structuredClone(i.exclusions[0]));
  const r = allocateAutomaticCapacity(i, d, [], [candidate()]);
  expect(r.allowed).toBe(true);
  expect(r.activeExclusionIds).toEqual(["x"]);
  expect(r.claimsByCandidate.new.claims).toHaveLength(1);
});
it("gives a position-qualified Lead both claims and never adds fake staffing credit", () => {
  const i = automaticWeek();
  i.staffing[0].requiresDesignatedLead = true;
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 2 },
  ];
  const r = allocateAutomaticCapacity(
    i,
    deriveGenerationDemand(i),
    [],
    [candidate("e1", { positionId: "barista", isDesignatedLead: true })],
  );
  expect(r.allowed).toBe(true);
  expect(r.claimsByCandidate.e1.claims.map((c) => c.kind).sort()).toEqual([
    "LEAD",
    "POSITION",
  ]);
});
it.each([false, true])(
  "allows unrelated Lead-only coverage alongside a named shortage (position exclusion=%s)",
  (excluded) => {
    const i = automaticWeek();
    i.staffing[0].requiresDesignatedLead = true;
    i.coverageWindows[0].positionRequirements = [
      { positionId: "barista", quantity: 2 },
    ];
    const d = deriveGenerationDemand(i);
    if (excluded) reserve(i, d.needs.find((n) => n.kind === "POSITION")!);
    const r = allocateAutomaticCapacity(
      i,
      d,
      [shift("barista", "e2", { positionId: "barista" })],
      [candidate("e1", { isDesignatedLead: true })],
    );
    expect(r.allowed).toBe(true);
    expect(r.claimsByCandidate.e1.claims.map((c) => c.kind)).toEqual(["LEAD"]);
  },
);
it("blocks an excluded Lead overlay even if ordinary person capacity remains", () => {
  const i = automaticWeek();
  i.staffing[0].requiresDesignatedLead = true;
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs.find((n) => n.kind === "LEAD")!);
  expect(
    allocateAutomaticCapacity(
      i,
      d,
      [],
      [candidate("e1", { isDesignatedLead: true })],
    ).allowed,
  ).toBe(false);
});
it("blocks Lead-only replacement of excluded generic staffing and reports coupled cause", () => {
  const i = automaticWeek();
  i.staffing[0].requiresDesignatedLead = true;
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs.find((n) => n.kind === "STAFFING")!);
  const r = allocateAutomaticCapacity(
    i,
    d,
    [shift("fixed", "e2")],
    [candidate("e1", { isDesignatedLead: true })],
  );
  expect(r.allowed).toBe(false);
  expect(r.issues.some((i) => i.code === "COUPLED_RESERVATION")).toBe(true);
});
it("preserves excess fixed assignments without opening another automatic unit", () => {
  const i = automaticWeek();
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs[0]);
  expect(
    allocateAutomaticCapacity(
      i,
      d,
      [shift("a", "e1"), shift("b", "e2"), shift("c", "e3")],
      [candidate("e4")],
    ).allowed,
  ).toBe(false);
});
it("does not grant permission outside configured demand", () => {
  const i = automaticWeek();
  expect(
    allocateAutomaticCapacity(
      i,
      deriveGenerationDemand(i),
      [],
      [candidate("x", { startTime: "07:00" })],
    ).allowed,
  ).toBe(false);
});
it("blocks named-to-generic reservation evasion but keeps positionless residual capacity", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 3;
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 2 },
  ];
  const d = deriveGenerationDemand(i);
  reserve(i, d.needs.find((n) => n.kind === "POSITION")!);
  const fixed = [shift("f", "e2", { positionId: "barista" })];
  expect(
    allocateAutomaticCapacity(i, d, fixed, [
      candidate("named", { positionId: "barista" }),
    ]).allowed,
  ).toBe(false);
  const generic = allocateAutomaticCapacity(i, d, fixed, [
    candidate("generic"),
  ]);
  expect(generic.allowed).toBe(true);
  expect(generic.claimsByCandidate.generic.claims.map((c) => c.kind)).toEqual([
    "STAFFING",
  ]);
});
it("does not allocate against a rejected scope", () => {
  const i = automaticWeek();
  i.schedules[0].status = "PUBLISHED";
  const r = allocateAutomaticCapacity(
    i,
    deriveGenerationDemand(i),
    [],
    [candidate()],
  );
  expect(r.allowed).toBe(false);
  expect(r.issues.some((e) => e.code === "TARGET_NOT_DRAFT")).toBe(true);
});
it("allocates joint Lead-person demand before unnecessary extra nonLead candidates regardless of candidate order", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.staffing[0].requiresDesignatedLead = true;
  const d = deriveGenerationDemand(i);
  for (const set of [
    [candidate("a"), candidate("z", { isDesignatedLead: true })],
    [candidate("z", { isDesignatedLead: true }), candidate("a")],
  ])
    expect(allocateAutomaticCapacity(i, d, [], set).allowed).toBe(false);
});
it("throws explicit claim overflow rather than silently dropping demand metadata", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  const time = (n: number) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
  i.coverageWindows = Array.from({ length: 258 }, (_, n) => ({
    ...i.coverageWindows[0],
    id: `w${n}`,
    startTime: time(480 + n),
    endTime: time(481 + n),
    positionRequirements: n % 2 ? [{ positionId: "barista", quantity: 1 }] : [],
  }));
  const d = deriveGenerationDemand(i);
  expect(() =>
    allocateAutomaticCapacity(
      i,
      d,
      [],
      [candidate("long", { positionId: "barista", endTime: "12:18" })],
    ),
  ).toThrow("Invalid generation claims");
});
it("prioritizes joint Lead staffing over an irrelevant position label when no position quota exists", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.staffing[0].requiresDesignatedLead = true;
  const d = deriveGenerationDemand(i),
    named = candidate("a", { positionId: "barista" }),
    lead = candidate("z", { isDesignatedLead: true });
  for (const additions of [
    [named, lead],
    [lead, named],
  ])
    expect(allocateAutomaticCapacity(i, d, [], additions).allowed).toBe(false);
  const joint = allocateAutomaticCapacity(i, d, [], [lead]);
  expect(joint.allowed).toBe(true);
  expect(joint.claimsByCandidate.z.claims.map((c) => c.kind).sort()).toEqual([
    "LEAD",
    "STAFFING",
  ]);
});
