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
import { TimeOffSheet } from "./time-off-signature";
import { getWorkspace } from "@/lib/data/workspaces";
import { QuietHeader, QuietNav, QuietPage, QuietRow, QuietSegments } from "@/components/quiet/quiet";
import { SheetRow } from "@/components/quiet/quiet-sheet";
function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** "Tue, Nov 3" */
const weekdayDay = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

function statusLabel(status: string) {
  return status[0] + status.slice(1).toLowerCase();
}

export const metadata = { title: "Time off" };

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
  // v5 (mockups E07, E08): Time off is the list; ?tab=new (or a failed send) opens the request sheet over it.
  const sheetOpen = params.tab === "new" || !!params.error;
  // F6: a link to one request (a notification) opens the list that holds it, so a decided request lands on Decided.
  const linked = params.requestId ? mine.find(request => request.id === params.requestId) : undefined;
  const view = params.filter === "decided" || (linked && linked.status !== "PENDING") ? "decided" : "waiting";

  const zone = await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");
  const sentOn = (at: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: zone, month: "short", day: "numeric" }).format(new Date(at)); } catch { return ""; } };

  // B12/B20: "unavailable" is a lost connection or an unreadable setting, not a form mistake; the sheet keeps the same
  // request id, so sending again is the same request.
  const notice = params.error === "unavailable" ? <p className="q-help q-help--alert" role="alert">Your request couldn’t be confirmed. Check your connection and send it again; it won’t be sent twice.</p>
    : params.error ? <p className="q-help q-help--alert" role="alert">Your request wasn’t sent. Check that the end date is on or after the start date. A partial day needs one date and an end time after the start time.</p> : null;
  const retryRequestId = params.error === "unavailable" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.requestId ?? "") ? params.requestId! : null;
  const status = params.submitted ? "Your request was sent for manager review." : params.reviewed ? "The request was reviewed." : null;

  type Request = (typeof mine)[number];
  const range = (request: Request) => request.startDate === request.endDate ? dateLabel(request.startDate) : `${dateLabel(request.startDate)} – ${dateLabel(request.endDate)}`;
  const span = (request: Request) => Math.round((Date.parse(request.endDate) - Date.parse(request.startDate)) / 86400000) + 1;
  const word = (status: string) => status === "DENIED" ? "Declined" : status === "CANCELLED" ? "Withdrawn" : status === "PENDING" ? "Waiting" : statusLabel(status);
  const decision = (request: Request) => keepWhole(`${request.status === "APPROVED" ? "Approved" : request.status === "DENIED" ? "Declined" : "Withdrawn"}${request.reviewerName && request.status !== "CANCELLED" ? ` by ${request.reviewerName}` : ""}${request.reviewedAt ? ` · ${sentOn(request.reviewedAt)}` : ""}`);
  const length = (request: Request) => request.startTime && request.endTime ? keepWhole(`Part of a day · ${formatTime(request.startTime)} – ${formatTime(request.endTime)}`)
    : span(request) > 1 ? `${span(request)} full days` : "Full day";
  const title = (request: Request) => request.startDate === request.endDate ? weekdayDay(request.startDate) : `${weekdayDay(request.startDate)} – ${weekdayDay(request.endDate)}`;
  const pending = mine.filter(request => request.status === "PENDING"), decided = mine.filter(request => request.status !== "PENDING");
  const shown = view === "decided" ? decided : pending;

  return <QuietPage className="q-timeoff">
    <QuietNav back={{ href: "/app/requests/hub", label: "Requests" }} />
    <QuietHeader title="Time off" />
    <QuietSegments label="Time-off requests" items={[
      { href: "/app/requests", label: pending.length ? `Waiting · ${pending.length}` : "Waiting", current: view === "waiting" },
      { href: "/app/requests?filter=decided", label: "Decided", current: view === "decided" },
    ]} />
    {status ? <p className="q-help" role="status">{status}</p> : null}
    {shown.length ? <ul className="q-list" style={{ marginTop: 16 }}>{shown.map(request => (
      <SheetRow key={request.id} anchor={`request-${request.id}`} status={request.status} sheetTitle="Time off" title={keepWhole(title(request))}
        detail={view === "decided" ? keepWhole(`${length(request)} · ${word(request.status)}`) : keepWhole(`${length(request)}${request.createdAt ? ` · Sent ${sentOn(request.createdAt)}` : ""}`)}>
        <div className="q-hd" data-employee-status={request.status}><h1>{keepWhole(title(request))}</h1><p>{length(request)}</p></div>
        <ul className="q-list" style={{ marginTop: 16 }}><QuietRow one title="Status" value={word(request.status)} tone="l" /></ul>
        {/* Request timeline: when it was sent, then who decided it and when (Jose, 2026-10-19). */}
        <div className="q-grp"><h2>Timeline</h2></div>
        <ul className="q-list" aria-label="Request timeline">
          <QuietRow one title={request.createdAt ? keepWhole(`Sent ${sentOn(request.createdAt)}`) : "Sent"} />
          <QuietRow one title={request.status === "PENDING" ? "Waiting for approval" : decision(request)} />
        </ul>
        {request.reason ? <><div className="q-grp"><h2>Your note</h2></div><p className="q-body q-timeoff__note">{request.reason}</p></> : null}
        <p className="nv-sr">{range(request)}</p>
        {request.status === "PENDING" && request.employeeId === session.id ? <section className="q-withdraw" aria-labelledby={`withdraw-${request.id}`}>
          <div className="q-grp"><h2 id={`withdraw-${request.id}`}>Changed your plans?</h2></div>
          <TimeOffWithdrawal requestId={request.id} dateLabel={range(request)} />
        </section> : null}
      </SheetRow>))}</ul>
      : <p className="q-empty q-empty--lead">{view === "decided" ? "No decided requests yet." : mine.length ? "Nothing waiting." : "No time-off requests yet."}</p>}
    <Link className="q-btn" href="/app/requests?tab=new" scroll={false} data-timeoff-new="">Request time off</Link>
    <TimeOffSheet open={sheetOpen} closeHref={view === "decided" ? "/app/requests?filter=decided" : "/app/requests"} requestId={retryRequestId ?? randomUUID()} draftOwner={session.id} notice={notice} />
  </QuietPage>;
}
