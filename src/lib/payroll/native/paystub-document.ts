import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export const NATIVE_PAYSTUB_PRESENTATION_VERSION = "NEVORA_NATIVE_PAYSTUB_PRESENTATION_V1";
export const NATIVE_PAYSTUB_TEMPLATE_VERSION = "NEVORA_NATIVE_PAYSTUB_PDF_V1";
export type NativePaystubRatio = { numerator: string; denominator: string };
export type NativePaystubMoney = { currentMinor: string; ytdMinor: string };
export type NativePaystubEarning = {
  label: string;
  kind: "REGULAR" | "OVERTIME" | "FLSA_TRUE_UP" | "SUPPLEMENTAL";
  amountMinor: string;
  work?: {
    nanoseconds: string;
    baseRateMinorPerHour: NativePaystubRatio;
    premiumRateMinorPerHour: NativePaystubRatio;
    paidRateMinorPerHour: NativePaystubRatio;
  };
};
export type NativePaystubDeduction = { label: string; amount: NativePaystubMoney };
export type NativePaystubPresentation = {
  version: typeof NATIVE_PAYSTUB_PRESENTATION_VERSION;
  templateVersion: typeof NATIVE_PAYSTUB_TEMPLATE_VERSION;
  sourceAuthority: "NATIVE_RECORDED_TIME";
  currency: "USD";
  language: "en" | "es";
  companyName: string;
  employeeName: string;
  employeeReference: string;
  period: { startDate: string; endDate: string };
  payDate: string;
  approvedAt: string;
  runReference: string;
  runRevision: number;
  correction: { kind: "ORIGINAL" } | {
    kind: "REPLACEMENT";
    originalRunReference: string;
    replacesRunReference: string;
    reasonLabel?: string;
  };
  ytdYear: number;
  earnings: readonly NativePaystubEarning[];
  taxes: readonly NativePaystubDeduction[];
  authorizedDeductions: readonly NativePaystubDeduction[];
  totals: {
    gross: NativePaystubMoney;
    taxes: NativePaystubMoney;
    authorizedDeductions: NativePaystubMoney;
    net: NativePaystubMoney;
  };
  employerContributions?: {
    lines: readonly NativePaystubDeduction[];
    total: NativePaystubMoney;
  };
  sourceReferences: readonly { label: string; value: string }[];
};
export type NativePaystubRenderOptions = {
  progress?: () => Promise<void>;
  signal?: AbortSignal;
};
export type NativePaystubPdf = {
  bytes: Uint8Array;
  sha256: string;
  pageCount: number;
  templateVersion: typeof NATIVE_PAYSTUB_TEMPLATE_VERSION;
};
export class NativePaystubDocumentError extends Error {
  constructor(readonly code: "INVALID_PRESENTATION" | "UNSUPPORTED_DOCUMENT_GLYPH", readonly paths: readonly string[]) { super(code); this.name = "NativePaystubDocumentError"; }
}

const MAX_ROWS = 2000;
function requireValue(condition: unknown, path: string): asserts condition {
  if (!condition) throw new NativePaystubDocumentError("INVALID_PRESENTATION", [path]);
}
function record(value: unknown, path: string): Record<string, unknown> {
  requireValue(value !== null && typeof value === "object" && !Array.isArray(value), path);
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string, max = 240): string {
  requireValue(typeof value === "string" && value.trim().length > 0 && value.length <= max, path);
  return value;
}
function integer(value: unknown, path: string, signed = true): string {
  requireValue(typeof value === "string" && (signed ? /^(?:0|-?[1-9]\d{0,23})$/ : /^(?:0|[1-9]\d{0,23})$/).test(value), path);
  return value;
}
function ratio(value: unknown, path: string): NativePaystubRatio {
  const r = record(value, path);
  const numerator = integer(r.numerator, `${path}.numerator`, false);
  const denominator = integer(r.denominator, `${path}.denominator`, false);
  requireValue(denominator !== "0", `${path}.denominator`);
  return { numerator, denominator };
}
function moneyPair(value: unknown, path: string): NativePaystubMoney {
  const r = record(value, path);
  return { currentMinor: integer(r.currentMinor, `${path}.currentMinor`), ytdMinor: integer(r.ytdMinor, `${path}.ytdMinor`) };
}
function list(value: unknown, path: string, min = 0, max = MAX_ROWS): unknown[] {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max, path);
  return value;
}
function isoDate(value: unknown, path: string): string {
  requireValue(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value), path);
  const date = new Date(`${value}T00:00:00.000Z`);
  requireValue(Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value, path);
  return value;
}
function deductions(value: unknown, path: string): NativePaystubDeduction[] {
  return Array.from(list(value, path), (v, i) => {
    const r = record(v, `${path}.${i}`);
    return { label: text(r.label, `${path}.${i}.label`, 500), amount: moneyPair(r.amount, `${path}.${i}.amount`) };
  });
}

/** Copy only presentation fields synchronously, so progress callbacks cannot mutate the artifact. */
function presentation(value: unknown): NativePaystubPresentation {
  const p = record(value, "presentation");
  requireValue(p.version === NATIVE_PAYSTUB_PRESENTATION_VERSION, "version");
  requireValue(p.templateVersion === NATIVE_PAYSTUB_TEMPLATE_VERSION, "templateVersion");
  requireValue(p.sourceAuthority === "NATIVE_RECORDED_TIME", "sourceAuthority");
  requireValue(p.currency === "USD", "currency");
  requireValue(p.language === "en" || p.language === "es", "language");
  const period = record(p.period, "period");
  const startDate = isoDate(period.startDate, "period.startDate"), endDate = isoDate(period.endDate, "period.endDate");
  requireValue(startDate <= endDate, "period.endDate");
  const payDate = isoDate(p.payDate, "payDate");
  const approvedAt = text(p.approvedAt, "approvedAt");
  requireValue(/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(approvedAt) && Number.isFinite(new Date(approvedAt).valueOf()), "approvedAt");
  isoDate(approvedAt.slice(0, 10), "approvedAt");
  requireValue(typeof p.runRevision === "number" && Number.isSafeInteger(p.runRevision) && p.runRevision > 0, "runRevision");
  requireValue(typeof p.ytdYear === "number" && p.ytdYear === Number(payDate.slice(0, 4)), "ytdYear");
  const correction = record(p.correction, "correction");
  requireValue(correction.kind === "ORIGINAL" || correction.kind === "REPLACEMENT", "correction.kind");
  const totals = record(p.totals, "totals");
  const parsed: NativePaystubPresentation = {
    version: NATIVE_PAYSTUB_PRESENTATION_VERSION, templateVersion: NATIVE_PAYSTUB_TEMPLATE_VERSION,
    sourceAuthority: "NATIVE_RECORDED_TIME", currency: "USD", language: p.language,
    companyName: text(p.companyName, "companyName"), employeeName: text(p.employeeName, "employeeName"),
    employeeReference: text(p.employeeReference, "employeeReference"),
    period: { startDate, endDate }, payDate, approvedAt, runReference: text(p.runReference, "runReference"), runRevision: p.runRevision,
    correction: correction.kind === "ORIGINAL" ? { kind: "ORIGINAL" } : {
      kind: "REPLACEMENT", originalRunReference: text(correction.originalRunReference, "correction.originalRunReference"),
      replacesRunReference: text(correction.replacesRunReference, "correction.replacesRunReference"),
      ...(correction.reasonLabel === undefined ? {} : { reasonLabel: text(correction.reasonLabel, "correction.reasonLabel", 500) }),
    },
    ytdYear: p.ytdYear,
    earnings: Array.from(list(p.earnings, "earnings"), (value, i) => {
      const path = `earnings.${i}`, r = record(value, path);
      requireValue(r.kind === "REGULAR" || r.kind === "OVERTIME" || r.kind === "FLSA_TRUE_UP" || r.kind === "SUPPLEMENTAL", `${path}.kind`);
      if (r.kind === "REGULAR" || r.kind === "OVERTIME") requireValue(r.work !== undefined, `${path}.work`);
      let work: NativePaystubEarning["work"];
      if (r.work !== undefined) {
        const w = record(r.work, `${path}.work`);
        work = {
          nanoseconds: integer(w.nanoseconds, `${path}.work.nanoseconds`, false),
          baseRateMinorPerHour: ratio(w.baseRateMinorPerHour, `${path}.work.baseRateMinorPerHour`),
          premiumRateMinorPerHour: ratio(w.premiumRateMinorPerHour, `${path}.work.premiumRateMinorPerHour`),
          paidRateMinorPerHour: ratio(w.paidRateMinorPerHour, `${path}.work.paidRateMinorPerHour`),
        };
      }
      return { label: text(r.label, `${path}.label`, 500), kind: r.kind, amountMinor: integer(r.amountMinor, `${path}.amountMinor`), ...(work ? { work } : {}) };
    }),
    taxes: deductions(p.taxes, "taxes"), authorizedDeductions: deductions(p.authorizedDeductions, "authorizedDeductions"),
    totals: { gross: moneyPair(totals.gross, "totals.gross"), taxes: moneyPair(totals.taxes, "totals.taxes"), authorizedDeductions: moneyPair(totals.authorizedDeductions, "totals.authorizedDeductions"), net: moneyPair(totals.net, "totals.net") },
    sourceReferences: Array.from(list(p.sourceReferences, "sourceReferences", 1, 32), (value, i) => {
      const r = record(value, `sourceReferences.${i}`);
      return { label: text(r.label, `sourceReferences.${i}.label`, 500), value: text(r.value, `sourceReferences.${i}.value`) };
    }),
  };
  if (p.employerContributions !== undefined) {
    const r = record(p.employerContributions, "employerContributions");
    parsed.employerContributions = { lines: deductions(r.lines, "employerContributions.lines"), total: moneyPair(r.total, "employerContributions.total") };
  }
  requireValue(parsed.earnings.length + parsed.taxes.length + parsed.authorizedDeductions.length + (parsed.employerContributions?.lines.length ?? 0) <= MAX_ROWS, "rows");
  const sum = (lines: readonly NativePaystubDeduction[], column: keyof NativePaystubMoney) => lines.reduce((v, line) => v + BigInt(line.amount[column]), BigInt(0));
  requireValue(parsed.earnings.reduce((v, line) => v + BigInt(line.amountMinor), BigInt(0)) === BigInt(parsed.totals.gross.currentMinor), "totals.gross.currentMinor");
  for (const column of ["currentMinor", "ytdMinor"] as const) {
    requireValue(sum(parsed.taxes, column) === BigInt(parsed.totals.taxes[column]), `totals.taxes.${column}`);
    requireValue(sum(parsed.authorizedDeductions, column) === BigInt(parsed.totals.authorizedDeductions[column]), `totals.authorizedDeductions.${column}`);
    requireValue(BigInt(parsed.totals.gross[column]) - BigInt(parsed.totals.taxes[column]) - BigInt(parsed.totals.authorizedDeductions[column]) === BigInt(parsed.totals.net[column]), `totals.net.${column}`);
    if (parsed.employerContributions) requireValue(sum(parsed.employerContributions.lines, column) === BigInt(parsed.employerContributions.total[column]), `employerContributions.total.${column}`);
  }
  return parsed;
}

function displayStrings(p: NativePaystubPresentation): [string, string][] {
  const strings: [string, string][] = [
    ["companyName", p.companyName], ["employeeName", p.employeeName], ["employeeReference", p.employeeReference],
    ["runReference", p.runReference],
  ];
  if (p.correction.kind === "REPLACEMENT") {
    strings.push(["correction.originalRunReference", p.correction.originalRunReference], ["correction.replacesRunReference", p.correction.replacesRunReference]);
    if (p.correction.reasonLabel !== undefined) strings.push(["correction.reasonLabel", p.correction.reasonLabel]);
  }
  for (const [category, rows] of [["earnings", p.earnings], ["taxes", p.taxes], ["authorizedDeductions", p.authorizedDeductions], ["employerContributions.lines", p.employerContributions?.lines ?? []]] as const) {
    for (const [i, line] of rows.entries()) strings.push([`${category}.${i}.label`, line.label]);
  }
  for (const [i, ref] of p.sourceReferences.entries()) strings.push([`sourceReferences.${i}.label`, ref.label], [`sourceReferences.${i}.value`, ref.value]);
  return strings;
}
function checkGlyphs(p: NativePaystubPresentation, regular: PDFFont, bold: PDFFont): void {
  const regularSet = new Set(regular.getCharacterSet()), boldSet = new Set(bold.getCharacterSet());
  const paths = displayStrings(p).filter(([, value]) => [...value].some(char => {
    const point = char.codePointAt(0)!;
    return point < 32 || (point >= 127 && point <= 159) || !regularSet.has(point) || !boldSet.has(point);
  })).map(([path]) => path);
  if (paths.length) throw new NativePaystubDocumentError("UNSUPPORTED_DOCUMENT_GLYPH", paths);
}
export async function preflightNativePaystubGlyphs(input: NativePaystubPresentation): Promise<void> {
  const p = presentation(input), pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  checkGlyphs(p, regular, bold);
}
const WORDS = {
  en: {
    title: "Pay statement", employee: "Employee reference", period: "Pay period", payDate: "Pay date",
    original: "Original statement", replacement: "Corrected replacement", current: "Current", ytd: "YTD",
    earnings: "Earnings", description: "Description", hours: "Hours", base: "Base / h", premium: "Premium / h", paid: "Paid rate / h", amount: "Amount",
    taxes: "Taxes", deductions: "Authorized deductions", contributions: "Employer contributions", contributionsNote: "Employer contributions do not reduce employee net pay.",
    gross: "Gross pay", net: "Net pay", total: "Total", payTotals: "Pay totals", none: "No items", continued: "continued",
    exact: "Hours and rates are exact decimals or fractions. Amounts are from approved payroll.",
    sources: "Approval and source references", recorded: "Source: approved recorded time", run: "Payroll run", revision: "revision",
    approved: "Approved", root: "Original run", replaces: "Replaces run", reason: "Correction",
    disclaimer: "Payroll documentation does not confirm payment.", template: "Statement template v1",
    kinds: { REGULAR: "Regular", OVERTIME: "Overtime", FLSA_TRUE_UP: "Supplemental true-up", SUPPLEMENTAL: "Supplemental" },
  },
  es: {
    title: "Comprobante de nómina", employee: "Referencia del empleado", period: "Período de nómina", payDate: "Fecha de pago",
    original: "Comprobante original", replacement: "Reemplazo corregido", current: "Actual", ytd: "Acumulado",
    earnings: "Ingresos", description: "Descripción", hours: "Horas", base: "Base / h", premium: "Prima / h", paid: "Tarifa / h", amount: "Importe",
    taxes: "Impuestos", deductions: "Deducciones autorizadas", contributions: "Aportaciones patronales", contributionsNote: "Las aportaciones patronales no reducen el neto del empleado.",
    gross: "Salario bruto", net: "Salario neto", total: "Total", payTotals: "Totales de nómina", none: "Sin partidas", continued: "continuación",
    exact: "Horas y tarifas en decimales o fracciones exactas. Importes de la nómina aprobada.",
    sources: "Aprobación y referencias de origen", recorded: "Origen: tiempo registrado aprobado", run: "Nómina", revision: "revisión",
    approved: "Aprobado", root: "Nómina original", replaces: "Reemplaza nómina", reason: "Corrección",
    disclaimer: "La documentación de nómina no confirma el pago.", template: "Plantilla del comprobante v1",
    kinds: { REGULAR: "Regular", OVERTIME: "Horas extra", FLSA_TRUE_UP: "Ajuste suplementario", SUPPLEMENTAL: "Suplementario" },
  },
} as const;

function money(value: string): string {
  const n = BigInt(value), absolute = n < BigInt(0) ? -n : n;
  const whole = (absolute / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `USD ${n < BigInt(0) ? "-" : ""}${whole}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}
/** Exact presentation arithmetic only; never rounds, computes or replaces wages/taxes. */
function exact(numerator: bigint, denominator: bigint, minimumDecimals = 0): string {
  let a = numerator, b = denominator;
  while (b !== BigInt(0)) [a, b] = [b, a % b];
  const n = numerator / a, d = denominator / a;
  let terminating = d;
  for (const factor of [BigInt(2), BigInt(5)]) while (terminating % factor === BigInt(0)) terminating /= factor;
  if (terminating !== BigInt(1)) return `${n}/${d}`;
  const whole = (n / d).toString();
  let remainder = n % d, decimals = "";
  while (remainder !== BigInt(0)) {
    remainder *= BigInt(10); decimals += (remainder / d).toString(); remainder %= d;
  }
  decimals = decimals.padEnd(minimumDecimals, "0");
  return `${whole}${decimals ? `.${decimals}` : ""}`;
}
function rate(r: NativePaystubRatio): string {
  return `USD ${exact(BigInt(r.numerator), BigInt(r.denominator) * BigInt(100), 2)}`;
}
// Standard-font drawText emits Tj without pair kerning; measure its actual glyph advances.
function advance(value: string, font: PDFFont, size: number): number {
  return [...value].reduce((sum, char) => sum + font.widthOfTextAtSize(char, size), 0);
}
function wrap(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  const widths = new Map<string, number>();
  let current = "", currentWidth = 0;
  for (const char of value) {
    const charWidth = widths.get(char) ?? font.widthOfTextAtSize(char, size);
    widths.set(char, charWidth);
    if (currentWidth + charWidth > width) {
      const space = current.lastIndexOf(" ");
      if (space > 0) { lines.push(current.slice(0, space)); current = current.slice(space + 1); }
      else { lines.push(current); current = ""; }
      currentWidth = advance(current, font, size);
      // The carried word can still nearly fill the line after removing a short prefix.
      if (currentWidth + charWidth > width) { lines.push(current); current = ""; currentWidth = 0; }
    }
    current += char; currentWidth += charWidth;
  }
  lines.push(current);
  return lines;
}

const PAGE_WIDTH = 612, PAGE_HEIGHT = 792, MARGIN = 40, WIDTH = PAGE_WIDTH - MARGIN * 2, TOP = 752, BOTTOM = 60;
// Print colors follow DESIGN.MD; standard Helvetica is explicitly pinned for this PDF contract.
const INK = rgb(17 / 255, 24 / 255, 39 / 255), MUTED = rgb(75 / 255, 85 / 255, 99 / 255);
const ACCENT = rgb(237 / 255, 114 / 255, 76 / 255), BORDER = rgb(209 / 255, 213 / 255, 219 / 255);
const SURFACE = rgb(250 / 255, 250 / 255, 250 / 255), TABLE_HEAD = rgb(229 / 255, 231 / 255, 235 / 255);

/** Role-independent rendering of one immutable, approved employee presentation. */
export async function renderNativeEmployeePaystub(input: NativePaystubPresentation, options: NativePaystubRenderOptions = {}): Promise<NativePaystubPdf> {
  options.signal?.throwIfAborted();
  const p = presentation(input), t = WORDS[p.language];
  const checkpoint = async () => {
    options.signal?.throwIfAborted();
    await options.progress?.();
    options.signal?.throwIfAborted();
  };
  await checkpoint();
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  checkGlyphs(p, regular, bold);
  const approved = new Date(p.approvedAt);
  pdf.setCreationDate(approved); pdf.setModificationDate(approved);
  pdf.setProducer("NEVORA"); pdf.setCreator("NEVORA"); pdf.setTitle(t.title);
  pdf.setSubject(`${p.sourceAuthority} / ${NATIVE_PAYSTUB_TEMPLATE_VERSION}`);
  let page: PDFPage, y = TOP;
  const draw = (value: string, x: number, baseline: number, size = 9, strong = false, muted = false) => {
    page.drawText(value, { x, y: baseline, size, font: strong ? bold : regular, color: muted ? MUTED : INK });
  };
  const addPage = async (first = false) => {
    await checkpoint();
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); y = TOP;
    if (!first) {
      draw(`${t.title} — ${t.continued}`, MARGIN, y - 12, 12, true); y -= 23;
      for (const line of wrap(`${t.employee}: ${p.employeeReference}`, regular, 8, WIDTH)) { draw(line, MARGIN, y - 8, 8, false, true); y -= 11; }
      page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 4 }, thickness: 1.5, color: ACCENT });
      y -= 16;
    }
  };
  const ensure = async (height: number) => { if (y - height < BOTTOM) await addPage(); };
  const paragraph = async (value: string, size = 9, strong = false, gap = 8, muted = false) => {
    const lines = wrap(value, strong ? bold : regular, size, WIDTH), leading = size + 4;
    await ensure(lines.length * leading + gap);
    for (const line of lines) { draw(line, MARGIN, y - size, size, strong, muted); y -= leading; }
    y -= gap;
  };
  const ytdLabel = `${t.ytd} ${p.ytdYear}`;
  const headerCells = (cells: string[], widths: number[]) => cells.map((cell, i) => wrap(cell, bold, 8, widths[i] - 16));
  const cellsFor = (cells: string[], widths: number[], strong = false, size = 9) => cells.map((cell, i) => wrap(cell, strong ? bold : regular, size, widths[i] - 16));
  const heightFor = (cells: string[][], leading = 12) => Math.max(...cells.map(cell => cell.length)) * leading + 16;
  const tableHeader = (cells: string[][], widths: number[]) => {
    const height = heightFor(cells, 11);
    page.drawRectangle({ x: MARGIN, y: y - height, width: WIDTH, height, color: TABLE_HEAD });
    let x = MARGIN;
    for (const [i, lines] of cells.entries()) {
      for (const [j, line] of lines.entries()) draw(line, x + 8, y - 8 - 8 - j * 11, 8, true);
      x += widths[i];
    }
    y -= height;
  };
  const tableRow = (cells: string[][], widths: number[], strong = false, shaded = false, size = 9) => {
    const height = heightFor(cells, size + 3);
    if (shaded || strong) page.drawRectangle({ x: MARGIN, y: y - height, width: WIDTH, height, color: SURFACE });
    let x = MARGIN;
    for (const [i, lines] of cells.entries()) {
      for (const [j, line] of lines.entries()) {
        const textWidth = advance(line, strong ? bold : regular, size);
        draw(line, i === 0 ? x + 8 : x + widths[i] - 8 - textWidth, y - 8 - size - j * (size + 3), size, strong);
      }
      x += widths[i];
    }
    page.drawLine({ start: { x: MARGIN, y: y - height }, end: { x: PAGE_WIDTH - MARGIN, y: y - height }, thickness: 0.5, color: BORDER });
    y -= height;
  };
  const table = async (title: string, headers: string[], widths: number[], rows: string[][], total?: string[]) => {
    await checkpoint();
    const heading = headerCells(headers, widths), headingHeight = heightFor(heading, 11);
    const prepared = rows.map(row => cellsFor(row, widths));
    const final = total ? cellsFor(total, widths, true) : undefined;
    const totalHeight = final ? heightFor(final) : 0;
    const start = async (continued: boolean, minimum: number) => {
      await ensure(27 + headingHeight + minimum);
      draw(`${title}${continued ? ` (${t.continued})` : ""}`, MARGIN, y - 12, 12, true); y -= 27;
      tableHeader(heading, widths);
    };
    await start(false, heightFor(prepared[0]) + (prepared.length === 1 ? totalHeight : 0));
    for (const [i, cells] of prepared.entries()) {
      if (i % 16 === 0) await checkpoint();
      const needed = heightFor(cells) + (i === prepared.length - 1 ? totalHeight : 0);
      if (y - needed < BOTTOM) { await addPage(); await start(true, needed); }
      tableRow(cells, widths, false, i % 2 === 1);
    }
    if (final) tableRow(final, widths, true);
    y -= 18;
  };
  const totalBlock = async (title: string | undefined, compact = false) => {
    await checkpoint();
    const widths = [176, 178, 178], size = compact ? 12 : 10;
    const keys = compact ? ["gross", "net"] as const : ["gross", "taxes", "authorizedDeductions", "net"] as const;
    const labels = { gross: t.gross, taxes: t.taxes, authorizedDeductions: t.deductions, net: t.net };
    const rows = keys.map(key => cellsFor([labels[key], money(p.totals[key].currentMinor), money(p.totals[key].ytdMinor)], widths, key === "net", size));
    const head = headerCells(["", t.current, ytdLabel], widths);
    await ensure((title ? 27 : 0) + heightFor(head, 11) + rows.reduce((v, row) => v + heightFor(row, size + 3), 0) + 18);
    if (title) { draw(title, MARGIN, y - 12, 12, true); y -= 27; }
    tableHeader(head, widths);
    for (const [i, row] of rows.entries()) tableRow(row, widths, keys[i] === "net", true, size);
    y -= 18;
  };

  await addPage(true);
  await paragraph(p.companyName, 20, true, 5);
  await paragraph(`${t.title} — ${p.correction.kind === "REPLACEMENT" ? t.replacement : t.original}`, 12, false, 12);
  page!.drawLine({ start: { x: MARGIN, y: y + 6 }, end: { x: PAGE_WIDTH - MARGIN, y: y + 6 }, thickness: 2, color: ACCENT });
  await paragraph(p.employeeName, 14, true, 4);
  await paragraph(`${t.employee}: ${p.employeeReference}`, 9, false, 12, true);
  await ensure(48);
  draw(t.period, MARGIN, y - 9, 9, true); draw(t.payDate, MARGIN + 350, y - 9, 9, true);
  draw(`${p.period.startDate} — ${p.period.endDate}`, MARGIN, y - 26, 10); draw(p.payDate, MARGIN + 350, y - 26, 10);
  y -= 48;
  await totalBlock(undefined, true);
  await table(t.earnings, [t.description, t.hours, t.base, t.premium, t.paid, t.amount], [152, 58, 80, 78, 82, 82], p.earnings.length ? p.earnings.map(line => [
    `${t.kinds[line.kind]} — ${line.label}`,
    line.work ? exact(BigInt(line.work.nanoseconds), BigInt("3600000000000")) : "—",
    line.work ? rate(line.work.baseRateMinorPerHour) : "—",
    line.work ? rate(line.work.premiumRateMinorPerHour) : "—",
    line.work ? rate(line.work.paidRateMinorPerHour) : "—", money(line.amountMinor),
  ]) : [[t.none, "", "", "", "", ""]], [t.gross, "", "", "", "", money(p.totals.gross.currentMinor)]);
  await paragraph(t.exact, 8, false, 12, true);
  const category = async (title: string, lines: readonly NativePaystubDeduction[], total: NativePaystubMoney) => {
    await table(title, [t.description, t.current, ytdLabel], [264, 134, 134], lines.length ? lines.map(line => [line.label, money(line.amount.currentMinor), money(line.amount.ytdMinor)]) : [[t.none, "", ""]], [t.total, money(total.currentMinor), money(total.ytdMinor)]);
  };
  await category(t.taxes, p.taxes, p.totals.taxes);
  await category(t.deductions, p.authorizedDeductions, p.totals.authorizedDeductions);
  await totalBlock(t.payTotals);
  if (p.employerContributions) {
    await category(t.contributions, p.employerContributions.lines, p.employerContributions.total);
    await paragraph(t.contributionsNote, 8, false, 12, true);
  }
  await checkpoint();
  const firstSource = `${t.run}: ${p.runReference} / ${t.revision} ${p.runRevision}`;
  // Keep the section heading with the complete first reference, including wrapped lines.
  await ensure(wrap(t.sources, bold, 12, WIDTH).length * 16 + 8
    + wrap(firstSource, regular, 8, WIDTH).length * 12 + 4);
  await paragraph(t.sources, 12, true, 8);
  await paragraph(firstSource, 8, false, 4, true);
  await paragraph(t.recorded, 8, false, 4, true);
  if (p.correction.kind === "REPLACEMENT") {
    await paragraph(`${t.root}: ${p.correction.originalRunReference}`, 8, false, 4, true);
    await paragraph(`${t.replaces}: ${p.correction.replacesRunReference}`, 8, false, 4, true);
    if (p.correction.reasonLabel !== undefined) await paragraph(`${t.reason}: ${p.correction.reasonLabel}`, 8, false, 4, true);
  }
  for (const ref of p.sourceReferences) { await checkpoint(); await paragraph(`${ref.label}: ${ref.value}`, 8, false, 4, true); }
  const pages = pdf.getPages();
  for (const [i, currentPage] of pages.entries()) {
    page = currentPage;
    page.drawLine({ start: { x: MARGIN, y: 48 }, end: { x: PAGE_WIDTH - MARGIN, y: 48 }, thickness: 0.5, color: BORDER });
    draw(t.disclaimer, MARGIN, 35, 8, false, true);
    const pageNumber = `${i + 1} / ${pages.length}`;
    draw(pageNumber, PAGE_WIDTH - MARGIN - advance(pageNumber, regular, 8), 35, 8, false, true);
    draw(t.template, MARGIN, 24, 8, false, true);
    const approval = `${t.approved}: ${approved.toISOString()}`;
    draw(approval, PAGE_WIDTH - MARGIN - advance(approval, regular, 8), 24, 8, false, true);
  }
  await checkpoint();
  const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false });
  await checkpoint();
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), pageCount: pages.length, templateVersion: NATIVE_PAYSTUB_TEMPLATE_VERSION };
}
