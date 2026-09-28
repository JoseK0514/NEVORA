import { describe, expect, it } from "vitest";
import { buildAcknowledgementState } from "./acknowledgement-state";
import type { PublishedShiftSnapshot } from "./publication-diff";

function shift(
  employeeId: string,
  overrides: Partial<PublishedShiftSnapshot> = {},
): PublishedShiftSnapshot {
  return {
    sourceShiftId: `shift-${employeeId}`,
    locationId: "loc-1",
    employeeId,
    date: "2026-09-28",
    startTime: "08:00",
    endTime: "16:00",
    isDesignatedLead: false,
    isCalloutApproved: false,
    ...overrides,
  };
}

describe("buildAcknowledgementState", () => {
  it("treats an acknowledgement of the latest revision as current", () => {
    expect(
      buildAcknowledgementState({
        employeeId: "E-1",
        acknowledgementRevisionId: "rev-1",
        latestRevisionId: "rev-1",
      }),
    ).toEqual({
      acknowledged: true,
      acknowledgedRevisionId: "rev-1",
      latestRevisionId: "rev-1",
      needsAcknowledgement: false,
    });
  });

  it("requires acknowledgement when a newer revision changes that employee", () => {
    expect(
      buildAcknowledgementState({
        employeeId: "E-1",
        acknowledgementRevisionId: "rev-1",
        latestRevisionId: "rev-2",
        acknowledgedRevisionShifts: [shift("E-1")],
        latestRevisionShifts: [shift("E-1", { startTime: "09:00", endTime: "17:00" })],
      }),
    ).toMatchObject({
      acknowledged: false,
      needsAcknowledgement: true,
    });
  });

  it("keeps acknowledgement current when a newer revision changes only another employee", () => {
    const e1 = shift("E-1");
    const e2Before = shift("E-2");
    const e2After = shift("E-2", { startTime: "10:00", endTime: "18:00" });

    expect(
      buildAcknowledgementState({
        employeeId: "E-1",
        acknowledgementRevisionId: "rev-1",
        latestRevisionId: "rev-2",
        acknowledgedRevisionShifts: [e1, e2Before],
        latestRevisionShifts: [e1, e2After],
      }),
    ).toMatchObject({
      acknowledged: true,
      needsAcknowledgement: false,
    });
  });

  it("cannot require acknowledgement when no publication revision exists", () => {
    expect(
      buildAcknowledgementState({
        employeeId: "E-1",
      }),
    ).toEqual({
      acknowledged: false,
      needsAcknowledgement: false,
    });
  });

  it("treats a legacy acknowledgement without revision context as stale", () => {
    expect(
      buildAcknowledgementState({
        employeeId: "E-1",
        latestRevisionId: "rev-2",
        latestRevisionShifts: [shift("E-1")],
      }),
    ).toEqual({
      acknowledged: false,
      latestRevisionId: "rev-2",
      needsAcknowledgement: true,
    });
  });
});
