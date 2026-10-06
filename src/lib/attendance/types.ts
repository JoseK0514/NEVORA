export type AttendanceEntryStatus = "CLOCKED_IN" | "ON_BREAK" | "CLOCKED_OUT";

export type AttendanceCoverage = {
  entriesComplete: boolean;
  breaksComplete: boolean;
  publicationsComplete: boolean;
};

export type RecordedBreak = {
  id: string;
  timeEntryId: string;
  startAt: string;
  endAt: string | null;
  breakTypeId: string | null;
  breakTypeSnapshot: unknown;
};

export type RecordedEntry = {
  id: string;
  workspaceId: string;
  employeeId: string;
  locationId: string;
  sourceVersion: number;
  clockInAt: string;
  clockOutAt: string | null;
  status: AttendanceEntryStatus;
  scheduleContext: unknown;
  breaks: readonly RecordedBreak[];
};

export type HistoricalShift = {
  workspaceId: string;
  employeeId: string;
  locationId: string;
  revisionId: string;
  revisionNumber: number;
  publishedShiftId: string;
  scheduleId: string;
  sourceShiftId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  isCalloutApproved: boolean;
};

export type AttendanceSource = {
  version: 1;
  workspaceId: string;
  timeZone: string;
  observedAt: string;
  entries: readonly RecordedEntry[];
  publications: readonly HistoricalShift[];
  coverage: AttendanceCoverage;
};

export type ValidatedAttendanceSource = AttendanceSource;

export type UnavailableReason =
  | "invalid_source"
  | "incomplete_source"
  | "source_limit";
export type UnavailableProjection = {
  state: "unavailable";
  reason: UnavailableReason;
};

export type LimitationReason =
  | "schedule_not_captured"
  | "schedule_context_invalid"
  | "schedule_reference_missing"
  | "schedule_reference_invalid"
  | "schedule_time_unresolved"
  | "publication_source_incomplete"
  | "break_target_not_captured"
  | "break_target_invalid"
  | "time_history_inconsistent";

export type ComparisonLimitation = {
  entryId: string;
  breakId: string | null;
  reason: LimitationReason;
};

export type DeferredCapability =
  | "missing_clock_in"
  | "policy_lateness"
  | "policy_early_departure"
  | "unusually_long_entry"
  | "correction_review"
  | "overtime_risk";

export type ScheduleEvidence =
  | {
      state: "matched";
      startAt: string;
      endAt: string;
      timeZone: string;
      revisionId: string;
      publishedShiftId: string;
    }
  | { state: "unmatched"; reason: "NO_MATCH" }
  | {
      state: "ambiguous";
      reason: "OVERLAPPING_SHIFTS" | "UNRESOLVED_LOCAL_TIME";
    }
  | {
      state: "not_evaluated";
      reason:
        | "schedule_not_captured"
        | "schedule_context_invalid"
        | "schedule_reference_missing"
        | "schedule_reference_invalid"
        | "schedule_time_unresolved"
        | "publication_source_incomplete";
    };

export type ObservationKind =
  | "TIME_HISTORY_INCONSISTENT"
  | "SCHEDULE_UNMATCHED"
  | "SCHEDULE_AMBIGUOUS"
  | "CLOCK_IN_AFTER_SCHEDULE_START"
  | "CLOCK_OUT_BEFORE_SCHEDULE_END"
  | "OPEN_AFTER_SCHEDULE_END"
  | "BREAK_TARGET_EXCEEDED";

export type ObservationEvidence = {
  recordedAt?: string;
  expectedAt?: string;
  differenceNanoseconds?: string;
  targetMinutes?: number;
  revisionId?: string;
  publishedShiftId?: string;
  reason?: string;
};

export type Observation = {
  id: string;
  kind: ObservationKind;
  breakId: string | null;
  message: string;
  evidence: ObservationEvidence;
};

export type AttendanceGroup = {
  entryId: string;
  employeeId: string;
  locationId: string;
  sourceVersion: number;
  observations: readonly Observation[];
};

export type ReadyProjection = {
  state: "ready";
  engineVersion: 1;
  workspaceId: string;
  timeZone: string;
  observedAt: string;
  scope: {
    kind: "TODAY_AND_OPEN";
    localDate: string;
    dayStartAt: string;
  };
  groups: readonly AttendanceGroup[];
  recordCount: number;
  signalCount: number;
  affectedEmployeeCount: number;
  coverage: {
    state: "complete" | "limited";
    limitations: readonly ComparisonLimitation[];
    deferredCapabilities: readonly DeferredCapability[];
  };
};

export type AttendanceProjection = ReadyProjection | UnavailableProjection;
