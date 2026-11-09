import {
  didEmployeeShiftSetChange,
  type PublishedShiftSnapshot,
} from "./publication-diff";

export type EmployeeAcknowledgementState = {
  acknowledged: boolean;
  acknowledgedRevisionId?: string;
  latestRevisionId?: string;
  needsAcknowledgement: boolean;
};

/**
 * Projects whether the employee must review again. A newer publication can keep
 * their acknowledgement effective when their own shift facts are unchanged;
 * missing comparison snapshots conservatively require review. This projection
 * does not record a receipt or establish current write authority.
 */
export function buildAcknowledgementState(input: {
  employeeId: string;
  acknowledgementRevisionId?: string;
  latestRevisionId?: string;
  acknowledgedRevisionShifts?: PublishedShiftSnapshot[];
  latestRevisionShifts?: PublishedShiftSnapshot[];
}): EmployeeAcknowledgementState {
  const base = {
    acknowledgedRevisionId: input.acknowledgementRevisionId,
    latestRevisionId: input.latestRevisionId,
  };

  if (!input.latestRevisionId) {
    return {
      acknowledged: false,
      needsAcknowledgement: false,
      ...(input.acknowledgementRevisionId
        ? { acknowledgedRevisionId: input.acknowledgementRevisionId }
        : {}),
    };
  }

  if (!input.acknowledgementRevisionId) {
    return {
      acknowledged: false,
      latestRevisionId: input.latestRevisionId,
      needsAcknowledgement: true,
    };
  }

  if (input.acknowledgementRevisionId === input.latestRevisionId) {
    return {
      acknowledged: true,
      ...base,
      needsAcknowledgement: false,
    };
  }

  if (!input.acknowledgedRevisionShifts || !input.latestRevisionShifts) {
    return {
      acknowledged: false,
      ...base,
      needsAcknowledgement: true,
    };
  }

  const changed = didEmployeeShiftSetChange(
    input.acknowledgedRevisionShifts,
    input.latestRevisionShifts,
    input.employeeId,
  );

  return {
    acknowledged: !changed,
    ...base,
    needsAcknowledgement: changed,
  };
}
