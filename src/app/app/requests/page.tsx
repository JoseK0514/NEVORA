import { keepWhole } from "@/lib/keep-whole";
import { TimeOffWithdrawal } from "@/components/time-off-withdrawal";
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { ManagerTimeOff } from "@/components/manager-time-off";
import { isTimeOffReviewerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { formatTime } from "@/lib/date-utils";
import "./time-off.css";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SunHorizonIcon } from "@phosphor-icons/react/dist/ssr/SunHorizon";
import { SigBand, SigDay, SigHead, SigPage } from "@/components/signature/signature";
import { TimeOffSignatureForm } from "./time-off-signature";
import ts from "./time-off-signature.module.css";
import { Status } from "@/components/kit/kit";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

const longDay = (date: string, part: "weekday" | "month") => new Intl.DateTimeFormat("en-US", { [part]: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const monthShort = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const shortDay = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const countWords = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
const countWord = (n: number) => n < countWords.length ? countWords[n] : String(n);

function statusLabel(status: string) {
  return status[0] + status.slice(1).toLowerCase();
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    reviewed?: string;
    tab?: string;
    requestId?: string;
    from?: string;
    filter?: string;
  }>;
}) {
  const moduleOff = await moduleGate("timeOff");
  if (moduleOff) return moduleOff;

  const session = await requireSession();
  const manager = isTimeOffReviewerRole(session.role);
  const params = await searchParams;

  if (manager) return ManagerTimeOff(params);

  const mine = await listEmployeeTimeOffRequests(session.id);
  const activeTab = params.tab === "my" ? "my" : "new";

  const zone = await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
  const sentOn = (at: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(at)); } catch { return ""; } };
  const waiting = mine.filter(request => request.status === "PENDING").length;

  // Phase 3 (Signature, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-3/p3c-board-a.png):
  // New request is the ticket form; My requests holds the waiting card (timeline, note, withdraw) and the decided rows.
  // The band's pill moves between the two views; the shell's Requests tabs sit above it.
  const notice = params.error ? <p className={`sg-alert ${ts.toNotice}`} data-tone="error" role="alert">Your request wasn’t sent. Check that the end date is on or after the start date. A partial day needs one date and an end time after the start time.</p>
    : params.submitted ? <p className={`sg-alert ${ts.toNotice}`} data-tone="ok" role="status">Your request was submitted for manager review. Track the decision below.</p>
    : params.reviewed ? <p className={`sg-alert ${ts.toNotice}`} data-tone="ok" role="status">The request was reviewed.</p> : null;

  if (activeTab === "new") return <TimeOffSignatureForm requestId={randomUUID()} draftOwner={session.id} notice={notice} today={businessDate(new Date(), zone)}
    viewLink={<Link className="sg-band-link" href="/app/requests?tab=my">My requests{mine.length ? <em>{mine.length}</em> : null}<CaretRightIcon size={14} aria-hidden="true" /></Link>} />;

  const range = (request: (typeof mine)[number]) => request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`;
  const span = (request: (typeof mine)[number]) => Math.round((Date.parse(request.endDate) - Date.parse(request.startDate)) / 86400000) + 1;
  const tone = (status: string) => status === "APPROVED" ? "done" as const : status === "PENDING" ? "review" as const : "neutral" as const;
  const word = (status: string) => status === "DENIED" ? "Declined" : status === "CANCELLED" ? "Withdrawn" : status === "PENDING" ? "Waiting" : statusLabel(status);
  const decision = (request: (typeof mine)[number]) => keepWhole(`${request.status === "APPROVED" ? "Approved" : request.status === "DENIED" ? "Declined" : "Withdrawn"}${request.reviewerName && request.status !== "CANCELLED" ? ` by ${request.reviewerName}` : ""}${request.reviewedAt ? ` · ${sentOn(request.reviewedAt)}` : ""}`);
  const kind = (request: (typeof mine)[number]) => request.startTime && request.endTime ? "Partial day" : "Full day";
  const detail = (request: (typeof mine)[number]) => request.startTime && request.endTime ? keepWhole(`${formatTime(request.startTime)} – ${formatTime(request.endTime)}`)
    : span(request) > 1 ? keepWhole(`${span(request)} days · through ${shortDay(request.endDate)}`) : "1 day";
  const pending = mine.filter(request => request.status === "PENDING"), decided = mine.filter(request => request.status !== "PENDING");

  return (
    <SigPage className={ts.toRoot} band={<SigBand eyebrow="Time off">
      <h1 className="nv-sr">Time off</h1>
      <p className="sg-head2">{pending.length ? <><em>{countWord(pending.length)}</em> {pending.length === 1 ? "request" : "requests"}<br />waiting</> : mine.length ? <>Nothing<br />waiting</> : <>Plan your<br />time away</>}</p>
      <p className="sg-sub"><span>{decided.length ? `${decided.length} decided` : mine.length ? "Your manager is reviewing" : "Send a request when you need time off."}</span></p>
      <Link className="sg-band-link" href="/app/requests?tab=new"><PlusIcon size={14} aria-hidden="true" />New request</Link>
    </SigBand>}>
      {notice}
      {mine.length ? <>
        {pending.length ? <><SigHead id="to-waiting" title="Waiting" count={pending.length} />
          <ul className={ts.toList} aria-labelledby="to-waiting">{pending.map(request => (
            <li className={`sg-card ${ts.toWait}`} id={`request-${request.id}`} tabIndex={-1} data-employee-status={request.status} key={request.id}>
              <div className="sg-card-head"><span className="sg-tile" aria-hidden="true"><SunHorizonIcon size={22} /></span>
                <span className={ts.toHeadCopy}><b>{kind(request)}</b><small>{detail(request)}</small></span>
                <Status tone={tone(request.status)}>{word(request.status)}</Status></div>
              <div className="sg-ticket">
                <div><small>From</small><b>{Number(request.startDate.slice(8))}</b><span>{longDay(request.startDate, "weekday")}</span><span>{longDay(request.startDate, "month")}</span></div>
                <i aria-hidden="true"><ArrowRightIcon size={18} /></i>
                <div><small>Until</small><b>{Number(request.endDate.slice(8))}</b><span>{longDay(request.endDate, "weekday")}</span><span>{longDay(request.endDate, "month")}</span></div>
              </div>
              <div className="sg-card-body">
                <span className="nv-sr">{range(request)}</span>
                {/* Request timeline: when it was sent, then who decided it and when (Jose, 2026-10-19). */}
                <ol className={ts.toRail} aria-label="Request timeline"><span className={ts.toTrack} aria-hidden="true" />
                  <li data-done="true">{request.createdAt ? keepWhole(`Sent ${sentOn(request.createdAt)}`) : "Sent"}</li>
                  <li>Waiting for approval</li>
                </ol>
                {request.reason ? <p className={ts.toQuote}><span className="nv-sr">Note: </span>{request.reason}</p> : null}
              </div>
              {request.employeeId === session.id ? <details className={ts.toWithdraw}><summary><span>Changed your plans?</span><b>Withdraw</b></summary>
                <TimeOffWithdrawal requestId={request.id} dateLabel={range(request)} /></details> : null}
            </li>))}</ul></> : null}
        {decided.length ? <><SigHead id="to-decided" title="Decided" count={decided.length} />
          <ul className="sg-card" aria-labelledby="to-decided">{decided.map(request => (
            <li className={`sg-r ${ts.toRow}`} id={`request-${request.id}`} tabIndex={-1} data-employee-status={request.status} key={request.id}>
              <SigDay top={monthShort(request.startDate)} day={Number(request.startDate.slice(8))} />
              <span className="sg-copy"><span className="sg-t1"><b><span className="nv-sr">{range(request)} · </span>{kind(request)}</b><Status tone={tone(request.status)}>{word(request.status)}</Status></span>
                <span>{detail(request)}{request.reason ? <span className="nv-sr"> · Note: {request.reason}</span> : null}</span>
                <span>{request.createdAt ? <>{keepWhole(`Sent ${sentOn(request.createdAt)}`)} · </> : null}{decision(request)}</span></span>
            </li>))}</ul></> : null}
      </> : <div className="sg-card"><div className={ts.toEmpty}>
        <span className="sg-tile" aria-hidden="true"><SunHorizonIcon size={22} /></span>
        <strong>No time-off requests yet</strong>
        <span>Choose your dates and send a request to your manager.</span>
        <Link className="sg-cta" href="/app/requests?tab=new">Request time off</Link>
      </div></div>}
    </SigPage>
  );
}
