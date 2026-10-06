import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  makeAttendanceSource,
  makeHistoricalShift,
  makeRecordedBreak,
  makeRecordedEntry,
} from "@/test/fixtures/attendance-exceptions";
import type { AttendanceSource, RecordedEntry } from "./types";
import { projectAttendance } from "./project";

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

function sourceWithMatchedEntry(
  entryOverrides: Partial<RecordedEntry> = {},
  sourceOverrides: Partial<AttendanceSource> = {},
) {
  const entry = makeRecordedEntry(entryOverrides);
  entry.scheduleContext = matchedContext(entry);
  return makeAttendanceSource({
    entries: [entry],
    publications: [makeHistoricalShift()],
    ...sourceOverrides,
  });
}

function ready(value: unknown) {
  const result = projectAttendance(value);
  if (result.state !== "ready") {
    throw new Error(`expected ready, got ${result.reason}`);
  }
  return result;
}

function kinds(value: unknown) {
  return ready(value).groups.flatMap((group) =>
    group.observations.map((observation) => observation.kind),
  );
}

describe("D1.1 factual recorded-time projection", () => {
  it("emits factual schedule observations without policy or disciplinary language", () => {
    const late = makeRecordedEntry({
      id: "entry-late",
      employeeId: "employee-late",
      clockInAt: "2030-10-07T12:07:00Z",
      clockOutAt: "2030-10-07T19:45:00Z",
      status: "CLOCKED_OUT",
    });
    late.scheduleContext = matchedContext(late);

    const open = makeRecordedEntry({
      id: "entry-open",
      employeeId: "employee-open",
      clockInAt: "2030-10-07T12:00:00Z",
    });
    const openContext = matchedContext(open);
    open.scheduleContext = {
      ...openContext,
      match: {
        ...(openContext.match as object),
        publishedShiftId: "published-shift-open",
        sourceShiftId: "source-shift-open",
      },
    };

    const result = ready(
      makeAttendanceSource({
        observedAt: "2030-10-07T20:00:00.000000001Z",
        entries: [late, open],
        publications: [
          makeHistoricalShift({ employeeId: "employee-late" }),
          makeHistoricalShift({
            employeeId: "employee-open",
            publishedShiftId: "published-shift-open",
            sourceShiftId: "source-shift-open",
          }),
        ],
      }),
    );

    expect(
      result.groups.map((group) => [
        group.entryId,
        group.observations.map((observation) => observation.kind),
      ]),
    ).toEqual([
      [
        "entry-late",
        [
          "CLOCK_IN_AFTER_SCHEDULE_START",
          "CLOCK_OUT_BEFORE_SCHEDULE_END",
        ],
      ],
      ["entry-open", ["OPEN_AFTER_SCHEDULE_END"]],
    ]);
    expect(JSON.stringify(result)).not.toMatch(
      /violation|absent|no-show|payable|unpaid|disciplin/i,
    );
    expect(result.groups[0].observations[0]).toMatchObject({
      message: "Clock-in recorded after scheduled start.",
      evidence: {
        recordedAt: "2030-10-07T12:07:00Z",
        expectedAt: "2030-10-07T12:00:00Z",
        differenceNanoseconds: "420000000000",
      },
    });
    expect(result.groups[1].observations[0]).toMatchObject({
      message: "No clock-out recorded · scheduled end passed.",
      evidence: {
        expectedAt: "2030-10-07T20:00:00Z",
        differenceNanoseconds: "1",
      },
    });
  });

  it("uses strict boundaries: exact schedule equality and exact break target do not trigger", () => {
    const entry = makeRecordedEntry({
      clockOutAt: "2030-10-07T20:00:00Z",
      status: "CLOCKED_OUT",
    });
    entry.scheduleContext = matchedContext(entry);
    let result = ready(
      makeAttendanceSource({
        observedAt: "2030-10-07T20:00:00Z",
        entries: [entry],
        publications: [makeHistoricalShift()],
      }),
    );
    expect(result.groups).toEqual([]);

    const breakAtTarget = makeRecordedBreak({
      timeEntryId: "entry-break",
      startAt: "2030-10-07T15:45:00Z",
      endAt: null,
      breakTypeId: "rest",
      breakTypeSnapshot: {
        id: "rest",
        version: 1,
        name: "Rest",
        category: "REST",
        targetMinutes: 15,
      },
    });
    const open = makeRecordedEntry({
      id: "entry-break",
      employeeId: "employee-break",
      status: "ON_BREAK",
      breaks: [breakAtTarget],
      scheduleContext: null,
    });
    result = ready(
      makeAttendanceSource({
        observedAt: "2030-10-07T16:00:00Z",
        entries: [open],
      }),
    );
    expect(result.groups).toEqual([]);
    expect(result.signalCount).toBe(0);
  });

  it("preserves a one-nanosecond positive schedule difference instead of rounding it to zero", () => {
    const entry = makeRecordedEntry({
      clockInAt: "2030-10-07T12:00:00.000000001Z",
    });
    entry.scheduleContext = matchedContext(entry);
    const result = ready(
      makeAttendanceSource({
        entries: [entry],
        publications: [makeHistoricalShift()],
      }),
    );
    expect(result.groups[0].observations[0]).toMatchObject({
      kind: "CLOCK_IN_AFTER_SCHEDULE_START",
      evidence: { differenceNanoseconds: "1" },
    });
  });

  it("keeps saved UNMATCHED and AMBIGUOUS contexts neutral and never selects a nearby shift", () => {
    const unmatched = makeRecordedEntry({
      id: "entry-unmatched",
      employeeId: "employee-unmatched",
      clockInAt: "2030-10-07T12:59:00Z",
    });
    unmatched.scheduleContext = {
      version: 1,
      status: "UNMATCHED",
      timeZone: "America/Puerto_Rico",
      capturedAt: unmatched.clockInAt,
      candidateCount: 0,
      reviewedRevisionIds: ["revision-1"],
      reason: "NO_MATCH",
      match: null,
    };
    const ambiguous = makeRecordedEntry({
      id: "entry-ambiguous",
      employeeId: "employee-ambiguous",
    });
    ambiguous.scheduleContext = {
      version: 1,
      status: "AMBIGUOUS",
      timeZone: "America/Puerto_Rico",
      capturedAt: ambiguous.clockInAt,
      candidateCount: 2,
      reviewedRevisionIds: ["revision-1"],
      reason: "OVERLAPPING_SHIFTS",
      match: null,
    };
    const result = ready(
      makeAttendanceSource({
        entries: [unmatched, ambiguous],
        publications: [
          makeHistoricalShift({ startTime: "09:00:00", endTime: "17:00:00" }),
        ],
      }),
    );
    expect(result.groups.map((group) => group.observations[0].kind)).toEqual([
      "SCHEDULE_AMBIGUOUS",
      "SCHEDULE_UNMATCHED",
    ]);
    expect(
      result.groups
        .flatMap((group) =>
          group.observations.map((observation) => observation.message),
        )
        .join(" "),
    ).not.toMatch(/late|absent|no-show/i);
  });

  it("uses a valid saved break target and does not substitute null or current catalogue policy", () => {
    const exceeded = makeRecordedBreak({
      breakTypeId: "rest",
      startAt: "2030-10-07T15:40:00Z",
      breakTypeSnapshot: {
        id: "rest",
        version: 2,
        name: "Original rest",
        category: "REST",
        targetMinutes: 15,
        currentTargetMinutes: 30,
      },
    });
    const entry = makeRecordedEntry({
      status: "ON_BREAK",
      breaks: [exceeded],
      scheduleContext: null,
    });
    let result = ready(makeAttendanceSource({ entries: [entry] }));
    expect(result.groups[0].observations).toEqual([
      expect.objectContaining({
        kind: "BREAK_TARGET_EXCEEDED",
        breakId: "break-1",
        message: "Open break exceeded saved target.",
        evidence: {
          recordedAt: "2030-10-07T16:00:00Z",
          expectedAt: "2030-10-07T15:55:00Z",
          differenceNanoseconds: "300000000000",
          targetMinutes: 15,
        },
      }),
    ]);

    const noTarget = {
      ...exceeded,
      breakTypeSnapshot: {
        id: "rest",
        version: 2,
        name: "Original rest",
        category: "REST",
        targetMinutes: null,
      },
    };
    result = ready(
      makeAttendanceSource({
        entries: [makeRecordedEntry({ status: "ON_BREAK", breaks: [noTarget] })],
      }),
    );
    expect(kinds(makeAttendanceSource({
      entries: [makeRecordedEntry({ status: "ON_BREAK", breaks: [noTarget] })],
    }))).not.toContain("BREAK_TARGET_EXCEEDED");
    expect(result.coverage.limitations).toContainEqual({
      entryId: "entry-1",
      breakId: "break-1",
      reason: "break_target_not_captured",
    });
  });

  it("marks malformed, future and contradictory attributable history inconsistent and suppresses derived observations", () => {
    const cases = [
      makeRecordedEntry({ clockInAt: "malformed" }),
      makeRecordedEntry({ clockInAt: "2030-10-08T12:00:00Z" }),
      makeRecordedEntry({
        clockOutAt: "2030-10-07T11:00:00Z",
        status: "CLOCKED_OUT",
      }),
      makeRecordedEntry({
        clockOutAt: null,
        status: "CLOCKED_OUT",
      }),
      makeRecordedEntry({
        status: "ON_BREAK",
        breaks: [],
      }),
      makeRecordedEntry({
        breaks: [
          makeRecordedBreak({
            startAt: "2030-10-07T11:00:00Z",
            endAt: "2030-10-07T11:30:00Z",
          }),
        ],
      }),
      makeRecordedEntry({
        breaks: [
          makeRecordedBreak({
            startAt: "2030-10-07T13:00:00Z",
            endAt: "2030-10-07T14:00:00Z",
          }),
          makeRecordedBreak({
            id: "break-2",
            startAt: "2030-10-07T13:30:00Z",
            endAt: "2030-10-07T14:30:00Z",
          }),
        ],
      }),
    ];

    for (const raw of cases) {
      const entry = { ...raw };
      entry.scheduleContext = matchedContext(entry);
      const result = ready(
        makeAttendanceSource({
          entries: [entry],
          publications: [makeHistoricalShift()],
        }),
      );
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].observations).toEqual([
        expect.objectContaining({
          kind: "TIME_HISTORY_INCONSISTENT",
          message: "Time record needs review.",
          evidence: { reason: "time_history_inconsistent" },
        }),
      ]);
      expect(JSON.stringify(result.groups[0])).not.toMatch(
        /differenceNanoseconds|recordedAt|expectedAt/,
      );
    }
  });

  it("detects overlapping entries and duplicate open entries across locations for the same employee", () => {
    const first = makeRecordedEntry({
      id: "entry-a",
      locationId: "location-a",
      clockOutAt: "2030-10-07T15:00:00Z",
      status: "CLOCKED_OUT",
      scheduleContext: null,
    });
    const second = makeRecordedEntry({
      id: "entry-b",
      locationId: "location-b",
      clockInAt: "2030-10-07T14:00:00Z",
      scheduleContext: null,
    });
    let result = ready(makeAttendanceSource({ entries: [first, second] }));
    expect(
      result.groups.map((group) => [
        group.entryId,
        group.observations.map((observation) => observation.kind),
      ]),
    ).toEqual([
      ["entry-a", ["TIME_HISTORY_INCONSISTENT"]],
      ["entry-b", ["TIME_HISTORY_INCONSISTENT"]],
    ]);

    const openA = makeRecordedEntry({
      id: "open-a",
      locationId: "location-a",
      scheduleContext: null,
    });
    const openB = makeRecordedEntry({
      id: "open-b",
      locationId: "location-b",
      clockInAt: "2030-10-07T14:00:00Z",
      scheduleContext: null,
    });
    result = ready(makeAttendanceSource({ entries: [openA, openB] }));
    expect(
      result.groups.every(
        (group) =>
          group.observations[0].kind === "TIME_HISTORY_INCONSISTENT",
      ),
    ).toBe(true);
  });

  it("allows closed entries to touch at a boundary without treating them as overlapping", () => {
    const first = makeRecordedEntry({
      id: "entry-a",
      clockOutAt: "2030-10-07T14:00:00Z",
      status: "CLOCKED_OUT",
      scheduleContext: null,
    });
    const second = makeRecordedEntry({
      id: "entry-b",
      clockInAt: "2030-10-07T14:00:00Z",
      clockOutAt: "2030-10-07T15:00:00Z",
      status: "CLOCKED_OUT",
      scheduleContext: null,
    });
    const result = ready(makeAttendanceSource({ entries: [first, second] }));
    expect(result.groups).toEqual([]);
    expect(result.coverage.limitations).toEqual([
      {
        entryId: "entry-a",
        breakId: null,
        reason: "schedule_not_captured",
      },
      {
        entryId: "entry-b",
        breakId: null,
        reason: "schedule_not_captured",
      },
    ]);
  });

  it("scopes to Today plus every open entry across midnight and excludes closed history before the day", () => {
    const oldOpen = makeRecordedEntry({
      id: "old-open",
      employeeId: "old-open",
      clockInAt: "2030-10-04T12:00:00Z",
      scheduleContext: {
        version: 1,
        status: "UNMATCHED",
        timeZone: "America/Puerto_Rico",
        capturedAt: "2030-10-04T12:00:00Z",
        candidateCount: 0,
        reviewedRevisionIds: [],
        reason: "NO_MATCH",
        match: null,
      },
    });
    const yesterdayClosed = makeRecordedEntry({
      id: "old-closed",
      employeeId: "old-closed",
      clockInAt: "2030-10-06T12:00:00Z",
      clockOutAt: "2030-10-06T16:00:00Z",
      status: "CLOCKED_OUT",
      scheduleContext: null,
    });
    const today = makeRecordedEntry({
      id: "today",
      employeeId: "today",
      scheduleContext: {
        version: 1,
        status: "UNMATCHED",
        timeZone: "America/Puerto_Rico",
        capturedAt: "2030-10-07T12:00:00Z",
        candidateCount: 0,
        reviewedRevisionIds: [],
        reason: "NO_MATCH",
        match: null,
      },
    });
    const result = ready(
      makeAttendanceSource({
        entries: [yesterdayClosed, today, oldOpen],
      }),
    );
    expect(result.scope).toEqual({
      kind: "TODAY_AND_OPEN",
      localDate: "2030-10-07",
      dayStartAt: "2030-10-07T04:00:00Z",
    });
    expect(result.groups.map((group) => group.entryId)).toEqual([
      "old-open",
      "today",
    ]);
    expect(
      result.coverage.limitations.some(
        (limitation) => limitation.entryId === "old-closed",
      ),
    ).toBe(false);
  });

  it.each([
    ["America/New_York", "2030-03-10T16:00:00Z", "2030-03-10T05:00:00Z"],
    ["America/New_York", "2030-11-03T17:00:00Z", "2030-11-03T04:00:00Z"],
  ] as const)(
    "derives the real %s local-day start across DST without assuming 24 hours",
    (timeZone, observedAt, dayStartAt) => {
      expect(
        ready(
          makeAttendanceSource({
            timeZone,
            observedAt,
          }),
        ).scope.dayStartAt,
      ).toBe(dayStartAt);
    },
  );

  it("retains explicit limitations for missing historical evidence and deferred capabilities", () => {
    const entry = makeRecordedEntry({ scheduleContext: null });
    const result = ready(makeAttendanceSource({ entries: [entry] }));
    expect(result.groups).toEqual([]);
    expect(result.coverage).toEqual({
      state: "limited",
      limitations: [
        {
          entryId: "entry-1",
          breakId: null,
          reason: "schedule_not_captured",
        },
      ],
      deferredCapabilities: [
        "missing_clock_in",
        "policy_lateness",
        "policy_early_departure",
        "unusually_long_entry",
        "correction_review",
        "overtime_risk",
      ],
    });
  });

  it("distinguishes entry groups, signals and affected people", () => {
    const first = makeRecordedEntry({
      id: "a",
      clockInAt: "2030-10-07T12:07:00Z",
      clockOutAt: "2030-10-07T19:45:00Z",
      status: "CLOCKED_OUT",
    });
    first.scheduleContext = matchedContext(first);
    const second = makeRecordedEntry({
      id: "b",
      clockInAt: "2030-10-07T19:45:00Z",
    });
    second.scheduleContext = {
      version: 1,
      status: "UNMATCHED",
      timeZone: "America/Puerto_Rico",
      capturedAt: second.clockInAt,
      candidateCount: 0,
      reviewedRevisionIds: [],
      reason: "NO_MATCH",
      match: null,
    };
    const result = ready(
      makeAttendanceSource({
        observedAt: "2030-10-07T20:00:00Z",
        entries: [first, second],
        publications: [makeHistoricalShift()],
      }),
    );
    expect(result).toMatchObject({
      recordCount: 2,
      signalCount: 3,
      affectedEmployeeCount: 1,
    });
  });

  it("produces deterministic stable output across array order and observation refresh while input remains untouched", () => {
    const a = makeRecordedEntry({
      id: "a",
      employeeId: "a",
      scheduleContext: {
        version: 1,
        status: "UNMATCHED",
        timeZone: "America/Puerto_Rico",
        capturedAt: "2030-10-07T12:00:00Z",
        candidateCount: 0,
        reviewedRevisionIds: [],
        reason: "NO_MATCH",
        match: null,
      },
    });
    const b = makeRecordedEntry({
      id: "b",
      employeeId: "b",
      clockInAt: "2030-10-07T13:00:00Z",
      scheduleContext: {
        version: 1,
        status: "AMBIGUOUS",
        timeZone: "America/Puerto_Rico",
        capturedAt: "2030-10-07T13:00:00Z",
        candidateCount: 2,
        reviewedRevisionIds: [],
        reason: "OVERLAPPING_SHIFTS",
        match: null,
      },
    });
    const source = makeAttendanceSource({ entries: [b, a] });
    const frozen = structuredClone(source);
    const first = ready(source);
    expect(source).toEqual(frozen);

    const reordered = ready(
      makeAttendanceSource({ entries: [a, b] }),
    );
    expect(first).toEqual(reordered);

    const refreshed = ready(
      makeAttendanceSource({
        observedAt: "2030-10-07T16:01:00Z",
        entries: [a, b],
      }),
    );
    expect(
      refreshed.groups.flatMap((group) =>
        group.observations.map((observation) => observation.id),
      ),
    ).toEqual(
      first.groups.flatMap((group) =>
        group.observations.map((observation) => observation.id),
      ),
    );
  });

  it("returns a ready complete empty result only for successfully evaluated implemented checks", () => {
    const result = ready(makeAttendanceSource());
    expect(result).toMatchObject({
      groups: [],
      recordCount: 0,
      signalCount: 0,
      affectedEmployeeCount: 0,
      coverage: { state: "complete", limitations: [] },
    });
    expect(result.coverage.deferredCapabilities).toHaveLength(6);
  });

  it("propagates incomplete and over-cap source states instead of returning a healthy-looking empty result", () => {
    expect(
      projectAttendance(
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
      projectAttendance(
        makeAttendanceSource({
          entries: Array.from({ length: 501 }, (_, index) =>
            makeRecordedEntry({
              id: `entry-${index}`,
              employeeId: `employee-${index}`,
            }),
          ),
        }),
      ),
    ).toEqual({ state: "unavailable", reason: "source_limit" });
  });

  it("drops arbitrary private source fields from projection output", () => {
    const entry = {
      ...makeRecordedEntry({
        scheduleContext: {
          version: 1,
          status: "UNMATCHED",
          timeZone: "America/Puerto_Rico",
          capturedAt: "2030-10-07T12:00:00Z",
          candidateCount: 0,
          reviewedRevisionIds: [],
          reason: "NO_MATCH",
          match: null,
        },
      }),
      employeeName: "Private Name",
      phone: "555-0100",
      notes: "medical",
      sessionHash: "secret",
    };
    const result = projectAttendance(
      {
        ...makeAttendanceSource({ entries: [entry] }),
        databaseUrl: "secret",
      },
    );
    expect(JSON.stringify(result)).not.toMatch(
      /Private Name|555-0100|medical|sessionHash|databaseUrl|secret/,
    );
  });

  it("does not use inactivity metadata to erase a real open record", () => {
    const entry = {
      ...makeRecordedEntry({
        scheduleContext: {
          version: 1,
          status: "UNMATCHED",
          timeZone: "America/Puerto_Rico",
          capturedAt: "2030-10-07T12:00:00Z",
          candidateCount: 0,
          reviewedRevisionIds: [],
          reason: "NO_MATCH",
          match: null,
        },
      }),
      employeeActive: false,
      locationActive: false,
      deviceActive: false,
    };
    expect(
      ready(makeAttendanceSource({ entries: [entry] })).groups.map(
        (group) => group.entryId,
      ),
    ).toEqual(["entry-1"]);
  });

  it("limits schedule comparison honestly when publication coverage is incomplete", () => {
    const entry = makeRecordedEntry();
    entry.scheduleContext = matchedContext(entry);
    const result = ready(
      makeAttendanceSource({
        entries: [entry],
        publications: [],
        coverage: {
          entriesComplete: true,
          breaksComplete: true,
          publicationsComplete: false,
        },
      }),
    );
    expect(result.groups).toEqual([]);
    expect(result.coverage.limitations).toContainEqual({
      entryId: "entry-1",
      breakId: null,
      reason: "publication_source_incomplete",
    });
  });
});


it("serializes precise attendance differences as decimal strings without bigint payloads", () => {
  const entry = makeRecordedEntry({
    clockInAt: "2030-10-07T12:00:00.000000001Z",
  });
  entry.scheduleContext = matchedContext(entry);
  const result = projectAttendance(
    makeAttendanceSource({
      entries: [entry],
      publications: [makeHistoricalShift()],
    }),
  );
  expect(() => JSON.stringify(result)).not.toThrow();
  const json = JSON.stringify(result);
  expect(json).toContain('"differenceNanoseconds":"1"');
  expect(json).not.toMatch(/differenceNanoseconds[^}]*n["}]/);
});

it("keeps all D1.1 runtime modules inside the approved pure dependency and effect boundary", () => {
  const files = [
    "types.ts",
    "validation.ts",
    "historical-schedule.ts",
    "project.ts",
    "format.ts",
  ];
  const allowedRuntimeImports = new Set([
    "@js-temporal/polyfill",
    "./types",
    "./validation",
    "./historical-schedule",
    "./project",
    "./format",
  ]);
  const forbidden: string[] = [];

  const visit = (file: string, node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const moduleName = ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier.text
        : "";
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const onlyTypeSpecifiers =
        Boolean(named) &&
        ts.isNamedImports(named!) &&
        named!.elements.length > 0 &&
        named!.elements.every((element) => element.isTypeOnly);
      const runtimeImport =
        !clause ||
        (!clause.isTypeOnly &&
          Boolean(clause.name || !onlyTypeSpecifiers));
      if (runtimeImport && !allowedRuntimeImports.has(moduleName)) {
        forbidden.push(`${file}:runtime-import:${moduleName}`);
      }
    }

    if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        forbidden.push(`${file}:dynamic-import`);
      }
      if (
        ts.isIdentifier(node.expression) &&
        ["require", "fetch", "setTimeout", "setInterval"].includes(
          node.expression.text,
        )
      ) {
        forbidden.push(`${file}:call:${node.expression.text}`);
      }
      if (
        ts.isPropertyAccessExpression(node.expression) &&
        ((node.expression.expression.getText() === "Date" &&
          node.expression.name.text === "now") ||
          (node.expression.expression.getText() === "Math" &&
            node.expression.name.text === "random") ||
          (node.expression.expression.getText() === "Temporal" &&
            node.expression.name.text === "Now"))
      ) {
        forbidden.push(`${file}:clock-or-random:${node.expression.getText()}`);
      }
    }

    if (
      ts.isIdentifier(node) &&
      [
        "window",
        "document",
        "localStorage",
        "sessionStorage",
        "navigator",
      ].includes(node.text)
    ) {
      forbidden.push(`${file}:browser-global:${node.text}`);
    }

    ts.forEachChild(node, (child) => visit(file, child));
  };

  for (const file of files) {
    const sourceText = readFileSync(
      join(process.cwd(), "src/lib/attendance", file),
      "utf8",
    );
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.ES2017,
      true,
      ts.ScriptKind.TS,
    );
    visit(file, source);
  }

  expect(forbidden).toEqual([]);
});


describe("D1.1 final author-review regressions", () => {
  it("keeps incomplete publication coverage explicit for an empty snapshot", () => {
    const result = ready(makeAttendanceSource({
      coverage: { entriesComplete: true, breaksComplete: true, publicationsComplete: false },
    }));
    expect(result.groups).toEqual([]);
    expect(result.coverage.state).toBe("limited");
  });

  it("preserves known schedule facts without declaring incomplete publications complete", () => {
    const source = sourceWithMatchedEntry({ clockInAt: "2030-10-07T12:07:00Z" }, {
      coverage: { entriesComplete: true, breaksComplete: true, publicationsComplete: false },
    });
    const result = ready(source);
    const complete = ready({ ...source, coverage: { ...source.coverage, publicationsComplete: true } });
    expect(result.groups).toEqual(complete.groups);
    expect(result.coverage.state).toBe("limited");
    expect(result.coverage.limitations).toContainEqual({
      entryId: "entry-1", breakId: null, reason: "publication_source_incomplete",
    });
  });

  it.each([
    ["2030-10-07T16:00:00Z", "2030-10-07T16:00:00Z"],
    ["2030-10-07T12:00:00Z", "2030-10-07T16:00:00Z"],
    ["invalid-instant", "2030-10-07T16:00:00Z"],
  ])("detects competing open entries even at zero duration or invalid times: %s / %s", (first, second) => {
    const result = ready(makeAttendanceSource({ entries: [
      makeRecordedEntry({ id: "qa-open-a", clockInAt: first }),
      makeRecordedEntry({ id: "qa-open-b", locationId: "location-2", clockInAt: second }),
    ] }));
    expect(result.groups.map(group => [group.entryId, group.observations.map(item => item.kind)])).toEqual([
      ["qa-open-a", ["TIME_HISTORY_INCONSISTENT"]],
      ["qa-open-b", ["TIME_HISTORY_INCONSISTENT"]],
    ]);
    expect(result.affectedEmployeeCount).toBe(1);
    for (const group of result.groups) {
      expect(group.observations[0].evidence).toEqual({ reason: "time_history_inconsistent" });
    }
  });

  it.each([
    ["2030-10-07T17:00:00Z", "2030-10-07T18:00:00Z"],
    ["2030-10-08T12:00:00Z", "2030-10-08T20:00:00Z"],
  ])("does not hide an impossible future closed record behind the view filter: %s", (start, end) => {
    const result = ready(makeAttendanceSource({ entries: [makeRecordedEntry({
      clockInAt: start, clockOutAt: end, status: "CLOCKED_OUT",
    })] }));
    expect(result.groups.map(group => group.observations.map(item => item.kind))).toEqual([
      ["TIME_HISTORY_INCONSISTENT"],
    ]);
    expect(result.groups[0].observations[0].evidence).toEqual({ reason: "time_history_inconsistent" });
    expect(result.coverage.state).toBe("limited");
  });

  it("does not mistake a touching closed entry and current open entry for duplicate open history", () => {
    const result = ready(makeAttendanceSource({ entries: [
      makeRecordedEntry({ id: "qa-closed", clockInAt: "2030-10-07T12:00:00Z", clockOutAt: "2030-10-07T16:00:00Z", status: "CLOCKED_OUT" }),
      makeRecordedEntry({ id: "qa-open", clockInAt: "2030-10-07T16:00:00Z" }),
    ] }));
    expect(result.groups).toEqual([]);
  });

  it.each(["+00:00", "-04:00"])("requires a named workspace timezone rather than a fixed offset: %s", timeZone => {
    expect(projectAttendance(makeAttendanceSource({ timeZone }))).toEqual({
      state: "unavailable", reason: "invalid_source",
    });
  });

  it("preserves valid captured fixed-offset history instead of applying the current workspace-zone restriction to it", () => {
    const entry = makeRecordedEntry();
    entry.scheduleContext = matchedContext(entry, { timeZone: "-04:00" });
    const result = ready(makeAttendanceSource({ entries: [entry], publications: [makeHistoricalShift()] }));
    expect(result.groups).toEqual([]);
    expect(result.coverage.state).toBe("complete");
  });

  it("does not overflow the supported instant range for an ordinary break still within its target", () => {
    const source = makeAttendanceSource({
      timeZone: "UTC", observedAt: "+275760-09-13T00:00:00Z",
      entries: [makeRecordedEntry({
        clockInAt: "+275760-09-12T23:00:00Z", status: "ON_BREAK",
        breaks: [makeRecordedBreak({
          startAt: "+275760-09-13T00:00:00Z", breakTypeId: "qa-break",
          breakTypeSnapshot: { id: "qa-break", version: 1, name: "Fictional break", category: "REST", targetMinutes: 15 },
        })],
      })],
    });
    expect(() => projectAttendance(source)).not.toThrow();
    expect(ready(source).groups).toEqual([]);
  });
});
