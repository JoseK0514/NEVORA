"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { QuietRow } from "@/components/quiet/quiet";
import { useLeaveStaffing } from "@/components/leave-staffing/use-leave-staffing";
import { conflictsFor } from "@/components/leave-staffing/conflict-check";
import { MAX_STAFFING_WEEKS, weeksFor } from "@/lib/time-off-staffing/client";
import { conflictShift } from "@/lib/time-off-staffing/present";
import "@/components/leave-staffing/leave-staffing.css";

/** One waiting request as the server page lays it out. */
export type WaitingTimeOff = { id: string; employeeName: string; avatar: string; startDate: string; endDate: string; when: string; ago?: string; href: string };

/** Closing F1 (NV-077): Time off's waiting rows say what Things to do says. One staffing read covers the weeks of every
 * waiting request; each row shows the amber "On the schedule" line when approving would leave a published shift uncovered,
 * then the compact Decline and Approve (the same review action as the request's page; Decline asks once). Approve shows only
 * once the check came back with no overlap; otherwise the teal pill is Review, which opens the request with its shifts. */
export function TimeOffWaitingList({ requests }: { requests: WaitingTimeOff[] }) {
  const leaves = useMemo(() => requests.map(request => ({ id: request.id, weeks: weeksFor(request.startDate, request.endDate) })), [requests]);
  const weeks = useMemo(() => [...new Set(leaves.flatMap(leave => leave.weeks ?? []))].sort().slice(0, MAX_STAFFING_WEEKS), [leaves]);
  const { state: staffing } = useLeaveStaffing(weeks.length ? { weeks } : null);
  const checked = useMemo(() => new Set(leaves.filter(leave => leave.weeks?.every(week => weeks.includes(week))).map(leave => leave.id)), [leaves, weeks]);
  return <ul className="q-list q-requests" aria-label="Waiting time off">{requests.map(request => {
    const conflicts = checked.has(request.id) ? conflictsFor(staffing, request.id) : null;
    const clear = conflicts !== null && conflicts.length === 0;
    const note = conflicts?.length ? <span className="b-leave-note" data-tone="amber"><WarningIcon weight="bold" aria-hidden="true" />{`On the schedule: ${conflictShift(conflicts[0])}${conflicts.length > 1 ? ` +${conflicts.length - 1}` : ""}`}</span>
      : conflicts ? null : <span className="b-leave-note">{!checked.has(request.id) ? "Check the schedule on its page" : staffing.status === "loading" ? "Checking the schedule…" : staffing.status === "expired" ? "Schedule check expired" : staffing.status === "paused" ? "Schedule check paused" : "Couldn’t check the schedule"}</span>;
    return <li key={request.id} id={`request-${request.id}`} tabIndex={-1} className="q-request">
      <QuietRow bare avatar={request.avatar} title={request.employeeName} detail={request.when} value={request.ago} href={request.href} />
      {note ? <p className="q-acts-note">{note}</p> : null}
      <form action={reviewTimeOffAction} className="q-acts-form">
        <input type="hidden" name="requestId" value={request.id} />
        <WaitingDecide name={request.employeeName} approve={clear} reviewHref={request.href} />
      </form>
    </li>;
  })}</ul>;
}

/** Decline and Approve (or Review) under one request; while the decision is out both are disabled and the pressed one says so. */
function WaitingDecide({ name, approve, reviewHref }: { name: string; approve: boolean; reviewHref: string }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  // Review B1 (NV-125): Decline asks once, so a mis-tap can't decline it; Approve stays one tap.
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const pair = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirming !== null) pair.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [confirming]);
  if (confirming && !pending) return <div ref={pair} className="q-acts" role="group" aria-label={`Decline time off for ${name}?`}>
    <button type="button" className="q-bs" onClick={() => setConfirming(false)} aria-label={`Keep time off request for ${name}`}>Keep</button>
    <button type="submit" className="q-bs q-bs--stop" name="decision" value="DENIED" aria-label={`Decline time off for ${name}`}>Decline</button>
  </div>;
  return <div ref={pair} className="q-acts" aria-busy={pending}>
    <button type="button" className="q-bs" onClick={() => setConfirming(true)} disabled={pending} aria-label={pending ? undefined : `Decline time off for ${name}`}>{pending && decision === "DENIED" ? "Declining…" : "Decline"}</button>
    {approve ? <button type="submit" className="q-bs q-bs--go" name="decision" value="APPROVED" disabled={pending} aria-label={pending ? undefined : `Approve time off for ${name}`}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</button>
      : <Link className="q-bs q-bs--go" href={reviewHref} aria-label={`Review time off for ${name}`}>Review</Link>}
    <span className="q-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </div>;
}
