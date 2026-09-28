import { describe, expect, it } from "vitest";
import { buildAvailabilitySubmissionState } from "./availability-submission";

describe("buildAvailabilitySubmissionState", () => {
  it("treats an explicit zero-window submission as submitted unavailable", () => {
    expect(
      buildAvailabilitySubmissionState({
        submitted: true,
        windowCount: 0,
        deadlinePassed: false,
      }),
    ).toEqual({ state: "SUBMITTED_UNAVAILABLE", submitted: true });
  });

  it("does not infer submission from seeded weekly windows", () => {
    expect(
      buildAvailabilitySubmissionState({
        submitted: false,
        windowCount: 5,
        deadlinePassed: false,
      }),
    ).toEqual({ state: "NOT_SUBMITTED", submitted: false });
  });

  it("treats an explicit submission with windows as submitted", () => {
    expect(
      buildAvailabilitySubmissionState({
        submitted: true,
        windowCount: 5,
        deadlinePassed: false,
      }),
    ).toEqual({ state: "SUBMITTED", submitted: true });
  });

  it("locks after the deadline while preserving whether the employee submitted", () => {
    expect(
      buildAvailabilitySubmissionState({
        submitted: true,
        windowCount: 0,
        deadlinePassed: true,
      }),
    ).toEqual({ state: "LOCKED", submitted: true });

    expect(
      buildAvailabilitySubmissionState({
        submitted: false,
        windowCount: 5,
        deadlinePassed: true,
      }),
    ).toEqual({ state: "LOCKED", submitted: false });
  });
});
