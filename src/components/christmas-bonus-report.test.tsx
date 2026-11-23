import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from "@rstest/core";
import { bonusYear, type BonusRow, type ChristmasBonusReport } from "@/lib/reports/christmas-bonus";
import { PortalLangProvider } from "@/lib/i18n/portal-lang";

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _p, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));
const { ChristmasBonusView } = await import("./christmas-bonus-report");

const MINUTE = BigInt(60_000_000_000);
const row = (extra: Partial<BonusRow>): BonusRow => ({ employeeId: "E1", name: "Ana Rivera", active: true, hireDate: "2016-03-02", thresholdHours: 700,
  recordedNanoseconds: String(BigInt(750 * 60 + 30) * MINUTE), breakNanoseconds: "0", unfinalizedDays: 0, status: "REACHED", ...extra });
const report = (rows: BonusRow[]): ChristmasBonusReport => ({ year: bonusYear(2026), timeZone: "America/Puerto_Rico", observedAt: "2026-11-18T16:00:00Z", rows,
  summary: { people: rows.length, reached: rows.length, checkBreaks: 0, needsHireDate: 0, notConfirmed: 0, unfinalizedDays: 0, peopleWithUnfinalizedDays: 0 } });
const html = (rows: BonusRow[]) => renderToStaticMarkup(createElement(ChristmasBonusView, { report: report(rows), choices: [bonusYear(2026), bonusYear(2025)] }));

// Final verification F (Nov 18, 2026).
describe("Christmas bonus hours", () => {
  it("writes hours as Insights does (F19): hours and minutes, thousands grouped", () => {
    const out = html([row({}), row({ employeeId: "E2", name: "Luis Ortiz", thresholdHours: 1350, recordedNanoseconds: String(BigInt(1400 * 60 + 5) * MINUTE), status: "REACHED" })]).replace(/[  ]/g, " ");
    expect(out).toContain(">750 h 30 min of 700 h<");
    expect(out).toContain(">1,400 h 5 min of 1,350 h<");
    expect(out).not.toMatch(/h 0\d\b/);
  });
  it("joins a person's facts with the kit's facts line, so no line starts or ends with the dot (F07)", () => {
    const out = html([row({})]);
    expect(out).toContain('<span class="b-segs c-bonus__facts"><span class="b-segs__i"><span class="c-bonus__fact">');
    expect(out).not.toMatch(/<\/span> · <span class="c-bonus__fact">/);
  });
  it("shows an empty year as the empty state alone: no 0 count and no footnote (F20)", () => {
    const out = html([]);
    expect(out).toContain("No hours recorded in NEVORA for this bonus year");
    expect(out).toContain('<h2 class="c-card__label" id="bonus-people-label">People</h2>');
    expect(out).not.toContain('class="b-note"');
    expect(out).not.toContain('id="bonus-summary"');
  });
  it("titles the disclaimer with its first sentence, Jose's words unchanged (F18)", () => {
    const out = html([row({})]);
    expect(out).toContain('<p class="b-callout__t">Informational only</p><div class="b-callout__b">Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.</div>');
    expect(out).toContain('class="b-note"');
  });
  it("marks the shown year with the bold check (F17)", () => {
    const out = html([row({})]);
    expect(out.match(/c-bonus__yearcheck/g)).toHaveLength(2);
    expect(out).toMatch(/aria-current="true">Oct 2025 – Sep 2026<svg[^>]*class="c-bonus__yearcheck"/);
  });
});

// Rondo Spanish (G98): the page passes the person's language; the year menu reads it from the portal.
describe("Christmas bonus hours in Spanish", () => {
  const spanish = (rows: BonusRow[]) => renderToStaticMarkup(<PortalLangProvider lang="es">
    <ChristmasBonusView report={report(rows)} choices={[bonusYear(2026), bonusYear(2025)]} lang="es" /></PortalLangProvider>).replace(/[\u00a0\u202f]/g, " ");
  it("writes the report, statuses, facts and es-PR dates in Spanish, and none of the English", () => {
    const out = spanish([row({}), row({ employeeId: "E2", name: "Luis Ortiz", hireDate: null, thresholdHours: null, status: "NEEDS_HIRE_DATE", unfinalizedDays: 2, active: false })]);
    const text = out.replace(/<[^>]+>/g, "");
    expect(out).toContain('<p class="b-callout__t">Solo informativo</p><div class="b-callout__b">La elegibilidad, las cantidades y las exenciones del bono de Navidad dependen del tamaño del patrono y de la ley de Puerto Rico. Confírmalo con tu proveedor de nómina o tu asesor legal antes de pagar.</div>');
    for (const words of ["Horas para el bono de Navidad", "Año del bono", "Período de pago", "Fecha límite para solicitar la exención", "Resumen", "Alcanzó", "Sin fecha de contratación", "Personas", "Las horas son el tiempo registrado"]) expect(out).toContain(words);
    expect(text).toContain("750 h 30 min de 700 h");expect(text).toContain("Contratación: 2 mar 2016");expect(text).toContain("2 días sin finalizar");expect(text).toContain("Inactiva");
    expect(out).toMatch(/aria-current="true">oct 2025 – sep 2026<svg/);
    for (const english of ["Informational only", "Christmas bonus hours", "Bonus year", "Payment window", "Reached", "No hire date", "Hired ", "not finalized", "At a glance"]) expect(out).not.toContain(english);
  });
  it("writes the empty year in Spanish", () => {
    expect(spanish([])).toContain("No hay horas registradas en NEVORA para este año del bono");
  });
});
