"use client";
import "./manager-inbox-corp.css";
import type { ReactNode } from "react";
import Link from "next/link";
import { CorpBadge, CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpNav, CorpNote, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { useActionCenter, mobileActionDetail, type ActionCenterConnection } from "./manager-action-center";
import { useToday } from "./manager-today";
import { gapPlace, itemEntry, lateBy, planLabel, shiftEntry } from "./manager-inbox";
import { needsYou, needsYouSentence } from "@/lib/action-center/needs-you";
import { itemPerson, presentItem, readableDates, spacedRanges } from "@/lib/action-center/present";
import { actionCenterNavigation } from "./action-center-navigation";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";

/* Things to do (Release 1; approved board O-Inbox, Oct 26). Presentation only: the same action center and Today reads as
 * the Inbox before it, the same review links and the same count as Home and the sidebar badge. One card per kind with its
 * count; each row opens the full review, where the decision is made (no Approve or Decline in the list). */

type Row = { key: string; href: string; label: string; title: string; detail?: string; value?: string; valueTone?: "red"; badge?: number };
type Group = { id: string; title: string; rows: Row[]; count?: number; aside?: { href: string; label: string; text: string } };
type Family = { id: string; title: string; groups: Group[] };

const statusText: Record<ActionCenterConnection, string> = {
  loading: "Checking what needs you…", reconnecting: "Reconnecting…", offline: "You’re offline. This updates when you reconnect.",
  paused: "Paused while you’re away. It updates when you come back.", unavailable: "Things to do isn’t available right now.",
  access_lost: "Sign in again to see what needs you.", ready: "Things to do isn’t available right now.",
};

const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
const hhmm = (value: string) => { const [h, m] = value.split(":").map(Number); if (h === 24 || (h === 0 && m === 0)) return "midnight"; return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
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
  // "Need 1 employee" reads "1 needed", so a row's line fits a 320px phone whole.
  return { key: item.id, href: entry.href, label: entry.label, title: plain(request ? shown.person ?? shown.title : shown.title),
    detail: plain(request ? requestDetail(item, shown.detail) : shown.detail).replace(/Need\s(\d+)\semployees?/g, "$1 needed") };
}

/** An open shift as the board reads it: "Barista 1:00 PM – 3:00 PM" over "Today · Condado · 1 open". */
export function gapRow(item: ActionItem, timeZone: string, day: string): Row {
  const row = itemRow(item, timeZone);
  const [date, when, ...parts] = mobileActionDetail(item.detail).split(" · ");
  // "Need 1 employee" reads "1 needed", so the line fits a 320px phone whole.
  // The read may keep the count with its noun using a no-break space, so any space matches.
  const rest = parts.map(part => part.replace(/^Need\s(\d+)\semployees?$/, "$1 needed"));
  if (!when) return { ...row, title: plain(gapPlace(item)) };
  // One position short reads as that position ("Barista 1:00 PM – 3:00 PM", "1 open"); otherwise the time and the need.
  const single = rest.length === 1 && /^[^;]+: \d+ open$/.test(rest[0]) ? rest[0].split(": ") : null;
  const dayText = item.dateTime?.slice(0, 10) === day ? "Today" : date;
  // "all day" from the read is a row title here: "All day".
  const time = when.replace(/\s*–\s*/, " – ").replace(/^./, letter => letter.toUpperCase());
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
  const when = `No clock-in · ${running ? "began" : "ended"} ${clock(running ? shift.startAt : shift.endAt, timeZone)}`;
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
      : { key: `plan:${type}`, href: first.href, label: `${title}, ${list.length}`, title, badge: list.length };
  });
}

/** Things to do lists exactly what Home and the sidebar count (who hasn't clocked in, today's urgent items and people's
 * requests). Owner premium (Oct 31, A5): at most three cards, one per job (Shifts, Requests, To review). Each kind keeps
 * its own list and anchor inside its card (#todo-open, #todo-missed, #todo-time-off, …), and each row's detail names its
 * kind. A card's count is the sum of its rows' items, so the three counts add up to the sidebar badge. Everything else the
 * action center holds (corrections and timecards that aren't urgent, planning and earlier gaps) is one quiet link away,
 * on its own page, and is never counted. Presentation only: the same reads and the same counts as before. */
export function groupThingsToDo(snapshot: Extract<ActionCenter, { state: "ready" }>, today: Today | null, timeZone: string, coverageFirst: boolean) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(snapshot.observedAt));
  const value = needsYou(snapshot.items, day, today?.state === "ready" ? today.missed : []);
  const urgent = value.now, later = value.planning;
  const of = (types: ActionItem["type"][], list: ActionItem[]) => list.filter(item => types.includes(item.type));
  const requests = [...urgent.filter(item => item.category === "requests"), ...value.requests];
  const known: ActionItem["type"][] = ["TIME_OFF", "EXCHANGE", "CALLOUT"];
  const timeKinds: ActionItem["type"][] = ["TIME_CORRECTION", "TIMECARD"];
  const places = new Set(value.noClockIn.map(shift => shift.locationName)).size > 1;
  const kind = (prefix: string) => (row: Row): Row => ({ ...row, detail: row.detail ? `${prefix} · ${row.detail}` : prefix });
  const missed: Group = { id: "missed", title: "No clock-in", rows: value.noClockIn.map(shift => shiftRow(shift, timeZone, snapshot.observedAt, places)) };
  // An open shift for one position already reads "1 open"; otherwise the row says it is an open shift.
  // On a narrow phone the line may wrap; "1 needed" stays together.
  const gaps: Group = { id: "open", title: "Open shifts", rows: of(["COVERAGE_GAP"], urgent).map(item => gapRow(item, timeZone, day))
    .map(row => / open$/.test(row.detail ?? "") ? row : kind("Open shift")(row)).map(row => ({ ...row, detail: row.detail?.replace(/ (\d+) (needed|open)$/, " $1\u00a0$2") })) };
  const families: Family[] = [
    { id: "shifts", title: "Shifts", groups: coverageFirst ? [gaps, missed] : [missed, gaps] },
    { id: "requests", title: "Requests", groups: [
      { id: "time-off", title: "Time off", rows: of(["TIME_OFF"], requests).map(item => kind("Time off")(itemRow(item, timeZone))) },
      { id: "swaps", title: "Shift swaps", rows: of(["EXCHANGE"], requests).map(item => kind("Shift swap")(itemRow(item, timeZone))) },
      { id: "cant-work", title: "Can’t work", rows: of(["CALLOUT"], requests).map(item => kind("Can’t work")(itemRow(item, timeZone))) },
      { id: "requests", title: "Other requests", rows: requests.filter(item => !known.includes(item.type)).map(item => itemRow(item, timeZone)) },
    ] },
    { id: "review", title: "To review", groups: [
      { id: "now", title: "Needs attention now", rows: urgent.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests" && !timeKinds.includes(item.type)).map(item => itemRow(item, timeZone)) },
      { id: "corrections", title: "Time corrections", rows: of(["TIME_CORRECTION"], urgent).map(item => kind("Time correction")(itemRow(item, timeZone))) },
      { id: "timecards", title: "Timecards to approve", rows: timecardRows(of(["TIMECARD"], urgent)).map(kind("Timecards")), count: of(["TIMECARD"], urgent).length },
    ] },
  ].map(family => ({ ...family, groups: family.groups.filter(group => group.rows.length) })).filter(family => family.groups.length);
  const more: Group[] = [
    { id: "corrections", title: "Time corrections", rows: of(["TIME_CORRECTION"], later).map(item => itemRow(item, timeZone)) },
    { id: "timecards", title: "Timecards to approve", rows: timecardRows(of(["TIMECARD"], later)), count: of(["TIMECARD"], later).length },
    { id: "plan", title: "Plan ahead", rows: planRows(later.filter(item => !timeKinds.includes(item.type)), timeZone), count: later.filter(item => !timeKinds.includes(item.type)).length },
    // Earlier this week: one row per kind (a week of past coverage gaps is one row with its count, not a long list).
    { id: "earlier", title: "Earlier this week", rows: value.past.length > 1
      ? [{ key: "earlier:gaps", href: "/app/schedule", label: `Coverage gaps earlier this week, ${value.past.length}`, title: "Coverage gaps", badge: value.past.length }]
      : value.past.map(item => itemRow(item, timeZone, true)), count: value.past.length },
  ].filter(group => group.rows.length);
  return { value, families, more };
}

const groupCount = (group: Group) => group.count ?? group.rows.length;

export function ManagerInboxCorp({ weekStart, actorId, timeZone, coverageFirst = false, view = "today" }: { weekStart: string; actorId: string; timeZone: string; coverageFirst?: boolean; view?: "today" | "more" }) {
  const { snapshot, connection, refresh } = useActionCenter(weekStart, actorId);
  const { snapshot: today, refresh: refreshToday } = useToday();
  return <ThingsToDoPage snapshot={snapshot} today={today} connection={connection} onRefresh={() => { refresh(); refreshToday(); }} timeZone={timeZone} coverageFirst={coverageFirst} view={view} />;
}

const rowOf = (row: Row) => <li key={row.key}>
  <CorpRow href={row.href} label={row.label} title={row.title} bold detail={row.detail} value={row.value} valueTone={row.valueTone}
    trail={row.badge ? <CorpBadge count={row.badge} /> : undefined} chevron />
</li>;

/** Presentation only: the released action center observation and today's shifts. */
export function ThingsToDoPage({ snapshot, today = null, connection, onRefresh, timeZone, coverageFirst = false, view = "today" }: {
  snapshot: ActionCenter | null; today?: Today | null; connection: ActionCenterConnection; onRefresh: () => void; timeZone: string; coverageFirst?: boolean;
  /** "more": Later and past, the items Things to do doesn't count (its own page, Back to Things to do). */
  view?: "today" | "more";
}) {
  const ready = connection === "ready" && snapshot?.state === "ready" ? snapshot : null;
  const grouped = ready ? groupThingsToDo(ready, today, timeZone, coverageFirst) : null;
  const value = grouped?.value ?? null, more = grouped?.more ?? [], families = grouped?.families ?? [];
  const moreView = view === "more";
  const shown = moreView ? more.length : families.length;
  const todayFailed = today?.state === "unavailable";
  const summary = value ? `${needsYouSentence(value.count)}${todayFailed ? " Clock-ins can’t be checked right now." : ""}` : statusText[connection];
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
      ? <><b className="c-empty__title">Nothing later or from earlier</b><span className="c-empty__body">Planning items and earlier gaps appear here.</span></>
      : <><b className="c-empty__title">You’re all set</b><span className="c-empty__body">Nothing needs you right now.</span></>}</div></CorpCard>;
  } else if (moreView) {
    body = more.map(group => <CorpCard key={group.id} id={`todo-${group.id}`} label={`${group.title} (${groupCount(group)})`}>
      <CorpRows label={group.title}>{group.rows.map(rowOf)}</CorpRows>
    </CorpCard>);
  } else {
    // At most three cards; each kind keeps its own list and anchor, so links to #todo-open or #todo-missed still land.
    body = families.map(family => <CorpCard key={family.id} as="div" id={`todo-${family.id}`} label={`${family.title} (${family.groups.reduce((total, group) => total + groupCount(group), 0)})`}>
      {family.groups.map(group => <section key={group.id} id={`todo-${group.id}`} className="c-todo__kind" aria-label={`${group.title} (${groupCount(group)})`}>
        <CorpRows label={group.title}>{group.rows.map(rowOf)}</CorpRows>
      </section>)}
    </CorpCard>);
  }
  const title = moreView ? "Later and past" : "Things to do";
  // A7: a single-column page, capped at the kit's narrow width on desktop.
  return <CorpPage className="c-todo c-page--narrow" labelledBy="todo-title">
    <div data-todo-state={ready ? (shown ? "ready" : "clear") : connection} hidden />
    {/* Phone: "‹ Home" over the page; when Things to do is a tab of its own the shell hides it and the large title shows. */}
    <CorpNav back={moreView ? { href: "/app/inbox", label: "Things to do" } : { href: "/app", label: "Home" }} title={title} phoneOnly />
    <CorpTitle id="todo-title" title={title} sub={moreView ? undefined : <span role="status" className="c-sr">{summary}</span>} wide />
    {ready && todayFailed ? <CorpCard as="div" ariaLabel="Clock-ins"><CorpBody>
      <p className="c-todo__state">Clock-ins can’t be checked right now.</p>
      <CorpButton kind="secondary" size="md" onClick={onRefresh}>Try again</CorpButton>
    </CorpBody></CorpCard> : null}
    {body}
    {/* Every request list stays one tap away, with or without waiting items (the menus no longer carry them), and what
      * Things to do doesn't count (planning, earlier gaps) is one quiet link, with no number competing with the cards. */}
    {!moreView ? <nav className="c-todo__links" aria-label="More lists">
      <Link href="/app/requests" aria-label="All time off requests">Time off requests</Link>
      <Link href="/app/exchange" aria-label="All shift requests">Shift requests</Link>
      <Link href="/app/inbox?view=more" aria-label="Later and past items, not counted in today’s total">Later and past</Link>
    </nav> : null}
    {ready?.limitedAttendance ? <CorpNote>Some attendance comparisons are unavailable.</CorpNote> : null}
  </CorpPage>;
}
