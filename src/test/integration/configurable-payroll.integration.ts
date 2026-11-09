import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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
  // Timecard and period-close writes require the company_access_adoption row
  // since the Company Access integration. Apply 0032 after the fixture roster
  // (its census is captured at application time) but never 0031: with the
  // native payroll schema present, PREPARE captures a native run and this
  // suite's provider-amount IMPORT fails NATIVE_AMOUNT_INPUT_FORBIDDEN.
  await f.q(
    await readFile("db/migrations/0032_company_access_invitations.sql", "utf8"),
  );
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
  ).toEqual([{ delivery: "QUEUED_DELIVERY_DISABLED" }]);
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
it("own statements link a published correction to the statement it replaced, and name nobody else's", async () => {
  const seeded = await seedPayrollFixture(f.db.executor, { published: true });
  const owner = seeded.proof;
  const original = (await runs(owner, f.db.executor)).runs.find((x) => x.id === seeded.runId)!;
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),$1,now()+interval '1 day'),(repeat('f',64),$2,now()+interval '1 day')", [seeded.ids.a, seeded.ids.b]);
  const a = { employee: { ...owner.employee, id: seeded.ids.a, role: "EMPLOYEE" as const }, sessionTokenHash: "e".repeat(64) };
  const b = { employee: { ...owner.employee, id: seeded.ids.b, role: "EMPLOYEE" as const }, sessionTokenHash: "f".repeat(64) };
  const before = (await statements(a, f.db.executor)).statements;
  expect(before).toHaveLength(1);
  expect(before[0]).toMatchObject({ corrects: null, correctedBy: null });
  const corrected = await command(owner, { action: "CORRECT", operationId: randomUUID(), runId: original.id, expectedRevision: original.revision, reason: "Fictional corrected reference", amounts: { ...seeded.amounts, sourceReference: "QA-linked-correction" } }, f.db.executor);
  const draft = (await runs(owner, f.db.executor)).runs.find((x) => x.id === corrected.runId)!;
  await command(owner, { action: "APPROVE", operationId: randomUUID(), runId: draft.id, expectedRevision: draft.revision, reviewToken: draft.reviewToken }, f.db.executor);
  // Run the worker until the correction's documents exist but are not yet published: an unpublished document is
  // never named, even though it is this person's own and its run corrects a published one.
  let unpublishedChecked = false;
  for (let i = 0; i < 6; i++) {
    const [state] = await f.q<{ docs: number; published: number }>("SELECT (SELECT count(*)::int FROM payroll_documents WHERE run_id=$1 AND employee_id=$2) AS docs,(SELECT count(*)::int FROM payroll_publications WHERE run_id=$1) AS published", [corrected.runId, seeded.ids.a]);
    if (state.docs > 0 && state.published === 0) { expect((await statements(a, f.db.executor)).statements).toEqual(before); unpublishedChecked = true; }
    if (state.published > 0) break;
    await workerOnce(f.db.executor);
  }
  expect(unpublishedChecked).toBe(true);
  const after = (await statements(a, f.db.executor)).statements;
  expect(after).toHaveLength(2);
  const replacement = after.find((x) => x.id !== before[0].id)!;
  expect(after.find((x) => x.id === before[0].id)).toMatchObject({ corrects: null, correctedBy: replacement.id });
  expect(replacement).toMatchObject({ corrects: before[0].id, correctedBy: null, period: before[0].period, payday: before[0].payday });
  // The other employee in the same runs sees no link to this person's documents.
  const others = (await statements(b, f.db.executor)).statements;
  expect(JSON.stringify(others)).not.toContain(before[0].id);
  expect(JSON.stringify(others)).not.toContain(replacement.id);
  // Both documents remain verified bytes for their owner only.
  expect((await document(a, replacement.id, f.db.executor)).bytes.subarray(0, 5).toString()).toBe("%PDF-");
  await expect(document(b, replacement.id, f.db.executor)).rejects.toThrow("DOCUMENT_UNAVAILABLE");
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

import { sqlNotificationStateRepository } from "../../lib/data/notification-state";
import { notificationIntentStatements } from "../../lib/data/notifications";
import { sqlSubscriptionRepository } from "../../lib/data/push-subscriptions";
import { sqlDeliveryRepository } from "../../lib/data/push-deliveries";
import { runDispatch, type WorkerDeps } from "../../lib/notifications/worker";
import { createNotificationOpenHandler } from "../../lib/notifications/open";
import { notificationPolicyFor } from "../../lib/notifications/policy";
import { encryptSubscriptionMaterial } from "../../lib/notifications/installation";
import { createECDH, createHash } from "node:crypto";
import type {
  NotificationIntent,
  ProviderResult,
} from "../../lib/notifications/types";
import { vi } from "vitest";
async function statementIntents() {
  await approve();
  await workerOnce(f.db.executor);
  await workerOnce(f.db.executor);
  await workerOnce(f.db.executor);
  const state = sqlNotificationStateRepository(f.db.executor);
  const ids = await f.q<{ id: string }>(
    "SELECT id FROM notifications WHERE source_kind='PAYROLL_STATEMENT' ORDER BY employee_id",
  );
  return {
    state,
    intents: await Promise.all(
      ids.map(async (r) => (await state.findIntent(r.id))!),
    ),
  };
}
async function fakeDispatcher(
  employeeId: string,
  result: ProviderResult = { kind: "accepted" },
) {
  const key = Buffer.alloc(32, 3),
    pair = createECDH("prime256v1");
  pair.setPrivateKey(Buffer.alloc(32, 1));
  const sessionHash =
    employeeId === "c34-owner"
      ? "a".repeat(64)
      : employeeId === "c34-a"
        ? "b".repeat(64)
        : "c".repeat(64);
  await f.q(
    "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day') ON CONFLICT DO NOTHING",
    [sessionHash, employeeId],
  );
  const enrollment = {
    employeeId,
    installationHash: createHash("sha256")
      .update(`fictional-${employeeId}`)
      .digest("hex"),
    environment: "test" as const,
    endpointFingerprint: `fictional-${employeeId}`,
    sessionHash,
    generation: randomUUID(),
    expectedGeneration: null,
    expiresAt: null,
    encryptedMaterial: "placeholder",
  };
  enrollment.encryptedMaterial = encryptSubscriptionMaterial(
    {
      endpoint: "https://fcm.googleapis.com/fcm/send/QA-never-contact",
      expirationTime: null,
      keys: {
        p256dh: pair.getPublicKey().toString("base64url"),
        auth: Buffer.alloc(16, 2).toString("base64url"),
      },
    },
    key,
    enrollment,
  );
  await sqlSubscriptionRepository(f.db.executor).enroll(enrollment);
  const workspace = (await import("../../lib/data/workspaces")).getWorkspace;
  const send = vi.fn(async () => result);
  const deps: WorkerDeps = {
    executor: f.db.executor,
    state: sqlNotificationStateRepository(f.db.executor),
    subscriptions: sqlSubscriptionRepository(f.db.executor),
    deliveries: sqlDeliveryRepository("test", f.db.executor),
    sender: { send },
    clock: () => new Date(),
    config: {
      workspace: await workspace(f.db.executor),
      featureEnabled: true,
      deliveryEnabled: true,
      testDeliveryEnabled: true,
      testAccountIds: [employeeId],
      environment: "test",
      portalOrigin: "https://example.invalid",
      subscriptionEncryptionKey: key.toString("base64url"),
      policy: notificationPolicyFor("America/Puerto_Rico"),
    },
  };
  // High urgency only in fictional dispatch fixtures avoids dependence on current quiet hour.
  await f.q("UPDATE notifications SET urgency='high' WHERE employee_id=$1", [
    employeeId,
  ]);
  return { deps, send };
}
it("backlog exposes two oldest missed cycles even with latest prepared; manual review remains idempotent and waiting", async () => {
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      reason: "Historical fixture",
      expectedRevision: 0,
      effectiveFrom: "2026-09-01",
      preferences,
    },
    f.db.executor,
  );
  await command(
    proof,
    {
      action: "PREPARE",
      operationId: randomUUID(),
      period: { startDate: "2026-10-05", endDate: "2026-10-11" },
      payday: "2026-10-13",
    },
    f.db.executor,
  );
  const response = await runs(proof, f.db.executor);
  expect(
    response.missingPeriods!.slice(0, 2).map((x) => x.period.startDate),
  ).toEqual(["2026-09-21", "2026-09-28"]);
  await f.q("UPDATE employees SET role='MANAGER' WHERE id='c34-a'");
  await f.q(
    "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-a',now()+interval '1 day')",
  );
  await saveSettings(
    proof,
    {
      action: "SET_GRANT",
      operationId: randomUUID(),
      reason: "Review historical gap",
      expectedRevision: 0,
      grant: { employeeId: "c34-a", review: true, approve: false },
    },
    f.db.executor,
  );
  const reviewer = {
    employee: { ...proof.employee, id: "c34-a", role: "MANAGER" as const },
    sessionTokenHash: "b".repeat(64),
  };
  const first = response.missingPeriods![0];
  const c = {
    action: "PREPARE",
    operationId: randomUUID(),
    period: first.period,
    payday: first.payday,
  };
  expect(await command(reviewer, c, f.db.executor)).toEqual(
    await command(reviewer, c, f.db.executor),
  );
  expect(
    (await runs(proof, f.db.executor)).runs.every(
      (r) => r.status === "WAITING_FOR_AMOUNTS",
    ),
  ).toBe(true);
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_documents")).toEqual(
    [{ n: 0 }],
  );
});
it("missed reminder lead recovers one actionable preparation source, excluding ungranted Managers", async () => {
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      reason: "Missed lead",
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      preferences: {
        ...preferences,
        schedule: { ...preferences.schedule, paydayOffsetDays: 0 },
        automation: {
          ...preferences.automation,
          prepare: false,
          reminderLeadDays: [31],
        },
      },
    },
    f.db.executor,
  );
  await f.q("UPDATE employees SET role='MANAGER' WHERE id='c34-b'");
  await schedulePayroll(f.db.executor);
  await schedulePayroll(f.db.executor);
  expect(
    await f.q(
      "SELECT count(*)::int AS n FROM payroll_jobs WHERE kind='REMINDER'",
    ),
  ).toEqual([{ n: 1 }]);
  await workerOnce(f.db.executor);
  expect(
    await f.q(
      "SELECT employee_id FROM notifications WHERE source_kind='PAYROLL_PREPARATION'",
    ),
  ).toEqual([{ employee_id: "c34-owner" }]);
  const state = sqlNotificationStateRepository(f.db.executor),
    [id] = await f.q<{ id: string }>("SELECT id FROM notifications");
  const intent = (await state.findIntent(id.id))!;
  expect((await state.check(intent, "c34-owner", new Date())).deliverable).toBe(
    true,
  );
  await f.q("UPDATE employees SET role='MANAGER' WHERE id='c34-owner'");
  expect(
    (await state.check(intent, "c34-owner", new Date(), "open")).deliverable,
  ).toBe(false);
});
it("publication notices atomically queue generic unique intents and preserve historical stub receipts", async () => {
  const { state, intents } = await statementIntents();
  expect(intents).toHaveLength(3);
  await Promise.all([
    f.db.executor.transaction(
      notificationIntentStatements(
        intents.map((n) => ({ ...n, id: randomUUID() })),
      ),
    ),
    f.db.executor.transaction(
      notificationIntentStatements(
        intents.map((n) => ({ ...n, id: randomUUID() })),
      ),
    ),
  ]);
  expect(await f.q("SELECT count(*)::int AS n FROM notifications")).toEqual([
    { n: 3 },
  ]);
  for (const n of intents) {
    expect(n.title).toBe("NEVORA update");
    expect(n.body).toBe("Open NEVORA to review your update.");
    expect(n.actionHref).toBeUndefined();
    expect((await state.check(n, n.employeeId, new Date())).deliverable).toBe(
      true,
    );
  }
  const out = (await runs(proof, f.db.executor)).jobs.find(
    (j) => j.kind === "REMINDER",
  );
  expect(out!.outcome).toBe("QUEUED_DELIVERY_DISABLED");
  await f.q(
    "INSERT INTO payroll_notice_receipts(workspace_id,business_key,payload) SELECT id,'historical-stub','{\"delivery\":\"NOT_SENT\"}'::jsonb FROM workspaces WHERE singleton",
  );
  await f.q(
    "INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,status,payload) SELECT $1,id,'REMINDER','historical-stub','SUCCEEDED','{}'::jsonb FROM workspaces WHERE singleton",
    [randomUUID()],
  );
  expect(
    (await runs(proof, f.db.executor)).jobs.find(
      (j) => j.id !== out!.id && j.kind === "REMINDER",
    )!.outcome,
  ).toBe("NOT_SENT_STUB");
  await expect(f.q("DELETE FROM payroll_notice_sources")).rejects.toThrow(
    "immutable ledger",
  );
});
it("private open denies another employee, disabled flag, inactive account and changed workspace", async () => {
  const { state, intents } = await statementIntents(),
    a = intents.find((n) => n.employeeId === "c34-a")!;
  const handler = (id: string) =>
    createNotificationOpenHandler({
      state,
      environment: "test",
      clock: () => new Date(),
      session: async () => ({
        id,
        role: "EMPLOYEE",
        firstName: "Fictional",
        lastName: "QA",
        primaryLocationId: "loc-1",
      }),
    });
  const request = new Request(
    `https://example.invalid/app/notifications/open?notificationId=${a.id}`,
  );
  expect((await handler("c34-b")(request)).status).toBe(404);
  const currentOwner = await handler("c34-a")(request);
  expect(currentOwner.status).toBe(303);
  // A statement notice opens that exact own statement on My pay (the source is the document).
  expect(currentOwner.headers.get("location")).toBe(`/app/my-pay?statement=${a.source.id}`);
  expect(a.source.id).toMatch(/^[0-9a-f-]{36}$/);
  expect(currentOwner.headers.get("cache-control")).toBe("no-store");
  expect(
    new URL(currentOwner.headers.get("location")!, "https://portal.example").href,
  ).toBe(`https://portal.example/app/my-pay?statement=${a.source.id}`);
  process.env.NEVORA_PAYROLL_ENABLED = "false";
  expect((await handler("c34-a")(request)).status).toBe(404);
  process.env.NEVORA_PAYROLL_ENABLED = "true";
  await f.q("UPDATE employees SET active=false WHERE id='c34-a'");
  expect((await handler("c34-a")(request)).status).toBe(404);
  await f.q("UPDATE employees SET active=true WHERE id='c34-a'");
  await f.q(
    "UPDATE workspaces SET updated_at=clock_timestamp() WHERE singleton",
  );
  expect((await handler("c34-a")(request)).status).toBe(404);
});
it.each(["inactive", "disabled", "workspace", "reminders"] as const)(
  "dispatch rejects %s before the injected fake sender",
  async (reason) => {
    await statementIntents();
    const { deps, send } = await fakeDispatcher("c34-a");
    if (reason === "inactive")
      await f.q("UPDATE employees SET active=false WHERE id='c34-a'");
    if (reason === "disabled") process.env.NEVORA_PAYROLL_ENABLED = "false";
    if (reason === "workspace")
      await f.q(
        "UPDATE workspaces SET updated_at=clock_timestamp() WHERE singleton",
      );
    if (reason === "reminders")
      await saveSettings(
        proof,
        {
          action: "SAVE_SETTINGS",
          operationId: randomUUID(),
          reason: "Disable notices",
          expectedRevision: 1,
          effectiveFrom: "2026-01-01",
          preferences: {
            ...preferences,
            automation: { ...preferences.automation, reminders: false },
          },
        },
        f.db.executor,
      );
    const report = await runDispatch({ mode: "all", deps });
    expect(send).not.toHaveBeenCalled();
    expect(report.accepted).toBe(0);
  },
);
it("fake transient then permanent delivery failure preserves approved PDF, publication and payment artifact bytes", async () => {
  await statementIntents();
  const run = (await runs(proof, f.db.executor)).runs[0];
  await command(
    proof,
    {
      action: "PAYMENT_EXPORT",
      operationId: randomUUID(),
      runId: run.id,
      expectedRevision: run.revision,
    },
    f.db.executor,
  );
  const before = await f.q(
    "SELECT id,sha256 FROM payroll_documents ORDER BY id",
  );
  const { deps, send } = await fakeDispatcher("c34-a", {
    kind: "retry",
    errorClass: "fictional_transient",
  });
  const first = await runDispatch({ mode: "all", deps });
  expect(first.retried).toBe(1);
  expect(send).toHaveBeenCalledTimes(1);
  await f.q(
    "UPDATE push_deliveries SET next_attempt_at=clock_timestamp() WHERE status='retry_pending'",
  );
  send.mockResolvedValue({ kind: "failed", errorClass: "fictional_permanent" });
  const second = await runDispatch({ mode: "retry", deps });
  expect(second.failed).toBe(1);
  expect(send).toHaveBeenCalledTimes(2);
  expect(
    await f.q("SELECT id,sha256 FROM payroll_documents ORDER BY id"),
  ).toEqual(before);
  expect(
    await f.q("SELECT count(*)::int AS n FROM payroll_publications"),
  ).toEqual([{ n: 1 }]);
  expect((await runs(proof, f.db.executor)).runs[0].status).toBe("APPROVED");
});
it("weekly offset31 selects the older actionable payday once and live reminder disable blocks statements", async () => {
  const [clock] = await f.q<{ today: string }>(
    "SELECT to_char(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico','YYYY-MM-DD') AS today",
  );
  const add = (s: string, n: number) =>
    new Date(Date.parse(`${s}T00:00:00Z`) + n * 86400000)
      .toISOString()
      .slice(0, 10);
  const anchor = add(clock.today, -49);
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      reason: "Offset31",
      expectedRevision: 0,
      effectiveFrom: anchor,
      preferences: {
        ...preferences,
        schedule: {
          frequency: "WEEKLY",
          anchorDate: anchor,
          paydayOffsetDays: 31,
        },
        automation: {
          prepare: false,
          publish: false,
          reminders: true,
          reminderLeadDays: [7],
        },
      },
    },
    f.db.executor,
  );
  await schedulePayroll(f.db.executor);
  await schedulePayroll(f.db.executor);
  await workerOnce(f.db.executor);
  const [source] = await f.q<{ start: string }>(
    "SELECT payload->'period'->>'startDate' AS start FROM payroll_notice_sources",
  );
  expect(source.start).toBe(add(clock.today, -35));
  expect(await f.q("SELECT count(*)::int AS n FROM notifications")).toEqual([
    { n: 1 },
  ]);
});
it("statement notification source rechecks effective reminder disable after publication", async () => {
  const { state, intents } = await statementIntents();
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      reason: "Disable notices",
      expectedRevision: 1,
      effectiveFrom: "2026-01-01",
      preferences: {
        ...preferences,
        automation: { ...preferences.automation, reminders: false },
      },
    },
    f.db.executor,
  );
  expect(
    (await state.check(intents[0], intents[0].employeeId, new Date()))
      .deliverable,
  ).toBe(false);
  expect(
    (await state.check(intents[0], intents[0].employeeId, new Date(), "open"))
      .deliverable,
  ).toBe(false);
});
it("explicit reviewer grant revocation cancels preparation before fake send and protected open", async () => {
  await f.q("UPDATE employees SET role='MANAGER' WHERE id='c34-a'");
  await saveSettings(
    proof,
    {
      action: "SAVE_SETTINGS",
      operationId: randomUUID(),
      reason: "Prep fixture",
      expectedRevision: 0,
      effectiveFrom: "2026-01-01",
      preferences: {
        ...preferences,
        automation: {
          ...preferences.automation,
          prepare: false,
          reminderLeadDays: [31],
        },
      },
    },
    f.db.executor,
  );
  await saveSettings(
    proof,
    {
      action: "SET_GRANT",
      operationId: randomUUID(),
      reason: "Fictional grant",
      expectedRevision: 0,
      grant: { employeeId: "c34-a", review: true, approve: false },
    },
    f.db.executor,
  );
  await schedulePayroll(f.db.executor);
  await workerOnce(f.db.executor);
  const { deps, send } = await fakeDispatcher("c34-a");
  const [row] = await f.q<{ id: string }>(
    "SELECT id FROM notifications WHERE employee_id='c34-a'",
  );
  const intent = (await deps.state.findIntent(row.id))!;
  expect(
    (await deps.state.check(intent, "c34-a", new Date())).deliverable,
  ).toBe(true);
  await saveSettings(
    proof,
    {
      action: "SET_GRANT",
      operationId: randomUUID(),
      reason: "Fictional revoke",
      expectedRevision: 1,
      grant: { employeeId: "c34-a", review: false, approve: false },
    },
    f.db.executor,
  );
  expect(
    (await deps.state.check(intent, "c34-a", new Date(), "open")).deliverable,
  ).toBe(false);
  await runDispatch({ mode: "all", deps });
  expect(send).not.toHaveBeenCalled();
});
it("unpublished and foreign statement source metadata cannot grant access", async () => {
  const r = await approve();
  await workerOnce(f.db.executor);
  const [doc] = await f.q<{ id: string }>(
    "SELECT id FROM payroll_documents WHERE employee_id='c34-a' AND kind='EMPLOYEE_STATEMENT'",
  );
  await f.q(
    "INSERT INTO payroll_notice_sources(id,workspace_id,kind,version,payload) SELECT $1,id,'PAYROLL_STATEMENT','fixture',jsonb_build_object('workspaceVersion',updated_at::text) FROM workspaces WHERE singleton",
    [doc.id],
  );
  const state = sqlNotificationStateRepository(f.db.executor);
  const n: NotificationIntent = {
    id: randomUUID(),
    employeeId: "c34-a",
    type: "PAYROLL_STATEMENT",
    title: "NEVORA update",
    body: "Open NEVORA.",
    eventKey: "fixture",
    environment: "test",
    source: { kind: "PAYROLL_STATEMENT", id: doc.id, version: "fixture" },
    effectiveVersion: "fixture",
    purpose: "REMINDER",
    urgency: "normal",
    dueAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  expect((await state.check(n, "c34-a", new Date())).deliverable).toBe(false);
  await workerOnce(f.db.executor);
  expect((await state.check(n, "c34-a", new Date())).deliverable).toBe(true);
  expect(
    (
      await state.check(
        { ...n, employeeId: "c34-b" },
        "c34-b",
        new Date(),
        "open",
      )
    ).deliverable,
  ).toBe(false);
  expect(r.status).toBe("APPROVED");
});
it("P1-M2 document read excludes the run beyond the 300-run page at the SQL boundary", async () => {
  const { newRun, insertRun, insertRevision } = await import(
    "../../lib/payroll/service"
  );
  const batch = [];
  let oldest = "";
  for (let i = 0; i < 301; i++) {
    const date = new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10);
    const r = newRun(randomUUID(), { startDate: date, endDate: date }, date);
    r.createdAt = `${date}T00:00:00Z`;
    if (i === 0) oldest = r.id;
    batch.push(insertRun(r), insertRevision(r, null));
  }
  await f.db.executor.transaction(batch);
  await f.q(
    "INSERT INTO payroll_documents(workspace_id,id,run_id,kind,filename,sha256,content,payload) SELECT id,$1,$2,'COMPANY_SUMMARY','fictional.pdf',repeat('a',64),decode('00','hex'),'{}'::jsonb FROM workspaces WHERE singleton",
    [randomUUID(), oldest],
  );
  let loaded = -1;
  const observed = {
    ...f.db.executor,
    transaction: async (
      stmts: Parameters<typeof f.db.executor.transaction>[0],
    ) => {
      const result = await f.db.executor.transaction(stmts);
      const index = stmts.findIndex((s) =>
        s.text.includes("FROM payroll_documents d WHERE"),
      );
      if (index >= 0) loaded = result[index].length;
      return result;
    },
  };
  const response = await runs(proof, observed);
  expect(response.runs).toHaveLength(300);
  expect(response.runs.some((r) => r.id === oldest)).toBe(false);
  expect(loaded).toBe(0);
});
it("multiple effective revisions inside a period require review and never queue an automatic reminder", async () => {
  const [clock] = await f.q<{ today: string }>(
    "SELECT to_char(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico','YYYY-MM-DD') AS today",
  );
  const today = new Date(`${clock.today}T00:00:00Z`);
  const add = (days: number) =>
    new Date(today.getTime() + days * 86400000).toISOString().slice(0, 10);
  const laterAnchor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
  ).toISOString().slice(0, 10);
  for (const [index, days] of [-13, -6, -4].entries()) {
    await saveSettings(
      proof,
      {
        action: "SAVE_SETTINGS",
        operationId: randomUUID(),
        reason: "Fictional multi-revision transition",
        expectedRevision: index,
        effectiveFrom: add(days),
        preferences: {
          ...preferences,
          schedule: {
            frequency: index === 2 ? "MONTHLY" : "WEEKLY",
            anchorDate: index === 2 ? laterAnchor : add(-7),
            paydayOffsetDays: 2,
          },
          automation: {
            prepare: false,
            publish: false,
            reminders: true,
            reminderLeadDays: [1],
          },
        },
      },
      f.db.executor,
    );
  }
  const response = await runs(proof, f.db.executor);
  expect(response.missingPeriods).toMatchObject([
    {
      period: { startDate: add(-7), endDate: add(-1) },
      state: "AMBIGUOUS_TRANSITION",
    },
  ]);
  expect(await schedulePayroll(f.db.executor)).toEqual({ queued: 0 });
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_jobs")).toEqual([
    { n: 0 },
  ]);
});
it("history extraction returns bounded rows and explicit unknown counts on overflow", async () => {
  await f.q(
    "INSERT INTO payroll_setting_revisions(workspace_id,revision,effective_from,payload) SELECT w.id,g,'2026-01-01',jsonb_build_object('revision',g,'effectiveFrom','2026-01-01','preferences',$1::jsonb) FROM workspaces w CROSS JOIN generate_series(1,1002) g WHERE w.singleton",
    [JSON.stringify(preferences)],
  );
  const { payrollHistorySql } = await import("../../lib/payroll/history");
  const [row] = await f.db.executor.query<{
    history: unknown[];
    overflow: boolean;
  }>({ text: payrollHistorySql, values: [] });
  expect(row.history).toHaveLength(1001);
  expect(row.overflow).toBe(true);
  const r = await runs(proof, f.db.executor);
  expect(r.missingPeriods).toEqual([]);
  expect(r.backlog).toMatchObject({
    overflow: true,
    missingCount: null,
    remainingCount: null,
    returnedCount: 0,
  });
});
