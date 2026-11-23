"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { TimeOffDecisionForm } from "@/components/time-off-decision-form";
import { QuietRow } from "@/components/quiet/quiet";
import { RequestFace } from "@/components/request-face";
import { DecisionAsk } from "@/components/owner-b/decision-parts";
import { useKeptResult } from "@/components/owner-b/kept-result";
import { BSegs, BState, BWhen } from "@/components/owner-b/b-kit";
import { useLeaveStaffing } from "@/components/leave-staffing/use-leave-staffing";
import { conflictsFor } from "@/components/leave-staffing/conflict-check";
import { MAX_STAFFING_WEEKS, weeksFor } from "@/lib/time-off-staffing/client";
import { conflictShift } from "@/lib/time-off-staffing/present";
import "@/components/leave-staffing/leave-staffing.css";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { TIME_COPY } from "@/components/time-copy";

/** One waiting request as the server page lays it out. */
export type WaitingTimeOff = { id: string; employeeName: string; avatar: string; startDate: string; endDate: string; when: string; ago?: string;
  /** Sent more than a day ago. Phones show the age only then, under the dates (OW-011). */
  aged?: boolean; href: string };

/** OW-011: a row's "when" breaks only between its parts ("Mon, Nov 30 – Wed, Dec 2 ·" then "3 days"). A range never breaks
 * inside itself and no line starts with the separator dot. */
export function WholeParts({ text }: { text: string }) {
  // Premium pass FA (final verification A #10): each part stays whole and no line starts or ends with its "·" (the kit's
  // line of facts; the dot used to end the line: "Tue, Nov 24 ·" over "12:00 PM – 8:00 PM ·").
  // Final polish (Nov 20, 2026): a time range reads as on Schedule and Things to do, short on a phone ("1–4 PM") and full
  // from 768px ("1:00 PM – 4:00 PM"): BWhen. A part with no range is drawn as it came.
  return <BSegs className="b-req-nw-line" parts={text.split(" · ").map((part, index) => <BWhen key={index} text={part} />)} />;
}

/** Phase 3 (OW-013): at 768px and wider a request is the Things to do row (avatar, name and dates, age, then Decline and
 * Approve inline, 64px); only the schedule note adds a line. The layout is in owner-b-requests.css; the markup order is the same.
 * Closing F1 (NV-077): Time off's waiting rows say what Things to do says. One staffing read covers the weeks of every
 * waiting request; each row shows the amber "On the schedule" line when approving would leave a published shift uncovered,
 * then the compact Decline and Approve (the same review action as the request's page; Decline asks once). Approve shows only
 * once the check came back with no overlap; otherwise the teal pill is Review, which opens the request with its shifts. */
export function TimeOffWaitingList({ requests, result }: { requests: WaitingTimeOff[];
  /** Final polish (confirmations A #8, #9): what the last decision left, as the card's first row, so the card keeps its
   * place on the band. */
  result?: ReactNode }) {
  const leaves = useMemo(() => requests.map(request => ({ id: request.id, weeks: weeksFor(request.startDate, request.endDate) })), [requests]);
  const weeks = useMemo(() => [...new Set(leaves.flatMap(leave => leave.weeks ?? []))].sort().slice(0, MAX_STAFFING_WEEKS), [leaves]);
  const { state: staffing } = useLeaveStaffing(weeks.length ? { weeks } : null);
  const checked = useMemo(() => new Set(leaves.filter(leave => leave.weeks?.every(week => weeks.includes(week))).map(leave => leave.id)), [leaves, weeks]);
  const kept = useKeptResult(result);
  const t = TIME_COPY[usePortalLang()];
  // #25: nothing waits and nothing was just decided: the kit's empty state, in the list's card.
  if (!requests.length && !kept) return <div className="q-list q-emptycard"><BState kind="empty" title={t.allCaughtUp} line={t.newShowUpHere} /></div>;
  return <ul className="q-list q-requests" aria-label={t.waitingTimeOff} aria-busy={staffing.status === "loading" || undefined}>{kept ? <li className="q-result">{kept}</li> : null}{requests.map(request => {
    const conflicts = checked.has(request.id) ? conflictsFor(staffing, request.id) : null;
    const clear = conflicts !== null && conflicts.length === 0;
    const note = conflicts?.length ? <span className="b-leave-note" data-tone="amber"><WarningIcon weight="bold" aria-hidden="true" />{t.onSchedule(conflictShift(conflicts[0]), conflicts.length - 1)}</span>
      // Final polish (confirmations A #13): while the one schedule read is out, the rows stay quiet ("Checking the
      // schedule…" stood under every row at once); the list says it once for screen readers. A check that did not come
      // back still says so on its row.
      : conflicts || (checked.has(request.id) && staffing.status === "loading") ? null : <span className="b-leave-note">{!checked.has(request.id) ? t.checkOnPage : staffing.status === "expired" ? t.checkExpired : staffing.status === "paused" ? t.checkPaused : t.couldntCheck}</span>;
    return <li key={request.id} id={`request-${request.id}`} tabIndex={-1} className="q-request">
      {/* Phase 8 (a.md #12, #25): the person's own face tint, and no chevron on a row that carries its own buttons (OW-012). */}
      <QuietRow bare avatar={<RequestFace name={request.employeeName} initials={request.avatar} />} title={request.employeeName} href={request.href} chevron={false}
        detail={<><WholeParts text={request.when} />{request.aged && request.ago ? <span className="q-rt__line b-req-age">{request.ago}</span> : null}</>}
        value={request.ago ? <span className="b-req-ago">{request.ago}</span> : undefined} />
      {note ? <p className="q-acts-note">{note}</p> : null}
      <TimeOffDecisionForm className="q-acts-form" checkHref={request.href}>
        <input type="hidden" name="requestId" value={request.id} />
        <WaitingDecide name={request.employeeName} approve={clear} reviewHref={request.href} />
      </TimeOffDecisionForm>
    </li>;
  })}</ul>;
}

/** The words of the Decline question, shared with Things to do (inbox-b.tsx). */
/** The English words (Things to do imports them); TIME_COPY[lang].ask has both languages. */
export const ASK = TIME_COPY.en.ask;
export const firstName = (name: string) => name.split(/\s+/)[0] || name;

/** Decline and Approve (or Review) under one request; while the decision is out both are disabled and the pressed one says so.
 * Phase 2 (Nov 15, 2026): a list of requests carries no filled primary, as on Things to do. Approve (or Review) is the tinted
 * pill and Decline a quiet text button (`b-rowact`, b-foundation.css); the confirm step (Keep beside the red Decline) is as it was. */
function WaitingDecide({ name, approve, reviewHref }: { name: string; approve: boolean; reviewHref: string }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  const t = TIME_COPY[usePortalLang()];
  // Review B1 (NV-125): Decline asks once, so a mis-tap can't decline it; Approve stays one tap.
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const pair = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirming !== null) pair.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [confirming]);
  // Final polish (confirmations A #6, #7, #23): the question is asked in words, in the block Cancel time off uses: the
  // quiet way out on the left, the red-edged commit on the right. Still one question and the same two taps.
  if (confirming && !pending) return <DecisionAsk groupRef={pair} groupLabel={t.declineForAsk(name)} question={t.ask.question} consequence={t.ask.consequence(firstName(name))}
    keep={t.ask.keep} keepLabel={t.keepFor(name)} onKeep={() => setConfirming(false)} go={t.ask.decline} goLabel={t.declineFor(name)} goValue="DENIED" />;
  return <div ref={pair} className="q-acts" aria-busy={pending}>
    <button type="button" className="q-bs b-rowact b-rowact--quiet" onClick={() => setConfirming(true)} disabled={pending} aria-label={pending ? undefined : t.declineFor(name)}>{pending && decision === "DENIED" ? t.declining : t.decline}</button>
    {approve ? <button type="submit" className="q-bs q-bs--go b-rowact b-rowact--go" name="decision" value="APPROVED" disabled={pending} aria-label={pending ? undefined : t.approveFor(name)}>{pending && decision === "APPROVED" ? t.approving : t.approve}</button>
      : <Link className="q-bs q-bs--go b-rowact b-rowact--go" href={reviewHref} aria-label={t.reviewFor(name)}>{t.review}</Link>}
    <span className="q-sr" role="status">{pending ? t.saving : ""}</span>
  </div>;
}
