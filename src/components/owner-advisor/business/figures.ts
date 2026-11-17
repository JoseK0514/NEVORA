/* The money lines of a business total, shared by the review screen and the evidence card. Every amount is the server's
 * exact minor-unit string through formatBusinessMinor; a figure the server did not give is left out, never shown as zero. */
import type { FinanceCurrencyMetrics, SalesCurrencyMetrics } from "@/lib/owner-advisor/business/contracts";
import { formatBusinessMinor } from "@/lib/owner-advisor/business/metrics";
import type { BusinessCopy } from "./copy";

export type Figure = { key: string; label: string; note?: string; value: string };
/** `compact`: the answer card's short list. The review screen shows every line. */
export function financeFigures(t: BusinessCopy, c: FinanceCurrencyMetrics, compact = false): Figure[] {
  const money = (value: string) => formatBusinessMinor(value, c.currency), f = t.figure, lines: Figure[] = [];
  if (!compact && c.openingMinor !== null) lines.push({ key: "opening", label: f.opening, value: money(c.openingMinor) });
  lines.push({ key: "moneyIn", label: f.moneyIn, value: money(c.postedInflowMinor) }, { key: "moneyOut", label: f.moneyOut, value: money(c.postedOutflowMinor) });
  if (c.reportedClosingMinor !== null) lines.push({ key: "closingReported", label: f.closingReported, value: money(c.reportedClosingMinor) });
  if (!compact && c.calculatedClosingMinor !== null) lines.push({ key: "closingCalculated", label: f.closingCalculated, value: money(c.calculatedClosingMinor) });
  if (c.differenceMinor !== null && c.differenceMinor !== "0") lines.push({ key: "difference", label: f.difference, value: money(c.differenceMinor) });
  lines.push({ key: "bills", label: f.bills, note: t.figureNote.bills, value: money(c.obligationsMinor) }, { key: "owed", label: f.owed, note: t.figureNote.owed, value: money(c.receivablesMinor) });
  if (c.scenarioConditional && c.scenarioMinor !== null) lines.push({ key: "scenario", label: f.scenario, note: t.figureNote.scenario, value: money(c.scenarioMinor) });
  return lines;
}
export function salesFigures(t: BusinessCopy, c: SalesCurrencyMetrics, compact = false): Figure[] {
  const money = (value: string) => formatBusinessMinor(value, c.currency), f = t.figure, lines: Figure[] = [];
  if (!compact) lines.push({ key: "gross", label: f.gross, value: money(c.merchandiseMinor) }, { key: "discounts", label: f.discounts, value: money(c.discountsMinor) });
  lines.push({ key: "netSales", label: f.netSales, value: money(c.netMerchandiseMinor) }, { key: "collected", label: f.collected, value: money(c.sales.collectionsMinor) },
    { key: "refunds", label: f.refunds, value: money(c.refunds.collectionsMinor) }, { key: "fees", label: f.fees, value: money(c.feesMinor) },
    { key: "netReceipts", label: f.netReceipts, note: t.figureNote.netReceipts, value: money(c.netReceiptsMinor) }, { key: "tax", label: f.tax, note: t.figureNote.tax, value: money(c.taxMinor) });
  if (!compact || c.cancellations > 0) lines.push({ key: "cancelled", label: f.cancelled, value: String(c.cancellations) });
  return lines;
}
