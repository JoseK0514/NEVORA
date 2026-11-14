import { it, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { generatePdfs, paymentDocument } from "./documents";
import { newRun, type Snapshot } from "./service";
const period = { startDate: "2026-09-21", endDate: "2026-09-27" };
const run = {
  ...newRun("11111111-1111-4111-8111-111111111111", period, "2026-09-29"),
  status: "APPROVED" as const,
  approvedAt: "2026-09-28T12:00:00.000Z",
  approvedBy: "owner",
  totals: {
    grossMinor: "10000",
    deductionsMinor: "1234",
    employerContributionsMinor: "700",
    netMinor: "8766",
    employeeCount: 1,
  },
  rows: [
    {
      employeeId: "a",
      employeeName: "María José " + "Apellido largo ".repeat(12),
      grossMinor: "10000",
      netMinor: "8766",
      employeeDeductions: Array.from({ length: 60 }, (_, i) => ({
        code: `D${i}`,
        label: `Deducción ${i}`,
        amountMinor: i === 0 ? "1234" : "0",
      })),
      employerContributions: [
        { code: "E", label: "Aportación patronal", amountMinor: "700" },
      ],
    },
  ],
};
const snapshot = {
  source: {
    roster: [],
    timecards: { cards: [] },
    population: null,
    settings: [],
    exceptions: [],
  },
  settings: {
    revision: 1,
    effectiveFrom: "2026-01-01",
    reason: "QA",
    actorId: "owner",
    createdAt: "2026-01-01",
    preferences: {
      companyName: "Compañía Ficticia",
      language: "es",
      currency: "USD",
      schedule: {
        frequency: "WEEKLY",
        anchorDate: "2026-01-01",
        paydayOffsetDays: 2,
      },
      rules: [],
      automation: {
        prepare: false,
        publish: true,
        reminders: false,
        reminderLeadDays: [],
      },
      bankProfile: "NEUTRAL_UNVERIFIED",
    },
  },
  exceptions: [],
  amounts: {
    schema: "NEVORA_PAYROLL_IMPORT_V1",
    currency: "USD",
    sourceName: "Contador Ficticio",
    sourceReference: "QA-2026",
    period,
    payday: "2026-09-29",
    rows: run.rows,
  },
} satisfies Snapshot;
it("creates actual paginated Spanish PDFs with exact deterministic bytes from approved snapshot", async () => {
  const docs = await generatePdfs(run, snapshot);
  expect(docs).toHaveLength(2);
  const again = await generatePdfs(run, snapshot);
  expect(docs.map((d) => d.sha256)).toEqual(again.map((d) => d.sha256));
  expect(
    (await PDFDocument.load(docs[0].bytes)).getPageCount(),
  ).toBeGreaterThan(1);
  await mkdir(".omo/evidence/payroll-backend/pdf", { recursive: true });
  for (const d of docs)
    await writeFile(`.omo/evidence/payroll-backend/pdf/${d.filename}`, d.bytes);
});
it("neutral payment artifact contains exact approved total/count and explicitly unverified compatibility", () => {
  const doc = paymentDocument(run, snapshot);
  const body = JSON.parse(doc.bytes.toString("utf8"));
  expect(body.totalNetMinor).toBe("8766");
  expect(body.employeeCount).toBe(1);
  expect(body.compatibility).toBe("UNVERIFIED");
  expect(paymentDocument(run, snapshot).sha256).toBe(doc.sha256);
  expect(body.instructions[0].amountMinor).toBe("8766");
});
it('fails unsupported-script names explicitly instead of creating corrupt statements',async()=>{await expect(generatePdfs({...run,rows:[{...run.rows[0],employeeName:'日本語'}]},snapshot)).rejects.toThrow('UNSUPPORTED_DOCUMENT_GLYPH');});
it('refuses full-net payment instructions for a provider-import correction',()=>{
  expect(()=>paymentDocument({...run,correctionOf:'22222222-2222-4222-8222-222222222222'},snapshot)).toThrow('CORRECTION_PAYMENT_EXPORT_UNAVAILABLE');
});
