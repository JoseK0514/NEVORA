import type { ReactNode } from "react";
import { ScheduleCopyForm } from "@/components/schedule-copy-form";
import Link from "next/link";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  readScheduleCopyReceipt,
  readScheduleCopyCommand,
} from "@/lib/data/schedule-copy";
import { Card, MetaParts, PageBand, StatGrid } from "@/components/kit/kit";
import { Notice } from "@/components/wave-a/parts";
import { formatDayLabel, formatTime, formatWeekRange } from "@/lib/date-utils";
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
  return keepWhole([`${day.weekday},\u00a0${day.day}`, `${formatTime(row.startTime)} – ${formatTime(row.endTime)}`, row.locationName].filter(Boolean).join(" · "));
};
const reasonText = (code: string | null) => (code ? SKIP_REASONS[code] ?? "It didn’t pass the schedule checks" : "Not copied");

function Frame({ title, summary, back = "/app/schedule", children }: { title: string; summary: string; back?: string; children: ReactNode }) {
  return <div className="nv-page wa-page wa-copy" data-nv-page="">
    <PageBand back={{ href: back, label: "Schedule" }} eyebrow="Copy week" title={title} summary={summary} />
    <div className="nv-content wa-narrow">{children}</div>
  </div>;
}

/** Phase 3.5 Wave A: the Copy-week receipt on the kit. What was copied, what wasn't and why, and the reference. */
export default async function CopyReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ operation?: string }>;
}) {
  // IS-WA-9: like every other schedule management page, the receipt is for Owners and Managers.
  await requireRoles(MANAGER_ROLES);
  const { operation } = await searchParams;
  if (!operation || !/^[0-9a-f-]{36}$/i.test(operation))
    return <Frame title="Copy not found" summary="This link doesn’t point to a schedule copy.">
      <Card title="Nothing to show">
        <div className="wa-card-body">
          <p className="wa-text">Open the schedule to see the current week.</p>
          <Link className="nv-btn" data-kind="secondary" data-block="true" href="/app/schedule">Back to schedule</Link>
        </div>
      </Card>
    </Frame>;
  const proof = await requireSessionMutationProof();
  const receipt = await readScheduleCopyReceipt(proof, operation);
  const command =
    receipt?.command ?? (await readScheduleCopyCommand(proof, operation));
  if (!receipt) {
    const back = command ? `/app/schedule?week=${command.weekStart}` : "/app/schedule";
    return <Frame title="Copy not confirmed" back={back} summary={command ? `We couldn’t confirm the copy into ${keepWhole(formatWeekRange(command.weekStart))}.` : "We couldn’t confirm whether shifts were copied."}>
      <Notice tone="review" title="Check the schedule first">Do not start a new copy while this one is unconfirmed. Some shifts may already be on the schedule.</Notice>
      <Card title="What you can do">
        <div className="wa-card-body">
          <p className="wa-text">Look at the schedule. If the shifts aren’t there, retry this same copy; it won’t copy anything twice.</p>
          <Link className="nv-btn" data-kind="primary" data-block="true" href={back}>Back to schedule</Link>
          {command ? <div className="wa-retry"><ScheduleCopyForm actorId={proof.employee.id} command={command} label="Retry this copy" className="nv-btn wa-retry__button" /></div> : null}
        </div>
        <details className="wa-disclosure" data-tone="neutral">
          <summary className="wa-disclosure__summary">Reference</summary>
          <p className="wa-card-note"><code className="wa-code">{operation}</code></p>
        </details>
      </Card>
    </Frame>;
  }
  const copied = receipt.rows.filter((r) => r.status === "COMMITTED");
  const skipped = receipt.rows.filter((r) => r.status === "SKIPPED");
  const describedSkipped = skipped.every(described) ? (skipped as unknown as DescribedRow[]) : null;
  const why = new Map<string, number>();
  for (const row of skipped) why.set(reasonText(row.reason), (why.get(reasonText(row.reason)) ?? 0) + 1);
  const warnings = receipt.rows.flatMap((row) => row.warnings);
  const back = `/app/schedule?week=${receipt.command.weekStart}`;
  return <Frame title={receipt.reason || !copied.length ? "Nothing copied" : "Week copied"} back={back}
    summary={`${copied.length} ${copied.length === 1 ? "shift" : "shifts"} copied into ${keepWhole(formatWeekRange(receipt.command.weekStart))}.`}>
    {receipt.reason ? <Notice tone="review" title="No shifts were copied">
      {receipt.reason === "TEMPLATE_UNAVAILABLE" ? "The template isn’t available anymore." : "The week it came from changed while copying."} Go back to the schedule and start a new copy.
    </Notice> : null}
    <Card title="Result" id="copy-result">
      <StatGrid stats={[{ label: "Copied", value: copied.length }, { label: "Not copied", value: skipped.length }]} />
    </Card>
    {describedSkipped?.length ? <Card title="Not copied" id="copy-skipped" meta={`${skipped.length}\u00a0${skipped.length === 1 ? "shift" : "shifts"}`}>
      <ul className="nv-rows">
        {describedSkipped.map((row, index) => <li key={index}><div className="nv-row"><span className="nv-row__text">
          <span className="nv-row__title">{row.employeeName ?? "Open shift"}</span>
          <span className="nv-row__meta"><MetaParts text={rowWhen(row)} /></span>
          <span className="nv-row__meta">{reasonText(row.reason)}</span>
        </span></div></li>)}
      </ul>
    </Card> : why.size ? <Card title="Why some weren’t copied" id="copy-skipped">
      <ul className="nv-rows">
        {[...why].map(([text, count]) => <li key={text}><div className="nv-row"><span className="nv-row__text"><span className="nv-row__title">{text}</span></span><span className="nv-row__trail">{count}</span></div></li>)}
      </ul>
    </Card> : null}
    {warnings.length ? <Card title="Worth a look" id="copy-warnings">
      <ul className="nv-rows">
        {warnings.map((warning, index) => <li key={`${warning.code}-${index}`}><div className="nv-row"><span className="nv-row__text"><span className="nv-row__meta wa-ink">{warning.message}</span></span></div></li>)}
      </ul>
    </Card> : null}
    <Card title="Reference" id="copy-reference">
      <details className="wa-disclosure" data-tone="neutral">
        <summary className="wa-disclosure__summary">Copy details</summary>
        <p className="wa-card-note">Request <code className="wa-code">{receipt.operationId}</code></p>
        <ul className="nv-rows">
          {receipt.rows.map((row, i) => <li key={i}><div className="nv-row"><span className="nv-row__text">
            {described(row) ? <span className="nv-row__meta wa-ink">{row.employeeName ?? "Open shift"} · <MetaParts text={rowWhen(row)} /></span> : null}
            <span className="nv-row__meta"><code className="wa-code">{row.sourceId}</code></span>
            <span className="nv-row__meta">{row.status === "COMMITTED" ? "Copied" : `Not copied · ${reasonText(row.reason)}`}</span>
          </span></div></li>)}
        </ul>
      </details>
    </Card>
    <Link className="nv-btn" data-kind="primary" data-block="true" href={back}>Back to schedule</Link>
  </Frame>;
}
