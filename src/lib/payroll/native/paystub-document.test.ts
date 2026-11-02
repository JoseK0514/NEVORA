import { createHash } from "node:crypto";
import { PDFArray, PDFDocument, PDFRawStream, StandardFonts, decodePDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  NATIVE_PAYSTUB_PRESENTATION_VERSION, NATIVE_PAYSTUB_TEMPLATE_V1,
  NativePaystubDocumentError, preflightNativePaystubGlyphs, renderNativeEmployeePaystub,
  type NativePaystubPresentation,
} from "./paystub-document";

function fixture(language: "en" | "es" = "en"): NativePaystubPresentation {
  return {
    version: NATIVE_PAYSTUB_PRESENTATION_VERSION, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V1,
    sourceAuthority: "NATIVE_RECORDED_TIME", currency: "USD", language,
    companyName: "Compañía Ejemplo — Servicios del Caribe", employeeName: "María José Núñez",
    employeeReference: "EMP-DEMO-014", period: { startDate: "2026-09-28", endDate: "2026-10-04" },
    payDate: "2026-10-09", approvedAt: "2026-10-08T16:30:00.000Z", runReference: "DEMO-RUN-2026-40", runRevision: 2,
    correction: { kind: "ORIGINAL" }, ytdYear: 2026,
    earnings: [
      { label: "Regular — Centro Norte", kind: "REGULAR", amountMinor: "58000", work: {
        nanoseconds: "144000000000000", baseRateMinorPerHour: { numerator: "1450", denominator: "1" },
        premiumRateMinorPerHour: { numerator: "0", denominator: "1" }, paidRateMinorPerHour: { numerator: "1450", denominator: "1" },
      } },
      { label: "Overtime / Horas extra", kind: "OVERTIME", amountMinor: "5438", work: {
        nanoseconds: "9000000000000", baseRateMinorPerHour: { numerator: "1450", denominator: "1" },
        premiumRateMinorPerHour: { numerator: "725", denominator: "1" }, paidRateMinorPerHour: { numerator: "2175", denominator: "1" },
      } },
      { label: "Supplemental true-up / Ajuste", kind: "FLSA_TRUE_UP", amountMinor: "123" },
    ],
    taxes: [
      { label: "Social Security / Seguro Social", amount: { currentMinor: "4862", ytdMinor: "104862" } },
      { label: "Medicare", amount: { currentMinor: "922", ytdMinor: "20922" } },
      { label: "PR income tax / Retención PR", amount: { currentMinor: "3000", ytdMinor: "83000" } },
    ],
    authorizedDeductions: [{ label: "Authorized savings / Ahorro autorizado", amount: { currentMinor: "500", ytdMinor: "2500" } }],
    totals: {
      gross: { currentMinor: "63561", ytdMinor: "1063561" }, taxes: { currentMinor: "8784", ytdMinor: "208784" },
      authorizedDeductions: { currentMinor: "500", ytdMinor: "2500" }, net: { currentMinor: "54277", ytdMinor: "852277" },
    },
    employerContributions: {
      lines: [{ label: "Employer example / Ejemplo patronal", amount: { currentMinor: "1234", ytdMinor: "50123" } }],
      total: { currentMinor: "1234", ytdMinor: "50123" },
    },
    sourceReferences: [{ label: "Recorded time / Tiempo registrado", value: "DEMO-SOURCE-REV-5" }, { label: "Rules / Reglas", value: "DEMO-APPROVED-RULES" }],
  };
}

describe("native paystub input boundary", () => {
  it("accepts explicit approved inputs including Spanish accents and zero premium", async () => {
    await expect(preflightNativePaystubGlyphs(fixture("es"))).resolves.toBeUndefined();
  });

  it.each([
    ["decimal cents", "12.5"], ["exponent", "1e3"], ["leading zero", "01"],
    ["negative zero", "-0"], ["whitespace", " 500"], ["missing", undefined], ["numeric primitive", 500],
    ["unbounded integer", "1".repeat(25)],
  ])("rejects %s money without coercion", async (_name, value) => {
    const input = fixture();
    input.authorizedDeductions[0].amount.currentMinor = value as string;
    await expect(preflightNativePaystubGlyphs(input)).rejects.toMatchObject({ code: "INVALID_PRESENTATION", paths: ["authorizedDeductions.0.amount.currentMinor"] });
  });

  it("rejects absent YTD rather than treating it as zero", async () => {
    const input = fixture();
    delete (input.totals.net as Partial<typeof input.totals.net>).ytdMinor;
    await expect(preflightNativePaystubGlyphs(input)).rejects.toMatchObject({ code: "INVALID_PRESENTATION", paths: ["totals.net.ytdMinor"] });
  });

  it.each([
    ["gross", "currentMinor", "63562"], ["taxes", "ytdMinor", "208785"],
    ["authorizedDeductions", "currentMinor", "501"], ["net", "ytdMinor", "852276"],
  ] as const)("rejects unreconciled %s %s", async (total, column, value) => {
    const input = fixture(); input.totals[total][column] = value;
    await expect(preflightNativePaystubGlyphs(input)).rejects.toMatchObject({ code: "INVALID_PRESENTATION" });
  });

  it("reconciles employer contributions separately from employee net", async () => {
    const input = fixture(); input.employerContributions!.total.currentMinor = "1235";
    await expect(preflightNativePaystubGlyphs(input)).rejects.toMatchObject({ code: "INVALID_PRESENTATION", paths: ["employerContributions.total.currentMinor"] });
  });

  it.each([
    ["impossible date", (p: NativePaystubPresentation) => { p.payDate = "2026-02-30"; }],
    ["reversed period", (p: NativePaystubPresentation) => { p.period.endDate = "2026-09-01"; }],
    ["timezone-less approval", (p: NativePaystubPresentation) => { p.approvedAt = "2026-10-08T16:30:00"; }],
    ["wrong YTD year", (p: NativePaystubPresentation) => { p.ytdYear = 2025; }],
    ["unknown currency", (p: NativePaystubPresentation) => { p.currency = "EUR" as "USD"; }],
    ["unknown presentation version", (p: NativePaystubPresentation) => { p.version = "V2" as typeof p.version; }],
    ["unknown template", (p: NativePaystubPresentation) => { p.templateVersion = "V2" as typeof p.templateVersion; }],
    ["missing regular duration", (p: NativePaystubPresentation) => { delete p.earnings[0].work; }],
    ["zero denominator", (p: NativePaystubPresentation) => { p.earnings[0].work!.paidRateMinorPerHour.denominator = "0"; }],
    ["missing source reference", (p: NativePaystubPresentation) => { p.sourceReferences = []; }],
    ["oversized name", (p: NativePaystubPresentation) => { p.employeeName = "a".repeat(241); }],
  ])("rejects %s", async (_name, mutate) => {
    const input = fixture(); mutate(input);
    await expect(preflightNativePaystubGlyphs(input)).rejects.toMatchObject({ code: "INVALID_PRESENTATION" });
  });

  it("reports unsupported glyph paths without echoing names or labels", async () => {
    const input = fixture(); input.employeeName = "秘密"; input.sourceReferences = [{ label: "Source", value: "DEMO-🧾" }];
    try {
      await preflightNativePaystubGlyphs(input); throw new Error("Expected glyph failure");
    } catch (error) {
      expect(error).toBeInstanceOf(NativePaystubDocumentError);
      expect(error).toMatchObject({ code: "UNSUPPORTED_DOCUMENT_GLYPH", paths: ["employeeName", "sourceReferences.0.value"] });
      expect(String(error)).not.toContain("秘密"); expect(String(error)).not.toContain("🧾");
    }
  });

  it("rejects control characters instead of hiding or replacing them", async () => {
    const input = fixture(); input.companyName = "Company\nInjected line";
    await expect(preflightNativePaystubGlyphs(input)).rejects.toMatchObject({ code: "UNSUPPORTED_DOCUMENT_GLYPH", paths: ["companyName"] });
  });
});

type PdfText = { text: string; x: number; y: number; size: number; bold: boolean };
/** Read real decoded PDF text operators; expectations never use renderer helpers. */
async function readPdf(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const pages: PdfText[][] = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? Array.from({ length: contents.size() }, (_, i) => doc.context.lookup(contents.get(i)) as PDFRawStream) : [contents as PDFRawStream];
    const operators = streams.map(stream => Buffer.from(decodePDFRawStream(stream).decode()).toString("ascii")).join("\n");
    pages.push([...operators.matchAll(/BT\s+([\s\S]*?)\s+ET/g)].map(match => {
      const tf = /\/([^\s]+)\s+([\d.]+)\s+Tf/.exec(match[1])!;
      const tm = /1 0 0 1 ([\d.-]+) ([\d.-]+) Tm/.exec(match[1])!;
      const hex = /<([0-9A-Fa-f]*)>\s*Tj/.exec(match[1])!;
      return { text: new TextDecoder("windows-1252").decode(Buffer.from(hex[1], "hex")), x: Number(tm[1]), y: Number(tm[2]), size: Number(tf[2]), bold: tf[1].startsWith("Helvetica-Bold") };
    }));
  }
  return { doc, pages, text: pages.flat().map(line => line.text).join(" ") };
}

function manyDeductions(): NativePaystubPresentation {
  const input = fixture("es");
  input.companyName = "Compañía de servicios profesionales y operaciones del Caribe ".repeat(3).trim();
  input.employeeName = "María José Núñez de los Santos y Rodríguez ".repeat(5).trim();
  input.authorizedDeductions = Array.from({ length: 75 }, (_, i) => ({
    label: `D-${i} ${"Deducción autorizada con descripción extensa para comprobar filas completas y lectura clara. ".repeat(3)} END-${i}`,
    amount: { currentMinor: "1", ytdMinor: "2" },
  }));
  input.totals.authorizedDeductions = { currentMinor: "75", ytdMinor: "150" };
  input.totals.net = { currentMinor: "54702", ytdMinor: "854627" };
  input.correction = { kind: "REPLACEMENT", originalRunReference: "DEMO-ORIGINAL-REV-1", replacesRunReference: "DEMO-PREVIOUS-REV-2", reasonLabel: "Corrección aprobada de tiempo registrado y ajuste suplementario." };
  return input;
}

describe("native employee PDF", () => {
  it.each(["en", "es"] as const)("renders approved exact amounts and time/rate detail in %s", async language => {
    const result = await renderNativeEmployeePaystub(fixture(language));
    const pdf = await readPdf(result.bytes);
    expect(pdf.text).toContain(language === "es" ? "Comprobante de nómina" : "Pay statement");
    expect(pdf.text).toContain("María José Núñez"); expect(pdf.text).toContain("Compañía Ejemplo");
    expect(pdf.text).toContain("USD 580.00"); expect(pdf.text).toContain("USD 54.38"); expect(pdf.text).toContain("USD 1.23");
    expect(pdf.text).toContain("USD 635.61"); expect(pdf.text).toContain("USD 542.77");
    expect(pdf.text).toContain("USD 10,635.61"); expect(pdf.text).toContain("USD 8,522.77");
    expect(pdf.text).toContain("USD 14.50"); expect(pdf.text).toContain("USD 7.25"); expect(pdf.text).toContain("USD 21.75");
    expect(pdf.pages.flat().some(line => line.text === "40")).toBe(true);
    expect(pdf.pages.flat().some(line => line.text === "2.5")).toBe(true);
    expect(pdf.text).toContain(language === "es" ? "Impuestos" : "Taxes");
    expect(pdf.text).toContain(language === "es" ? "Deducciones autorizadas" : "Authorized deductions");
    expect(pdf.text).toContain(language === "es" ? "Aportaciones patronales" : "Employer contributions");
    expect(pdf.text).toContain("DEMO-SOURCE-REV-5"); expect(result.pageCount).toBe(pdf.doc.getPageCount());
    expect(pdf.doc.getCreationDate()?.toISOString()).toBe("2026-10-08T16:30:00.000Z");
  });

  it("produces identical bytes and SHA from fixed approval data independently of progress", async () => {
    const first = await renderNativeEmployeePaystub(fixture());
    const second = await renderNativeEmployeePaystub(fixture(), { progress: async () => {} });
    expect(first.sha256).toBe(createHash("sha256").update(first.bytes).digest("hex"));
    expect(second.sha256).toBe(first.sha256); expect(second.bytes).toEqual(first.bytes);
    const changed = fixture(); changed.approvedAt = "2026-10-08T16:30:01.000Z";
    expect((await renderNativeEmployeePaystub(changed)).sha256).not.toBe(first.sha256);
  });

  it.each(["en", "es"] as const)("uses a human-readable %s template label while preserving pinned metadata", async language => {
    const result = await renderNativeEmployeePaystub(fixture(language));
    const pdf = await readPdf(result.bytes);
    expect(pdf.text).toContain(language === "es" ? "Plantilla del comprobante v1" : "Statement template v1");
    expect(pdf.text).not.toContain("NEVORA_NATIVE_PAYSTUB_PDF_V1");
    expect(pdf.doc.getSubject()).toContain("NEVORA_NATIVE_PAYSTUB_PDF_V1");
    expect(result.templateVersion).toBe("NEVORA_NATIVE_PAYSTUB_PDF_V1");
  });

  it("displays exact fractional hours/rates and retains approved wage amounts", async () => {
    const input = fixture();
    input.earnings[0].work = { nanoseconds: "1200000000000", baseRateMinorPerHour: { numerator: "1700", denominator: "3" }, premiumRateMinorPerHour: { numerator: "0", denominator: "1" }, paidRateMinorPerHour: { numerator: "1700", denominator: "3" } };
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.pages.flat().some(line => line.text === "1/3")).toBe(true);
    expect(pdf.text).toContain("USD 17/3"); expect(pdf.text).toContain("USD 580.00"); expect(pdf.text).toContain("USD 635.61");
  });

  it("retains exact cents beyond Number precision", async () => {
    const input = fixture();
    input.earnings = [{ kind: "SUPPLEMENTAL", label: "Explicit approved large balance", amountMinor: "900719925474099312345" }];
    input.taxes = []; input.authorizedDeductions = []; delete input.employerContributions;
    input.totals = { gross: { currentMinor: "900719925474099312345", ytdMinor: "900719925474099312345" }, net: { currentMinor: "900719925474099312345", ytdMinor: "900719925474099312345" }, taxes: { currentMinor: "0", ytdMinor: "0" }, authorizedDeductions: { currentMinor: "0", ytdMinor: "0" } };
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.text.replace(/\s/g, "")).toContain("USD9,007,199,254,740,993,123.45");
    expect(pdf.text).not.toContain("Employer contributions");
  });

  it("renders explicitly approved zero earnings without inventing worked time or YTD", async () => {
    const input = fixture(); input.earnings = []; input.taxes = []; input.authorizedDeductions = []; delete input.employerContributions;
    input.totals = { gross: { currentMinor: "0", ytdMinor: "10000" }, net: { currentMinor: "0", ytdMinor: "10000" }, taxes: { currentMinor: "0", ytdMinor: "0" }, authorizedDeductions: { currentMinor: "0", ytdMinor: "0" } };
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.text).toContain("No items"); expect(pdf.text).toContain("USD 0.00"); expect(pdf.text).toContain("USD 100.00");
    expect(pdf.pages.flat().some(line => line.text === "40")).toBe(false);
  });

  it("wraps unbroken names using actual unkerned PDF glyph advances", async () => {
    const input = fixture(); input.companyName = "To".repeat(120); input.employeeName = "AV".repeat(120);
    input.employeeReference = "To".repeat(120); input.earnings[0].label = "AV".repeat(250);
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    const metrics = await PDFDocument.create();
    const regular = await metrics.embedFont(StandardFonts.Helvetica), bold = await metrics.embedFont(StandardFonts.HelveticaBold);
    for (const line of pdf.pages.flat()) {
      // A Tj operator advances each glyph separately; it does not apply pair kerning.
      const advance = [...line.text].reduce((sum, char) => sum + (line.bold ? bold : regular).widthOfTextAtSize(char, line.size), 0);
      expect(line.x + advance, line.text).toBeLessThanOrEqual(572.1);
    }
    expect(pdf.text.replace(/\s/g, "")).toContain("To".repeat(120));
    expect(pdf.text.replace(/\s/g, "")).toContain("AV".repeat(250));
  });

  it("rechecks a near-full carried word before appending a wider glyph", async () => {
    const input = fixture(); input.companyName = "i " + "i".repeat(93) + "W";
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    const metrics = await PDFDocument.create();
    const regular = await metrics.embedFont(StandardFonts.Helvetica), bold = await metrics.embedFont(StandardFonts.HelveticaBold);
    for (const line of pdf.pages.flat()) {
      const advance = [...line.text].reduce((sum, char) => sum + (line.bold ? bold : regular).widthOfTextAtSize(char, line.size), 0);
      expect(line.x + advance, line.text).toBeLessThanOrEqual(572.1);
    }
    expect(pdf.text.replace(/\s/g, "")).toContain("i".repeat(94) + "W");
  });

  it("renders signed approved true-up cents without recalculating payroll", async () => {
    const input = fixture(); input.earnings[2].amountMinor = "-123";
    input.totals.gross = { currentMinor: "63315", ytdMinor: "1063315" };
    input.totals.net = { currentMinor: "54031", ytdMinor: "852031" };
    const pdf = await readPdf((await renderNativeEmployeePaystub(input)).bytes);
    expect(pdf.text).toContain("USD -1.23"); expect(pdf.text).toContain("USD 633.15"); expect(pdf.text).toContain("USD 540.31");
  });

  it("wraps long multipage rows with repeated headings, complete labels and grouped totals", async () => {
    const result = await renderNativeEmployeePaystub(manyDeductions());
    const pdf = await readPdf(result.bytes);
    expect(pdf.pages.length).toBeGreaterThan(3);
    const deductionPages = pdf.pages.filter(page => page.some(line => /(?:D-\d|END-\d)/.test(line.text)));
    expect(deductionPages.length).toBeGreaterThan(2);
    for (const page of deductionPages) {
      expect(page.map(line => line.text).join(" ")).toContain("Deducciones autorizadas");
      expect(page.some(line => line.text === "Actual")).toBe(true);
      expect(page.some(line => /Acumulado/.test(line.text))).toBe(true);
    }
    for (let i = 0; i < 75; i++) expect(pdf.text.replace(/\s/g, "")).toContain(`END-${i}`);
    expect(pdf.text).toContain("DEMO-ORIGINAL-REV-1"); expect(pdf.text).toContain("DEMO-PREVIOUS-REV-2");
    const totalsPage = pdf.pages.find(page => page.some(line => line.text === "Totales de nómina"))!;
    expect(totalsPage).toBeDefined();
    const totalsText = totalsPage.map(line => line.text).join(" ");
    for (const value of ["USD 635.61", "USD 87.84", "USD 0.75", "USD 547.02", "USD 8,546.27"]) expect(totalsText).toContain(value);
  });

  it("keeps all actual text within printable page geometry at readable sizes", async () => {
    const pdf = await readPdf((await renderNativeEmployeePaystub(manyDeductions())).bytes);
    const metrics = await PDFDocument.create();
    const regular = await metrics.embedFont(StandardFonts.Helvetica), bold = await metrics.embedFont(StandardFonts.HelveticaBold);
    for (const [pageIndex, page] of pdf.pages.entries()) {
      for (const line of page) {
        const width = (line.bold ? bold : regular).widthOfTextAtSize(line.text, line.size);
        expect(line.size, `page ${pageIndex + 1}: ${line.text}`).toBeGreaterThanOrEqual(8);
        expect(line.x).toBeGreaterThanOrEqual(39.9); expect(line.x + width).toBeLessThanOrEqual(572.1);
        expect(line.y).toBeGreaterThanOrEqual(24); expect(line.y + line.size).toBeLessThanOrEqual(752.1);
      }
      for (let i = 0; i < page.length; i++) for (let j = i + 1; j < page.length; j++) {
        const a = page[i], b = page[j];
        if (Math.abs(a.y - b.y) < Math.min(a.size, b.size) * 0.8) {
          const aRight = a.x + (a.bold ? bold : regular).widthOfTextAtSize(a.text, a.size);
          const bRight = b.x + (b.bold ? bold : regular).widthOfTextAtSize(b.text, b.size);
          expect(aRight <= b.x + 0.2 || bRight <= a.x + 0.2, `Overlapping text: ${a.text} / ${b.text}`).toBe(true);
        }
      }
    }
  });

  it("uses an input snapshot when a lease callback mutates caller data", async () => {
    const input = fixture();
    const result = await renderNativeEmployeePaystub(input, { progress: async () => { input.employeeName = "CHANGED DURING RENDER"; input.totals.net.currentMinor = "0"; } });
    const pdf = await readPdf(result.bytes);
    expect(pdf.text).toContain("María José Núñez"); expect(pdf.text).not.toContain("CHANGED DURING RENDER"); expect(pdf.text).toContain("USD 542.77");
  });

  it("awaits bounded checkpoints throughout a large document", async () => {
    let completed = 0;
    const result = await renderNativeEmployeePaystub(manyDeductions(), { progress: async () => { await Promise.resolve(); completed++; } });
    expect(result.pageCount).toBeGreaterThan(3); expect(completed).toBeGreaterThanOrEqual(result.pageCount + 5);
  });

  it("propagates lease callback failure before returning any complete document", async () => {
    const failure = new Error("Lease lost"); let calls = 0;
    await expect(renderNativeEmployeePaystub(manyDeductions(), { progress: async () => { if (++calls === 5) throw failure; } })).rejects.toBe(failure);
    expect(calls).toBe(5);
  });

  it("propagates cancellation at a progress checkpoint", async () => {
    const controller = new AbortController(), reason = new Error("Cancelled render"); let calls = 0;
    await expect(renderNativeEmployeePaystub(manyDeductions(), { signal: controller.signal, progress: async () => { if (++calls === 3) controller.abort(reason); } })).rejects.toBe(reason);
  });

  it("rejects already cancelled work before running progress", async () => {
    const controller = new AbortController(), reason = new Error("Already cancelled"); controller.abort(reason);
    let called = false;
    await expect(renderNativeEmployeePaystub(fixture(), { signal: controller.signal, progress: async () => { called = true; } })).rejects.toBe(reason);
    expect(called).toBe(false);
  });

  it("performs glyph validation again at render, even without caller preflight", async () => {
    const input = fixture(); input.taxes[0].label = "税";
    await expect(renderNativeEmployeePaystub(input)).rejects.toMatchObject({ code: "UNSUPPORTED_DOCUMENT_GLYPH", paths: ["taxes.0.label"] });
  });
});

// Exact ordinary-name presentation from sealed NP-17 original AS_OWNER (149-character company).
function np17ApprovedPresentation(): NativePaystubPresentation {
  return {
    "version": "NEVORA_NATIVE_PAYSTUB_PRESENTATION_V1",
    "templateVersion": "NEVORA_NATIVE_PAYSTUB_PDF_V1",
    "sourceAuthority": "NATIVE_RECORDED_TIME",
    "currency": "USD",
    "language": "en",
    "companyName": "Cooperativa Ficticia de Investigación, Conservación y Servicios Comunitarios de los Jardines del Valle del Norte y la Reserva Marítima de Puerto Rico",
    "employeeName": "Fictional owner",
    "employeeReference": "AS_OWNER",
    "period": {
      "endDate": "2026-09-27",
      "startDate": "2026-09-21"
    },
    "payDate": "2026-09-29",
    "approvedAt": "2026-10-14T10:59:48.006Z",
    "runReference": "c44133bc-178c-4394-bbbc-13461f990c85",
    "runRevision": 2,
    "correction": {
      "kind": "ORIGINAL"
    },
    "ytdYear": 2026,
    "earnings": [
      {
        "label": "Regular hours",
        "kind": "REGULAR",
        "amountMinor": "100000",
        "work": {
          "nanoseconds": "144000000000000",
          "baseRateMinorPerHour": {
            "numerator": "2500",
            "denominator": "1"
          },
          "premiumRateMinorPerHour": {
            "numerator": "0",
            "denominator": "1"
          },
          "paidRateMinorPerHour": {
            "numerator": "2500",
            "denominator": "1"
          }
        }
      }
    ],
    "taxes": [
      {
        "label": "Additional Medicare",
        "amount": {
          "currentMinor": "0",
          "ytdMinor": "0"
        }
      },
      {
        "label": "Medicare",
        "amount": {
          "currentMinor": "1450",
          "ytdMinor": "1450"
        }
      },
      {
        "label": "Puerto Rico income tax",
        "amount": {
          "currentMinor": "9965",
          "ytdMinor": "9965"
        }
      },
      {
        "label": "Disability insurance (SINOT)",
        "amount": {
          "currentMinor": "300",
          "ytdMinor": "300"
        }
      },
      {
        "label": "Social Security",
        "amount": {
          "currentMinor": "6200",
          "ytdMinor": "6200"
        }
      }
    ],
    "authorizedDeductions": [],
    "totals": {
      "gross": {
        "currentMinor": "100000",
        "ytdMinor": "100000"
      },
      "taxes": {
        "currentMinor": "17915",
        "ytdMinor": "17915"
      },
      "authorizedDeductions": {
        "currentMinor": "0",
        "ytdMinor": "0"
      },
      "net": {
        "currentMinor": "82085",
        "ytdMinor": "82085"
      }
    },
    "employerContributions": {
      "lines": [
        {
          "label": "Workers compensation insurance (CFSE)",
          "amount": {
            "currentMinor": "1000",
            "ytdMinor": "1000"
          }
        },
        {
          "label": "Federal unemployment tax (FUTA)",
          "amount": {
            "currentMinor": "6000",
            "ytdMinor": "6000"
          }
        },
        {
          "label": "Medicare",
          "amount": {
            "currentMinor": "1450",
            "ytdMinor": "1450"
          }
        },
        {
          "label": "Puerto Rico unemployment insurance",
          "amount": {
            "currentMinor": "2500",
            "ytdMinor": "2500"
          }
        },
        {
          "label": "Disability insurance (SINOT)",
          "amount": {
            "currentMinor": "300",
            "ytdMinor": "300"
          }
        },
        {
          "label": "Social Security",
          "amount": {
            "currentMinor": "6200",
            "ytdMinor": "6200"
          }
        }
      ],
      "total": {
        "currentMinor": "17450",
        "ytdMinor": "17450"
      }
    },
    "sourceReferences": [
      {
        "label": "Approved payroll reference",
        "value": "c44133bc-178c-4394-bbbc-13461f990c85 / 2"
      }
    ]
  };
}

describe("NP17-001 source section grouping", () => {
  const cases = [
    { language: "en", replacement: false }, { language: "en", replacement: true },
    { language: "es", replacement: false }, { language: "es", replacement: true },
  ] as const;
  function caseInput(language: "en" | "es", replacement: boolean) {
    const p = np17ApprovedPresentation(); p.language = language;
    if (replacement) {
      p.runReference = "aa69fe07-fe9d-4020-a339-fc56596f3fa7";
      p.approvedAt = "2026-10-14T10:59:51.995Z";
      p.correction = { kind: "REPLACEMENT", originalRunReference: "c44133bc-178c-4394-bbbc-13461f990c85", replacesRunReference: "c44133bc-178c-4394-bbbc-13461f990c85" };
    }
    p.sourceReferences = [{ label: language === "es" ? "Referencia de nómina aprobada" : "Approved payroll reference", value: `${p.runReference} / 2` }];
    return p;
  }
  async function expectPrintable(pages: PdfText[][]) {
    const metrics = await PDFDocument.create();
    const regular = await metrics.embedFont(StandardFonts.Helvetica), bold = await metrics.embedFont(StandardFonts.HelveticaBold);
    for (const page of pages) for (const line of page) {
      const width = [...line.text].reduce((n, char) => n + (line.bold ? bold : regular).widthOfTextAtSize(char, line.size), 0);
      expect(line.x).toBeGreaterThanOrEqual(39.9); expect(line.x + width, line.text).toBeLessThanOrEqual(572.1);
      expect(line.y).toBeGreaterThanOrEqual(24); expect(line.y + line.size).toBeLessThanOrEqual(752.1); expect(line.size).toBeGreaterThanOrEqual(8);
    }
  }
  it.each(cases)("keeps approval heading and first reference together: $language / replacement=$replacement", async ({ language, replacement }) => {
    const p = caseInput(language, replacement), pdf = await readPdf((await renderNativeEmployeePaystub(p)).bytes);
    const heading = language === "es" ? "Aprobación y referencias de origen" : "Approval and source references";
    const headingPage = pdf.pages.findIndex(page => page.some(line => line.text === heading));
    const reference = `${language === "es" ? "Nómina" : "Payroll run"}: ${p.runReference} / ${language === "es" ? "revisión" : "revision"} 2`;
    expect(headingPage).toBeGreaterThanOrEqual(0);
    expect(pdf.pages[headingPage].map(line => line.text).join(" ")).toContain(reference);
    for (const value of ["USD 1,000.00", "USD 179.15", "USD 820.85", "USD 174.50", "USD 99.65", "USD 62.00", "USD 60.00", "USD 25.00", "USD 14.50", "USD 10.00", "USD 3.00"]) expect(pdf.text).toContain(value);
    expect(pdf.text).toContain(p.companyName); expect(pdf.text).toContain("Fictional owner");
    expect(pdf.text).toContain("2026-09-21 — 2026-09-27"); expect(pdf.text).toContain(p.payDate); expect(pdf.text).toContain(p.approvedAt);
    expect(pdf.text).toContain(p.sourceReferences[0].label); expect(pdf.text).toContain(p.sourceReferences[0].value);
    if (replacement) expect(pdf.text).toContain("c44133bc-178c-4394-bbbc-13461f990c85");
    await expectPrintable(pdf.pages);
  });
  it.each(cases)("keeps the whole wrapped first reference with the heading: $language / replacement=$replacement", async ({ language, replacement }) => {
    const p = caseInput(language, replacement); p.runReference = "NP17-WRAPPED-" + "W".repeat(215) + "-END";
    const pdf = await readPdf((await renderNativeEmployeePaystub(p)).bytes);
    const heading = language === "es" ? "Aprobación y referencias de origen" : "Approval and source references";
    const page = pdf.pages.find(page => page.some(line => line.text === heading))!;
    expect(page).toBeDefined();
    expect(page.map(line => line.text).join("").replace(/\s/g, "")).toContain(`${language === "es" ? "Nómina" : "Payroll run"}:${p.runReference}/${language === "es" ? "revisión" : "revision"}2`.replace(/\s/g, ""));
    expect(pdf.text).toContain(p.sourceReferences[0].value);
    await expectPrintable(pdf.pages);
  });
});
