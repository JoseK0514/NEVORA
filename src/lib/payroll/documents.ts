import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PayrollRun, PayrollDocument } from "./contracts";
import type { Snapshot } from "./service";
import { PayrollError } from "./model";
import { statement as q, workspaceSql as ws } from "./store";
import { stableExportJson } from "../payroll-export/json";
const sha = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const idFor = (runId: string, kind: string, employeeId: string | null) => {
  const hex = createHash("sha256")
    .update(`${runId}:${kind}:${employeeId ?? ""}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
export function money(v: string) {
  const n = BigInt(v);
  return `USD ${n / BigInt(100)}.${(n % BigInt(100)).toString().padStart(2, "0")}`;
}
function stored(
  run: PayrollRun,
  kind: PayrollDocument["kind"],
  employeeId: string | null,
  bytes: Buffer,
) {
  const id = idFor(run.id, kind, employeeId),
    filename = `payroll-${run.period.startDate}-${id}.${kind === "PAYMENT_INSTRUCTIONS" ? "json" : "pdf"}`,
    sha256 = sha(bytes);
  return {
    id,
    filename,
    sha256,
    bytes,
    kind,
    employeeId,
    statement: q(
      `INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload) VALUES(${ws},$1::uuid,$2::uuid,$3,$4,$5,$6,decode($7,'hex'),$8::jsonb) ON CONFLICT DO NOTHING`,
      id,
      run.id,
      employeeId,
      kind,
      filename,
      sha256,
      bytes.toString("hex"),
      JSON.stringify({ period: run.period, payday: run.payday }),
    ),
  };
}
export function paymentDocument(run: PayrollRun, snapshot: Snapshot) {
  if (run.status !== "APPROVED" || !run.totals || !run.rows)
    throw new PayrollError("APPROVAL_REQUIRED", 409);
  const artifact = {
    schema: "NEVORA_PAYMENT_INSTRUCTIONS_V1",
    compatibility: "UNVERIFIED",
    submission: "NOT_SUBMITTED",
    processing: "UNVERIFIED",
    currency: "USD",
    runId: run.id,
    runRevision: run.revision,
    sourceName: snapshot.amounts.sourceName,
    sourceReference: snapshot.amounts.sourceReference,
    period: run.period,
    payday: run.payday,
    employeeCount: run.totals.employeeCount,
    totalNetMinor: run.totals.netMinor,
    instructions: run.rows.map((row) => ({
      employeeId: row.employeeId,
      amountMinor: row.netMinor,
    })),
  };
  return stored(
    run,
    "PAYMENT_INSTRUCTIONS",
    null,
    Buffer.from(stableExportJson(artifact)),
  );
}
/** Validate every dynamic string that appears in either document before approval. */
export async function preflightDocumentGlyphs(run:PayrollRun,snapshot:Snapshot){
  const doc=await PDFDocument.create();
  const supported=new Set((await doc.embedFont(StandardFonts.Helvetica)).getCharacterSet());
  const fields:[string,string][]=[['companyName',snapshot.settings.preferences.companyName],['sourceName',snapshot.amounts.sourceName],['sourceReference',snapshot.amounts.sourceReference]];
  for(const [i,row] of (run.rows??[]).entries()){
    fields.push([`rows.${i}.employeeName`,row.employeeName],[`rows.${i}.employeeId`,row.employeeId]);
    for(const [category,lines] of [['earnings',row.earnings??[]],['employeeDeductions',row.employeeDeductions],['employerContributions',row.employerContributions]] as const){
      for(const [j,line] of lines.entries())fields.push([`rows.${i}.${category}.${j}.label`,line.label]);
    }
  }
  const issues=fields.filter(([,value])=>[...value].some(char=>!supported.has(char.codePointAt(0)!))).map(([path])=>({path,message:'This exact text contains a character outside the supported English/Spanish PDF repertoire.'}));
  if(issues.length)throw new PayrollError('UNSUPPORTED_DOCUMENT_GLYPH',409,issues);
}
async function pdf(lines: string[], createdAt: string) {
  const doc = await PDFDocument.create();
  // PDF standard Helvetica has reliable WinAnsi outlines for English/Spanish.
  // Reject unsupported characters explicitly instead of producing missing glyphs.
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.setCreationDate(new Date(createdAt));
  doc.setModificationDate(new Date(createdAt));
  doc.setProducer("NEVORA");
  doc.setCreator("NEVORA");
  const glyphs = new Set(font.getCharacterSet());
  let page: PDFPage,
    y = 0;
  const add = () => {
    page = doc.addPage([612, 792]);
    y = 748;
  };
  add();
  for (const line of lines) {
    for (const char of line)
      if (!glyphs.has(char.codePointAt(0)!))
        throw new PayrollError("UNSUPPORTED_DOCUMENT_GLYPH", 409);
    for (const wrapped of wrap(line, font)) {
      if (y < 50) add();
      page!.drawText(wrapped, {
        x: 44,
        y,
        size: 10,
        font,
        color: rgb(0.1, 0.13, 0.17),
      });
      y -= 16;
    }
    y -= 4;
  }
  doc.getPages().forEach((p, i) =>
    p.drawText(`${i + 1} / ${doc.getPageCount()}`, {
      x: 520,
      y: 26,
      size: 9,
      font,
    }),
  );
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}
function wrap(text: string, font: PDFFont) {
  const lines: string[] = [];
  let line = "";
  for (const char of text) {
    if (font.widthOfTextAtSize(line + char, 10) > 520) {
      lines.push(line);
      line = char;
    } else line += char;
  }
  lines.push(line);
  return lines;
}
export async function generatePdfs(
  run: PayrollRun,
  snapshot: Snapshot,
  progress?: () => Promise<void>,
) {
  if (run.status !== "APPROVED" || !run.rows || !run.totals || !run.approvedAt)
    throw new PayrollError("APPROVAL_REQUIRED", 409);
  const base = (es: boolean) => [
    snapshot.settings.preferences.companyName,
    es ? "Comprobante de nómina" : "Pay statement",
    `${run.period.startDate} — ${run.period.endDate}`,
    `${es ? "Fecha de pago" : "Payday"}: ${run.payday}`,
    `${es ? "Fuente" : "Source"}: ${snapshot.amounts.sourceName} / ${snapshot.amounts.sourceReference}`,
    `${es ? "Nómina" : "Run"}: ${run.id} / ${run.revision}`,
  ];
  const result = [];
  for (const row of run.rows) {
    await progress?.();
    const exception = snapshot.exceptions.find(
      (e) => e.exception.employeeId === row.employeeId,
    );
    const es =
      (exception?.exception.language ??
        snapshot.settings.preferences.language) === "es";
    const lines = [
      ...base(es),
      `${row.employeeName} (${row.employeeId})`,
      `${es ? "Bruto" : "Gross"}: ${money(row.grossMinor)}`,
      ...(row.earnings ?? []).map((l) => `${l.label}: ${money(l.amountMinor)}`),
      es ? "Deducciones del empleado" : "Employee deductions",
      ...row.employeeDeductions.map(
        (l) => `${l.label}: ${money(l.amountMinor)}`,
      ),
      `${es ? "Neto" : "Net"}: ${money(row.netMinor)}`,
      es
        ? "Aportaciones patronales (no reducen el neto)"
        : "Employer contributions (do not reduce net)",
      ...row.employerContributions.map(
        (l) => `${l.label}: ${money(l.amountMinor)}`,
      ),
      es
        ? "Publicación no confirma pago."
        : "Publication does not confirm payment.",
    ];
    result.push(
      stored(
        run,
        "EMPLOYEE_STATEMENT",
        row.employeeId,
        await pdf(lines, run.approvedAt),
      ),
    );
  }
  await progress?.();
  const es = snapshot.settings.preferences.language === "es";
  result.push(
    stored(
      run,
      "COMPANY_SUMMARY",
      null,
      await pdf(
        [
          ...base(es),
          es ? "Resumen de nómina" : "Payroll summary",
          ...run.rows.flatMap((row) => [
            `${row.employeeName} (${row.employeeId})`,
            `${es ? "Bruto" : "Gross"}: ${money(row.grossMinor)} | ${es ? "Neto" : "Net"}: ${money(row.netMinor)}`,
          ]),
          `${es ? "Empleados" : "Employees"}: ${run.totals.employeeCount}`,
          `${es ? "Bruto" : "Gross"}: ${money(run.totals.grossMinor)}`,
          `${es ? "Deducciones del empleado" : "Employee deductions"}: ${money(run.totals.deductionsMinor)}`,
          `${es ? "Aportaciones patronales" : "Employer contributions"}: ${money(run.totals.employerContributionsMinor)}`,
          `${es ? "Neto" : "Net"}: ${money(run.totals.netMinor)}`,
        ],
        run.approvedAt,
      ),
    ),
  );
  return result;
}
