import { describe, expect, it } from "vitest";
import { generatePdfs } from "../documents";
import { nativeDocumentFixture } from "./document-fixtures.test-support";
import { NATIVE_COMPANY_SUMMARY_TEMPLATE_V1, NATIVE_COMPANY_SUMMARY_TEMPLATE_V2, renderNativeCompanySummary, type NativeCompanySummaryPresentation } from "./company-summary-document";
import { NATIVE_PAYSTUB_TEMPLATE_V1 } from "./paystub-document";
import { expectCleanGeometry, readPdf } from "./pdf-text.test-support";

// Company payroll summary, template v2. Fictional data only.
const team = [
  ["María José Núñez", "EMP-DEMO-014", "63561", "54277"], ["Ángel Vélez", "EMP-DEMO-002", "100000", "82085"], ["Keisha Rivera", "EMP-DEMO-021", "48720", "42410"],
].map(([name, reference, grossMinor, netMinor]) => ({ name, reference, grossMinor, netMinor }));
function fixture(language: "en" | "es" = "en", employees = team): NativeCompanySummaryPresentation {
  const gross = employees.reduce((v, e) => v + BigInt(e.grossMinor), BigInt(0)), net = employees.reduce((v, e) => v + BigInt(e.netMinor), BigInt(0));
  return {
    language, companyName: "Fernwood Bakery", period: { startDate: "2026-09-28", endDate: "2026-10-04" }, payDate: "2026-10-09",
    approvedAt: "2026-10-08T16:30:00.000Z", runReference: "DEMO-RUN-2026-40", runRevision: 2, correction: { kind: "ORIGINAL" }, employees,
    totals: { employeeCount: employees.length, grossMinor: String(gross), deductionsMinor: String(gross - net), employerContributionsMinor: "16494", netMinor: String(net) },
  };
}
const summaryOf = async (...args: Parameters<typeof generatePdfs>) => (await generatePdfs(...args)).find(d => d.kind === "COMPANY_SUMMARY")!;

describe("native company summary template v2", () => {
  it("is the summary a native run that recorded pay statement v2 gets, with v2 in its stored metadata", async () => {
    const { run, snapshot } = nativeDocumentFixture();
    const summary = await summaryOf(run, snapshot);
    expect(JSON.parse(String(summary.statement.values[7])).nativeDocument).toMatchObject({ templateVersion: NATIVE_COMPANY_SUMMARY_TEMPLATE_V2, runRevision: run.revision });
    const { text } = await readPdf(summary.bytes);
    expect(text).toContain("Resumen de nómina");
    expect(text).toContain("Ángel Vélez");
    expect((await summaryOf(run, snapshot)).sha256).toBe(summary.sha256);
  });

  it("keeps the plain summary byte for byte for a native run that recorded pay statement v1 and for an imported run", async () => {
    const { run, snapshot } = nativeDocumentFixture();
    const v1Run = { ...run, nativeCalculation: { ...run.nativeCalculation!, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V1 } };
    const v1 = await summaryOf(v1Run, snapshot);
    expect(JSON.parse(String(v1.statement.values[7])).nativeDocument.templateVersion).toBe(NATIVE_COMPANY_SUMMARY_TEMPLATE_V1);
    const imported = await summaryOf({ ...run, sourceAuthority: "PROVIDER_IMPORT" as const, nativeCalculation: undefined }, snapshot);
    expect(v1.sha256).toBe(imported.sha256);
    expect((await readPdf(v1.bytes)).text).not.toContain("Plantilla v2");
  });

  it("leads with net pay, then the run in one strip, pay by employee, what the company pays, and references", async () => {
    const r = await renderNativeCompanySummary(fixture());
    const { pages, text } = await readPdf(r.bytes);
    expect(r.templateVersion).toBe(NATIVE_COMPANY_SUMMARY_TEMPLATE_V2);
    for (const value of ["Payroll summary", "Original", "For work Sep 28 – Oct 4, 2026", "Payday Oct 9, 2026", "3 employees", "Net pay to your team", "$1,787.72",
      "Employer contributions of $164.94 are paid on top of gross pay.", "Gross pay", "$2,122.81", "Employee deductions", "$335.09",
      "Pay by employee", "Employee ID EMP-DEMO-014", "$635.61", "$542.77", "Paid by the company", "$164.94",
      "Payroll run: DEMO-RUN-2026-40, revision 2", "Source: approved recorded time", "Approved Oct 8, 2026, 16:30 UTC", "Template v2",
      "This summary documents approved payroll. It doesn't confirm payment.", "Page 1 of 1"])
      expect(text).toContain(value);
    const hero = pages[0].find(line => line.text === "$1,787.72" && line.size > 30)!;
    expect(hero.bold).toBe(true);
    expect(hero.y).toBeGreaterThan(pages[0].find(line => line.text === "Pay by employee")!.y);
    await expectCleanGeometry(pages);
  });

  it("reads in Spanish and marks a corrected replacement with its run references", async () => {
    const input = fixture("es");
    input.correction = { kind: "REPLACEMENT", originalRunReference: "DEMO-ORIGINAL-1", replacesRunReference: "DEMO-PREVIOUS-2" };
    input.totals.employerContributionsMinor = "0";
    const { pages, text } = await readPdf((await renderNativeCompanySummary(input)).bytes);
    for (const value of ["Resumen de nómina", "Reemplazo corregido", "Trabajo del 28 sep – 4 oct 2026", "Pago 9 oct 2026", "3 empleados", "Pago neto a tu equipo",
      "Pago por empleado", "ID de empleado EMP-DEMO-014", "Pagado por la empresa", "Nómina original: DEMO-ORIGINAL-1", "Reemplaza nómina: DEMO-PREVIOUS-2",
      "Origen: tiempo registrado aprobado", "Aprobado 8 oct 2026, 16:30 UTC", "Página 1 de 1"])
      expect(text).toContain(value);
    expect(text).not.toContain("se pagan además del pago bruto");
    await expectCleanGeometry(pages);
  });

  it("wraps long names and IDs, shrinks very large amounts to fit, and continues across pages with a footer on every page", async () => {
    const employees = Array.from({ length: 40 }, (_, i) => ({ ...team[i % 3], reference: `EMP-DEMO-${100 + i}` }));
    employees[0] = { name: "María José Núñez de los Santos y Rodríguez ".repeat(4).trim(), reference: "EMP-" + "DEMO".repeat(30), grossMinor: "999999999999", netMinor: "888888888888" };
    const input = fixture("en", employees);
    input.companyName = "Panadería y Repostería Fernwood de Mayagüez y Cabo Rojo, Sociedad Limitada µ";
    const { pages, text, compact } = await readPdf((await renderNativeCompanySummary(input)).bytes);
    expect(pages.length).toBeGreaterThan(1);
    expect(text).toContain("Pay by employee (continued)");
    for (let i = 1; i <= pages.length; i++) expect(text).toContain(`Page ${i} of ${pages.length}`);
    expect(compact).toContain("EMP-" + "DEMO".repeat(30));
    expect(compact).toContain("$9,999,999,999.99");
    expect(compact).toContain("EMP-DEMO-139");
    expect(compact).toContain("SOCIEDADLIMITADAµ");
    await expectCleanGeometry(pages);
  });

  it("awaits progress through a large summary and stops when the callback fails", async () => {
    const input = fixture("en", Array.from({ length: 120 }, (_, i) => ({ ...team[i % 3], reference: `EMP-DEMO-${i}` })));
    let calls = 0;
    await renderNativeCompanySummary(input, { progress: async () => { calls++; } });
    expect(calls).toBeGreaterThan(6);
    let n = 0;
    await expect(renderNativeCompanySummary(input, { progress: async () => { if (++n === 4) throw Error("PAYROLL_LEASE_LOST"); } })).rejects.toThrow("PAYROLL_LEASE_LOST");
  });

  it("rejects text the pinned fonts can't draw, naming each path", async () => {
    const input = fixture();
    input.employees = [{ ...team[0], name: "日本語" }, ...team.slice(1)];
    input.companyName = "Fernwood\u0007";
    await expect(renderNativeCompanySummary(input)).rejects.toMatchObject({ code: "UNSUPPORTED_DOCUMENT_GLYPH", issues: [{ path: "companyName" }, { path: "employees.0.name" }] });
  });
});
