import type {
  AttendanceSource,
  HistoricalShift,
  RecordedBreak,
  RecordedEntry,
} from "@/lib/attendance/types";

export function makeRecordedEntry(
  overrides: Partial<RecordedEntry> = {},
): RecordedEntry {
  return {
    id: "entry-1",
    workspaceId: "workspace-test",
    employeeId: "employee-1",
    locationId: "location-1",
    sourceVersion: 1,
    clockInAt: "2030-10-07T12:00:00Z",
    clockOutAt: null,
    status: "CLOCKED_IN",
    scheduleContext: null,
    breaks: [],
    ...overrides,
  };
}

export function makeHistoricalShift(
  overrides: Partial<HistoricalShift> = {},
): HistoricalShift {
  return {
    workspaceId: "workspace-test",
    employeeId: "employee-1",
    locationId: "location-1",
    revisionId: "revision-1",
    revisionNumber: 1,
    publishedShiftId: "published-shift-1",
    scheduleId: "schedule-1",
    sourceShiftId: "source-shift-1",
    date: "2030-10-07",
    startTime: "08:00:00",
    endTime: "16:00:00",
    isCalloutApproved: false,
    ...overrides,
  };
}

export function makeRecordedBreak(
  overrides: Partial<RecordedBreak> = {},
): RecordedBreak {
  return {
    id: "break-1",
    timeEntryId: "entry-1",
    startAt: "2030-10-07T13:00:00Z",
    endAt: null,
    breakTypeId: null,
    breakTypeSnapshot: null,
    ...overrides,
  };
}

export function makeAttendanceSource(
  overrides: Partial<AttendanceSource> = {},
): AttendanceSource {
  return {
    version: 1,
    workspaceId: "workspace-test",
    timeZone: "America/Puerto_Rico",
    observedAt: "2030-10-07T16:00:00Z",
    entries: [],
    publications: [],
    coverage: {
      entriesComplete: true,
      breaksComplete: true,
      publicationsComplete: true,
    },
    ...overrides,
  };
}
