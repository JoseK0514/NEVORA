import { TimeOffReviewActions } from "@/components/time-off-review-actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listPendingTimeOffRequests, listTeamTimeOffRequests } from "@/lib/data/requests";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import { formatTime, weekStartFor } from "@/lib/date-utils";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { Card, FilterPills, KitLink, MetaParts, PageBand, Row, Rows, Status, Tile } from "@/components/kit/kit";
import { Fact, Facts, Notice } from "@/components/wave-a/parts";
import { ActionForm } from "@/components/wave-a/action-form";
import { TimeOffReviewDecision } from "@/components/time-off-review-decision";
import { ManagerIssueFocus } from './manager-issue-focus';
import { inboxFilter } from "@/lib/action-center/inbox";

const tabs = [
  { id: "pending", label: "Pending", status: "PENDING" },
  { id: "approved", label: "Approved", status: "APPROVED" },
  { id: "declined", label: "Declined", status: "DENIED" },
] as const;

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

function shortDate(date: string, weekday = true) {
  // Each date stays whole on one line; a range breaks only after its dash.
  return new Intl.DateTimeFormat("en-US", { ...(weekday ? { weekday: "short" as const } : {}), month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace(/ /g, "\u00a0");
}

type PendingRequest = Awaited<ReturnType<typeof listPendingTimeOffRequests>>[number];

/** F6: one request on its own page. Back names where the manager came from;
 * the decision returns there (D-5). Dates, length and the note come first (O1). */
type Origin = { from: "home" | "inbox"; filter: string };
const backTo = ({ from, filter }: Origin) => from === "home" ? { href: "/app", label: "Home" } : { href: filter === "all" ? "/app/inbox" : `/app/inbox?filter=${filter}`, label: "Inbox" };

function FocusedReview({ request, origin, error }: { request: PendingRequest; origin: Origin; error?: string }) {
  const back = backTo(origin);
  const from = origin.from;
  const range = request.endDate !== request.startDate ? `${shortDate(request.startDate)}\u00a0– ${shortDate(request.endDate)}` : shortDate(request.startDate);
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  const length = request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)}\u00a0– ${formatTime(request.endTime)}`
    : days === 1 ? "Full day" : `${days} full days`;
  const week = weekStartFor(request.startDate);
  return <div className="nv-page premium-review" data-nv-page="">
    <PageBand back={back} eyebrow="Time-off request" title={request.employeeName}
      summary={`Wants ${request.endDate !== request.startDate ? `${shortDate(request.startDate, false)}\u00a0– ${shortDate(request.endDate, false)}` : shortDate(request.startDate, false)} off.`} />
    <form action={reviewTimeOffAction} className="nv-content premium-review-form" aria-label={`Review time off for ${request.employeeName}`}>
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="returnTo" value={from} />
      <input type="hidden" name="returnFilter" value={origin.filter} />
      {error ? <p className="form-error premium-review-error" role="alert">The request could not be reviewed. It may have changed; review it again.</p> : null}
      <Card id={`request-${request.id}`} title="Request" meta={<Status tone="review">Waiting</Status>}>
        <Rows label="Request details">
          <Row title="Dates" trailing={<span className="premium-fact">{range}</span>} />
          <Row title="Length" trailing={<span className="premium-fact">{length}</span>} />
        </Rows>
      </Card>
      <Card id="request-note" title="Note">
        <p className="premium-review-note">{request.reason ? request.reason : "No note was added."}</p>
      </Card>
      <p className="premium-review-more"><KitLink href="/app/requests?tab=pending">All pending time-off requests</KitLink></p>
      <Card id="request-context" title="Before you decide">
        <Rows label="Before you decide">
          <Row href={`/app/schedule?week=${encodeURIComponent(week)}`} title="See that week’s schedule" meta="Who else is working those days"
            leading={<Tile><CalendarBlankIcon size={20} weight="bold" /></Tile>} />
        </Rows>
      </Card>
      {/* Sticky inside the form, so the decision stays on screen while the facts scroll. */}
      <TimeOffReviewDecision />
    </form>
  </div>;
}

/** IS-10: a link to a request that is no longer waiting says so, instead of opening the list. */
function DecidedReview({ origin }: { origin: Origin }) {
  return <div className="nv-page premium-review" data-nv-page="">
    <PageBand back={backTo(origin)} eyebrow="Time-off request" title="Already decided" summary="This request isn’t waiting for review anymore." />
    <div className="nv-content">
      <Card title="Where to find it">
        <p className="premium-review-note">Approved and declined requests stay in Time off for the record.</p>
        <p className="premium-review-more"><KitLink href="/app/requests?tab=approved">See approved time off</KitLink> · <KitLink href="/app/requests?tab=declined">See declined</KitLink></p>
      </Card>
    </div>
  </div>;
}

function lengthLabel(request: { startDate: string; endDate: string; startTime?: string | null; endTime?: string | null }) {
  const days = Math.round((Date.parse(`${request.endDate}T12:00:00Z`) - Date.parse(`${request.startDate}T12:00:00Z`)) / 86_400_000) + 1;
  return request.startTime && request.endTime ? `Partial day · ${formatTime(request.startTime)}\u00a0– ${formatTime(request.endTime)}` : days === 1 ? "Full day" : `${days} full days`;
}
const rangeLabel = (request: { startDate: string; endDate: string }) =>
  request.endDate !== request.startDate ? `${shortDate(request.startDate)}\u00a0– ${shortDate(request.endDate)}` : shortDate(request.startDate);

export async function ManagerTimeOff({ tab, error, reviewed, requestId, from, filter }: {
  tab?: string; error?: string; reviewed?: string; requestId?: string; from?: string; filter?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const selected = tabs.find(item => item.id === tab) ?? tabs[0];
  const requests = selected.status === "PENDING"
    ? await listPendingTimeOffRequests()
    : await listTeamTimeOffRequests(selected.status);
  const focused = selected.status === "PENDING" && requestId ? requests.find(request => request.id === requestId) : undefined;
  const origin: Origin = { from: from === "home" ? "home" : "inbox", filter: inboxFilter(filter ?? "requests") };
  if (focused) return <FocusedReview request={focused as PendingRequest} origin={origin} error={error} />;
  if (selected.status === "PENDING" && requestId && !error) return <DecidedReview origin={origin} />;

  const count = requests.length;
  const plural = (n: number) => `${n}\u00a0${n === 1 ? "request" : "requests"}`;
  // Phase 3.5 Wave A: the full Time-off list on the kit. Pending requests are cards with the decision on them;
  // approved and declined are one record card each. The single-request review above is unchanged.
  return (
    <div className="nv-page wa-page wa-timeoff" data-nv-page="">
      <PageBand title="Time off" overlap={false}
        summary={selected.id === "pending" ? (count ? `${plural(count)} waiting for your review.` : "Nothing is waiting for your review.") : `Your team’s ${selected.label.toLowerCase()} time off, latest dates first.`}
        extra={<FilterPills label="Time off sections" items={tabs.map(item => ({ href: `/app/requests?tab=${item.id}`, label: item.label, current: selected.id === item.id }))} />} />
      <div className="nv-content">
        <ManagerIssueFocus prefix="request-" />
        {error ? <Notice tone="urgent" title="That decision wasn’t saved">The request may have changed. Check it and decide again.</Notice> : null}
        {reviewed ? <Notice tone="done" title="Decision saved">The employee can see it in their requests.</Notice> : null}
        {selected.id === "pending" ? (count ? <div className="wa-grid">{requests.map(request => (
          <div className="wa-target" id={`request-${request.id}`} tabIndex={-1} key={request.id}>
            <Card title={request.employeeName} meta={<Status tone="review">Waiting</Status>}>
              <Facts label={`Time off for ${request.employeeName}`}>
                <Fact label="Dates">{rangeLabel(request)}</Fact>
                <Fact label="Length">{lengthLabel(request)}</Fact>
                {request.reason ? <Fact label="Note">{request.reason}</Fact> : null}
              </Facts>
              <ActionForm action={reviewTimeOffAction} className="wa-card-body wa-decision-form" label={`Review time off for ${request.employeeName}`}
                failure={{ title: "Your decision wasn’t saved", body: "Check your connection and try again. Nothing changed." }}>
                <input type="hidden" name="requestId" value={request.id} />
                <TimeOffReviewActions name={request.employeeName} />
                <KitLink href={`/app/requests?tab=pending&requestId=${encodeURIComponent(request.id)}`}>Open request and that week’s schedule</KitLink>
              </ActionForm>
            </Card>
          </div>
        ))}</div> : <Card title="You’re all caught up">
          <div className="wa-card-body"><p className="wa-text wa-muted">New time-off requests show up here and in your Inbox.</p></div>
        </Card>) : (
          <Card title={selected.label} meta={plural(count)} id={`timeoff-${selected.id}`}>
            {count ? <Rows label={`${selected.label} time off`}>
              {requests.map(request => (
                <Row key={request.id} title={request.employeeName}
                  meta={<><MetaParts text={`${rangeLabel(request)} · ${lengthLabel(request)}`} />{request.reason ? <span className="wa-row-note">Note: {request.reason}</span> : null}</>} />
              ))}
            </Rows> : <div className="wa-card-body"><p className="wa-text wa-muted">{`No ${selected.label.toLowerCase()} time off yet. Decisions you make show up here.`}</p></div>}
          </Card>
        )}
      </div>
    </div>
  );
}
