"use client";
import "./manager-inbox-corp.css";
import type { ReactNode } from "react";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpNav, CorpNote, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { useActionCenter, mobileActionDetail, type ActionCenterConnection } from "./manager-action-center";
import { useToday } from "./manager-today";
import { gapPlace, itemEntry, lateBy, planLabel, shiftEntry } from "./manager-inbox";
import { needsYou } from "@/lib/action-center/needs-you";
import { itemPerson, presentItem, readableDates, spacedRanges } from "@/lib/action-center/present";
import { actionCenterNavigation } from "./action-center-navigation";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import { InboxB } from "./owner-b/inbox-b";

/* Things to do (Release 1; approved board O-Inbox, Oct 26). Presentation only: the same action center and Today reads as
 * the Inbox before it, the same review links and the same count as Home and the sidebar badge. One card per kind with its
 * count; each row opens the full review, where the decision is made (no Approve or Decline in the list). */

type Row = { key: string; href: string; label: string; title: string; detail?: string; value?: string; valueTone?: "red" | "soft" };
type Group = { id: string; title: string; rows: Row[]; count?: number; aside?: { href: string; label: string; text: string } };
type Family = { id: string; title: string; groups: Group[] };

const statusText: Record<ActionCenterConnection, string> = {
  loading: "Checking what needs you…", reconnecting: "Reconnecting…", offline: "You’re offline. This updates when you reconnect.",
  paused: "Paused while you’re away. It updates when you come back.", unavailable: "Things to do isn’t available right now.",
  access_lost: "Sign in again to see what needs you.", ready: "Things to do isn’t available right now.",
};

const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
// R7 (copy row 12): midnight reads as Schedule does, "12:00 AM".
const hhmm = (value: string) => { const [h, m] = value.split(":").map(Number); const hour = h % 24; return `${(hour % 12) || 12}:${String(m).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`; };
const midnight = (text: string) => text.replace(/\bmidnight\b/gi, "12:00 AM");
/** R7 (copy row 3): "Need 1 employee" reads "Needs 1 person" ("Needs 2 people"), the count kept with its noun. */
const needs = (text: string) => text.replace(/Need\s(\d+)\semployees?/g, (_, n: string) => `Needs ${n}\u00a0${n === "1" ? "person" : "people"}`);
const plain = (text: string) => text.replace(/ /g, " ");

/** Codex's optional request facts (dates and partial-day times), when the read carries them. */
type RequestFacts = { startDate: string; endDate: string; partialDay?: { start: string; end: string } };
function requestDetail(item: ActionItem, fallback: string) {
  const facts = (item as ActionItem & { request?: RequestFacts }).request;
  if (!facts) return fallback;
  const dates = facts.startDate === facts.endDate ? dayText(facts.startDate) : `${dayText(facts.startDate)} – ${dayText(facts.endDate)}`;
  return `${dates} · ${facts.partialDay ? `${hhmm(facts.partialDay.start)} – ${hhmm(facts.partialDay.end)}` : "All day"}`;
}

function itemRow(item: ActionItem, timeZone: string, calm = false): Row {
  const entry = itemEntry(item, calm, "all", timeZone);
  const shown = presentItem({ ...item, detail: mobileActionDetail(item.detail) }, actionCenterNavigation(item).label, timeZone);
  const request = item.category === "requests";
  return { key: item.id, href: entry.href, label: midnight(entry.label), title: plain(request ? shown.person ?? shown.title : shown.title),
    detail: needs(midnight(plain(request ? requestDetail(item, shown.detail) : shown.detail))) };
}

/** An open shift as the board reads it: "Barista 1:00 PM – 3:00 PM" over "Today · Condado · 1 open", or
 * "12:00 AM – 8:00 AM" over "Today · Condado · Needs 1 person"; a whole-day gap is "Open all day". */
export function gapRow(item: ActionItem, timeZone: string, day: string): Row {
  const row = itemRow(item, timeZone);
  const [date, when, ...parts] = mobileActionDetail(item.detail).split(" · ");
  // The read may keep the count with its noun using a no-break space, so any space matches.
  const rest = parts.map(needs);
  if (!when) return { ...row, title: plain(gapPlace(item)) };
  // One position short reads as that position ("Barista 1:00 PM – 3:00 PM", "1 open"); otherwise the time and the need.
  const single = rest.length === 1 && /^[^;]+: \d+ open$/.test(rest[0]) ? rest[0].split(": ") : null;
  const dayText = item.dateTime?.slice(0, 10) === day ? "Today" : date;
  // "all day" from the read is a row title here: "Open all day" (copy row 11); "midnight" reads "12:00 AM" (row 12).
  // R2: thin spaces round the en dash ("12:00 AM – 8:00 AM"), as the kit's timeRangeText sets them.
  const time = /^all day$/i.test(when.trim()) ? "Open all day" : midnight(when.replace(/\s*–\s*/, "\u2009–\u2009"));
  return { ...row, title: plain(single ? `${single[0]} ${time}` : time), detail: plain([dayText, gapPlace(item), ...(single ? [single[1]] : rest)].join(" · ")) };
}

/** Timecards to approve: one row per pay period, naming whose cards are waiting; it opens Time. */
function timecardRows(items: ActionItem[]): Row[] {
  const byPeriod = new Map<string, ActionItem[]>();
  for (const item of items) { const period = item.detail.split(" · ")[1] ?? ""; byPeriod.set(period, [...(byPeriod.get(period) ?? []), item]); }
  return [...byPeriod].map(([period, list]) => {
    const names = list.map(item => itemPerson(item) ?? item.detail.split(" · ")[0]).map(name => name.split(" ")[0]);
    const title = plain(period ? spacedRanges(readableDates(period)) : "This pay period");
    // Time opens on that pay period (the items' own review link: ?start=&end=), and on the person's card when only one
    // is waiting. Without the period it would open the current week, where an earlier period's cards aren't shown.
    const review = new URL(list[0].href, "https://nevora.invalid");
    if (list.length > 1) review.hash = "";
    const href = review.pathname === "/app/timecards" ? review.pathname + review.search + review.hash : "/app/timecards";
    return { key: `timecards:${period}`, href, label: `Timecards to approve, ${title}: ${names.join(", ")}`, title, detail: names.join(", ") };
  });
}

function shiftRow(shift: TodayShift, timeZone: string, observedAt: string | undefined, showPlace: boolean): Row {
  const entry = shiftEntry(shift, timeZone, observedAt, showPlace);
  const running = shift.status === "not_clocked_in";
  // R7 (copy row 9): the heading says Missed clock-ins, so the line says only when the shift began or ended.
  const when = `Shift ${running ? "began" : "ended"} ${clock(running ? shift.startAt : shift.endAt, timeZone)}`;
  return { key: entry.key, href: entry.href, label: entry.label, title: shift.employeeName, detail: plain(showPlace ? `${when} · ${shift.locationName}` : when),
    value: running ? lateBy(shift, observedAt) : undefined, valueTone: "red" };
}

/** Plan ahead: one row per kind. One item opens itself; several show their count and open the first. */
function planRows(items: ActionItem[], timeZone: string): Row[] {
  const byType = new Map<ActionItem["type"], ActionItem[]>();
  for (const item of items) byType.set(item.type, [...(byType.get(item.type) ?? []), item]);
  return [...byType].map(([type, list]) => {
    const first = itemRow(list[0], timeZone);
    const title = planLabel[type] ?? first.title;
    return list.length === 1 ? { ...first, title, label: first.label }
      : { key: `plan:${type}`, href: first.href, label: `${title}, ${list.length}`, title, value: String(list.length), valueTone: "soft" };
  });
}

/** Things to do lists exactly what Home and the sidebar count (who hasn't clocked in, today's urgent items and people's
 * requests). Owner premium round 2 (R3, R6): every kind has its own heading with its count ("Open shifts 3", "Missed
 * clock-ins 1"), and related kinds share a card, so the page never shows more than three cards:
 *   1. Open shifts (the schedule's job);
 *   2. Time: missed clock-ins, other urgent clock-in items, time corrections and timecards to approve (the time job);
 *   3. Requests: time off, swaps, can't-work and other requests, ending with "More requests" (the full request lists and
 *      Older items), which is its own card only when no request is waiting.
 * Each kind keeps its anchor (#todo-open, #todo-missed, #todo-time-off, …) and the Time card keeps #todo-review, so Home's
 * links still land. The headings' counts add up to the sidebar badge. Everything else the action center holds
 * (corrections and timecards that aren't urgent, planning and earlier gaps) is on Older items and is never counted.
 * Presentation only: the same reads and the same counts as before. */
export function groupThingsToDo(snapshot: Extract<ActionCenter, { state: "ready" }>, today: Today | null, timeZone: string, coverageFirst: boolean) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(snapshot.observedAt));
  const value = needsYou(snapshot.items, day, today?.state === "ready" ? today.missed : []);
  const urgent = value.now, later = value.planning;
  const of = (types: ActionItem["type"][], list: ActionItem[]) => list.filter(item => types.includes(item.type));
  const requests = [...urgent.filter(item => item.category === "requests"), ...value.requests];
  const known: ActionItem["type"][] = ["TIME_OFF", "EXCHANGE", "CALLOUT"];
  const timeKinds: ActionItem["type"][] = ["TIME_CORRECTION", "TIMECARD"];
  const places = new Set(value.noClockIn.map(shift => shift.locationName)).size > 1;
  // On a narrow phone the line may wrap; the count stays with its noun ("1 open", "Needs 1 person").
  const open: Group = { id: "open", title: "Open shifts", rows: of(["COVERAGE_GAP"], urgent).map(item => gapRow(item, timeZone, day))
    .map(row => ({ ...row, detail: row.detail?.replace(/ (\d+) open$/, " $1\u00a0open") })) };
  const time: Group[] = [
    { id: "missed", title: "Missed clock-ins", rows: value.noClockIn.map(shift => shiftRow(shift, timeZone, snapshot.observedAt, places)) },
    { id: "now", title: "Needs attention now", rows: urgent.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests" && !timeKinds.includes(item.type)).map(item => itemRow(item, timeZone)) },
    { id: "corrections", title: "Time corrections", rows: of(["TIME_CORRECTION"], urgent).map(item => itemRow(item, timeZone)) },
    { id: "timecards", title: "Timecards to approve", rows: timecardRows(of(["TIMECARD"], urgent)), count: of(["TIMECARD"], urgent).length },
  ];
  const asked: Group[] = [
    { id: "time-off", title: "Time off", rows: of(["TIME_OFF"], requests).map(item => itemRow(item, timeZone)) },
    { id: "swaps", title: "Shift swaps", rows: of(["EXCHANGE"], requests).map(item => itemRow(item, timeZone)) },
    { id: "cant-work", title: "Can’t work", rows: of(["CALLOUT"], requests).map(item => itemRow(item, timeZone)) },
    { id: "requests", title: "Other requests", rows: requests.filter(item => !known.includes(item.type)).map(item => itemRow(item, timeZone)) },
  ];
  const shown = (groups: Group[]) => groups.filter(group => group.rows.length);
  const cards: Family[] = [
    { id: "card-open", title: "Open shifts", groups: shown([open]) },
    { id: "review", title: "Time", groups: shown(time) },
    { id: "card-requests", title: "Requests", groups: shown(asked) },
  ];
  const families = (coverageFirst ? cards : [cards[1], cards[0], cards[2]]).filter(family => family.groups.length);
  const more: Group[] = [
    { id: "corrections", title: "Time corrections", rows: of(["TIME_CORRECTION"], later).map(item => itemRow(item, timeZone)) },
    { id: "timecards", title: "Timecards to approve", rows: timecardRows(of(["TIMECARD"], later)), count: of(["TIMECARD"], later).length },
    { id: "plan", title: "Plan ahead", rows: planRows(later.filter(item => !timeKinds.includes(item.type)), timeZone), count: later.filter(item => !timeKinds.includes(item.type)).length },
    // Earlier this week: one row per kind (a week of past coverage gaps is one row with its count, not a long list).
    { id: "earlier", title: "Earlier this week", rows: value.past.length > 1
      ? [{ key: "earlier:gaps", href: "/app/schedule", label: `Coverage gaps earlier this week, ${value.past.length}`, title: "Coverage gaps", value: String(value.past.length), valueTone: "soft" as const }]
      : value.past.map(item => itemRow(item, timeZone, true)), count: value.past.length },
  ].filter(group => group.rows.length);
  return { value, families, more };
}

/** R7 (copy row 6): the screen-reader line matches the page's name. "5 things to do today", never "need you". */
export const toDoSentence = (n: number) => n === 0 ? "Nothing to do right now." : `${n}\u00a0${n === 1 ? "thing" : "things"} to do today.`;

const groupCount = (group: Group) => group.count ?? group.rows.length;

export function ManagerInboxCorp({ weekStart, actorId, timeZone, coverageFirst = false, view = "today" }: { weekStart: string; actorId: string; timeZone: string; coverageFirst?: boolean; view?: "today" | "more" }) {
  const { snapshot, connection, refresh } = useActionCenter(weekStart, actorId);
  const { snapshot: today, refresh: refreshToday } = useToday();
  return <ThingsToDoPage snapshot={snapshot} today={today} connection={connection} onRefresh={() => { refresh(); refreshToday(); }} timeZone={timeZone} coverageFirst={coverageFirst} view={view} />;
}

const rowOf = (row: Row) => <li key={row.key}>
  <CorpRow href={row.href} label={row.label} title={row.title} bold detail={row.detail} value={row.value} valueTone={row.valueTone} chevron />
</li>;

/** R3: one count voice. The label, then the figure in grey, no brackets ("Open shifts 3"). */
const headed = (title: string, n: number) => <>{title}<span className="c-count c-num">{n}</span></>;

/** One kind inside a card: its heading row with the count, then its rows. Nov 1 upscale: the Time off kind ends with
 * "See all time off ›", the way to every time off request. */
const kindOf = (group: Group) => <section key={group.id} id={`todo-${group.id}`} className="c-todo__kind" aria-labelledby={`todo-${group.id}-label`}>
  <div className="c-card__head"><h2 className="c-card__label" id={`todo-${group.id}-label`}>{headed(group.title, groupCount(group))}</h2></div>
  <CorpRows label={group.title}>{group.rows.map(rowOf)}
    {group.id === "time-off" ? <li className="c-todo__seeall"><CorpRow href="/app/requests" label="See all time off requests" title="See all time off" one chevron /></li> : null}
  </CorpRows>
</section>;

/** Nov 1 upscale: "More" is its own card under its own label, after the cards: Shift requests and Done and older (what
 * Things to do lists but doesn't count), as plain rows; Time off requests too while no Time off card ends with its link. */
const moreCard = (timeOffShown: boolean) => <section key="more" id="todo-more" className="c-section c-todo__more" aria-labelledby="todo-more-label">
  <h2 className="c-section__label" id="todo-more-label">More</h2>
  <div className="c-card">
    <CorpRows label="More">
      {timeOffShown ? null : <li><CorpRow href="/app/requests" label="All time off requests" title="Time off requests" one chevron /></li>}
      <li><CorpRow href="/app/exchange" label="All shift requests" title="Shift requests" one chevron /></li>
      <li><CorpRow href="/app/inbox?view=more" label="Done and older, not counted in today’s total" title="Done and older" one chevron /></li>
    </CorpRows>
  </div>
</section>;

/** Presentation only: the released action center observation and today's shifts. */
export function ThingsToDoPage({ snapshot, today = null, connection, onRefresh, timeZone, coverageFirst = false, view = "today" }: {
  snapshot: ActionCenter | null; today?: Today | null; connection: ActionCenterConnection; onRefresh: () => void; timeZone: string; coverageFirst?: boolean;
  /** "more": Older items, the items Things to do doesn't count (its own page, Back to Things to do). */
  view?: "today" | "more";
}) {
  const ready = connection === "ready" && snapshot?.state === "ready" ? snapshot : null;
  const grouped = ready ? groupThingsToDo(ready, today, timeZone, coverageFirst) : null;
  const value = grouped?.value ?? null, more = grouped?.more ?? [], families = grouped?.families ?? [];
  const moreView = view === "more";
  const shown = moreView ? more.length : families.length;
  const todayFailed = today?.state === "unavailable";
  const summary = value ? `${toDoSentence(value.count)}${todayFailed ? " Clock-ins can’t be checked right now." : ""}` : statusText[connection];
  let body: ReactNode;
  if (!ready && (connection === "unavailable" || connection === "ready")) {
    // P3: the kit's one error card.
    body = <CorpCard as="div" ariaLabel="Things to do"><div className="c-error-card"><p className="c-error-card__title">Things to do isn’t available</p>
      <p className="c-error-card__body">Check your connection, then try again.</p>
      <CorpButton kind="neutral" className="c-error-card__action c-todo__retry" onClick={() => { onRefresh(); focusAfterRetry("#todo-title", ".c-todo__retry"); }}>Try again</CorpButton>
    </div></CorpCard>;
  } else if (!ready) {
    body = <CorpCard as="div" ariaLabel="Things to do"><CorpBody>
      <p className="c-todo__state" aria-busy={connection === "loading" || connection === "reconnecting" || undefined}>{statusText[connection]}</p>
      {connection === "access_lost" ? <CorpButtonLink href="/login" kind="secondary" size="md" native>Sign in</CorpButtonLink> : null}
    </CorpBody></CorpCard>;
  } else if (!shown) {
    // A10: the kit's empty card, never one bare line.
    body = <CorpCard as="div" ariaLabel="Things to do"><div className="c-empty c-empty--card">{moreView
      ? <><b className="c-empty__title">Nothing done or older</b><span className="c-empty__body">Planning items and earlier gaps appear here.</span></>
      : <><b className="c-empty__title">You’re all set</b><span className="c-empty__body">Nothing needs you right now.</span></>}</div></CorpCard>;
  } else if (moreView) {
    body = more.map(group => <CorpCard key={group.id} id={`todo-${group.id}`} label={headed(group.title, groupCount(group))}>
      <CorpRows label={group.title}>{group.rows.map(rowOf)}</CorpRows>
    </CorpCard>);
  } else {
    // At most three cards of things to do (see groupThingsToDo), then the More card.
    const timeOffShown = families.some(family => family.groups.some(group => group.id === "time-off"));
    body = <>{families.map(family => <div key={family.id} id={`todo-${family.id}`} className="c-card c-todo__card" role="group" aria-label={family.title}>
      {family.groups.map(kindOf)}
    </div>)}{moreCard(timeOffShown)}</>;
  }
  // The request lists stay one tap away while the page loads, fails or has nothing waiting.
  if (!moreView && (!ready || !shown)) body = <>{body}{moreCard(false)}</>;
  const title = moreView ? "Done and older" : "Things to do";
  // A7: a single-column page, capped at the kit's narrow width on desktop.
  return <CorpPage className="c-todo c-page--narrow" labelledBy="todo-title">
    <div data-todo-state={ready ? (shown ? "ready" : "clear") : connection} hidden />
    {/* Direction B: the phone screen (phones under data-nv-b); tablets and desktop keep the cards below. */}
    {moreView ? null : <InboxB ready={ready} families={families} total={value ? value.count : null} connection={connection} statusLine={summary} todayFailed={!!ready && todayFailed} onRefresh={onRefresh} back />}
    {/* Phone: "‹ Home" over the page; when Things to do is a tab of its own the shell hides it and the large title shows. */}
    <CorpNav back={moreView ? { href: "/app/inbox", label: "Things to do" } : { href: "/app", label: "Home" }} title={title} phoneOnly />
    <CorpTitle id="todo-title" title={title} sub={moreView ? undefined : <span role="status" className="c-sr">{summary}</span>} wide />
    {ready && todayFailed ? <CorpCard as="div" ariaLabel="Clock-ins"><CorpBody>
      <p className="c-todo__state">Clock-ins can’t be checked right now.</p>
      <CorpButton kind="secondary" size="md" onClick={onRefresh}>Try again</CorpButton>
    </CorpBody></CorpCard> : null}
    {body}
    {ready?.limitedAttendance ? <CorpNote>Some attendance comparisons are unavailable.</CorpNote> : null}
  </CorpPage>;
}
