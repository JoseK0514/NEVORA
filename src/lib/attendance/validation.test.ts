import { describe, expect, it } from "vitest";
import {
  makeAttendanceSource,
  makeHistoricalShift,
  makeRecordedBreak,
  makeRecordedEntry,
} from "@/test/fixtures/attendance-exceptions";
import { validateAttendanceSource } from "./validation";

describe("D1.1 attendance source validation", () => {
  it.each([['CLOCKED_IN'], {toString:null}])('rejects non-string entry status without coercion or a thrown error: %j', status => {
    expect(validateAttendanceSource(makeAttendanceSource({entries:[{...makeRecordedEntry(),status} as unknown as ReturnType<typeof makeRecordedEntry>]})))
      .toEqual({state:'unavailable',reason:'invalid_source'});
  });
  it("accepts a complete empty synthetic source without turning empty into missing coverage", () => {
    expect(validateAttendanceSource(makeAttendanceSource())).toEqual(
      makeAttendanceSource(),
    );
  });

  it.each([
    null,
    {},
    { ...makeAttendanceSource(), version: 2 },
    { ...makeAttendanceSource(), workspaceId: "" },
    { ...makeAttendanceSource(), timeZone: "Invalid/Zone" },
    { ...makeAttendanceSource(), observedAt: "not-an-instant" },
    { ...makeAttendanceSource(), coverage: { entriesComplete: true } },
  ])("fails closed for an invalid envelope without reflecting source data: %j", (value) => {
    const result = validateAttendanceSource(value);
    expect(result).toEqual({ state: "unavailable", reason: "invalid_source" });
    expect(JSON.stringify(result)).not.toMatch(
      /workspace-test|employee-1|location-1/,
    );
  });

  it("requires complete entry and break coverage but permits limited publication coverage", () => {
    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          coverage: {
            entriesComplete: false,
            breaksComplete: true,
            publicationsComplete: true,
          },
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "incomplete_source" });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          coverage: {
            entriesComplete: true,
            breaksComplete: false,
            publicationsComplete: true,
          },
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "incomplete_source" });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          coverage: {
            entriesComplete: true,
            breaksComplete: true,
            publicationsComplete: false,
          },
        }),
      ),
    ).toMatchObject({
      version: 1,
      workspaceId: "workspace-test",
      coverage: { publicationsComplete: false },
    });
  });

  it("rejects unsafe workspace, entry, break and publication ownership without returning identities", () => {
    const result = validateAttendanceSource(
      makeAttendanceSource({
        entries: [
          makeRecordedEntry({
            workspaceId: "other-workspace",
            breaks: [makeRecordedBreak()],
          }),
        ],
        publications: [makeHistoricalShift()],
      }),
    );
    expect(result).toEqual({ state: "unavailable", reason: "invalid_source" });
    expect(JSON.stringify(result)).not.toMatch(
      /other-workspace|entry-1|employee-1/,
    );

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          entries: [
            makeRecordedEntry({
              breaks: [makeRecordedBreak({ timeEntryId: "other-entry" })],
            }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "invalid_source" });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          publications: [
            makeHistoricalShift({ workspaceId: "other-workspace" }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "invalid_source" });
  });

  it("rejects duplicate primary identities instead of silently replacing data", () => {
    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          entries: [
            makeRecordedEntry(),
            makeRecordedEntry({ employeeId: "employee-2" }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "invalid_source" });

    const repeatedBreak = makeRecordedBreak();
    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          entries: [
            makeRecordedEntry({ breaks: [repeatedBreak, repeatedBreak] }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "invalid_source" });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          publications: [
            makeHistoricalShift(),
            makeHistoricalShift({ employeeId: "employee-2" }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "invalid_source" });
  });

  it("enforces the explicit source bounds without silent truncation", () => {
    const entries = Array.from({ length: 500 }, (_, index) =>
      makeRecordedEntry({
        id: `entry-${index}`,
        employeeId: `employee-${index}`,
      }),
    );
    expect(
      validateAttendanceSource(makeAttendanceSource({ entries })),
    ).toMatchObject({ version: 1 });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          entries: [
            ...entries,
            makeRecordedEntry({
              id: "entry-over",
              employeeId: "employee-over",
            }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "source_limit" });

    const breaks = Array.from({ length: 5_000 }, (_, index) =>
      makeRecordedBreak({ id: `break-${index}` }),
    );
    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          entries: [makeRecordedEntry({ breaks })],
        }),
      ),
    ).toMatchObject({ version: 1 });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          entries: [
            makeRecordedEntry({
              breaks: [
                ...breaks,
                makeRecordedBreak({ id: "break-over" }),
              ],
            }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "source_limit" });

    const publications = Array.from({ length: 500 }, (_, index) =>
      makeHistoricalShift({
        publishedShiftId: `published-${index}`,
        sourceShiftId: `source-${index}`,
      }),
    );
    expect(
      validateAttendanceSource(makeAttendanceSource({ publications })),
    ).toMatchObject({ version: 1 });

    expect(
      validateAttendanceSource(
        makeAttendanceSource({
          publications: [
            ...publications,
            makeHistoricalShift({
              publishedShiftId: "published-over",
              sourceShiftId: "source-over",
            }),
          ],
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "source_limit" });
  });

  it("copies only declared fields while preserving attributable malformed time text for integrity review", () => {
    const rawEntry = {
      ...makeRecordedEntry({ clockInAt: "malformed-but-bounded" }),
      employeeName: "Private Name",
      phone: "555-0100",
      credentialHash: "secret",
    };
    const rawShift = {
      ...makeHistoricalShift(),
      employeeName: "Private Name",
      notes: "private",
    };
    const rawSource = {
      ...makeAttendanceSource({
        entries: [rawEntry],
        publications: [rawShift],
      }),
      databaseUrl: "secret",
      sessionHash: "private",
    };
    const result = validateAttendanceSource(rawSource);
    expect(result).toMatchObject({
      version: 1,
      entries: [{ clockInAt: "malformed-but-bounded" }],
    });
    expect(JSON.stringify(result)).not.toMatch(
      /Private Name|555-0100|credentialHash|databaseUrl|sessionHash|notes|secret/,
    );
  });
});
