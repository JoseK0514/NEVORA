/** Fictional test data only. Caller supplies an owned disposable executor. */
import { randomUUID, createHash } from "node:crypto";
import type { SqlExecutor } from "../../lib/notifications/types";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
import { hashPassword } from "../../lib/auth/password";
import { readTimecards, mutateTimecard } from "../../lib/timecards/service";
import {
  readPeriodClose,
  savePeriodPopulation,
} from "../../lib/period-close/service";
import { saveSettings, command, runs } from "../../lib/payroll/service";
import {
  registerClockerDevice,
  redeemClockerEnrollment,
} from "../../lib/clocker/devices.server";
import { workerOnce } from "../../lib/payroll/worker";
import type {
  PayrollPreferences,
  PayrollImport,
} from "../../lib/payroll/contracts";
export async function seedPayrollFixture(
  ex: SqlExecutor,
  options: { published?: boolean } = {},
) {
  const [identity] = await ex.query<{ name: string; marker: string }>({
    text: "SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
    values: [],
  });
  if (
    !/^nevora_(exchange|foundation)_test_/.test(identity.name) ||
    !identity.marker?.startsWith("fuel-phase3-disposable:")
  )
    throw Error("Owned payroll database required");
  const password = "Fictional-payroll-QA-2026!",
    ids = {
      owner: "payroll-qa-owner",
      reviewer: "payroll-qa-reviewer",
      manager: "payroll-qa-manager",
      a: "payroll-qa-a",
      b: "payroll-qa-b",
    };
  for (const [name, id] of Object.entries(ids)) {
    await ex.query({
      text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,$3,$4,$5,'loc-1')",
      values: [
        id,
        name === "a" ? "María José" : name,
        "Fictional QA",
        "5550000000",
        name === "owner"
          ? "OWNER"
          : ["reviewer", "manager"].includes(name)
            ? "MANAGER"
            : "EMPLOYEE",
      ],
    });
    await ex.query({
      text: "INSERT INTO employee_credentials(employee_id,password_hash) VALUES($1,$2)",
      values: [id, await hashPassword(password)],
    });
    await ex.query({
      text: "INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,'loc-1')",
      values: [id],
    });
  }
  const token = "fictional-payroll-server-proof-" + randomUUID(),
    sessionTokenHash = createHash("sha256").update(token).digest("hex");
  await ex.query({
    text: "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",
    values: [sessionTokenHash, ids.owner],
  });
  const proof: SessionMutationProof = {
    employee: {
      id: ids.owner,
      firstName: "owner",
      lastName: "Fictional QA",
      role: "OWNER",
      primaryLocationId: "loc-1",
    },
    sessionTokenHash,
  };
  const preferences: PayrollPreferences = {
    companyName: "Compañía Ficticia QA",
    language: "es",
    currency: "USD",
    schedule: {
      frequency: "WEEKLY",
      anchorDate: "2026-09-21",
      paydayOffsetDays: 2,
    },
    rules: [],
    automation: {
      prepare: true,
      publish: true,
      reminders: true,
      reminderLeadDays: [1],
    },
    bankProfile: "NEUTRAL_UNVERIFIED",
  };
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      reason: "Fictional test setup",
      preferences,
    },
    ex,
  );
  await saveSettings(
    proof,
    {
      action: "SET_GRANT",
      operationId: randomUUID(),
      expectedRevision: 0,
      reason: "Fictional explicit payroll authority",
      grant: { employeeId: ids.reviewer, review: true, approve: true },
    },
    ex,
  );
  const period = { startDate: "2026-09-21", endDate: "2026-09-27" };
  const pending = await registerClockerDevice(
    { employeeId: ids.owner, sessionTokenHash },
    { name: "Fictional payroll clock", locationId: "loc-1" },
    ex,
  );
  const device = await redeemClockerEnrollment(
    { enrollmentToken: pending.enrollmentToken, locationKey: "2" },
    ex,
  );
  await ex.query({
    text: "INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)",
    values: [randomUUID(), ids.a, device.device.id],
  });
  const cards = await readTimecards(proof, period, ex);
  if (cards.state !== "ready") throw Error("Fictional timecard unavailable");
  const a = cards.cards.find((c) => c.card.employeeId === ids.a)!;
  for (const [index, action] of ["APPROVE", "FINALIZE"].entries()) {
    const result = await mutateTimecard(
      proof,
      {
        operationId: randomUUID(),
        employeeId: ids.a,
        ...period,
        expectedRevision: a.revision + index,
        expectedSourceHash: a.sourceHash,
        action,
      },
      ex,
    );
    if (result.status !== (action === "APPROVE" ? "approved" : "finalized"))
      throw Error("Fictional finalization failed");
  }
  const close = await readPeriodClose(proof, period, ex);
  await savePeriodPopulation(
    proof,
    {
      operationId: randomUUID(),
      expectedRevision: 0,
      sourceHash: close.sourceHash,
      ...period,
      members: close.members.map((e) => ({
        employeeId: e.employeeId,
        disposition: e.employeeId === ids.a ? "INCLUDE" : "ZERO_TIME",
        reason: "Fictional payroll disposition",
        employmentFacts: "Fictional employment",
        employmentBasis: "MANAGER_ATTESTED",
      })),
    },
    ex,
  );
  const amounts: PayrollImport = {
    schema: "NEVORA_PAYROLL_IMPORT_V1",
    currency: "USD",
    sourceName: "Fictional Accountant",
    sourceReference: "QA-2026-09",
    period,
    payday: "2026-09-29",
    rows: close.members.map((e) => ({
      employeeId: e.employeeId,
      grossMinor: e.employeeId === ids.a ? "100000" : "0",
      netMinor: e.employeeId === ids.a ? "87660" : "0",
      employeeDeductions:
        e.employeeId === ids.a
          ? [{ code: "D", label: "Deducción aprobada", amountMinor: "12340" }]
          : [],
      employerContributions:
        e.employeeId === ids.a
          ? [{ code: "E", label: "Aportación patronal", amountMinor: "7000" }]
          : [],
    })),
  };
  const prepared = await command(
    proof,
    {
      action: "PREPARE",
      operationId: randomUUID(),
      period,
      payday: amounts.payday,
    },
    ex,
  );
  await command(
    proof,
    {
      action: "IMPORT",
      operationId: randomUUID(),
      runId: prepared.runId,
      expectedRevision: 1,
      amounts,
    },
    ex,
  );
  if (options.published) {
    const r = (await runs(proof, ex)).runs[0];
    await command(
      proof,
      {
        action: "APPROVE",
        operationId: randomUUID(),
        runId: r.id,
        expectedRevision: r.revision,
        reviewToken: r.reviewToken,
      },
      ex,
    );
    await workerOnce(ex);
    await workerOnce(ex);
    await workerOnce(ex);
  }
  return {
    ids,
    password,
    proof,
    period,
    amounts,
    runId: prepared.runId!,
    preferences,
  };
}
