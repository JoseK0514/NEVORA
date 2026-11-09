export type AvailabilitySubmissionState =
  | "NOT_SUBMITTED"
  | "SUBMITTED"
  | "SUBMITTED_UNAVAILABLE"
  | "LOCKED";

export type AvailabilitySubmissionStatus = {
  state: AvailabilitySubmissionState;
  submitted: boolean;
  windowCount: number;
  submittedAt?: string;
  updatedAt?: string;
};

/**
 * Distinguishes no submission from explicitly submitted unavailability (zero
 * windows). A passed deadline locks either state without changing whether the
 * employee submitted; persistence must enforce the actual cutoff separately.
 */
export function buildAvailabilitySubmissionState(input: {
  submitted: boolean;
  windowCount: number;
  deadlinePassed: boolean;
}): Pick<AvailabilitySubmissionStatus, "state" | "submitted"> {
  if (input.deadlinePassed) {
    return { state: "LOCKED", submitted: input.submitted };
  }

  if (!input.submitted) {
    return { state: "NOT_SUBMITTED", submitted: false };
  }

  if (input.windowCount === 0) {
    return { state: "SUBMITTED_UNAVAILABLE", submitted: true };
  }

  return { state: "SUBMITTED", submitted: true };
}
