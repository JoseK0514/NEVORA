vi.mock("server-only", () => ({}));
import {readFile} from "node:fs/promises";
import { createHash } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createDisposableFoundationDatabase } from "./local-postgres";
import {
  listTemplateShifts,
  archiveScheduleTemplate,
} from "../../lib/data/schedule-templates";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const hash = createHash("sha256")
  .update("fictional-local-manager")
  .digest("hex");
const proof = {
  employee: { id: "owner", role: "OWNER" },
  sessionTokenHash: hash,
} as SessionMutationProof;
beforeAll(async () => {
  db = await createDisposableFoundationDatabase({ mode: "current-runtime" });
  await db.executor
    .query({
      text: `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','5550000001','OWNER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',clock_timestamp()+interval '1 day');`,
      values: [hash],
    })
    .catch(async () => {
      await db.executor.query({
        text: `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','5550000001','OWNER','loc-1') ON CONFLICT DO NOTHING`,
        values: [],
      });
      await db.executor.query({
        text: `INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',clock_timestamp()+interval '1 day')`,
        values: [hash],
      });
    });
  // This complete operational fixture explicitly adopts its preexisting Owner.
  for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await db.executor.query({text:await readFile('db/migrations/'+file,'utf8'),values:[]});
});
afterAll(async () => {
  await db?.dispose();
});
it("refuses selected template reads with a revoked current session", async () => {
  await db.executor.query({
    text: `INSERT INTO schedule_templates(id,name,created_by) VALUES('empty','Empty','owner')`,
    values: [],
  });
  expect(await listTemplateShifts("empty", db.executor, proof)).toEqual([]);
  const revoked = { ...proof, sessionTokenHash: "f".repeat(64) };
  await expect(
    listTemplateShifts("empty", db.executor, revoked),
  ).rejects.toThrow();
});
it("archives only with current authority and makes an archived template unavailable", async () => {
  await expect(
    archiveScheduleTemplate(
      "empty",
      { ...proof, sessionTokenHash: "f".repeat(64) },
      db.executor,
    ),
  ).rejects.toThrow();
  expect(await listTemplateShifts("empty", db.executor, proof)).toEqual([]);
  await archiveScheduleTemplate("empty", proof, db.executor);
  expect(await listTemplateShifts("empty", db.executor, proof)).toBeNull();
});

import { executeScheduleCopy } from "../../lib/data/schedule-copy";
import { randomUUID } from "node:crypto";
import type { SqlExecutor } from "../../lib/notifications/types";
it("an archived template has a durable terminal receipt and exact retry never blocks a fresh operation", async () => {
  const command = { operationId: randomUUID(), kind: "TEMPLATE", templateId: "empty", weekStart: "2030-10-07" };
  const receipt = await executeScheduleCopy(proof, command, db.executor);
  expect(receipt).toMatchObject({ operationId: command.operationId, rows: [], reason: "TEMPLATE_UNAVAILABLE" });
  expect(await executeScheduleCopy(proof, command, db.executor)).toEqual(receipt);
  expect(await db.executor.query({ text: "SELECT id FROM schedules WHERE week_start=$1", values: [command.weekStart] })).toEqual([]);
});
it("copy commits one shift and retains original receipt after lost response, retry, source deletion and changed-command conflict", async () => {
  await db.executor.query({
    text: `INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('worker','Fictional','Worker','5550000002','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('worker','loc-1'); INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('available','worker',1,'08:00','20:00'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('prior','loc-1','2030-09-30','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('original','prior','worker','2030-09-30','08:00','12:00');`,
    values: [],
  });
  const command = {
    operationId: randomUUID(),
    weekStart: "2030-10-07",
    kind: "PREVIOUS_WEEK",
  };
  let lost = false;
  const transport = {
    query: db.executor.query,
    transaction: async (
      statements: Parameters<typeof db.executor.transaction>[0],
    ) => {
      const result = await db.executor.transaction(statements);
      if (
        !lost &&
        statements.some((s) =>
          s.text.includes("INSERT INTO schedule_copy_receipts"),
        )
      ) {
        lost = true;
        throw new Error("Response lost after commit");
      }
      return result;
    },
  };
  const result = await executeScheduleCopy(proof, command, transport);
  expect(lost).toBe(true);
  expect(result.rows).toEqual([
    expect.objectContaining({
      status: "COMMITTED",
      shiftId: expect.any(String),
      employeeName:'Fictional Worker',date:'2030-10-07',startTime:'08:00',endTime:'12:00',locationName:expect.any(String),
    }),
  ]);
  await db.executor.query({
    text: "DELETE FROM shifts WHERE id='original' OR id=$1",
    values: [result.rows[0].shiftId],
  });
  expect(await executeScheduleCopy(proof, command, db.executor)).toEqual(
    result,
  );
  await expect(
    executeScheduleCopy(
      proof,
      { ...command, weekStart: "2030-10-14" },
      db.executor,
    ),
  ).rejects.toThrow(/CONFLICT/);
});

import { saveCompanyPolicy } from "../../lib/business-improvements/company-policies/service";
it("Owner policy writes replay immutable original revisions and reject stale, changed commands and revoked sessions", async () => {
  const command = {
    operationId: randomUUID(),
    expectedRevision: 0,
    locationId: null,
    settings: {
      version: 1,
      attendance: {
        lateness: {
          thresholdMinutes: 5,
          comparison: "GT",
          effectiveFrom: "2030-01-01T00:00:00Z",
        },
      },
    },
  };
  const saved = await saveCompanyPolicy(proof, command, db.executor);
  expect(saved.revision).toBe(1);
  expect(await saveCompanyPolicy(proof, command, db.executor)).toEqual(saved);
  await expect(
    saveCompanyPolicy(
      proof,
      { ...command, settings: { version: 1 } },
      db.executor,
    ),
  ).rejects.toThrow(/conflict/i);
  await expect(
    saveCompanyPolicy(
      proof,
      { ...command, operationId: randomUUID() },
      db.executor,
    ),
  ).rejects.toThrow(/conflict/i);
  await expect(
    saveCompanyPolicy(
      { ...proof, sessionTokenHash: "f".repeat(64) },
      command,
      db.executor,
    ),
  ).rejects.toThrow();
});

import { readAttendancePolicies } from "../../lib/business-improvements/attendance-policy/service";
it("actual attendance source publishes six configured or explicit unconfigured detector states with immutable observations", async () => {
  const result = await readAttendancePolicies(proof, db.executor);
  expect(result.state).toBe("ready");
  if (result.state === "ready") {
    expect(result.locations.length).toBeGreaterThan(0);
    expect(result.locations[0].detectors).toHaveLength(6);
    expect(
      result.locations[0].detectors.find((d) => d.kind === "missing_clock_in")
        ?.reason,
    ).toBe("policy_not_selected");
    expect(result.validForMs).toBeGreaterThan(0);
    expect(
      await db.executor.query({
        text: "SELECT id FROM attendance_policy_observations WHERE id=$1::uuid",
        values: [result.observationId],
      }),
    ).toHaveLength(1);
  }
  expect(
    (
      await readAttendancePolicies(
        { ...proof, sessionTokenHash: "f".repeat(64) },
        db.executor,
      )
    ).state,
  ).toBe("unavailable");
});

import { readPeriodClose } from "../../lib/period-close/service";
it("populated attendance reads captured published lateness and effective elapsed time; source and policy drift fail closed", async () => {
  const [timing] = await db.executor.query<{
    date: string;
    week: string;
    clockIn: string;
    start: string;
    end: string;
  }>({
    text: `WITH d AS (SELECT ((clock_timestamp() AT TIME ZONE time_zone)::date-1) AS day,time_zone FROM workspaces)
      SELECT day::text AS date,date_trunc('week',day)::date::text AS week,
      ((day+time '08:10') AT TIME ZONE time_zone)::text AS "clockIn",
      ((day+time '08:00') AT TIME ZONE time_zone)::text AS start,
      ((day+time '12:00') AT TIME ZONE time_zone)::text AS "end" FROM d`,
    values: [],
  });
  await db.executor.transaction([
    { text: "INSERT INTO clocker_devices(id,location_id,name) VALUES('policy-device','loc-2','Fictional policy device')", values: [] },
    { text: "INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('policy-schedule','loc-2',$1,'owner','PUBLISHED')", values: [timing.week] },
    { text: "INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('policy-publication',$1,1,'PUBLISH','owner')", values: [timing.week] },
  ]);
  await db.executor.query({
    text: `INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('policy-published-shift','policy-publication','policy-source','policy-schedule','loc-2','worker',$1,'08:00','12:00')`,
    values: [timing.date],
  });
  const candidate = {
    revisionId: "policy-publication", revisionNumber: 1,
    publishedShiftId: "policy-published-shift", sourceShiftId: "policy-source",
    scheduleId: "policy-schedule", positionId: null, positionName: null,
    startAt: timing.start, endAt: timing.end, uncertain: false,
  };
  await db.executor.transaction([
    {
      text: "SELECT set_config('nevora.clocker_schedule_capture',$1,true)",
      values: [JSON.stringify({
        version: 1, employeeId: "worker", locationId: "loc-2",
        workspaceId: "workspace-fuel", timeZone: "America/Puerto_Rico",
        windowStartAt: timing.start, windowEndAt: timing.end,
        reviewedRevisionIds: ["policy-publication"], candidates: [candidate],
      })],
    },
    {
      text: "INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('policy-punch','worker','loc-2','policy-device',$1,'CLOCKED_IN')",
      values: [timing.clockIn],
    },
  ]);
  const settings = {
    version: 1,
    attendance: {
      lateness: { thresholdMinutes: 5, comparison: "GT", effectiveFrom: "2020-01-01T00:00:00Z" },
      longEntry: { thresholdMinutes: 60, comparison: "GT", effectiveFrom: "2020-01-01T00:00:00Z", basis: "EFFECTIVE_ELAPSED", appliesTo: "OPEN" },
    },
  };
  await saveCompanyPolicy(proof, {
    operationId: randomUUID(), locationId: "loc-2", expectedRevision: 0, settings,
  }, db.executor);
  const result = await readAttendancePolicies(proof, db.executor);
  expect(result.state).toBe("ready");
  if (result.state !== "ready") throw Error("Populated attendance unavailable");
  const detectors = result.locations.find((l) => l.locationId === "loc-2")!.detectors;
  expect(detectors.find((d) => d.kind === "policy_lateness")).toMatchObject({
    state: "evaluated", observations: [{ measurementId: "policy-punch", employeeId: "worker", valueNanoseconds: "600000000000", sourceVersion: "raw:1:policy-publication:policy-published-shift" }],
  });
  const elapsed = detectors.find((d) => d.kind === "unusually_long_entry")!;
  expect(elapsed.state).toBe("evaluated");
  expect(elapsed.observations).toHaveLength(1);
  expect(elapsed.observations[0].measurementId).toBe("policy-punch");
  expect(BigInt(elapsed.observations[0].valueNanoseconds)).toBeGreaterThan(BigInt(3600000000000));
  const [saved] = await db.executor.query<{ payload: unknown }>({
    text: "SELECT payload FROM attendance_policy_observations WHERE id=$1", values: [result.observationId],
  });
  expect(saved.payload).toMatchObject({ observationId: result.observationId, sourceHash: result.sourceHash, locations: result.locations });
  const countObservations = () => db.executor.query<{ count: string }>({ text: "SELECT count(*)::text AS count FROM attendance_policy_observations", values: [] });
  const countBefore = await countObservations();
  for (const drift of ["source", "policy"]) {
    let changed = false;
    const transport: SqlExecutor = {
      query: db.executor.query,
      transaction: async (statements, signal) => {
        const rows = await db.executor.transaction(statements, signal);
        if (!changed && statements.some((s) => s.text.startsWith("/* attendance_policy_runtime */"))) {
          changed = true;
          if (drift === "source") await db.executor.query({ text: "UPDATE time_entries SET version=version+1 WHERE id='policy-punch'", values: [] });
          else await saveCompanyPolicy(proof, {
            operationId: randomUUID(), locationId: "loc-2", expectedRevision: 1,
            settings: { ...settings, attendance: { ...settings.attendance, lateness: { ...settings.attendance.lateness, thresholdMinutes: 15 } } },
          }, db.executor);
        }
        return rows;
      },
    };
    expect(await readAttendancePolicies(proof, transport)).toMatchObject({ state: "unavailable" });
    expect(changed).toBe(true);
    expect(await countObservations()).toEqual(countBefore);
  }
  await db.executor.transaction([
    { text: "DELETE FROM time_entries WHERE id='policy-punch'", values: [] },
    { text: "INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('policy-unmatched','worker','loc-2','policy-device',$1,'CLOCKED_IN')", values: [timing.clockIn] },
  ]);
  const unmatched = await readAttendancePolicies(proof, db.executor);
  expect(unmatched.state).toBe("ready");
  if (unmatched.state !== "ready") throw Error("Unmatched attendance unavailable");
  expect(unmatched.locations.find((l) => l.locationId === "loc-2")!.detectors.find((d) => d.kind === "policy_lateness")).toMatchObject({ state: "unverifiable", reason: "source_unverifiable", observations: [] });
  await db.executor.query({ text: "DELETE FROM time_entries WHERE id='policy-unmatched'", values: [] });
});
it("payroll population includes inactive and zero-time roster members without inventing employment dates", async () => {
  await db.executor.query({
    text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES('leaver','Fictional','Leaver','5550000003','EMPLOYEE','loc-1',false)",
    values: [],
  });
  const population = await readPeriodClose(
    proof,
    { startDate: "2030-10-01", endDate: "2030-10-07" },
    db.executor,
  );
  expect(population.members.map((m) => m.employeeId)).toEqual([
    "leaver",
    "owner",
    "worker",
  ]);
  expect(population.sourceHash).toMatch(/^[a-f0-9]{64}$/);
});
import {
  savePeriodPopulation,
  preparePeriodManifest,
  readPeriodArtifact,
  recordPeriodHandoff,
} from "../../lib/period-close/service";
import { readTimecards, mutateTimecard } from "../../lib/timecards/service";
import {
  createPayrollExport,
  saveExportProfile,
} from "../../lib/payroll-export/service";
import { neutralProfile } from "../../lib/payroll-export/model";
it("period manifest reconciles multiple immutable export batches, zero-time and inactive members; rejects omissions and survives later reopen", async () => {
  const period = { startDate: "2020-10-01", endDate: "2020-10-07" };
  for (const employeeId of ["worker", "leaver"])
    for (const action of ["APPROVE", "FINALIZE"] as const) {
      const result = await readTimecards(proof, period, db.executor);
      expect(result.state).toBe("ready");
      if (result.state !== "ready") throw Error("timecards unavailable");
      const card = result.cards.find((c) => c.card.employeeId === employeeId)!;
      expect(
        await mutateTimecard(
          proof,
          {
            ...period,
            operationId: randomUUID(),
            employeeId,
            action,
            expectedRevision: card.revision,
            expectedSourceHash: card.sourceHash,
          },
          db.executor,
        ),
      ).toMatchObject({
        status: action === "APPROVE" ? "approved" : "finalized",
      });
    }
  const cards = await readTimecards(proof, period, db.executor);
  if (cards.state !== "ready") throw Error("unavailable");
  const profileId = randomUUID();
  await saveExportProfile(
    proof,
    {
      operationId: randomUUID(),
      id: profileId,
      expectedRevision: 0,
      profile: neutralProfile(),
    },
    db.executor,
  );
  const receipts = [];
  for (const employeeId of ["worker", "leaver"]) {
    const card = cards.cards.find((c) => c.card.employeeId === employeeId)!;
    const result = await createPayrollExport(
      proof,
      {
        ...period,
        operationId: randomUUID(),
        profileId,
        profileRevision: 1,
        cards: [
          {
            employeeId,
            revision: card.revision,
            sourceHash: card.sourceHash,
            finalizationOperationId: card.history[0].operationId,
          },
        ],
      },
      db.executor,
    );
    receipts.push({ actorId: "owner", operationId: result.operationId });
  }
  const before = await readPeriodClose(proof, period, db.executor),
    members = before.members.map((m) => ({
      employeeId: m.employeeId,
      disposition: m.employeeId === "owner" ? "ZERO_TIME" : "INCLUDE",
      reason: "Reviewed fictional payroll membership",
      employmentFacts: "Period employment reviewed; dates not supplied",
      employmentBasis: "MANAGER_ATTESTED",
    }));
  await expect(
    savePeriodPopulation(
      proof,
      {
        ...period,
        operationId: randomUUID(),
        expectedRevision: 0,
        sourceHash: before.sourceHash,
        members: members.slice(1),
      },
      db.executor,
    ),
  ).rejects.toThrow(/OMISSION/);
  const population = await savePeriodPopulation(
    proof,
    {
      ...period,
      operationId: randomUUID(),
      expectedRevision: 0,
      sourceHash: before.sourceHash,
      members,
    },
    db.executor,
  );
  await expect(
    preparePeriodManifest(
      proof,
      {
        ...period,
        operationId: randomUUID(),
        populationRevision: population.revision,
        receipts: receipts.slice(1),
      },
      db.executor,
    ),
  ).rejects.toThrow(/OMISSION/);
  const command = {
    ...period,
    operationId: randomUUID(),
    populationRevision: population.revision,
    receipts,
  };
  const manifest = await preparePeriodManifest(proof, command, db.executor);
  expect(manifest.exports).toHaveLength(2);
  expect(manifest.population.members).toHaveLength(3);
  expect(manifest.downstream).toBe("NOT_VERIFIED");
  expect(await preparePeriodManifest(proof, command, db.executor)).toEqual(
    manifest,
  );
  await expect(
    preparePeriodManifest(
      proof,
      { ...command, operationId: randomUUID() },
      db.executor,
    ),
  ).rejects.toThrow(/MANIFEST_CONFLICT/);
  const artifact = await readPeriodArtifact(
    proof,
    manifest.id,
    "csv",
    0,
    db.executor,
  );
  expect(artifact.content).toContain("Employee");
  expect(artifact.filename).toMatch(/^nevora-[\w.-]+\.csv$/);
  expect(
    await db.executor.query({
      text: "SELECT kind FROM payroll_period_events WHERE manifest_id=$1::uuid AND kind='ARTIFACT_SERVED'",
      values: [manifest.id],
    }),
  ).toHaveLength(1);
  const handoff = {
    operationId: randomUUID(),
    manifestId: manifest.id,
    destination: "Fictional payroll portal",
    reference: "LOCAL-REFERENCE-ONLY",
    kind: "REPORTED_IMPORTED",
  };
  expect(await recordPeriodHandoff(proof, handoff, db.executor)).toMatchObject({
    providerVerified: false,
    payrollProcessed: "UNVERIFIED",
  });
  await saveExportProfile(
    proof,
    {
      operationId: randomUUID(),
      id: profileId,
      expectedRevision: 1,
      profile: { ...neutralProfile(), name: "Revised mapping" },
    },
    db.executor,
  );
  expect(
    (await readPeriodClose(proof, period, db.executor)).manifests[0].current,
  ).toBe(false);
  await expect(
    recordPeriodHandoff(
      proof,
      { ...handoff, operationId: randomUUID() },
      db.executor,
    ),
  ).rejects.toThrow(/CONFLICT/);
  expect(await recordPeriodHandoff(proof, handoff, db.executor)).toMatchObject({
    providerVerified: false,
  });
  const worker = cards.cards.find((c) => c.card.employeeId === "worker")!;
  await mutateTimecard(
    proof,
    {
      ...period,
      operationId: randomUUID(),
      employeeId: "worker",
      action: "REOPEN",
      expectedRevision: worker.revision,
      expectedSourceHash: worker.sourceHash,
      note: "Fictional review",
    },
    db.executor,
  );
  expect(
    (await readPeriodClose(proof, period, db.executor)).manifests[0].current,
  ).toBe(false);
  await expect(
    recordPeriodHandoff(
      proof,
      { ...handoff, operationId: randomUUID() },
      db.executor,
    ),
  ).rejects.toThrow(/SOURCE_CONFLICT/);
  expect(await recordPeriodHandoff(proof, handoff, db.executor)).toMatchObject({
    providerVerified: false,
  });
  expect(await preparePeriodManifest(proof, command, db.executor)).toEqual(
    manifest,
  );
  expect(
    (await readPeriodArtifact(proof, manifest.id, "csv", 0, db.executor))
      .content,
  ).toBe(artifact.content);
});

it("copy crash rolls back schedule, per-row ledger, publication and outbox; duplicate concurrent retries return one immutable winner", async () => {
  await db.executor.query({
    text: `INSERT INTO schedule_templates(id,name,created_by) VALUES('copy-pattern','Copy pattern','owner'); INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id) VALUES('pattern-1','copy-pattern','loc-1',0,'08:00','12:00','worker'),('pattern-2','copy-pattern','loc-1',0,'10:00','14:00','worker'),('pattern-3','copy-pattern','loc-1',0,'08:00','12:00',null),('pattern-4','copy-pattern','loc-1',0,'08:00','12:00','leaver'); INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('published-target','loc-1','2030-10-14','owner','PUBLISHED');`,
    values: [],
  });
  const command = {
    operationId: randomUUID(),
    weekStart: "2030-10-14",
    kind: "TEMPLATE",
    templateId: "copy-pattern",
  };
  const crash = {
    query: db.executor.query,
    transaction: (statements: Parameters<typeof db.executor.transaction>[0]) =>
      db.executor.transaction(
        statements.some((s) =>
          s.text.includes("INSERT INTO schedule_copy_receipts"),
        )
          ? [...statements, { text: "SELECT 1/0", values: [] }]
          : statements,
      ),
  };
  await expect(executeScheduleCopy(proof, command, crash)).rejects.toThrow(
    /division by zero/,
  );
  expect(
    await db.executor.query({
      text: "SELECT id FROM shifts WHERE schedule_id='published-target'",
      values: [],
    }),
  ).toEqual([]);
  expect(
    await db.executor.query({
      text: "SELECT id FROM schedule_publication_revisions WHERE week_start='2030-10-14'",
      values: [],
    }),
  ).toEqual([]);
  expect(
    await db.executor.query({
      text: "SELECT operation_id FROM schedule_copy_receipts WHERE operation_id=$1",
      values: [command.operationId],
    }),
  ).toEqual([]);
  expect(
    await db.executor.query({ text: "SELECT id FROM schedule_pending_edits", values: [] }),
  ).toEqual([]);
  const winners = await Promise.all([
    executeScheduleCopy(proof, command, db.executor),
    executeScheduleCopy(proof, command, db.executor),
    executeScheduleCopy(proof, command, db.executor),
  ]);
  expect(winners[1]).toEqual(winners[0]);
  expect(winners[2]).toEqual(winners[0]);
  expect(winners[0].rows.map((r) => r.status)).toEqual([
    "COMMITTED",
    "SKIPPED",
    "SKIPPED",
    "SKIPPED",
  ]);
  expect(winners[0].rows[1].reason).toBe("SHIFT_OVERLAP");
  expect(
    await db.executor.query({
      text: "SELECT id FROM shifts WHERE schedule_id='published-target'",
      values: [],
    }),
  ).toHaveLength(1);
  // Publish changes (Jose, 2026-10-29): copying into a published week is held
  // like any manual edit. It used to publish a revision at once; now the row
  // waits as one COPY history entry until the Owner taps Publish changes.
  expect(
    await db.executor.query({
      text: "SELECT id FROM schedule_publication_revisions WHERE week_start='2030-10-14'",
      values: [],
    }),
  ).toHaveLength(0);
  expect(
    await db.executor.query({
      text: "SELECT kind,published_revision_id FROM schedule_pending_edits WHERE week_start='2030-10-14'",
      values: [],
    }),
  ).toEqual([{ kind: "COPY", published_revision_id: null }]);
  expect(
    await db.executor.query({
      text: "SELECT row_number FROM schedule_copy_row_receipts WHERE operation_id=$1",
      values: [command.operationId],
    }),
  ).toHaveLength(4);
});
it("durable pending template command records SOURCE_CHANGED without substituting edited source rows", async () => {
  const command = {
    operationId: randomUUID(),
    weekStart: "2030-10-21",
    kind: "TEMPLATE",
    templateId: "copy-pattern",
  };
  let drift = false;
  const executor = {
    query: db.executor.query,
    transaction: async (
      statements: Parameters<typeof db.executor.transaction>[0],
    ) => {
      const result = await db.executor.transaction(statements);
      if (
        !drift &&
        statements.some((s) =>
          s.text.includes("INSERT INTO schedule_copy_operations"),
        )
      ) {
        drift = true;
        await db.executor.query({
          text: "UPDATE schedule_template_shifts SET end_time='13:00' WHERE id='pattern-1'",
          values: [],
        });
      }
      return result;
    },
  };
  const receipt = await executeScheduleCopy(proof, command, executor);
  expect(receipt.rows).toHaveLength(4);
  expect(
    receipt.rows.every(
      (r) => r.reason === "SOURCE_CHANGED" && r.shiftId === null,
    ),
  ).toBe(true);
  expect(
    await db.executor.query({
      text: "SELECT id FROM schedules WHERE week_start='2030-10-21'",
      values: [],
    }),
  ).toEqual([]);
});
it("new copy receipts cannot commit after final session expiry, even for skipped source rows", async () => {
  const command = {
    operationId: randomUUID(),
    weekStart: "2030-10-28",
    kind: "TEMPLATE",
    templateId: "copy-pattern",
  };
  const executor = {
    query: db.executor.query,
    transaction: (
      statements: Parameters<typeof db.executor.transaction>[0],
    ) => {
      const original = [...statements];
      if (
        original.some((s) =>
          s.text.includes("INSERT INTO schedule_copy_receipts"),
        )
      )
        original.splice(original.length - 2, 0, {
          text: "UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",
          values: [hash],
        });
      return db.executor.transaction(original);
    },
  };
  await expect(executeScheduleCopy(proof, command, executor)).rejects.toThrow(
    /management_authorization/,
  );
  expect(
    await db.executor.query({
      text: "SELECT operation_id FROM schedule_copy_receipts WHERE operation_id=$1",
      values: [command.operationId],
    }),
  ).toEqual([]);
  expect(
    await db.executor.query({
      text: "SELECT id FROM schedules WHERE week_start='2030-10-28'",
      values: [],
    }),
  ).toEqual([]);
});
it("template owners and all durable ledgers reject hostile reassignment, mutation and truncation", async () => {
  await expect(
    db.executor.query({
      text: "UPDATE schedule_templates SET workspace_id='foreign' WHERE id='copy-pattern'",
      values: [],
    }),
  ).rejects.toThrow(/immutable/);
  await expect(
    db.executor.query({
      text: "UPDATE schedule_template_shifts SET template_id='empty' WHERE id='pattern-1'",
      values: [],
    }),
  ).rejects.toThrow(/immutable/);
  await expect(
    db.executor.query({
      text: "INSERT INTO schedule_templates(id,name,created_by,workspace_id) VALUES('foreign','Foreign','owner','foreign')",
      values: [],
    }),
  ).rejects.toThrow(/foreign key/);
  for (const table of [
    "schedule_copy_operations",
    "schedule_copy_receipts",
    "schedule_copy_row_receipts",
    "nevora_company_policy_revisions",
    "attendance_policy_observations",
    "payroll_period_populations",
    "payroll_period_manifests",
    "payroll_period_events",
  ]) {
    await expect(
      db.executor.query({ text: `DELETE FROM ${table}`, values: [] }),
    ).rejects.toThrow(/immutable|append_only/);
    await expect(
      db.executor.query({ text: `TRUNCATE ${table} CASCADE`, values: [] }),
    ).rejects.toThrow(/immutable|append_only/);
  }
});
it("maximum integer policy revision commits and exact original retry works, while further new revisions fail", async () => {
  await db.executor.query({
    text: `INSERT INTO nevora_company_policy_revisions(operation_id,workspace_id,location_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys) VALUES($1,'workspace-fuel','loc-1',2147483646,'owner',repeat('a',64),'{"version":1}','{"version":1}','[]')`,
    values: [randomUUID()],
  });
  const command = {
    operationId: randomUUID(),
    expectedRevision: 2147483646,
    locationId: "loc-1",
    settings: { version: 1 },
  };
  expect(await saveCompanyPolicy(proof, command, db.executor)).toMatchObject({
    revision: 2147483647,
  });
  expect(await saveCompanyPolicy(proof, command, db.executor)).toMatchObject({
    revision: 2147483647,
  });
  await expect(
    saveCompanyPolicy(
      proof,
      { ...command, operationId: randomUUID(), expectedRevision: 2147483647 },
      db.executor,
    ),
  ).rejects.toThrow(/Invalid/);
});
it("copy/template preserve positions and reject unqualified employees and ambiguous local dates without writes", async () => {
  await db.executor.query({
    text: `INSERT INTO positions(id,workspace_id,name) VALUES('qualified','workspace-fuel','Qualified work'); INSERT INTO employee_positions VALUES('worker','qualified'); INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('sunday','worker',0,'00:00','24:00'); INSERT INTO schedule_templates(id,name,created_by) VALUES('qualified-pattern','Qualified pattern','owner'); INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,position_id) VALUES('qualified-row','qualified-pattern','loc-1',0,'08:00','12:00','worker','qualified');`,
    values: [],
  });
  const fromTemplate = await executeScheduleCopy(
    proof,
    {
      operationId: randomUUID(),
      weekStart: "2030-11-04",
      kind: "TEMPLATE",
      templateId: "qualified-pattern",
    },
    db.executor,
  );
  expect(
    await db.executor.query({
      text: "SELECT position_id FROM shifts WHERE id=$1",
      values: [fromTemplate.rows[0].shiftId],
    }),
  ).toEqual([{ position_id: "qualified" }]);
  const copied = await executeScheduleCopy(
    proof,
    {
      operationId: randomUUID(),
      weekStart: "2030-11-11",
      kind: "PREVIOUS_WEEK",
    },
    db.executor,
  );
  expect(
    await db.executor.query({
      text: "SELECT position_id FROM shifts WHERE id=$1",
      values: [copied.rows[0].shiftId],
    }),
  ).toEqual([{ position_id: "qualified" }]);
  await db.executor.query({
    text: "DELETE FROM employee_positions WHERE employee_id='worker' AND position_id='qualified'",
    values: [],
  });
  const unqualified = await executeScheduleCopy(
    proof,
    {
      operationId: randomUUID(),
      weekStart: "2030-11-18",
      kind: "TEMPLATE",
      templateId: "qualified-pattern",
    },
    db.executor,
  );
  expect(unqualified.rows[0]).toMatchObject({
    status: "SKIPPED",
    reason: "POSITION_INELIGIBLE",
    shiftId: null,
  });
  await db.executor.query({
    text: "UPDATE workspaces SET time_zone='America/New_York'; INSERT INTO schedule_templates(id,name,created_by) VALUES('dst','DST pattern','owner'); INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id) VALUES('dst-row','dst','loc-1',6,'01:30','04:00','worker'); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('dst-source','loc-1','2026-10-19','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('dst-prior','dst-source','worker','2026-10-25','01:30','04:00')",
    values: [],
  });
  for (const source of [
    { kind: "TEMPLATE", templateId: "dst" },
    { kind: "PREVIOUS_WEEK" },
  ]) {
    const result = await executeScheduleCopy(
      proof,
      { operationId: randomUUID(), weekStart: "2026-10-26", ...source },
      db.executor,
    );
    expect(result.rows[0]).toMatchObject({
      status: "SKIPPED",
      reason: "INVALID_LOCAL_TIME",
      shiftId: null,
    });
  }
});
