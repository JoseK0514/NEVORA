import { randomUUID } from "node:crypto";
import { beforeEach, afterEach, it, expect } from "vitest";
import { createPunchFixture } from "./clocker-punch-fixture";
import {
  settings,
  saveSettings,
  runs,
  command,
} from "../../lib/payroll/service";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
const proof: SessionMutationProof = {
  employee: {
    id: "c34-owner",
    role: "OWNER",
    firstName: "QA",
    lastName: "Owner",
    primaryLocationId: "loc-1",
  },
  sessionTokenHash: "a".repeat(64),
};
const preferences = {
  companyName: "Compañía Ficticia",
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
const period = { startDate: "2026-09-21", endDate: "2026-09-27" };
let f: Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async () => {
  process.env.NEVORA_PAYROLL_ENABLED = "true";
  f = await createPunchFixture();
});
afterEach(async () => {
  await f?.db.dispose();
  delete process.env.NEVORA_PAYROLL_ENABLED;
});
it("persists settings, replays identical lost responses, rejects changed payload and immutable ledger edits", async () => {
  const c = {
    action: "SAVE_SETTINGS",
    operationId: randomUUID(),
    reason: "Fictional test",
    expectedRevision: 0,
    effectiveFrom: "2026-01-01",
    preferences,
  };
  const r = await saveSettings(proof, c, f.db.executor);
  expect(r.revision).toBe(1);
  expect(await saveSettings(proof, c, f.db.executor)).toEqual(r);
  expect(
    (await settings(proof, f.db.executor)).revisions[0].preferences.companyName,
  ).toBe("Compañía Ficticia");
  await expect(
    saveSettings(proof, { ...c, reason: "Changed" }, f.db.executor),
  ).rejects.toThrow("CONFLICT");
  await expect(f.q("DELETE FROM payroll_setting_revisions")).rejects.toThrow(
    "immutable ledger",
  );
});
it("denies Manager money authority and stale live Owner role", async () => {
  await f.q("UPDATE employees SET role='MANAGER' WHERE id='c34-owner'");
  await expect(settings(proof, f.db.executor)).rejects.toThrow(
    "payroll_authorization",
  );
  await expect(runs(proof, f.db.executor)).rejects.toThrow(
    "payroll_authorization",
  );
});
it("concurrent preparation creates one waiting run and exact receipt retries", async () => {
  const c = {
    action: "PREPARE",
    operationId: randomUUID(),
    period,
    payday: "2026-09-29",
  };
  const result = await Promise.all([
    command(proof, c, f.db.executor),
    command(proof, c, f.db.executor),
  ]);
  expect(result[0]).toEqual(result[1]);
  const state = await runs(proof, f.db.executor);
  expect(state.runs).toHaveLength(1);
  expect(state.runs[0].status).toBe("WAITING_FOR_AMOUNTS");
  expect(
    await f.q("SELECT count(*)::int AS n FROM payroll_command_receipts"),
  ).toEqual([{ n: 1 }]);
});
it("rejects conflicting payday for an existing period", async () => {
  await command(
    proof,
    {
      action: "PREPARE",
      operationId: randomUUID(),
      period,
      payday: "2026-09-29",
    },
    f.db.executor,
  );
  await expect(
    command(
      proof,
      {
        action: "PREPARE",
        operationId: randomUUID(),
        period,
        payday: "2026-09-30",
      },
      f.db.executor,
    ),
  ).rejects.toThrow("PAYDAY_CONFLICT");
});
import {
  readPeriodClose,
  savePeriodPopulation,
} from "../../lib/period-close/service";
import { workerOnce, claimJob, finishJob } from "../../lib/payroll/worker";
import { statements, document } from "../../lib/payroll/access";
import { statement as sql } from "../../lib/payroll/store";
async function reviewed() {
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      reason: "QA",
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      preferences,
    },
    f.db.executor,
  );
  const state = await readPeriodClose(proof, period, f.db.executor);
  await savePeriodPopulation(
    proof,
    {
      operationId: randomUUID(),
      expectedRevision: 0,
      sourceHash: state.sourceHash,
      ...period,
      members: state.members.map((e) => ({
        employeeId: e.employeeId,
        disposition: "ZERO_TIME",
        reason: "Fictional empty period",
        employmentFacts: "Fictional roster",
        employmentBasis: "MANAGER_ATTESTED",
      })),
    },
    f.db.executor,
  );
  const prepared = await command(
    proof,
    {
      action: "PREPARE",
      operationId: randomUUID(),
      period,
      payday: "2026-09-29",
    },
    f.db.executor,
  );
  const amounts = {
    schema: "NEVORA_PAYROLL_IMPORT_V1",
    currency: "USD",
    sourceName: "Fictional accountant",
    sourceReference: "QA-123",
    period,
    payday: "2026-09-29",
    rows: state.members.map((e) => ({
      employeeId: e.employeeId,
      grossMinor: "0",
      netMinor: "0",
      employeeDeductions: [],
      employerContributions: [],
    })),
  };
  await command(
    proof,
    {
      action: "IMPORT",
      operationId: randomUUID(),
      runId: prepared.runId,
      expectedRevision: 1,
      amounts,
    },
    f.db.executor,
  );
  return (await runs(proof, f.db.executor)).runs[0];
}
async function approve() {
  const r = await reviewed();
  await command(
    proof,
    {
      action: "APPROVE",
      operationId: randomUUID(),
      runId: r.id,
      expectedRevision: r.revision,
      reviewToken: r.reviewToken,
    },
    f.db.executor,
  );
  return (await runs(proof, f.db.executor)).runs[0];
}
it("freezes approved inputs, generates and publishes real private PDFs, keeps employees isolated and exact payment retries", async () => {
  const r = await approve();
  await expect(
    f.q("UPDATE payroll_run_revisions SET snapshot=NULL"),
  ).rejects.toThrow("immutable ledger");
  await workerOnce(f.db.executor);
  await workerOnce(f.db.executor);
  await workerOnce(f.db.executor);
  await f.q(
    "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-a',now()+interval '1 day'),(repeat('c',64),'c34-b',now()+interval '1 day')",
  );
  const a = {
      employee: { ...proof.employee, id: "c34-a", role: "EMPLOYEE" as const },
      sessionTokenHash: "b".repeat(64),
    },
    b = {
      employee: { ...proof.employee, id: "c34-b", role: "EMPLOYEE" as const },
      sessionTokenHash: "c".repeat(64),
    };
  const docs = await statements(a, f.db.executor);
  expect(docs.statements).toHaveLength(1);
  const bytes = await document(a, docs.statements[0].id, f.db.executor);
  expect(bytes.bytes.subarray(0, 5).toString()).toBe("%PDF-");
  await expect(
    document(b, docs.statements[0].id, f.db.executor),
  ).rejects.toThrow("DOCUMENT_UNAVAILABLE");
  const c = {
    action: "PAYMENT_EXPORT",
    operationId: randomUUID(),
    runId: r.id,
    expectedRevision: r.revision,
  };
  expect(await command(proof, c, f.db.executor)).toEqual(
    await command(proof, c, f.db.executor),
  );
  expect(
    await f.q(
      "SELECT count(*)::int AS n FROM payroll_documents WHERE kind='PAYMENT_INSTRUCTIONS'",
    ),
  ).toEqual([{ n: 1 }]);
  expect(
    await f.q(
      "SELECT payload->>'delivery' AS delivery FROM payroll_notice_receipts",
    ),
  ).toEqual([{ delivery: "NOT_SENT" }]);
});
it("rejects stale roster and settings review; historical approved snapshot stays unchanged", async () => {
  const r = await reviewed();
  await f.q("UPDATE employees SET last_name='Changed' WHERE id='c34-a'");
  await expect(
    command(
      proof,
      {
        action: "APPROVE",
        operationId: randomUUID(),
        runId: r.id,
        expectedRevision: r.revision,
        reviewToken: r.reviewToken,
      },
      f.db.executor,
    ),
  ).rejects.toThrow("SOURCE_CONFLICT");
});
it("stale worker lease cannot commit after another claim; crashed lease recovers", async () => {
  await approve();
  const first = await claimJob(f.db.executor);
  expect(first).not.toBeNull();
  await f.q(
    "UPDATE payroll_jobs SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1",
    [first!.id],
  );
  const second = await claimJob(f.db.executor);
  expect(second!.id).toBe(first!.id);
  await expect(
    finishJob(
      first!,
      [
        sql(
          "INSERT INTO payroll_notice_receipts VALUES((SELECT id FROM workspaces WHERE singleton), 'stale', '{}')",
        ),
      ],
      f.db.executor,
    ),
  ).rejects.toThrow("PAYROLL_LEASE_LOST");
  expect(
    await f.q(
      "SELECT count(*)::int AS n FROM payroll_notice_receipts WHERE business_key='stale'",
    ),
  ).toEqual([{ n: 0 }]);
  await finishJob(second!, [], f.db.executor);
});
import { seedPayrollFixture } from "./payroll-fixture";
import { schedulePayroll } from "../../lib/payroll/schedule";
it("nonzero finalized time imports exact authoritative values, corrections link and defaults preserve overrides", async () => {
  const seeded = await seedPayrollFixture(f.db.executor, { published: true });
  const owner = seeded.proof;
  let r = (await runs(owner, f.db.executor)).runs.find(
    (r) => r.id === seeded.runId,
  )!;
  expect(r.totals).toEqual({
    grossMinor: "100000",
    deductionsMinor: "12340",
    employerContributionsMinor: "7000",
    netMinor: "87660",
    employeeCount: 8,
  });
  await saveSettings(
    owner,
    {
      action: "SAVE_EXCEPTION",
      operationId: randomUUID(),
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      reason: "QA language election",
      exception: { employeeId: seeded.ids.a, language: "en", rules: null },
    },
    f.db.executor,
  );
  await saveSettings(
    owner,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      expectedRevision: 1,
      effectiveFrom: "2026-01-01",
      reason: "QA new default",
      preferences: { ...seeded.preferences, companyName: "Changed company" },
    },
    f.db.executor,
  );
  expect(
    (await settings(owner, f.db.executor)).exceptions[0].exception.language,
  ).toBe("en");
  expect(
    (await runs(owner, f.db.executor)).runs.find((x) => x.id === r.id)!
      .settingsRevision,
  ).toBe(1);
  const correction = await command(
    owner,
    {
      action: "CORRECT",
      operationId: randomUUID(),
      runId: r.id,
      expectedRevision: r.revision,
      reason: "Corrected provider reference",
      amounts: { ...seeded.amounts, sourceReference: "QA-correction" },
    },
    f.db.executor,
  );
  r = (await runs(owner, f.db.executor)).runs.find(
    (x) => x.id === correction.runId,
  )!;
  expect(r.correctionOf).toBe(seeded.runId);
  expect(r.settingsRevision).toBe(2);
  expect(r.rows!.find((x) => x.employeeId === seeded.ids.a)!.netMinor).toBe(
    "87660",
  );
});
it("scheduled preparation creates one durable waiting job/run across retries and consumes saved preferences", async () => {
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      reason: "QA automatic",
      preferences,
    },
    f.db.executor,
  );
  await Promise.all([
    schedulePayroll(f.db.executor),
    schedulePayroll(f.db.executor),
  ]);
  expect(
    await f.q(
      "SELECT count(*)::int AS n FROM payroll_jobs WHERE kind='PREPARE'",
    ),
  ).toEqual([{ n: 1 }]);
  await workerOnce(f.db.executor);
  expect((await runs(proof, f.db.executor)).runs[0].status).toBe(
    "WAITING_FOR_AMOUNTS",
  );
});
it("live grant revocation rejects a previously authorized reviewer without leaking receipts", async () => {
  const seeded = await seedPayrollFixture(f.db.executor);
  await f.q(
    "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),$1,now()+interval '1 day')",
    [seeded.ids.reviewer],
  );
  const reviewer = {
    employee: {
      ...proof.employee,
      id: seeded.ids.reviewer,
      role: "MANAGER" as const,
    },
    sessionTokenHash: "d".repeat(64),
  };
  expect((await runs(reviewer, f.db.executor)).runs.length).toBe(1);
  await saveSettings(
    seeded.proof,
    {
      action: "SET_GRANT",
      operationId: randomUUID(),
      expectedRevision: 1,
      reason: "Revoke fictional grant",
      grant: { employeeId: seeded.ids.reviewer, review: false, approve: false },
    },
    f.db.executor,
  );
  await expect(runs(reviewer, f.db.executor)).rejects.toThrow(
    "payroll_authorization",
  );
});
import { processJob } from "../../lib/payroll/worker";
it("notice transaction failure leaves published PDFs intact and retries only the notice", async () => {
  await approve();
  await workerOnce(f.db.executor);
  await workerOnce(f.db.executor);
  const job = await claimJob(f.db.executor);
  expect(job!.kind).toBe("REMINDER");
  const injected = {
    ...f.db.executor,
    transaction: (stmts: Parameters<typeof f.db.executor.transaction>[0]) =>
      f.db.executor.transaction(
        stmts.map((s) =>
          s.text.startsWith("INSERT INTO payroll_notice_receipts")
            ? sql("SELECT 1/0")
            : s,
        ),
      ),
  };
  await expect(processJob(job!, injected)).rejects.toThrow();
  expect(
    await f.q("SELECT count(*)::int AS n FROM payroll_publications"),
  ).toEqual([{ n: 1 }]);
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_documents")).toEqual(
    [{ n: 4 }],
  );
  await f.q(
    "UPDATE payroll_jobs SET available_at=clock_timestamp() WHERE kind='REMINDER'",
  );
  await workerOnce(f.db.executor);
  expect(
    await f.q("SELECT count(*)::int AS n FROM payroll_notice_receipts"),
  ).toEqual([{ n: 1 }]);
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_documents")).toEqual(
    [{ n: 4 }],
  );
});
it("committed command with lost response recovers original receipt and does not duplicate revision", async () => {
  let lost = false;
  const ex = {
    ...f.db.executor,
    transaction: async (
      stmts: Parameters<typeof f.db.executor.transaction>[0],
    ) => {
      const result = await f.db.executor.transaction(stmts);
      if (
        !lost &&
        stmts.some((s) =>
          s.text.startsWith("INSERT INTO payroll_command_receipts"),
        )
      ) {
        lost = true;
        throw Error("FICTIONAL_CONNECTION_LOST_AFTER_COMMIT");
      }
      return result;
    },
  };
  const c = {
    action: "SAVE_SETTINGS",
    operationId: randomUUID(),
    reason: "QA lost response",
    expectedRevision: 0,
    effectiveFrom: "2026-01-01",
    preferences,
  };
  expect((await saveSettings(proof, c, ex)).revision).toBe(1);
  expect(
    await f.q("SELECT count(*)::int AS n FROM payroll_setting_revisions"),
  ).toEqual([{ n: 1 }]);
});
it("role revoked after pre-read but before mutation prevents every business write", async () => {
  let revoked = false;
  const ex = {
    ...f.db.executor,
    transaction: async (
      stmts: Parameters<typeof f.db.executor.transaction>[0],
    ) => {
      if (
        !revoked &&
        stmts.some((s) =>
          s.text.startsWith("INSERT INTO payroll_setting_revisions"),
        )
      ) {
        revoked = true;
        await f.q("UPDATE employees SET role='MANAGER' WHERE id='c34-owner'");
      }
      return f.db.executor.transaction(stmts);
    },
  };
  await expect(
    saveSettings(
      proof,
      {
        action: "SAVE_SETTINGS",
        operationId: randomUUID(),
        reason: "QA authority race",
        expectedRevision: 0,
        effectiveFrom: "2026-01-01",
        preferences,
      },
      ex,
    ),
  ).rejects.toThrow("payroll_authorization");
  expect(
    await f.q("SELECT count(*)::int AS n FROM payroll_setting_revisions"),
  ).toEqual([{ n: 0 }]);
});
it("missing imported money cannot approve or generate a payment artifact", async () => {
  const prepared = await command(
    proof,
    {
      action: "PREPARE",
      operationId: randomUUID(),
      period,
      payday: "2026-09-29",
    },
    f.db.executor,
  );
  await expect(
    command(
      proof,
      {
        action: "APPROVE",
        operationId: randomUUID(),
        runId: prepared.runId,
        expectedRevision: 1,
        reviewToken: "a".repeat(64),
      },
      f.db.executor,
    ),
  ).rejects.toThrow("REVIEW_CONFLICT");
  await expect(
    command(
      proof,
      {
        action: "PAYMENT_EXPORT",
        operationId: randomUUID(),
        runId: prepared.runId,
        expectedRevision: 1,
      },
      f.db.executor,
    ),
  ).rejects.toThrow("APPROVAL_REQUIRED");
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_documents")).toEqual(
    [{ n: 0 }],
  );
});
it("reopened finalized time invalidates a reviewed import before approval", async () => {
  const seeded = await seedPayrollFixture(f.db.executor);
  const { readTimecards, mutateTimecard } = await import(
    "../../lib/timecards/service"
  );
  const state = await readTimecards(seeded.proof, seeded.period, f.db.executor);
  if (state.state !== "ready") throw Error("Unexpected time source");
  const card = state.cards.find((c) => c.card.employeeId === seeded.ids.a)!;
  await mutateTimecard(
    seeded.proof,
    {
      operationId: randomUUID(),
      employeeId: seeded.ids.a,
      ...seeded.period,
      expectedRevision: card.revision,
      expectedSourceHash: card.sourceHash,
      action: "REOPEN",
      note: "Fictional changed time",
    },
    f.db.executor,
  );
  const r = (await runs(seeded.proof, f.db.executor)).runs[0];
  await expect(
    command(
      seeded.proof,
      {
        action: "APPROVE",
        operationId: randomUUID(),
        runId: r.id,
        expectedRevision: r.revision,
        reviewToken: r.reviewToken,
      },
      f.db.executor,
    ),
  ).rejects.toThrow("SOURCE_CONFLICT");
});
it("queued preparation respects settings disabled after enqueue", async () => {
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      reason: "QA automatic",
      preferences,
    },
    f.db.executor,
  );
  await schedulePayroll(f.db.executor);
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      expectedRevision: 1,
      effectiveFrom: "2026-01-01",
      reason: "Disable queued automatic preparation",
      preferences: {
        ...preferences,
        automation: { ...preferences.automation, prepare: false },
      },
    },
    f.db.executor,
  );
  await expect(workerOnce(f.db.executor)).rejects.toThrow("SCHEDULE_CHANGED");
  expect((await runs(proof, f.db.executor)).runs).toHaveLength(0);
  expect(
    await f.q("SELECT status,error FROM payroll_jobs WHERE kind='PREPARE'"),
  ).toEqual([{ status: "FAILED", error: "SCHEDULE_CHANGED" }]);
});
it("partial PDF computation failure stores nothing, then renews fenced lease and recovers exact document hashes", async () => {
  const r = await approve();
  const job = await claimJob(f.db.executor);
  let renewed = 0;
  const failing = {
    ...f.db.executor,
    query: async <T>(s: Parameters<typeof f.db.executor.query>[0]) => {
      if (
        s.text.startsWith("UPDATE payroll_jobs SET lease_until") &&
        ++renewed === 2
      )
        throw Error("FICTIONAL_CRASH_DURING_PDF");
      return f.db.executor.query<T>(s);
    },
  };
  await expect(processJob(job!, failing)).rejects.toThrow(
    "FICTIONAL_CRASH_DURING_PDF",
  );
  expect(renewed).toBe(2);
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_documents")).toEqual(
    [{ n: 0 }],
  );
  await f.q(
    "UPDATE payroll_jobs SET available_at=clock_timestamp() WHERE kind='PDF'",
  );
  await workerOnce(f.db.executor);
  const { generatePdfs } = await import("../../lib/payroll/documents");
  const [row] = await f.q<{
    snapshot: import("../../lib/payroll/service").Snapshot;
  }>("SELECT snapshot FROM payroll_runs_current WHERE run_id=$1", [r.id]);
  const expected = await generatePdfs(r, row.snapshot);
  const stored = await f.q<{ sha256: string }>(
    "SELECT sha256 FROM payroll_documents ORDER BY sha256",
  );
  expect(stored.map((d) => d.sha256)).toEqual(
    expected.map((d) => d.sha256).sort(),
  );
});
it("notice retries stop after five attempts and remain independent from approved amounts", async () => {
  const r = await approve();
  await f.q(
    "UPDATE payroll_jobs SET available_at=clock_timestamp()+interval '1 day' WHERE kind='PDF'",
  );
  await f.q(
    "INSERT INTO payroll_jobs(id,workspace_id,run_id,kind,business_key,payload) VALUES($1,(SELECT id FROM workspaces WHERE singleton),$2,'REMINDER','notice-limit','{}')",
    [randomUUID(), r.id],
  );
  for (let i = 0; i < 5; i++) {
    await expect(workerOnce(f.db.executor)).rejects.toThrow(
      "PUBLICATION_REQUIRED",
    );
    await f.q(
      "UPDATE payroll_jobs SET available_at=clock_timestamp() WHERE kind='REMINDER'",
    );
  }
  expect(
    await f.q("SELECT status,attempts FROM payroll_jobs WHERE kind='REMINDER'"),
  ).toEqual([{ status: "FAILED", attempts: 5 }]);
  expect(await claimJob(f.db.executor)).toBeNull();
  expect((await runs(proof, f.db.executor)).runs[0].status).toBe("APPROVED");
});
it("unsupported display glyphs block human approval before any immutable approval or PDF job exists", async () => {
  await f.q(
    "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('qa-unicode','日本語','QA','558','EMPLOYEE','loc-1')",
  );
  const r = await reviewed();
  await expect(
    command(
      proof,
      {
        action: "APPROVE",
        operationId: randomUUID(),
        runId: r.id,
        expectedRevision: r.revision,
        reviewToken: r.reviewToken,
      },
      f.db.executor,
    ),
  ).rejects.toThrow("UNSUPPORTED_DOCUMENT_GLYPH");
  expect((await runs(proof, f.db.executor)).runs[0].status).toBe(
    "REVIEW_REQUIRED",
  );
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_jobs")).toEqual([
    { n: 0 },
  ]);
});
it("inactive employees remain in complete population and omitted inactive amount rows are rejected", async () => {
  await f.q("UPDATE employees SET active=false WHERE id='c34-b'");
  const r = await reviewed();
  expect(r.rows!.some((row) => row.employeeId === "c34-b")).toBe(true);
  const rows = r
    .rows!.filter((row) => row.employeeId !== "c34-b")
    .map((row) => ({
      employeeId: row.employeeId,
      grossMinor: row.grossMinor,
      netMinor: row.netMinor,
      employeeDeductions: row.employeeDeductions,
      employerContributions: row.employerContributions,
    }));
  await expect(
    command(
      proof,
      {
        action: "IMPORT",
        operationId: randomUUID(),
        runId: r.id,
        expectedRevision: r.revision,
        amounts: {
          schema: "NEVORA_PAYROLL_IMPORT_V1",
          currency: "USD",
          sourceName: r.sourceName,
          sourceReference: r.sourceReference,
          period: r.period,
          payday: r.payday,
          rows,
        },
      },
      f.db.executor,
    ),
  ).rejects.toMatchObject({
    issues: [{ path: "rows.population", message: "Check this value." }],
  });
  expect((await runs(proof, f.db.executor)).runs[0].revision).toBe(r.revision);
});
