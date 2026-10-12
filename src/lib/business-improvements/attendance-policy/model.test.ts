import { expect, it } from "vitest";
const get = async () => {
  const m = await import("./model").catch(() => null);
  expect(m?.evaluateConfiguredDetectors).toBeTypeOf("function");
  return m!;
};
const policy = {
  kind: "policy_lateness",
  id: "fictional-approved-policy",
  version: 3,
  approvalReference: "fictional-owner-review",
  basis: "CAPTURED_SCHEDULE_START_DELTA",
  thresholdNanoseconds: "60000000000",
  comparison: "GT",
};
const measurement = {
  id: "entry-1",
  employeeId: "self",
  locationId: "location-1",
  kind: "policy_lateness",
  basis: "CAPTURED_SCHEDULE_START_DELTA",
  valueNanoseconds: "60000000001",
  complete: true,
  sourceVersion: "entry-v1",
};
it("keeps every unselected detector explicitly unverifiable instead of healthy zero", async () => {
  const m = await get();
  const r = m.evaluateConfiguredDetectors({
    workspaceId: "w",
    observedAt: "2030-10-07T14:00:00Z",
    policies: [],
    measurements: [],
  });
  expect(r.state).toBe("ready");
  if (r.state !== "ready") throw Error("Expected ready");
  expect(r.detectors).toHaveLength(6);
  expect(
    r.detectors.every(
      (d) => d.state === "unverifiable" && d.reason === "policy_not_selected",
    ),
  ).toBe(true);
});
it("uses exact nanoseconds and the approved comparator at equality", async () => {
  const m = await get();
  for (const [value, comparison, want] of [
    ["60000000000", "GT", 0],
    ["60000000001", "GT", 1],
    ["60000000000", "GTE", 1],
  ] as const) {
    const r = m.evaluateConfiguredDetectors({
      workspaceId: "w",
      observedAt: "2030-10-07T14:00:00Z",
      policies: [{ ...policy, comparison }],
      measurements: [{ ...measurement, valueNanoseconds: value }],
    });
    if (r.state !== "ready") throw Error("Expected ready");
    expect(
      r.detectors.find((d) => d.kind === "policy_lateness")?.observations,
    ).toHaveLength(want);
  }
});
it("withholds selected policy for incomplete or incompatible measurements", async () => {
  const m = await get();
  for (const x of [{ complete: false }, { basis: "SCHEDULED_WALL_CLOCK" }]) {
    const r = m.evaluateConfiguredDetectors({
      workspaceId: "w",
      observedAt: "2030-10-07T14:00:00Z",
      policies: [policy],
      measurements: [{ ...measurement, ...x }],
    });
    if (r.state !== "ready") throw Error("Expected ready");
    expect(r.detectors.find((d) => d.kind === "policy_lateness")).toMatchObject(
      {
        state: "unverifiable",
        reason: "source_unverifiable",
        observations: [],
      },
    );
  }
});
it("rejects malformed, duplicated or unapproved policy inputs without activation", async () => {
  const m = await get();
  for (const policies of [
    [{ ...policy, approvalReference: "" }],
    [{ ...policy, thresholdNanoseconds: "1e9" }],
    [policy, policy],
    [{ ...policy, comparison: "DEFAULT" }],
  ])
    expect(
      m.evaluateConfiguredDetectors({
        workspaceId: "w",
        observedAt: "2030-10-07T14:00:00Z",
        policies,
        measurements: [measurement],
      }).state,
    ).toBe("unavailable");
});
it("does not turn a selected detector with missing census into an all-clear", async () => {
  const m = await get();
  const r = m.evaluateConfiguredDetectors({
    workspaceId: "w",
    observedAt: "2030-10-07T14:00:00Z",
    policies: [
      {
        ...policy,
        kind: "missing_clock_in",
        basis: "APPROVED_EXPECTED_ASSIGNMENT_CENSUS",
      },
    ],
    measurements: [],
  });
  if (r.state !== "ready") throw Error("Expected ready");
  expect(r.detectors.find((d) => d.kind === "missing_clock_in")).toMatchObject({
    state: "unverifiable",
    reason: "source_unverifiable",
  });
});
