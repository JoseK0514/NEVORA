import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { NATIVE_PAYSTUB_WORDMARK_PNG_BASE64 } from "./paystub-wordmark";

export const NATIVE_PAYSTUB_PRESENTATION_VERSION = "NEVORA_NATIVE_PAYSTUB_PRESENTATION_V1";
export const NATIVE_PAYSTUB_TEMPLATE_V1 = "NEVORA_NATIVE_PAYSTUB_PDF_V1" as const;
export const NATIVE_PAYSTUB_TEMPLATE_V2 = "NEVORA_NATIVE_PAYSTUB_PDF_V2" as const;
export type NativePaystubTemplateVersion = typeof NATIVE_PAYSTUB_TEMPLATE_V1 | typeof NATIVE_PAYSTUB_TEMPLATE_V2;
export const isNativePaystubTemplateVersion = (value: unknown): value is NativePaystubTemplateVersion => value === NATIVE_PAYSTUB_TEMPLATE_V1 || value === NATIVE_PAYSTUB_TEMPLATE_V2;
/** The template newly prepared runs record. A run always renders with the template it recorded, so statements
 * issued under v1 keep their exact bytes and fingerprints. */
export const NATIVE_PAYSTUB_TEMPLATE_VERSION = NATIVE_PAYSTUB_TEMPLATE_V2;
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
  templateVersion: NativePaystubTemplateVersion;
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
  templateVersion: NativePaystubTemplateVersion;
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
  requireValue(p.templateVersion === NATIVE_PAYSTUB_TEMPLATE_V1 || p.templateVersion === NATIVE_PAYSTUB_TEMPLATE_V2, "templateVersion");
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
    version: NATIVE_PAYSTUB_PRESENTATION_VERSION, templateVersion: p.templateVersion as NativePaystubTemplateVersion,
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
/** Validate a copied presentation and every dynamic string against both embedded
 * font repertoires before approval. Reject unsupported text explicitly rather than
 * replacing characters and changing the approved document’s meaning. */
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

/** Role-independent rendering of one immutable, approved employee presentation, with the template it recorded. */
export async function renderNativeEmployeePaystub(input: NativePaystubPresentation, options: NativePaystubRenderOptions = {}): Promise<NativePaystubPdf> {
  options.signal?.throwIfAborted();
  const p = presentation(input);
  return p.templateVersion === NATIVE_PAYSTUB_TEMPLATE_V2 ? renderStatementV2(p, options) : renderStatementV1(p, options);
}

/** Template v1 (October 2026). Kept byte for byte: statements issued with it must re-render identically. */
async function renderStatementV1(p: NativePaystubPresentation, options: NativePaystubRenderOptions): Promise<NativePaystubPdf> {
  const t = WORDS[p.language];
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
  pdf.setSubject(`${p.sourceAuthority} / ${NATIVE_PAYSTUB_TEMPLATE_V1}`);
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
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), pageCount: pages.length, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V1 };
}

/* Template v2 (approved November 2, 2026): an elegant, plain-language statement. The take-home amount leads,
 * then one strip reads "You earned - Taxes - Other deductions = Take home", then each section in plain words.
 * Same pinned Helvetica fonts and glyph check as v1; presentation arithmetic stays exact and never rounds. */
const WORDS_V2 = {
  en: {
    title: "Pay statement", original: "Original", replacement: "Corrected replacement", employeeId: "Employee ID",
    home: "You take home", earned: "You earned", taxes: "Taxes", other: "Other deductions", takeHome: "Take home",
    earnings: "What you earned", earningsHelp: "Your hours and pay for this period.",
    taxesTitle: "Taxes withheld", taxesHelp: "Taken from your pay and sent to the government for you.",
    deductionsTitle: "Other deductions", deductionsHelp: "Amounts you authorized to be taken from your pay.",
    employerTitle: "Paid by your employer", employerHelp: "Your employer pays these on top of your wages. They don't come out of your pay.",
    thisYear: "This year", thisPeriod: "This period", paidOn: "Paid on", forWork: "For work", hours: "Hours", rate: "Rate", amount: "Amount",
    total: "Total", none: "None this period", base: "Base", premium: "overtime premium", continued: "continued",
    references: "References", run: "Payroll run", revision: "revision", recorded: "Source: approved recorded time",
    root: "Original run", replaces: "Replaces run", reason: "Correction", approved: "Approved",
    disclaimer: "This statement documents approved payroll. It doesn't confirm payment.", page: "Page", of: "of",
    prepared: "Prepared with", template: "Template v2", h: "h", min: "min", s: "s",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  es: {
    title: "Comprobante de nómina", original: "Original", replacement: "Reemplazo corregido", employeeId: "ID de empleado",
    home: "Recibes", earned: "Ganaste", taxes: "Impuestos", other: "Otras deducciones", takeHome: "Recibes",
    earnings: "Lo que ganaste", earningsHelp: "Tus horas y tu pago en este período.",
    taxesTitle: "Impuestos retenidos", taxesHelp: "Se descuentan de tu pago y se envían al gobierno por ti.",
    deductionsTitle: "Otras deducciones", deductionsHelp: "Cantidades que autorizaste descontar de tu pago.",
    employerTitle: "Pagado por tu patrono", employerHelp: "Tu patrono los paga además de tu salario. No salen de tu pago.",
    thisYear: "Este año", thisPeriod: "Este período", paidOn: "Pagado el", forWork: "Trabajo del", hours: "Horas", rate: "Tarifa", amount: "Importe",
    total: "Total", none: "Ninguna en este período", base: "Base", premium: "prima por horas extra", continued: "continuación",
    references: "Referencias", run: "Nómina", revision: "revisión", recorded: "Origen: tiempo registrado aprobado",
    root: "Nómina original", replaces: "Reemplaza nómina", reason: "Corrección", approved: "Aprobado",
    disclaimer: "Este comprobante documenta la nómina aprobada. No confirma el pago.", page: "Página", of: "de",
    prepared: "Preparado con", template: "Plantilla v2", h: "h", min: "min", s: "s",
    months: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
  },
} as const;
type WordsV2 = (typeof WORDS_V2)["en" | "es"];

const hexV2 = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const V2 = {
  ink: hexV2("#172622"), muted: hexV2("#5F6D68"), soft: hexV2("#8A958F"), teal: hexV2("#0B6E69"), wash: hexV2("#EAF4F1"),
  line: hexV2("#E3E9E6"), sheet: hexV2("#F7F6F3"), amber: hexV2("#8A5A00"), amberWash: hexV2("#FBF1DC"),
  net: hexV2("#0B6E69"), tax: hexV2("#D4A24C"), deduction: hexV2("#9CBDB8"),
};
const V2_MARGIN = 44, V2_WIDTH = PAGE_WIDTH - V2_MARGIN * 2, V2_BOTTOM = 62;
type Color = ReturnType<typeof rgb>;
type CellRow = { cells: string[]; sub?: string };
type Column = { label: string; width: number; right?: boolean };

/** "$1,234.56"; a negative amount keeps its sign. Approved cent strings only, never rounded. */
function dollars(value: string): string {
  const n = BigInt(value), absolute = n < BigInt(0) ? -n : n;
  return `${n < BigInt(0) ? "-" : ""}$${(absolute / BigInt(100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${(absolute % BigInt(100)).toString().padStart(2, "0")}`;
}
const dollarRate = (r: NativePaystubRatio) => `$${exact(BigInt(r.numerator), BigInt(r.denominator) * BigInt(100), 2)}`;
/** Decimal hours when exact ("40", "2.5"); otherwise exact hours, minutes and seconds ("1 h 40 min"); a fraction only
 * when the time isn't a whole number of seconds. */
function workedHours(nanoseconds: string, t: WordsV2): string {
  const ns = BigInt(nanoseconds), hour = BigInt("3600000000000"), decimal = exact(ns, hour);
  if (!decimal.includes("/")) return decimal;
  const second = BigInt(1000000000);
  if (ns % second !== BigInt(0)) return decimal;
  const total = ns / second, h = total / BigInt(3600), m = (total % BigInt(3600)) / BigInt(60), sec = total % BigInt(60);
  return [h ? `${h} ${t.h}` : "", m ? `${m} ${t.min}` : "", sec ? `${sec} ${t.s}` : ""].filter(Boolean).join(" ");
}
function calendarDate(iso: string, t: WordsV2, en: boolean, year = true): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return en ? `${t.months[m - 1]} ${d}${year ? `, ${y}` : ""}` : `${d} ${t.months[m - 1]}${year ? ` ${y}` : ""}`;
}
const dateRange = (start: string, end: string, t: WordsV2, en: boolean) => `${calendarDate(start, t, en, start.slice(0, 4) !== end.slice(0, 4))} – ${calendarDate(end, t, en)}`;
function approvalStamp(approvedAt: string, t: WordsV2, en: boolean): string {
  const utc = new Date(approvedAt).toISOString();
  return `${calendarDate(utc, t, en)}, ${utc.slice(11, 16)} UTC`;
}

async function renderStatementV2(p: NativePaystubPresentation, options: NativePaystubRenderOptions): Promise<NativePaystubPdf> {
  const t = WORDS_V2[p.language], en = p.language === "en";
  const checkpoint = async () => {
    options.signal?.throwIfAborted();
    await options.progress?.();
    options.signal?.throwIfAborted();
  };
  await checkpoint();
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  checkGlyphs(p, regular, bold);
  const mark: PDFImage = await pdf.embedPng(Buffer.from(NATIVE_PAYSTUB_WORDMARK_PNG_BASE64, "base64"));
  const approved = new Date(p.approvedAt);
  pdf.setCreationDate(approved); pdf.setModificationDate(approved);
  pdf.setProducer("NEVORA"); pdf.setCreator("NEVORA"); pdf.setTitle(t.title);
  pdf.setSubject(`${p.sourceAuthority} / ${NATIVE_PAYSTUB_TEMPLATE_V2}`);
  const M = V2_MARGIN, CW = V2_WIDTH;
  let page!: PDFPage, y = 0;
  const pages: PDFPage[] = [];
  const width = (value: string, size: number, strong = false) => advance(value, strong ? bold : regular, size);
  const text = (value: string, x: number, baseline: number, size: number, o: { strong?: boolean; color?: Color; align?: "left" | "right" | "center" } = {}) => {
    const w = width(value, size, o.strong);
    page.drawText(value, { x: o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x, y: baseline, size, font: o.strong ? bold : regular, color: o.color ?? V2.ink });
  };
  const lines = (value: string, size: number, max: number, strong = false) => wrap(value, strong ? bold : regular, size, max);
  /** Capitals for the spaced employer line, one character at a time: a character whose capital the pinned font can't
   * draw (such as "µ", whose capital is Greek "Μ") stays as written, so the line shows only text the glyph check
   * already accepted. */
  const boldGlyphs = new Set(bold.getCharacterSet());
  const capitals = (value: string) => [...value].map(ch => { const up = ch.toUpperCase(); return [...up].every(c => boldGlyphs.has(c.codePointAt(0)!)) ? up : ch; }).join("");
  /** Small spaced capitals for the employer line; wraps on words, and splits a word only when it is longer than a line. */
  const spaced = (value: string, x: number, baseline: number, size: number, max: number, color: Color, track = 1.1) => {
    const span = (part: string) => [...part].reduce((v, ch) => v + bold.widthOfTextAtSize(ch, size) + track, -track);
    const words = capitals(value).split(" ").flatMap(word => {
      if (span(word) <= max) return [word];
      const pieces: string[] = []; let piece = "";
      for (const ch of word) { if (piece && span(piece + ch) > max) { pieces.push(piece); piece = ""; } piece += ch; }
      return [...pieces, piece];
    });
    const rows: string[] = []; let current = "";
    for (const word of words) { const next = current ? `${current} ${word}` : word; if (current && span(next) > max) { rows.push(current); current = word; } else current = next; }
    rows.push(current);
    rows.forEach((row, i) => {
      let cx = x;
      for (const ch of row) { page.drawText(ch, { x: cx, y: baseline - i * (size + 4), size, font: bold, color }); cx += bold.widthOfTextAtSize(ch, size) + track; }
    });
    return rows.length;
  };
  const rule = (at: number, x1 = M, x2 = PAGE_WIDTH - M) => page.drawLine({ start: { x: x1, y: at }, end: { x: x2, y: at }, thickness: 0.6, color: V2.line });
  const rounded = (x: number, yBottom: number, w: number, h: number, color: Color, r: number) => {
    const path = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
    page.drawSvgPath(path, { x, y: yBottom + h, color, scale: 1 });
  };
  const addPage = async (first = false) => {
    await checkpoint();
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); pages.push(page); y = PAGE_HEIGHT - M;
    if (first) return;
    const right = `${p.employeeName} · ${dateRange(p.period.startDate, p.period.endDate, t, en)}`;
    const rightLines = lines(right, 8, CW * 0.55);
    rightLines.forEach((l, i) => text(l, PAGE_WIDTH - M, y - 8 - i * 11, 8, { color: V2.muted, align: "right" }));
    const used = spaced(p.companyName, M, y - 8, 7.5, CW * 0.4, V2.teal, 0.9);
    y -= 18 + (Math.max(used, rightLines.length) - 1) * 11.5; rule(y); y -= 20;
  };
  const ensure = async (height: number) => { if (y - height < V2_BOTTOM) { await addPage(); return true; } return false; };

  /** A plain-language section: title, one-line explanation, light column labels, rows on hairlines, bold total. */
  const section = async (title: string, help: string, cols: Column[], rows: CellRow[], total: string[] | undefined, x = M, w = CW) => {
    await checkpoint();
    const size = 9, rowH = 20, helpLines = lines(help, 7.5, w);
    const cellLines = (cells: string[], strong = false) => cells.map((c, j) => c ? lines(c, strong ? size + 0.5 : size, cols[j].width - (j === 0 ? 8 : 6), strong) : []);
    const wrapped = rows.map(r => ({ cells: cellLines(r.cells), sub: r.sub ? lines(r.sub, 7.5, cols[0].width + cols.slice(1).reduce((v, c) => v + c.width, 0) * 0.5) : [] }));
    const tall = (cells: string[][]) => Math.max(1, ...cells.map(c => c.length));
    const height = (r: typeof wrapped[number]) => rowH + (tall(r.cells) - 1) * 12 + r.sub.length * 11;
    const totalLines = total ? cellLines(total, true) : undefined, totalH = totalLines ? rowH + 2 + (tall(totalLines) - 1) * 12 : 0;
    const head = (continued: boolean) => {
      text(`${title}${continued ? ` (${t.continued})` : ""}`, x, y - 11, 11.5, { strong: true }); y -= 17;
      if (!continued) for (const l of helpLines) { text(l, x, y - 8, 7.5, { color: V2.muted }); y -= 10; }
      y -= 8;
      let cx = x; for (const c of cols) { if (c.label) text(c.label, c.right ? cx + c.width : cx + (cx === x ? 0 : 6), y - 10, 7, { color: V2.soft, align: c.right ? "right" : "left" }); cx += c.width; }
      y -= 14; rule(y, x, x + w);
    };
    await ensure(17 + helpLines.length * 10 + 22 + (wrapped.length ? height(wrapped[0]) : 0) + (wrapped.length === 1 ? totalH : 0));
    head(false);
    for (const [i, r] of wrapped.entries()) {
      if (i % 16 === 0 && i > 0) await checkpoint();
      const h = height(r), last = i === wrapped.length - 1;
      if (y - h - (last ? totalH : 0) < V2_BOTTOM) { await addPage(); head(true); }
      let cx = x;
      for (const [j, cell] of r.cells.entries()) {
        const c = cols[j], at = j === 0 ? cx : c.right ? cx + c.width : cx + 6;
        cell.forEach((l, k) => text(l, at, y - 14 - k * 12, size, { align: j > 0 && c.right ? "right" : "left", color: l === "—" ? V2.soft : V2.ink }));
        cx += c.width;
      }
      r.sub.forEach((l, j) => text(l, x, y - 25 - (tall(r.cells) - 1) * 12 - j * 11, 7.5, { color: V2.muted }));
      y -= h; rule(y, x, x + w);
    }
    if (totalLines) {
      let cx = x;
      for (const [j, cell] of totalLines.entries()) {
        const c = cols[j];
        cell.forEach((l, k) => text(l, c.right ? cx + c.width : cx, y - 15 - k * 12, size + 0.5, { strong: true, align: c.right ? "right" : "left" }));
        cx += c.width;
      }
      y -= totalH;
    }
    y -= 12;
  };
  /** The exact height of a section whose every row and total fits on one line, or undefined when one wraps. */
  const singleLineHeight = (help: string, cols: Column[], rows: CellRow[], total: string[], w: number) => {
    const fits = (cells: string[], strong = false) => cells.every((c, j) => !c || width(c, strong ? 9.5 : 9, strong) <= cols[j].width - (j === 0 ? 8 : 6));
    if (!rows.every(r => !r.sub && fits(r.cells)) || !fits(total, true)) return undefined;
    return 17 + lines(help, 7.5, w).length * 10 + 8 + 14 + rows.length * 20 + 22 + 12;
  };
  /** Shrinks a one-line figure to fit its space, down to a readable floor. */
  const fit = (value: string, size: number, max: number, floor: number) => Math.max(floor, Math.min(size, size * max / width(value, size, true)));

  await addPage(true);
  // Masthead: the employer as a quiet spaced line, the document title large, and the statement kind as a label.
  const kind = p.correction.kind === "REPLACEMENT" ? t.replacement : t.original, replacement = p.correction.kind === "REPLACEMENT";
  const chipWidth = width(kind, 7.5, true) + 16;
  rounded(PAGE_WIDTH - M - chipWidth, y - 13, chipWidth, 17, replacement ? V2.amberWash : V2.wash, 8.5);
  text(kind, PAGE_WIDTH - M - chipWidth / 2, y - 7.5, 7.5, { strong: true, color: replacement ? V2.amber : V2.teal, align: "center" });
  const employerRows = spaced(p.companyName, M, y - 8, 8, CW - chipWidth - 24, V2.teal);
  y -= (employerRows - 1) * 12;
  for (const l of lines(t.title, 22, CW, true)) { text(l, M, y - 34, 22, { strong: true }); y -= 26; }
  y -= 20;
  // Who and when: wraps instead of colliding when a name or period is long.
  const when = `${t.forWork} ${dateRange(p.period.startDate, p.period.endDate, t, en)}  ·  ${t.paidOn} ${calendarDate(p.payDate, t, en)}`;
  const whenWidth = Math.min(width(when, 9), CW * 0.55);
  const whoLines = lines(`${p.employeeName}  ·  ${t.employeeId} ${p.employeeReference}`, 9, CW - whenWidth - 20), whenLines = lines(when, 9, whenWidth);
  whoLines.forEach((l, i) => text(l, M, y - 8 - i * 12, 9, { color: V2.muted }));
  whenLines.forEach((l, i) => text(l, PAGE_WIDTH - M, y - 8 - i * 12, 9, { color: V2.muted, align: "right" }));
  y -= 22 + (Math.max(whoLines.length, whenLines.length) - 1) * 12;
  // The answer first: what the person takes home.
  text(t.home, M, y - 10, 10, { strong: true, color: V2.teal });
  const hero = dollars(p.totals.net.currentMinor);
  text(hero, M, y - 50, fit(hero, 44, CW, 8), { strong: true });
  text(`${t.thisYear}: ${dollars(p.totals.net.ytdMinor)}`, M, y - 66, 8.5, { color: V2.muted });
  y -= 80;
  // The story in one strip: earned - taxes - other deductions = take home.
  const steps: [string, string, string, boolean][] = [
    [t.earned, dollars(p.totals.gross.currentMinor), "", false], [t.taxes, dollars(p.totals.taxes.currentMinor), "–", false],
    [t.other, dollars(p.totals.authorizedDeductions.currentMinor), "–", false], [t.takeHome, dollars(p.totals.net.currentMinor), "=", true],
  ];
  const stepWidth = CW / 4, stripHeight = 54;
  rounded(M, y - stripHeight, CW, stripHeight, V2.sheet, 10);
  for (const [i, [label, value, op, last]] of steps.entries()) {
    const x = M + i * stepWidth + 18;
    if (op) text(op, M + i * stepWidth - 4, y - 34, 14, { color: V2.soft, align: "center" });
    text(lines(label, 8, stepWidth - 22, last)[0], x, y - 19, 8, { strong: last, color: last ? V2.teal : V2.muted });
    const room = stepWidth - 26, valueSize = fit(value, value.length > 12 ? 11 : 14, room, 8);
    lines(value, valueSize, room, true).slice(0, 2).forEach((l, j) => text(l, x, y - 38 - j * 9, valueSize, { strong: true, color: last ? V2.teal : V2.ink }));
  }
  y -= stripHeight + 10;
  // The same split as a thin line, drawn only when every part is a non-negative share of positive gross pay.
  const gross = BigInt(p.totals.gross.currentMinor);
  const parts: [bigint, Color][] = [[BigInt(p.totals.net.currentMinor), V2.net], [BigInt(p.totals.taxes.currentMinor), V2.tax], [BigInt(p.totals.authorizedDeductions.currentMinor), V2.deduction]];
  if (gross > BigInt(0) && parts.every(([v]) => v >= BigInt(0))) {
    const live = parts.filter(([v]) => v > BigInt(0)), usable = CW - 2 * (live.length - 1);
    let bx = M;
    for (const [i, [v, c]] of live.entries()) {
      const w = usable * Number(v) / Number(gross);
      page.drawRectangle({ x: bx, y: y - 4, width: Math.max(w, 1.5), height: 4, color: c });
      bx += w + (i < live.length - 1 ? 2 : 0);
    }
  }
  y -= 26;

  const amountColumns = (w: number): Column[] => [{ label: "", width: w * 0.46 }, { label: t.thisPeriod, width: w * 0.26, right: true }, { label: t.thisYear, width: w * 0.28, right: true }];
  const lineRows = (rows: readonly NativePaystubDeduction[]): CellRow[] => rows.length ? rows.map(l => ({ cells: [l.label, dollars(l.amount.currentMinor), dollars(l.amount.ytdMinor)] })) : [{ cells: [t.none, "", ""] }];
  await section(t.earnings, t.earningsHelp,
    [{ label: "", width: CW * 0.52 }, { label: t.hours, width: CW * 0.14, right: true }, { label: t.rate, width: CW * 0.16, right: true }, { label: t.amount, width: CW * 0.18, right: true }],
    p.earnings.length ? p.earnings.map(e => {
      if (!e.work) return { cells: [e.label, "—", "—", dollars(e.amountMinor)] };
      const premium = BigInt(e.work.premiumRateMinorPerHour.numerator) !== BigInt(0);
      return { cells: [e.label, workedHours(e.work.nanoseconds, t), dollarRate(e.work.paidRateMinorPerHour), dollars(e.amountMinor)],
        sub: premium ? `${t.base} ${dollarRate(e.work.baseRateMinorPerHour)} + ${dollarRate(e.work.premiumRateMinorPerHour)} ${t.premium}` : undefined };
    }) : [{ cells: [t.none, "", "", ""] }],
    [t.total, "", "", dollars(p.totals.gross.currentMinor)]);
  // Taxes and other deductions sit side by side when both are short and every row fits on one line; otherwise they stack.
  const half = (CW - 32) / 2;
  const taxTotal = [t.total, dollars(p.totals.taxes.currentMinor), dollars(p.totals.taxes.ytdMinor)];
  const deductionTotal = [t.total, dollars(p.totals.authorizedDeductions.currentMinor), dollars(p.totals.authorizedDeductions.ytdMinor)];
  const pairHeights = p.taxes.length <= 12 && p.authorizedDeductions.length <= 12
    ? [singleLineHeight(t.taxesHelp, amountColumns(half), lineRows(p.taxes), taxTotal, half), singleLineHeight(t.deductionsHelp, amountColumns(half), lineRows(p.authorizedDeductions), deductionTotal, half)]
    : [undefined];
  if (pairHeights.every(h => h !== undefined)) {
    await ensure(Math.max(...pairHeights));
    const top = y;
    await section(t.taxesTitle, t.taxesHelp, amountColumns(half), lineRows(p.taxes), taxTotal, M, half);
    const afterTaxes = y; y = top;
    await section(t.deductionsTitle, t.deductionsHelp, amountColumns(half), lineRows(p.authorizedDeductions), deductionTotal, M + half + 32, half);
    y = Math.min(y, afterTaxes);
  } else {
    await section(t.taxesTitle, t.taxesHelp, amountColumns(CW), lineRows(p.taxes), taxTotal);
    await section(t.deductionsTitle, t.deductionsHelp, amountColumns(CW), lineRows(p.authorizedDeductions), deductionTotal);
  }
  if (p.employerContributions)
    await section(t.employerTitle, t.employerHelp, amountColumns(CW), lineRows(p.employerContributions.lines), [t.total, dollars(p.employerContributions.total.currentMinor), dollars(p.employerContributions.total.ytdMinor)]);

  // References in two columns; long values wrap inside their column.
  await checkpoint();
  const references = [`${t.run}: ${p.runReference}, ${t.revision} ${p.runRevision}`, t.recorded,
    ...(p.correction.kind === "REPLACEMENT" ? [`${t.root}: ${p.correction.originalRunReference}`, `${t.replaces}: ${p.correction.replacesRunReference}`, ...(p.correction.reasonLabel !== undefined ? [`${t.reason}: ${p.correction.reasonLabel}`] : [])] : []),
    ...p.sourceReferences.map(r => `${r.label}: ${r.value}`)].map(r => lines(r, 7.5, CW / 2 - 12));
  const pairs: string[][][] = [];
  for (let i = 0; i < references.length; i += 2) pairs.push(references.slice(i, i + 2));
  const pairHeight = (pair: string[][]) => Math.max(...pair.map(r => r.length)) * 10 + 2;
  await ensure(18 + pairHeight(pairs[0]));
  text(t.references, M, y - 9, 8.5, { strong: true, color: V2.muted }); y -= 18;
  for (const [i, pair] of pairs.entries()) {
    if (i % 16 === 0 && i > 0) await checkpoint();
    if (y - pairHeight(pair) < V2_BOTTOM) await addPage();
    pair.forEach((ref, col) => ref.forEach((l, j) => text(l, M + col * (CW / 2), y - 8 - j * 10, 7.5, { color: V2.muted })));
    y -= pairHeight(pair);
  }

  // Footer on every page.
  const stampFull = `${t.approved} ${approvalStamp(p.approvedAt, t, en)} · ${t.run} ${p.runReference} · ${t.template}`;
  const stampShort = `${t.approved} ${approvalStamp(p.approvedAt, t, en)} · ${t.template}`;
  for (const [i, current] of pages.entries()) {
    page = current;
    rule(52);
    text(t.disclaimer, M, 38, 7.5, { color: V2.muted });
    text(`${t.page} ${i + 1} ${t.of} ${pages.length}`, PAGE_WIDTH - M, 38, 7.5, { color: V2.muted, align: "right" });
    const markWidth = 52, markHeight = markWidth * mark.height / mark.width;
    page.drawImage(mark, { x: PAGE_WIDTH - M - markWidth, y: 24, width: markWidth, height: markHeight });
    const preparedX = PAGE_WIDTH - M - markWidth - 4;
    text(t.prepared, preparedX, 26, 7, { color: V2.soft, align: "right" });
    const stampRoom = preparedX - width(t.prepared, 7) - 16 - M, full = lines(stampFull, 7, stampRoom);
    (full.length <= 2 ? full : lines(stampShort, 7, stampRoom)).forEach((l, j) => text(l, M, 26 - j * 9, 7, { color: V2.soft }));
  }
  await checkpoint();
  const bytes = await pdf.save({ useObjectStreams: false, addDefaultPage: false });
  await checkpoint();
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), pageCount: pages.length, templateVersion: NATIVE_PAYSTUB_TEMPLATE_V2 };
}
