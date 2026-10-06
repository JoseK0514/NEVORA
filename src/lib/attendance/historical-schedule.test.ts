import { describe, expect, it } from "vitest";
import {
  makeAttendanceSource,
  makeHistoricalShift,
  makeRecordedEntry,
} from "@/test/fixtures/attendance-exceptions";
import type { AttendanceSource, RecordedEntry } from "./types";
import { validateAttendanceSource } from "./validation";
import { resolveHistoricalSchedule } from "./historical-schedule";

function validated(
  entries = [makeRecordedEntry()],
  publications = [makeHistoricalShift()],
  extra: Record<string, unknown> = {},
) {
  const result = validateAttendanceSource(
    makeAttendanceSource({
      entries,
      publications,
      ...(extra as Partial<AttendanceSource>),
    }),
  );
  if ("state" in result) throw new Error(`fixture unavailable: ${result.reason}`);
  return result;
}

function matchedContext(
  entry: RecordedEntry,
  overrides: Record<string, unknown> = {},
) {
  return {
    version: 1,
    status: "MATCHED",
    timeZone: "America/Puerto_Rico",
    capturedAt: entry.clockInAt,
    candidateCount: 1,
    reviewedRevisionIds: ["revision-1"],
    reason: null,
    match: {
      revisionId: "revision-1",
      revisionNumber: 1,
      publishedShiftId: "published-shift-1",
      sourceShiftId: "source-shift-1",
      scheduleId: "schedule-1",
      positionId: null,
      positionName: null,
    },
    ...overrides,
  };
}

describe("D1.1 saved historical schedule resolution", () => {
  it('requires multiple candidates for saved OVERLAPPING_SHIFTS ambiguity',()=>{
    const entry=makeRecordedEntry();
    entry.scheduleContext={version:1,status:'AMBIGUOUS',timeZone:'America/Puerto_Rico',capturedAt:entry.clockInAt,candidateCount:1,reviewedRevisionIds:['revision-1'],reason:'OVERLAPPING_SHIFTS',match:null};
    const source=validated([entry]);
    expect(resolveHistoricalSchedule(source,source.entries[0])).toEqual({state:'not_evaluated',reason:'schedule_context_invalid'});
  });
  it("resolves only the exact saved immutable publication and ignores a newer revision", () => {
    const entry = makeRecordedEntry({
      clockInAt: "2030-10-07T13:07:00Z",
    });
    entry.scheduleContext = matchedContext(entry);
    const source = validated(
      [entry],
      [
        makeHistoricalShift(),
        makeHistoricalShift({
          revisionId: "revision-2",
          revisionNumber: 2,
          publishedShiftId: "published-shift-2",
          startTime: "10:00:00",
          endTime: "18:00:00",
        }),
      ],
    );

    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "matched",
      startAt: "2030-10-07T12:00:00Z",
      endAt: "2030-10-07T20:00:00Z",
      timeZone: "America/Puerto_Rico",
      revisionId: "revision-1",
      publishedShiftId: "published-shift-1",
    });
  });

  it.each([
    ["revisionId", "wrong-revision"],
    ["revisionNumber", 2],
    ["publishedShiftId", "wrong-published"],
    ["scheduleId", "wrong-schedule"],
    ["sourceShiftId", "wrong-source"],
  ] as const)(
    "withholds a MATCHED comparison when saved %s does not match the immutable row",
    (field, value) => {
      const entry = makeRecordedEntry();
      const base = matchedContext(entry);
      entry.scheduleContext = {
        ...base,
        ...(field === "revisionId"
          ? { reviewedRevisionIds: [String(value)] }
          : {}),
        match: { ...(base.match as object), [field]: value },
      };
      const source = validated([entry]);
      expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
        state: "not_evaluated",
        reason:
          field === "publishedShiftId"
            ? "schedule_reference_missing"
            : "schedule_reference_invalid",
      });
    },
  );

  it("rejects wrong employee/location/workspace identity and approved-callout contradictions", () => {
    for (const shift of [
      makeHistoricalShift({ employeeId: "employee-other" }),
      makeHistoricalShift({ locationId: "location-other" }),
      makeHistoricalShift({ workspaceId: "workspace-other" }),
      makeHistoricalShift({ isCalloutApproved: true }),
    ]) {
      const entry = makeRecordedEntry();
      entry.scheduleContext = matchedContext(entry);
      const sourceValue = makeAttendanceSource({
        entries: [entry],
        publications: [shift],
      });
      const validatedSource = validateAttendanceSource(sourceValue);
      if ("state" in validatedSource) {
        expect(validatedSource).toEqual({
          state: "unavailable",
          reason: "invalid_source",
        });
        continue;
      }
      expect(
        resolveHistoricalSchedule(validatedSource, validatedSource.entries[0]),
      ).toEqual({
        state: "not_evaluated",
        reason: "schedule_reference_invalid",
      });
    }
  });

  it("requires capturedAt to equal the real clock-in and the clock-in to satisfy Phase C half-open matching", () => {
    const mismatchedCapture = makeRecordedEntry();
    mismatchedCapture.scheduleContext = matchedContext(mismatchedCapture, {
      capturedAt: "2030-10-07T12:00:01Z",
    });
    let source = validated([mismatchedCapture]);
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "not_evaluated",
      reason: "schedule_context_invalid",
    });

    const outside = makeRecordedEntry({
      clockInAt: "2030-10-07T20:00:00Z",
    });
    outside.scheduleContext = matchedContext(outside);
    source = validated([outside]);
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "not_evaluated",
      reason: "schedule_reference_invalid",
    });
  });

  it("preserves null, malformed and incomplete historical evidence as explicit not-evaluated states", () => {
    const entry = makeRecordedEntry({ scheduleContext: null });
    let source = validated([entry], []);
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "not_evaluated",
      reason: "schedule_not_captured",
    });

    entry.scheduleContext = { version: 1, status: "MATCHED" };
    source = validated([entry], []);
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "not_evaluated",
      reason: "schedule_context_invalid",
    });

    entry.scheduleContext = matchedContext(entry);
    source = validated([entry], [], {
      coverage: {
        entriesComplete: true,
        breaksComplete: true,
        publicationsComplete: false,
      },
    });
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "not_evaluated",
      reason: "publication_source_incomplete",
    });
  });

  it("keeps an early 08:59 punch with saved UNMATCHED context neutral even beside a 09:00 shift", () => {
    const entry = makeRecordedEntry({
      clockInAt: "2030-10-07T12:59:00Z",
    });
    entry.scheduleContext = {
      version: 1,
      status: "UNMATCHED",
      timeZone: "America/Puerto_Rico",
      capturedAt: entry.clockInAt,
      candidateCount: 0,
      reviewedRevisionIds: ["revision-1"],
      reason: "NO_MATCH",
      match: null,
    };
    const source = validated(
      [entry],
      [makeHistoricalShift({ startTime: "09:00:00", endTime: "17:00:00" })],
    );
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "unmatched",
      reason: "NO_MATCH",
    });
  });

  it.each([
    "OVERLAPPING_SHIFTS",
    "UNRESOLVED_LOCAL_TIME",
  ] as const)("preserves saved AMBIGUOUS reason %s without choosing a shift", (reason) => {
    const entry = makeRecordedEntry();
    entry.scheduleContext = {
      version: 1,
      status: "AMBIGUOUS",
      timeZone: "America/Puerto_Rico",
      capturedAt: entry.clockInAt,
      candidateCount: 2,
      reviewedRevisionIds: ["revision-1"],
      reason,
      match: null,
    };
    const source = validated([entry]);
    expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
      state: "ambiguous",
      reason,
    });
  });

  it("resolves overnight and allowed 24:00 endings using the captured timezone", () => {
    const overnight = makeRecordedEntry({
      clockInAt: "2030-10-08T02:30:00Z",
    });
    overnight.scheduleContext = matchedContext(overnight);
    let source = validated(
      [overnight],
      [
        makeHistoricalShift({
          date: "2030-10-07",
          startTime: "22:00:00",
          endTime: "06:00:00",
        }),
      ],
    );
    expect(resolveHistoricalSchedule(source, source.entries[0])).toMatchObject({
      state: "matched",
      startAt: "2030-10-08T02:00:00Z",
      endAt: "2030-10-08T10:00:00Z",
    });

    const endOfDay = makeRecordedEntry();
    endOfDay.scheduleContext = matchedContext(endOfDay);
    source = validated(
      [endOfDay],
      [makeHistoricalShift({ endTime: "24:00:00" })],
    );
    expect(resolveHistoricalSchedule(source, source.entries[0])).toMatchObject({
      state: "matched",
      endAt: "2030-10-08T04:00:00Z",
    });
  });

  it("uses the captured schedule timezone even when the workspace observation timezone differs", () => {
    const entry = makeRecordedEntry({
      clockInAt: "2030-10-07T12:07:00Z",
    });
    entry.scheduleContext = matchedContext(entry, {
      timeZone: "America/New_York",
    });
    const source = validated(
      [entry],
      [makeHistoricalShift()],
      { timeZone: "America/Puerto_Rico" },
    );
    expect(resolveHistoricalSchedule(source, source.entries[0])).toMatchObject({
      state: "matched",
      startAt: "2030-10-07T12:00:00Z",
      endAt: "2030-10-07T20:00:00Z",
      timeZone: "America/New_York",
    });
  });

  it.each([
    ["2030-03-10", "02:30:00", "04:00:00", "2030-03-10T07:00:00Z"],
    ["2030-11-03", "01:30:00", "02:30:00", "2030-11-03T06:00:00Z"],
  ] as const)(
    "withholds a New York comparison for unresolved local time on %s",
    (date, startTime, endTime, clockInAt) => {
      const entry = makeRecordedEntry({ clockInAt });
      entry.scheduleContext = matchedContext(entry, {
        timeZone: "America/New_York",
      });
      const source = validated(
        [entry],
        [makeHistoricalShift({ date, startTime, endTime })],
      );
      expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
        state: "not_evaluated",
        reason: "schedule_time_unresolved",
      });
    },
  );

  it("rejects zero-length or invalid local schedule boundaries without guessing", () => {
    for (const shift of [
      makeHistoricalShift({ endTime: "08:00:00" }),
      makeHistoricalShift({ startTime: "25:00:00" }),
      makeHistoricalShift({ date: "2030-02-30" }),
    ]) {
      const entry = makeRecordedEntry();
      entry.scheduleContext = matchedContext(entry);
      const source = validated([entry], [shift]);
      expect(resolveHistoricalSchedule(source, source.entries[0])).toEqual({
        state: "not_evaluated",
        reason: "schedule_reference_invalid",
      });
    }
  });
});
