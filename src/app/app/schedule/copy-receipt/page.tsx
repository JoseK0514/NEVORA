import type { ReactNode } from "react";
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import { ScheduleCopyForm } from "@/components/schedule-copy-form";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  readScheduleCopyReceipt,
  readScheduleCopyCommand,
} from "@/lib/data/schedule-copy";
import { QuietHeader, QuietNav, QuietPage, QuietRow, weekLabel as compactWeek } from "@/components/quiet/quiet";
import { SheetRowButton } from "@/components/quiet/u2-sheets";
import { addDays, formatDayLabel, formatTimeRange } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";

/* Why a shift wasn't copied. The server gives codes only; the row's person, day and time are a Codex read (CODEX.md). */
const SKIP_REASONS: Record<string, string> = {
  TEMPLATE_UNAVAILABLE: "The template isn’t available anymore",
  SOURCE_CHANGED: "The week it came from changed",
  EMPLOYEE_UNAVAILABLE: "The person can’t work then",
  ASSIGNMENT_UNAVAILABLE: "The assignment can’t be made",
  INVALID_LOCAL_TIME: "The time doesn’t exist that day (clock change)",
};
/** Codex C3: new receipts describe each row (person, day, time, location); older receipts have ids only. */
type Described = { employeeName?: string | null; date?: string; startTime?: string; endTime?: string; locationName?: string | null };
type DescribedRow = Described & { date: string; startTime: string; endTime: string; reason: string | null };
const described = (row: object): row is DescribedRow => {
  const r = row as Described;
  return typeof r.date === "string" && typeof r.startTime === "string" && typeof r.endTime === "string";
};
const rowWhen = (row: DescribedRow) => {
  const day = formatDayLabel(row.date);
  return keepWhole([`${day.weekday}, ${day.day}`, formatTimeRange(row.startTime, row.endTime), row.locationName].filter(Boolean).join(" · "));
};
const reasonText = (code: string | null) => (code ? SKIP_REASONS[code] ?? "It didn’t pass the schedule checks" : "Not copied");

/** T-6 (Team U2, Oct 25, 2026): the copy result on Quiet. The Schedule shows the result as a toast; this page stays for
 * links and for the reasons some shifts weren't copied. */
function Frame({ title, sub, back = "/app/schedule", children }: { title: string; sub: string; back?: string; children: ReactNode }) {
  return <QuietPage className="u2-receipt">
    <QuietNav back={{ href: back, label: "Schedule" }} />
    <QuietHeader title={title} sub={sub} />
    {children}
  </QuietPage>;
}

export const metadata = { title: "Week copied" };

export default async function CopyReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  // IS-WA-9: like every other schedule management page, the receipt is for Owners and Managers.
  await requireRoles(MANAGER_ROLES);
  const { operation } = await searchParams;
  // UX-O-24: a link without a copy goes to the Schedule.
  if (!operation || !/^[0-9a-f-]{36}$/i.test(operation)) redirect("/app/schedule");
  const proof = await requireSessionMutationProof();
  const source=await withOperationalCompany(proof,async()=>{
  const receipt = await readScheduleCopyReceipt(proof, operation);
  const command =
    receipt?.command ?? (await readScheduleCopyCommand(proof, operation));
  return {receipt,command};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Copy result unavailable" reason={source.reason}/>;
  const {receipt,command}=source.data;
  if (!receipt) {
    const back = command ? `/app/schedule?week=${command.weekStart}` : "/app/schedule";
    return <ScopedReadFrame observation={source}><Frame title="Copy not confirmed" back={back} sub={command ? `We couldn’t confirm the copy into ${keepWhole(compactWeek(command.weekStart))}.` : "We couldn’t confirm whether shifts were copied."}>
      <p className="q-note" data-tone="urgent"><span className="q-note__title">Check the schedule first</span>Do not start a new copy while this one is unconfirmed. Some shifts may already be on the schedule.</p>
      <p className="q-help">{command ? "If the shifts aren’t there, retry this same copy; it won’t copy anything twice." : "Open the schedule to check whether the shifts were copied."}</p>
      <Link className="q-btn" href={back}>Back to schedule</Link>
      {command ? <div className="u2-copy u2-copy--page"><ScheduleCopyForm actorId={proof.employee.id} command={command} label="Retry this copy" className="q-btn q-btn--sec" /></div> : null}
      <p className="q-help">{`Reference ${operation}`}</p>
    </Frame></ScopedReadFrame>;
  }
  const copied = receipt.rows.filter((r) => r.status === "COMMITTED");
  const skipped = receipt.rows.filter((r) => r.status === "SKIPPED");
  const describedSkipped = skipped.every(described) ? (skipped as unknown as DescribedRow[]) : null;
  const why = new Map<string, number>();
  for (const row of skipped) why.set(reasonText(row.reason), (why.get(reasonText(row.reason)) ?? 0) + 1);
  const warnings = receipt.rows.flatMap((row) => row.warnings);
  const back = `/app/schedule?week=${receipt.command.weekStart}`;
  const from = receipt.command.kind === "PREVIOUS_WEEK" ? ` · from ${compactWeek(addDays(receipt.command.weekStart, -7))}` : "";
  return <ScopedReadFrame observation={source}><Frame title={receipt.reason || !copied.length ? "Nothing copied" : "Week copied"} back={back}
    sub={`${compactWeek(receipt.command.weekStart)}${from}`}>
    {receipt.reason ? <p className="q-note" data-tone="urgent"><span className="q-note__title">No shifts were copied</span>
      {receipt.reason === "TEMPLATE_UNAVAILABLE" ? "The template isn’t available anymore." : "The week it came from changed while copying."} Go back to the schedule and start a new copy.
    </p> : null}
    <ul className="q-list u2-receipt__list" id="copy-result" aria-label="Result">
      <QuietRow title="Shifts added" value={String(copied.length)} />
      {skipped.length ? <SheetRowButton title="Skipped" value={String(skipped.length)} sheetTitle="Not copied">
        <ul className="q-list" id="copy-skipped">
          {describedSkipped ? describedSkipped.map((row, index) => <QuietRow key={index} title={row.employeeName ?? "Open shift"} detail={`${rowWhen(row)} · ${reasonText(row.reason)}`} />)
            : [...why].map(([text, count]) => <QuietRow key={text} title={text} value={String(count)} />)}
        </ul>
      </SheetRowButton> : <QuietRow title="Skipped" value="0" />}
      <QuietRow title="Status" value="Draft" />
    </ul>
    {warnings.length ? <><div className="q-grp"><h2>Worth a look</h2></div><ul className="q-list" id="copy-warnings">
      {warnings.map((warning, index) => <QuietRow key={`${warning.code}-${index}`} title={warning.message} />)}
    </ul></> : null}
    <Link className="q-btn" href={back}>Open schedule</Link>
    <p className="q-help">{`Reference ${receipt.operationId}`}</p>
  </Frame></ScopedReadFrame>;
}
