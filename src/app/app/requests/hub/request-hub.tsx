import { keepWhole } from "@/lib/keep-whole";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { CalendarXIcon } from "@phosphor-icons/react/dist/ssr/CalendarX";
import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr/CalendarPlus";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { QuietBar, QuietHeader, QuietList, QuietPage, QuietRow } from "@/components/quiet/quiet";
import { formatTimeRange } from "@/lib/date-utils";
import { RequestHubAdd } from "./request-hub-add";

/* Requests in the v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; target:
 * docs/product/specs/employee-v5-quiet/mockups/E06-Requests.png). What is waiting, then what you can ask for; Plus starts
 * a request. Routes are unchanged; the requests are the same own-request reads Time off, Shift requests and My time use.
 * F8 (Oct 25): Waiting is every request of yours a manager or teammate still has to answer. */

export type HubTimeOffRequest = {
  id: string; status: string; startDate: string; endDate: string;
  startTime?: string | null; endTime?: string | null; createdAt: string;
};
/** A pending swap or cover offer you made, or an Unable to work report waiting for a manager. */
export type HubShiftRequest = { id: string; kind: "swap" | "cover" | "callout"; date: string; startTime: string; endTime: string; createdAt: string };
/** A correction waiting for a manager. */
export type HubCorrection = { id: string; kind: string; startAt: string; endAt: string; locationName: string };

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const monthDay = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(utc(date));
const weekdayDay = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(utc(date));

/** "Oct 29 – 30", "Oct 30 – Nov 2" or "Fri, Nov 13". */
function rangeLabel(request: HubTimeOffRequest) {
  if (request.startDate === request.endDate) return weekdayDay(request.startDate);
  const sameMonth = request.startDate.slice(0, 7) === request.endDate.slice(0, 7);
  return `${monthDay(request.startDate)} – ${sameMonth ? Number(request.endDate.slice(8)) : monthDay(request.endDate)}`;
}

function lengthLabel(request: HubTimeOffRequest) {
  if (request.startTime && request.endTime) return "Part of a day";
  const days = Math.round((utc(request.endDate).getTime() - utc(request.startDate).getTime()) / 86_400_000) + 1;
  return days === 1 ? "Full day" : `${days} full days`;
}

const shiftWords = { swap: "Swap", cover: "Cover", callout: "Unable to work" } as const;
const shiftStatus = { swap: "Waiting for your teammate", cover: "Offered to your team", callout: "Waiting for your manager" } as const;
const correctionWords: Record<string, string> = { MISSING_ENTRY: "Missing time", ENTRY_BOUNDARY: "Clock in and out", BREAK_BOUNDARY: "Break" };

export function RequestHub({ modules = ALL_MODULES_ON, requests, timeZone = "UTC", shiftRequests = [], corrections = [] }: {
  modules?: EnabledModules;
  /** The person's own time-off requests, newest first; null when they couldn't be read. Omitted when time off is off. */
  requests?: readonly HubTimeOffRequest[] | null;
  timeZone?: string;
  /** Own pending swaps, cover offers and Unable to work reports; null when they couldn't be read. */
  shiftRequests?: readonly HubShiftRequest[] | null;
  /** Own corrections waiting for review; null when they couldn't be read. */
  corrections?: readonly HubCorrection[] | null;
}) {
  const inZone = (at: string, options: Intl.DateTimeFormatOptions) => { try { return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(new Date(at)); } catch { return ""; } };
  const sentOn = (at: string) => inZone(at, { month: "short", day: "numeric" });
  const waiting = (requests ?? []).filter(request => request.status === "PENDING");
  const changes = shiftRequests ?? [], fixes = corrections ?? [];
  const count = waiting.length + changes.length + fixes.length;
  const failed = (modules.timeOff && requests === null) || shiftRequests === null || corrections === null;
  const sub = count ? `${count} waiting for approval`
    : modules.timeOff && requests === null ? "Couldn’t load your requests" : failed ? "Some requests couldn’t be checked" : "Nothing waiting";
  const ic = (Icon: typeof ClockIcon) => <Icon className="q-ic" aria-hidden="true" />;
  return <QuietPage className="q-reqhub">
    <QuietBar><RequestHubAdd timeOff={modules.timeOff} marketplace={modules.marketplace} /></QuietBar>
    <QuietHeader title="Requests" sub={sub} />
    {modules.timeOff && requests === null ? <QuietList style={{ marginTop: 16 }}>
      <QuietRow href="/app/requests?tab=my" title="My time-off requests" detail="Open them to see where each one stands" />
    </QuietList> : null}
    {count ? <section aria-labelledby="request-hub-waiting">
      <div className="q-grp"><h2 id="request-hub-waiting">Waiting</h2></div>
      <QuietList>
        {waiting.map(request => <QuietRow key={request.id} href={`/app/requests?tab=my#request-${encodeURIComponent(request.id)}`} variant="tint" avatar={ic(CalendarMinusIcon)}
          title={keepWhole(`Time off · ${rangeLabel(request)}`)} detail={`${lengthLabel(request)}${sentOn(request.createdAt) ? ` · Sent ${sentOn(request.createdAt)}` : ""}`} />)}
        {changes.map(change => <QuietRow key={`${change.kind}:${change.id}`} href={`/app/exchange?tab=requests#request-${encodeURIComponent(change.id)}`} variant="tint"
          avatar={ic(change.kind === "swap" ? ArrowsLeftRightIcon : change.kind === "cover" ? HandCoinsIcon : CalendarXIcon)}
          title={keepWhole(`${shiftWords[change.kind]} · ${weekdayDay(change.date)}`)} detail={keepWhole(`${formatTimeRange(change.startTime, change.endTime)} · ${shiftStatus[change.kind]}`)} />)}
        {fixes.map(fix => <QuietRow key={`fix:${fix.id}`} href="/app/my-time#corrections" variant="tint" avatar={ic(ClockCounterClockwiseIcon)}
          title={keepWhole(`Correction · ${inZone(fix.startAt, { month: "short", day: "numeric" })}`)}
          detail={keepWhole([correctionWords[fix.kind] ?? "Time", `${inZone(fix.startAt, { hour: "numeric", minute: "2-digit" })} – ${inZone(fix.endAt, { hour: "numeric", minute: "2-digit" })}`, fix.locationName].filter(Boolean).join(" · "))} />)}
      </QuietList>
    </section> : null}
    {count && failed ? <p className="q-help" role="status">Some requests couldn’t be checked. Open Time off, Shift requests or My time to see them.</p> : null}
    <section aria-labelledby="request-hub-start">
      <div className="q-grp"><h2 id="request-hub-start">Ask for</h2></div>
      <QuietList>
        {modules.timeOff ? <QuietRow href="/app/requests" icon={ic(CalendarMinusIcon)} title="Time off" /> : null}
        {/* P1-11: open shifts live on Schedule; this is the way there from Requests. */}
        {modules.marketplace ? <QuietRow href="/app/schedule?view=open" icon={ic(CalendarPlusIcon)} title="Pick up a shift" /> : null}
        {modules.marketplace ? <QuietRow href="/app/exchange" icon={ic(ArrowsLeftRightIcon)} title="Swap or cover a shift" /> : null}
        <QuietRow href="/app/availability" icon={ic(ClockIcon)} title="Availability" />
      </QuietList>
    </section>
    {modules.timeOff && modules.marketplace ? <details className="q-disclose">
      <summary className="q-btn q-btn--quiet">Which request should I use?</summary>
      <div className="q-disclose__body">
        <p><b>Time off</b> is for a date or time range you need away from work.</p>
        <p><b>Shift requests</b> are for a specific scheduled shift: a swap, an offer for cover, or saying you can’t work it. Start them from the shift on your schedule.</p>
      </div>
    </details> : null}
  </QuietPage>;
}
