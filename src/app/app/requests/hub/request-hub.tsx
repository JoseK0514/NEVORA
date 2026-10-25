import { keepWhole } from "@/lib/keep-whole";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { QuietBar, QuietBarIcon, QuietHeader, QuietList, QuietPage, QuietRow } from "@/components/quiet/quiet";

/* Requests in the v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; target:
 * docs/product/specs/employee-v5-quiet/mockups/E06-Requests.png). What is waiting, then what you can ask for; Plus starts
 * a time-off request. Routes are unchanged; the requests are the same own-request read the Time off page uses. */

export type HubTimeOffRequest = {
  id: string; status: string; startDate: string; endDate: string;
  startTime?: string | null; endTime?: string | null; createdAt: string;
};

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const monthDay = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(utc(date));

/** "Oct 29 – 30", "Oct 30 – Nov 2" or "Fri, Nov 13". */
function rangeLabel(request: HubTimeOffRequest) {
  if (request.startDate === request.endDate) return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(utc(request.startDate));
  const sameMonth = request.startDate.slice(0, 7) === request.endDate.slice(0, 7);
  return `${monthDay(request.startDate)} – ${sameMonth ? Number(request.endDate.slice(8)) : monthDay(request.endDate)}`;
}

function lengthLabel(request: HubTimeOffRequest) {
  if (request.startTime && request.endTime) return "Part of a day";
  const days = Math.round((utc(request.endDate).getTime() - utc(request.startDate).getTime()) / 86_400_000) + 1;
  return days === 1 ? "Full day" : `${days} full days`;
}

export function RequestHub({ modules = ALL_MODULES_ON, requests, timeZone = "UTC" }: {
  modules?: EnabledModules;
  /** The person's own time-off requests, newest first; null when they couldn't be read. Omitted when time off is off. */
  requests?: readonly HubTimeOffRequest[] | null;
  timeZone?: string;
}) {
  const sentOn = (at: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(at)); } catch { return ""; } };
  const waiting = (requests ?? []).filter(request => request.status === "PENDING");
  const sub = modules.timeOff && requests ? (waiting.length ? `${waiting.length} waiting for approval` : "Nothing waiting")
    : modules.timeOff && requests === null ? "Couldn’t load your requests" : modules.marketplace ? "Change one of your shifts" : "Tell your manager when you can work";
  const ic = (Icon: typeof ClockIcon) => <Icon className="q-ic" aria-hidden="true" />;
  return <QuietPage className="q-reqhub">
    <QuietBar>{modules.timeOff ? <QuietBarIcon href="/app/requests?tab=new" label="New time-off request"><PlusIcon className="q-ic" aria-hidden="true" /></QuietBarIcon> : null}</QuietBar>
    <QuietHeader title="Requests" sub={sub} />
    {modules.timeOff && requests === null ? <QuietList style={{ marginTop: 16 }}>
      <QuietRow href="/app/requests?tab=my" title="My time-off requests" detail="Open them to see where each one stands" />
    </QuietList> : null}
    {waiting.length ? <section aria-labelledby="request-hub-waiting">
      <div className="q-grp"><h2 id="request-hub-waiting">Waiting</h2></div>
      <QuietList>{waiting.map(request => <QuietRow key={request.id} href={`/app/requests?tab=my#request-${encodeURIComponent(request.id)}`} variant="tint" avatar={ic(CalendarMinusIcon)}
        title={keepWhole(`Time off · ${rangeLabel(request)}`)} detail={`${lengthLabel(request)}${sentOn(request.createdAt) ? ` · Sent ${sentOn(request.createdAt)}` : ""}`} />)}</QuietList>
    </section> : null}
    <section aria-labelledby="request-hub-start">
      <div className="q-grp"><h2 id="request-hub-start">Ask for</h2></div>
      <QuietList>
        {modules.timeOff ? <QuietRow href="/app/requests" icon={ic(CalendarMinusIcon)} title="Time off" /> : null}
        {modules.marketplace ? <QuietRow href="/app/exchange" icon={ic(ArrowsLeftRightIcon)} title="Swap or cover a shift" /> : null}
        <QuietRow href="/app/availability" icon={ic(ClockIcon)} title="Availability" />
      </QuietList>
    </section>
    {modules.timeOff && modules.marketplace ? <details className="q-disclose">
      <summary className="q-btn q-btn--quiet">Which request should I use?</summary>
      <div className="q-disclose__body">
        <p><b>Time off</b> is for a date or time range you need away from work.</p>
        <p><b>Shift requests</b> are for a specific scheduled shift: a swap, an offer for cover, or Unable to work. Start them from the shift on your schedule.</p>
      </div>
    </details> : null}
  </QuietPage>;
}
