import { createHash } from "node:crypto";
import { PDFDocument, StandardFonts, type PDFImage, type PDFPage, type rgb } from "pdf-lib";
import { PayrollError } from "../model";
import { NATIVE_PAYSTUB_WORDMARK_PNG_BASE64 } from "./paystub-wordmark";
import { V2, WORDS_V2, advance, approvalStamp, calendarDate, dateRange, dollars, wrap } from "./paystub-document";

/* Company payroll summary, template v2 (approved November 5, 2026). It follows the v2 pay statement: net pay to the
 * team leads, one strip reads "Employees · Gross pay – Employee deductions = Net pay", then pay by employee, what
 * the company pays on top, and references. Native runs that recorded pay statement template v2 get this summary;
 * every other run keeps the plain summary, so documents already issued re-render identically. */
export const NATIVE_COMPANY_SUMMARY_TEMPLATE_V1 = "NEVORA_NATIVE_COMPANY_SUMMARY_V1" as const;
export const NATIVE_COMPANY_SUMMARY_TEMPLATE_V2 = "NEVORA_NATIVE_COMPANY_SUMMARY_V2" as const;
export type NativeCompanySummaryTemplateVersion = typeof NATIVE_COMPANY_SUMMARY_TEMPLATE_V1 | typeof NATIVE_COMPANY_SUMMARY_TEMPLATE_V2;

export type NativeCompanySummaryPresentation = {
  language: "en" | "es";
  companyName: string;
  period: { startDate: string; endDate: string };
  payDate: string;
  approvedAt: string;
  runReference: string;
  runRevision: number;
  correction: { kind: "ORIGINAL" } | { kind: "REPLACEMENT"; originalRunReference: string; replacesRunReference: string };
  employees: { name: string; reference: string; grossMinor: string; netMinor: string }[];
  totals: { employeeCount: number; grossMinor: string; deductionsMinor: string; employerContributionsMinor: string; netMinor: string };
};

const WORDS = {
  en: {
    title: "Payroll summary", original: "Original", replacement: "Corrected replacement", forWork: "For work", payday: "Payday",
    employeeCount: (n: number) => `${n} ${n === 1 ? "employee" : "employees"}`,
    hero: "Net pay to your team", employer: (v: string) => `Employer contributions of ${v} are paid on top of gross pay.`,
    employees: "Employees", gross: "Gross pay", deductions: "Employee deductions", net: "Net pay",
    byEmployee: "Pay by employee", byHelp: "Gross and net pay for each person in this run.", employee: "Employee", id: "Employee ID", total: "Total",
    contribTitle: "Paid by the company", contribHelp: "Employer contributions for this run. They're paid on top of wages and don't come out of anyone's pay.",
    contrib: "Employer contributions", references: "References", run: "Payroll run", revision: "revision", recorded: "Source: approved recorded time",
    root: "Original run", replaces: "Replaces run", approved: "Approved", template: "Template v2", prepared: "Prepared with",
    disclaimer: "This summary documents approved payroll. It doesn't confirm payment.", page: "Page", of: "of", continued: "continued",
  },
  es: {
    title: "Resumen de nómina", original: "Original", replacement: "Reemplazo corregido", forWork: "Trabajo del", payday: "Pago",
    employeeCount: (n: number) => `${n} ${n === 1 ? "empleado" : "empleados"}`,
    hero: "Pago neto a tu equipo", employer: (v: string) => `Las aportaciones patronales de ${v} se pagan además del pago bruto.`,
    employees: "Empleados", gross: "Pago bruto", deductions: "Deducciones del empleado", net: "Pago neto",
    byEmployee: "Pago por empleado", byHelp: "Pago bruto y neto de cada persona en esta nómina.", employee: "Empleado", id: "ID de empleado", total: "Total",
    contribTitle: "Pagado por la empresa", contribHelp: "Aportaciones patronales de esta nómina. Se pagan además del salario y no salen del pago de nadie.",
    contrib: "Aportaciones patronales", references: "Referencias", run: "Nómina", revision: "revisión", recorded: "Origen: tiempo registrado aprobado",
    root: "Nómina original", replaces: "Reemplaza nómina", approved: "Aprobado", template: "Plantilla v2", prepared: "Preparado con",
    disclaimer: "Este resumen documenta la nómina aprobada. No confirma el pago.", page: "Página", of: "de", continued: "continuación",
  },
} as const;

const PAGE_WIDTH = 612, PAGE_HEIGHT = 792, M = 44, CW = PAGE_WIDTH - M * 2, BOTTOM = 62;
type Color = ReturnType<typeof rgb>;

/** Every dynamic string, by path, for the glyph check. */
function displayStrings(p: NativeCompanySummaryPresentation): [string, string][] {
  const strings: [string, string][] = [["companyName", p.companyName], ["runReference", p.runReference]];
  if (p.correction.kind === "REPLACEMENT") strings.push(["correction.originalRunReference", p.correction.originalRunReference], ["correction.replacesRunReference", p.correction.replacesRunReference]);
  for (const [i, e] of p.employees.entries()) strings.push([`employees.${i}.name`, e.name], [`employees.${i}.reference`, e.reference]);
  return strings;
}

export async function renderNativeCompanySummary(p: NativeCompanySummaryPresentation, options: { progress?: () => Promise<void> } = {}) {
  const t = WORDS[p.language], dates = WORDS_V2[p.language], en = p.language === "en";
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Same rule as the pay statement: reject text either pinned font can't draw instead of changing what it says.
  const regularSet = new Set(regular.getCharacterSet()), boldSet = new Set(bold.getCharacterSet());
  const issues = displayStrings(p).filter(([, value]) => [...value].some(char => {
    const point = char.codePointAt(0)!;
    return point < 32 || (point >= 127 && point <= 159) || !regularSet.has(point) || !boldSet.has(point);
  })).map(([path]) => ({ path, message: "This exact text contains a character outside the supported English/Spanish PDF repertoire." }));
  if (issues.length) throw new PayrollError("UNSUPPORTED_DOCUMENT_GLYPH", 409, issues);

  const mark: PDFImage = await pdf.embedPng(Buffer.from(NATIVE_PAYSTUB_WORDMARK_PNG_BASE64, "base64"));
  const approved = new Date(p.approvedAt);
  pdf.setCreationDate(approved); pdf.setModificationDate(approved);
  pdf.setProducer("NEVORA"); pdf.setCreator("NEVORA"); pdf.setTitle(t.title);
  pdf.setSubject(`NATIVE_RECORDED_TIME / ${NATIVE_COMPANY_SUMMARY_TEMPLATE_V2}`);

  let page!: PDFPage, y = 0;
  const pages: PDFPage[] = [];
  const width = (value: string, size: number, strong = false) => advance(value, strong ? bold : regular, size);
  const text = (value: string, x: number, baseline: number, size: number, o: { strong?: boolean; color?: Color; align?: "left" | "right" | "center" } = {}) => {
    const w = width(value, size, o.strong);
    page.drawText(value, { x: o.align === "right" ? x - w : o.align === "center" ? x - w / 2 : x, y: baseline, size, font: o.strong ? bold : regular, color: o.color ?? V2.ink });
  };
  const lines = (value: string, size: number, max: number, strong = false) => wrap(value, strong ? bold : regular, size, max);
  /** Shrinks a one-line figure to fit its space, down to a readable floor. */
  const fit = (value: string, size: number, max: number, floor: number, strong = true) => Math.max(floor, Math.min(size, size * max / width(value, size, strong)));
  // Spaced capitals for the company line; a character whose capital the pinned font can't draw stays as written.
  const capitals = (value: string) => [...value].map(ch => { const up = ch.toUpperCase(); return [...up].every(c => boldSet.has(c.codePointAt(0)!)) ? up : ch; }).join("");
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
  const period = dateRange(p.period.startDate, p.period.endDate, dates, en);
  const addPage = async (first = false) => {
    await options.progress?.();
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]); pages.push(page); y = PAGE_HEIGHT - M;
    if (first) return;
    const right = lines(`${t.title} · ${period}`, 8, CW * 0.55);
    right.forEach((l, i) => text(l, PAGE_WIDTH - M, y - 8 - i * 11, 8, { color: V2.muted, align: "right" }));
    const used = spaced(p.companyName, M, y - 8, 7.5, CW * 0.4, V2.teal, 0.9);
    y -= 18 + (Math.max(used, right.length) - 1) * 11.5; rule(y); y -= 20;
  };
  const ensure = async (height: number) => { if (y - height < BOTTOM) await addPage(); };

  await addPage(true);
  // Masthead: the company as a quiet spaced line, the title large, and the run kind as a label.
  const replacement = p.correction.kind === "REPLACEMENT", kind = replacement ? t.replacement : t.original;
  const chipWidth = width(kind, 7.5, true) + 16;
  rounded(PAGE_WIDTH - M - chipWidth, y - 13, chipWidth, 17, replacement ? V2.amberWash : V2.wash, 8.5);
  text(kind, PAGE_WIDTH - M - chipWidth / 2, y - 7.5, 7.5, { strong: true, color: replacement ? V2.amber : V2.teal, align: "center" });
  const companyRows = spaced(p.companyName, M, y - 8, 8, CW - chipWidth - 24, V2.teal);
  y -= (companyRows - 1) * 12;
  text(t.title, M, y - 34, 22, { strong: true }); y -= 46;
  const when = `${t.forWork} ${period}  ·  ${t.payday} ${calendarDate(p.payDate, dates, en)}`;
  text(when, M, y - 8, 9, { color: V2.muted });
  text(t.employeeCount(p.totals.employeeCount), PAGE_WIDTH - M, y - 8, 9, { color: V2.muted, align: "right" });
  y -= 22;

  // The answer first: net pay to the team.
  text(t.hero, M, y - 10, 10, { strong: true, color: V2.teal });
  const hero = dollars(p.totals.netMinor);
  text(hero, M, y - 50, fit(hero, 44, CW, 8), { strong: true });
  if (BigInt(p.totals.employerContributionsMinor) !== BigInt(0))
    lines(t.employer(dollars(p.totals.employerContributionsMinor)), 8.5, CW).forEach((l, i) => text(l, M, y - 66 - i * 11, 8.5, { color: V2.muted }));
  y -= 80;

  // The run in one strip: employees, gross pay - employee deductions = net pay.
  const steps: [string, string, string, boolean][] = [
    [t.employees, String(p.totals.employeeCount), "", false], [t.gross, dollars(p.totals.grossMinor), "", false],
    [t.deductions, dollars(p.totals.deductionsMinor), "–", false], [t.net, dollars(p.totals.netMinor), "=", true],
  ];
  const stepWidth = CW / 4, stripHeight = 54;
  rounded(M, y - stripHeight, CW, stripHeight, V2.sheet, 10);
  page.drawLine({ start: { x: M + stepWidth, y: y - 14 }, end: { x: M + stepWidth, y: y - 40 }, thickness: 0.6, color: V2.line });
  for (const [i, [label, value, op, last]] of steps.entries()) {
    const x = M + i * stepWidth + 18;
    if (op) text(op, M + i * stepWidth - 4, y - 34, 14, { color: V2.soft, align: "center" });
    text(lines(label, 8, stepWidth - 22, last)[0], x, y - 19, 8, { strong: last, color: last ? V2.teal : V2.muted });
    const room = stepWidth - 26, valueSize = fit(value, value.length > 12 ? 11 : 14, room, 8);
    lines(value, valueSize, room, true).slice(0, 2).forEach((l, j) => text(l, x, y - 38 - j * 9, valueSize, { strong: true, color: last ? V2.teal : V2.ink }));
  }
  y -= stripHeight + 10;
  // The same split as a thin line, drawn only when both parts are a non-negative share of positive gross pay.
  const gross = BigInt(p.totals.grossMinor), net = BigInt(p.totals.netMinor), deductions = BigInt(p.totals.deductionsMinor);
  if (gross > BigInt(0) && net >= BigInt(0) && deductions >= BigInt(0)) {
    const live = ([[net, V2.net], [deductions, V2.deduction]] as [bigint, Color][]).filter(([v]) => v > BigInt(0)), usable = CW - 2 * (live.length - 1);
    let bx = M;
    for (const [i, [v, c]] of live.entries()) {
      const w = usable * Number(v) / Number(gross);
      page.drawRectangle({ x: bx, y: y - 4, width: Math.max(w, 1.5), height: 4, color: c });
      bx += w + (i < live.length - 1 ? 2 : 0);
    }
  }
  y -= 26;

  // Pay by employee: the name wraps in its column, with the employee ID underneath.
  const nameWidth = CW * 0.5, amountWidth = CW * 0.25, grossRight = M + nameWidth + amountWidth, netRight = PAGE_WIDTH - M;
  const helpLines = lines(t.byHelp, 7.5, CW);
  const head = (continued: boolean) => {
    text(`${t.byEmployee}${continued ? ` (${t.continued})` : ""}`, M, y - 11, 11.5, { strong: true }); y -= 17;
    if (!continued) for (const l of helpLines) { text(l, M, y - 8, 7.5, { color: V2.muted }); y -= 10; }
    y -= 8;
    text(t.employee, M, y - 10, 7, { color: V2.soft });
    text(t.gross, grossRight, y - 10, 7, { color: V2.soft, align: "right" });
    text(t.net, netRight, y - 10, 7, { color: V2.soft, align: "right" });
    y -= 14; rule(y);
  };
  const rows = p.employees.map(e => ({ e, name: lines(e.name, 9, nameWidth - 8), id: lines(`${t.id} ${e.reference}`, 7.5, nameWidth - 8) }));
  const rowHeight = (r: typeof rows[number]) => 28 + (r.name.length - 1) * 12 + (r.id.length - 1) * 10;
  const totalHeight = 34;
  await ensure(17 + helpLines.length * 10 + 22 + (rows.length ? rowHeight(rows[0]) : 0) + (rows.length <= 1 ? totalHeight : 0));
  head(false);
  for (const [i, r] of rows.entries()) {
    if (i % 16 === 0 && i > 0) await options.progress?.();
    const h = rowHeight(r), last = i === rows.length - 1;
    if (y - h - (last ? totalHeight : 0) < BOTTOM) { await addPage(); head(true); }
    r.name.forEach((l, k) => text(l, M, y - 14 - k * 12, 9));
    r.id.forEach((l, k) => text(l, M, y - 24 - (r.name.length - 1) * 12 - k * 10, 7.5, { color: V2.muted }));
    const g = dollars(r.e.grossMinor), n = dollars(r.e.netMinor);
    text(g, grossRight, y - 14, fit(g, 9, amountWidth - 6, 7, false), { align: "right" });
    text(n, netRight, y - 14, fit(n, 9, amountWidth - 6, 7, false), { align: "right" });
    y -= h; rule(y);
  }
  const grossTotal = dollars(p.totals.grossMinor), netTotal = dollars(p.totals.netMinor);
  text(t.total, M, y - 15, 9.5, { strong: true });
  text(grossTotal, grossRight, y - 15, fit(grossTotal, 9.5, amountWidth - 6, 7), { strong: true, align: "right" });
  text(netTotal, netRight, y - 15, fit(netTotal, 9.5, amountWidth - 6, 7), { strong: true, align: "right" });
  y -= totalHeight;

  // What the company pays on top of wages.
  const contribHelp = lines(t.contribHelp, 7.5, CW), contribution = dollars(p.totals.employerContributionsMinor);
  await ensure(17 + contribHelp.length * 10 + 8 + 20 + 24);
  text(t.contribTitle, M, y - 11, 11.5, { strong: true }); y -= 17;
  for (const l of contribHelp) { text(l, M, y - 8, 7.5, { color: V2.muted }); y -= 10; }
  y -= 8; rule(y);
  text(t.contrib, M, y - 14, 9);
  text(contribution, netRight, y - 14, fit(contribution, 9.5, CW * 0.4, 7), { strong: true, align: "right" });
  y -= 20; rule(y); y -= 24;

  // References in two columns; long values wrap inside their column.
  const references = [`${t.run}: ${p.runReference}, ${t.revision} ${p.runRevision}`, t.recorded,
    ...(p.correction.kind === "REPLACEMENT" ? [`${t.root}: ${p.correction.originalRunReference}`, `${t.replaces}: ${p.correction.replacesRunReference}`] : [])].map(r => lines(r, 7.5, CW / 2 - 12));
  const pairs: string[][][] = [];
  for (let i = 0; i < references.length; i += 2) pairs.push(references.slice(i, i + 2));
  const pairHeight = (pair: string[][]) => Math.max(...pair.map(r => r.length)) * 10 + 2;
  await ensure(18 + pairHeight(pairs[0]));
  text(t.references, M, y - 9, 8.5, { strong: true, color: V2.muted }); y -= 18;
  for (const pair of pairs) {
    if (y - pairHeight(pair) < BOTTOM) await addPage();
    pair.forEach((ref, col) => ref.forEach((l, j) => text(l, M + col * (CW / 2), y - 8 - j * 10, 7.5, { color: V2.muted })));
    y -= pairHeight(pair);
  }

  // Footer on every page.
  const stamp = approvalStamp(p.approvedAt, dates, en);
  const stampFull = `${t.approved} ${stamp} · ${t.run} ${p.runReference} · ${t.template}`, stampShort = `${t.approved} ${stamp} · ${t.template}`;
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
  await options.progress?.();
  const bytes = Buffer.from(await pdf.save({ useObjectStreams: false, addDefaultPage: false }));
  return { bytes, sha256: createHash("sha256").update(bytes).digest("hex"), pageCount: pages.length, templateVersion: NATIVE_COMPANY_SUMMARY_TEMPLATE_V2 };
}
