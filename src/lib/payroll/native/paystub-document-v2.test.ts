import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  NATIVE_PAYSTUB_PRESENTATION_VERSION, NATIVE_PAYSTUB_TEMPLATE_V2,
  preflightNativePaystubGlyphs, renderNativeEmployeePaystub, type NativePaystubPresentation,
} from "./paystub-document";
import { expectCleanGeometry, readPdf } from "./pdf-text.test-support";

// Template v2 ("You take home" first, plain-language sections). Fictional data only.
function fixture(language: "en" | "es" = "en"): NativePaystubPresentation {
  return {
    version: NATIVE_PAYSTUB_PRESENTATION_VERSION, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V2,
    sourceAuthority: "NATIVE_RECORDED_TIME", currency: "USD", language,
    companyName: "Compañía Ejemplo — Servicios del Caribe", employeeName: "María José Núñez",
    employeeReference: "EMP-DEMO-014", period: { startDate: "2026-09-28", endDate: "2026-10-04" },
    payDate: "2026-10-09", approvedAt: "2026-10-08T16:30:00.000Z", runReference: "DEMO-RUN-2026-40", runRevision: 2,
    correction: { kind: "ORIGINAL" }, ytdYear: 2026,
    earnings: [
      { label: "Regular hours", kind: "REGULAR", amountMinor: "58000", work: {
        nanoseconds: "144000000000000", baseRateMinorPerHour: { numerator: "1450", denominator: "1" },
        premiumRateMinorPerHour: { numerator: "0", denominator: "1" }, paidRateMinorPerHour: { numerator: "1450", denominator: "1" },
      } },
      { label: "Overtime hours", kind: "OVERTIME", amountMinor: "5438", work: {
        nanoseconds: "9000000000000", baseRateMinorPerHour: { numerator: "1450", denominator: "1" },
        premiumRateMinorPerHour: { numerator: "725", denominator: "1" }, paidRateMinorPerHour: { numerator: "2175", denominator: "1" },
      } },
      { label: "Weekly premium true-up", kind: "FLSA_TRUE_UP", amountMinor: "123" },
    ],
    taxes: [
      { label: "Social Security", amount: { currentMinor: "4862", ytdMinor: "104862" } },
      { label: "Medicare", amount: { currentMinor: "922", ytdMinor: "20922" } },
      { label: "PR income tax", amount: { currentMinor: "3000", ytdMinor: "83000" } },
    ],
    authorizedDeductions: [{ label: "Authorized savings", amount: { currentMinor: "500", ytdMinor: "2500" } }],
    totals: {
      gross: { currentMinor: "63561", ytdMinor: "1063561" }, taxes: { currentMinor: "8784", ytdMinor: "208784" },
      authorizedDeductions: { currentMinor: "500", ytdMinor: "2500" }, net: { currentMinor: "54277", ytdMinor: "852277" },
    },
    employerContributions: {
      lines: [{ label: "Employer Social Security", amount: { currentMinor: "1234", ytdMinor: "50123" } }],
      total: { currentMinor: "1234", ytdMinor: "50123" },
    },
    sourceReferences: [{ label: "Recorded time", value: "DEMO-SOURCE-REV-5" }, { label: "Rules", value: "DEMO-APPROVED-RULES" }],
  };
}

function longStatement(): NativePaystubPresentation {
  const input = fixture("es");
  input.companyName = "Compañía de servicios profesionales y operaciones del Caribe ".repeat(3).trim().slice(0, 240);
  input.employeeName = "María José Núñez de los Santos y Rodríguez ".repeat(5).trim();
  input.employeeReference = "EMP-" + "DEMO".repeat(40);
  input.earnings[0].label = `${"Horas regulares en el centro norte con descripción extensa ".repeat(8).trim()} END-E`;
  input.authorizedDeductions = Array.from({ length: 75 }, (_, i) => ({
    label: `D-${i} ${"Deducción autorizada con descripción extensa para comprobar filas completas y lectura clara. ".repeat(3)} END-${i}`,
    amount: { currentMinor: "1", ytdMinor: "2" },
  }));
  input.totals.authorizedDeductions = { currentMinor: "75", ytdMinor: "150" };
  input.totals.net = { currentMinor: "54702", ytdMinor: "854627" };
  input.correction = { kind: "REPLACEMENT", originalRunReference: "DEMO-ORIGINAL-REV-1", replacesRunReference: "DEMO-PREVIOUS-REV-2", reasonLabel: "Corrección aprobada de tiempo registrado y ajuste suplementario." };
  return input;
}

describe("native pay statement template v2", () => {
  it.each([
    ["en", ["Pay statement", "You take home", "What you earned", "Taxes withheld", "Other deductions", "Paid by your employer", "References", "Original", "This year: $8,522.77", "Base $14.50 + $7.25 overtime premium", "Page 1 of 1", "This statement documents approved payroll. It doesn't confirm payment."]],
    ["es", ["Comprobante de nómina", "Recibes", "Lo que ganaste", "Impuestos retenidos", "Otras deducciones", "Pagado por tu patrono", "Referencias", "Original", "Este año: $8,522.77", "Base $14.50 + $7.25 prima por horas extra", "Página 1 de 1", "Este comprobante documenta la nómina aprobada. No confirma el pago."]],
  ] as const)("leads with take-home pay in plain %s and keeps every approved amount exact", async (language, phrases) => {
    const result = await renderNativeEmployeePaystub(fixture(language));
    const pdf = await readPdf(result.bytes);
    for (const phrase of phrases) expect(pdf.text).toContain(phrase);
    for (const amount of ["$542.77", "$635.61", "$87.84", "$5.00", "$580.00", "$54.38", "$1.23", "$48.62", "$9.22", "$30.00", "$12.34", "$1,048.62", "$501.23"]) expect(pdf.text).toContain(amount);
    const hero = pdf.pages[0].find(line => line.text === "$542.77" && line.size === 44);
    expect(hero?.bold).toBe(true);
    expect(pdf.pages.flat().some(line => line.text === "40")).toBe(true);
    expect(pdf.pages.flat().some(line => line.text === "2.5")).toBe(true);
    expect(pdf.text).toContain("$14.50"); expect(pdf.text).toContain("$21.75");
    expect(pdf.compact).toContain("COMPAÑÍAEJEMPLO");
    expect(pdf.text).toContain("DEMO-SOURCE-REV-5"); expect(pdf.text).toContain("DEMO-RUN-2026-40");
    expect(pdf.text).not.toContain("USD ");
    expect(pdf.text).not.toContain("NEVORA_NATIVE_PAYSTUB_PDF_V2");
    expect(pdf.doc.getSubject()).toBe("NATIVE_RECORDED_TIME / NEVORA_NATIVE_PAYSTUB_PDF_V2");
    expect(pdf.doc.getCreationDate()?.toISOString()).toBe("2026-10-08T16:30:00.000Z");
    expect(result.templateVersion).toBe(NATIVE_PAYSTUB_TEMPLATE_V2); expect(result.pageCount).toBe(1);
    await expectCleanGeometry(pdf.pages);
  });

  it("produces identical bytes and SHA from fixed approval data independently of progress", async () => {
    const first = await renderNativeEmployeePaystub(fixture());
    const second = await renderNativeEmployeePaystub(fixture(), { progress: async () => {} });
    expect(first.sha256).toBe(createHash("sha256").update(first.bytes).digest("hex"));
    expect(second.bytes).toEqual(first.bytes);
    const changed = fixture(); changed.approvedAt = "2026-10-08T16:30:01.000Z";
    expect((await renderNativeEmployeePaystub(changed)).sha256).not.toBe(first.sha256);
  });

  it("states the approval time in UTC whatever offset it was recorded with", async () => {
    const input = fixture(); input.approvedAt = "2026-10-08T21:15:00.000-04:00";
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.text).toContain("Approved Oct 9, 2026, 01:15 UTC");
    const es = fixture("es"); es.approvedAt = input.approvedAt;
    expect((await readPdf((await renderNativeEmployeePaystub(es)).bytes)).text).toContain("Aprobado 9 oct 2026, 01:15 UTC");
  });

  it("shows hours as decimals when exact, as hours and minutes otherwise, and never rounds", async () => {
    const input = fixture();
    input.earnings[0].work = { nanoseconds: "6000000000000", baseRateMinorPerHour: { numerator: "1700", denominator: "3" }, premiumRateMinorPerHour: { numerator: "0", denominator: "1" }, paidRateMinorPerHour: { numerator: "1700", denominator: "3" } };
    input.earnings[1].work = { ...input.earnings[1].work!, nanoseconds: "1" };
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.pages.flat().some(line => line.text === "1 h 40 min")).toBe(true);
    // A time that isn’t a whole number of seconds stays an exact fraction, wrapped inside the Hours column if needed.
    expect(pdf.compact).toContain("Overtimehours1/3600000000000$21.75$54.38");
    expect(pdf.text).toContain("$17/3"); expect(pdf.text).toContain("$580.00");
    await expectCleanGeometry(pdf.pages);
  });

  it("marks a corrected replacement and lists every correction reference", async () => {
    const input = fixture();
    input.correction = { kind: "REPLACEMENT", originalRunReference: "DEMO-ORIGINAL-REV-1", replacesRunReference: "DEMO-PREVIOUS-REV-2", reasonLabel: "Approved correction to recorded time." };
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.text).toContain("Corrected replacement");
    for (const value of ["Original run: DEMO-ORIGINAL-REV-1", "Replaces run: DEMO-PREVIOUS-REV-2", "Correction: Approved correction to recorded time."]) expect(pdf.text).toContain(value);
    await expectCleanGeometry(pdf.pages);
  });

  it("renders zero pay and empty sections without inventing time, a split bar or YTD", async () => {
    const input = fixture(); input.earnings = []; input.taxes = []; input.authorizedDeductions = []; delete input.employerContributions;
    input.totals = { gross: { currentMinor: "0", ytdMinor: "10000" }, net: { currentMinor: "0", ytdMinor: "10000" }, taxes: { currentMinor: "0", ytdMinor: "0" }, authorizedDeductions: { currentMinor: "0", ytdMinor: "0" } };
    const result = await renderNativeEmployeePaystub(input);
    const pdf = await readPdf(result.bytes);
    expect(pdf.text).toContain("None this period"); expect(pdf.text).toContain("$0.00"); expect(pdf.text).toContain("This year: $100.00");
    expect(pdf.text).not.toContain("Paid by your employer");
    expect(pdf.pages.flat().some(line => line.text === "40")).toBe(false);
    await expectCleanGeometry(pdf.pages);
  });

  it("keeps signed true-ups and amounts beyond Number precision exact and inside their columns", async () => {
    const input = fixture(); input.earnings[2].amountMinor = "-123";
    input.totals.gross = { currentMinor: "63315", ytdMinor: "1063315" }; input.totals.net = { currentMinor: "54031", ytdMinor: "852031" };
    expect((await readPdf((await renderNativeEmployeePaystub(input)).bytes)).text).toContain("-$1.23");
    const large = fixture();
    large.earnings = [{ kind: "SUPPLEMENTAL", label: "Explicit approved large balance", amountMinor: "900719925474099312345" }];
    large.taxes = []; large.authorizedDeductions = []; delete large.employerContributions;
    large.totals = { gross: { currentMinor: "900719925474099312345", ytdMinor: "900719925474099312345" }, net: { currentMinor: "900719925474099312345", ytdMinor: "900719925474099312345" }, taxes: { currentMinor: "0", ytdMinor: "0" }, authorizedDeductions: { currentMinor: "0", ytdMinor: "0" } };
    const pdf = await readPdf((await renderNativeEmployeePaystub(large)).bytes);
    expect(pdf.compact).toContain("$9,007,199,254,740,993,123.45");
    await expectCleanGeometry(pdf.pages);
  });

  it("wraps long names, IDs and 500-character labels across pages with continued headings and a footer on every page", async () => {
    const result = await renderNativeEmployeePaystub(longStatement());
    const pdf = await readPdf(result.bytes);
    expect(result.pageCount).toBeGreaterThan(3); expect(pdf.pages.length).toBe(result.pageCount);
    for (let i = 0; i < 75; i++) expect(pdf.compact).toContain(`END-${i}`);
    expect(pdf.compact).toContain("END-E"); expect(pdf.compact).toContain("DEMO".repeat(40));
    expect(pdf.compact).toContain(longStatement().employeeName.replace(/\s/g, ""));
    expect(pdf.text).toContain("Otras deducciones (continuación)");
    expect(pdf.text).toContain("Reemplazo corregido"); expect(pdf.text).toContain("DEMO-PREVIOUS-REV-2");
    for (const [i, page] of pdf.pages.entries()) {
      const text = page.map(line => line.text).join(" ");
      expect(text).toContain(`Página ${i + 1} de ${result.pageCount}`);
      expect(text).toContain("No confirma el pago.");
      expect(text).toContain("Aprobado 8 oct 2026, 16:30 UTC");
    }
    expect(pdf.text).toContain("$547.02"); expect(pdf.text).toContain("$0.75");
    await expectCleanGeometry(pdf.pages);
  });

  it("awaits checkpoints throughout a large statement and stops on cancellation or a failed callback", async () => {
    let completed = 0;
    const result = await renderNativeEmployeePaystub(longStatement(), { progress: async () => { await Promise.resolve(); completed++; } });
    expect(completed).toBeGreaterThanOrEqual(result.pageCount + 5);
    const controller = new AbortController(), reason = new Error("Cancelled render"); let calls = 0;
    await expect(renderNativeEmployeePaystub(longStatement(), { signal: controller.signal, progress: async () => { if (++calls === 3) controller.abort(reason); } })).rejects.toBe(reason);
    const failure = new Error("Lease lost"); calls = 0;
    await expect(renderNativeEmployeePaystub(longStatement(), { progress: async () => { if (++calls === 5) throw failure; } })).rejects.toBe(failure);
  });

  it("renders every employer name the glyph check accepts, keeping a character whose capital the font can't draw", async () => {
    const input = fixture(); input.companyName = "µ Services ÿ ß";
    await expect(preflightNativePaystubGlyphs(input)).resolves.toBeUndefined();
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    // "µ" stays as written (its capital is Greek "Μ", outside WinAnsi); "ÿ" and "ß" have WinAnsi capitals.
    expect(pdf.compact).toContain("µSERVICESŸSS");
    await expectCleanGeometry(pdf.pages);
    // Every printable character the check accepts renders on the spaced capital line, in body and continued headers.
    const accepted = (await Promise.all(Array.from({ length: 224 }, (_, i) => String.fromCodePoint(32 + i)).map(async ch => {
      const probe = fixture(); probe.companyName = `A${ch}Z`;
      return preflightNativePaystubGlyphs(probe).then(() => ch, () => null);
    }))).filter((ch): ch is string => ch !== null && ch !== " ");
    expect(accepted.length).toBeGreaterThan(180);
    const every = longStatement(); every.companyName = accepted.join("").slice(0, 240);
    const rendered = await renderNativeEmployeePaystub(every);
    expect(rendered.pageCount).toBeGreaterThan(1);
  });

  it("rejects glyphs the statement font can't draw", async () => {
    const input = fixture(); input.taxes[0].label = "税";
    await expect(renderNativeEmployeePaystub(input)).rejects.toMatchObject({ code: "UNSUPPORTED_DOCUMENT_GLYPH", paths: ["taxes.0.label"] });
  });
});
