"use client";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";

import Link from "next/link";
import { useToday } from "./manager-today";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowsClockwiseIcon, ArrowsLeftRightIcon, CalendarBlankIcon, CalendarMinusIcon, CaretDownIcon, ClockIcon, UserCheckIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { useActionCenter, mobileActionDetail, type ActionCenterConnection } from "./manager-action-center";
import { actionCenterNavigation } from "./action-center-navigation";
import { EmptyState } from "./empty-state";
import { Celebration } from "./celebration";
import { Avatar, Button, Card, Freshness, KitStack, MetaParts, PageBand, Row, Rows, Status, Tile } from "./kit/kit";
import { usePresentation } from "./presentation-context";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { KeepSelectedVisible } from "./kit/keep-selected-visible";
import { CLOCK_IN, groupHeading, presentItem } from "@/lib/action-center/present";
import { groupInboxItems, inboxFilter, type InboxFilter } from "@/lib/action-center/inbox";
import { needsYou, needsYouDetail } from "@/lib/action-center/needs-you";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";

const statusText = {
  loading: "Loading your Inbox…", reconnecting: "Reconnecting…", offline: "You’re offline. This updates when you reconnect.", paused: "Paused while you’re away. It updates when you come back.",
  unavailable: "The Inbox isn’t available right now.", access_lost: "Sign in again to see your Inbox.", ready: "The Inbox isn’t available right now.",
} as const;

const filters: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "now", label: "Act now" }, { value: "requests", label: "Requests" }, { value: "planning", label: "Plan ahead" },
];

const emptyText: Record<InboxFilter, string> = {
  all: "Nothing needs you right now.",
  now: "Nothing to act on now. Shifts with no clock-in and urgent gaps show up here.",
  requests: "No requests are waiting. New time-off and shift requests show up here.",
  planning: "Nothing to plan ahead right now.",
};

const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

/** What one Inbox row shows, and what the desktop detail pane shows for it (Phase 4). */
type InboxEntry = {
  key: string; href: string; label: string; leading: ReactNode; title: ReactNode; meta?: ReactNode; action: string; status?: ReactNode; urgent?: boolean;
  /** Detail pane only: labelled facts and one plain sentence on what to do. */
  facts?: [string, ReactNode][]; note?: string; secondary?: { href: string; label: string }; paneMeta?: boolean;
};

/** Desktop list and detail (Phase 4): the row a wide screen has selected, and how to select one. */
const Selection = createContext<{ selected: string | null; select: (entry: InboxEntry, event: MouseEvent<HTMLAnchorElement>) => void } | null>(null);

/** One row. The whole row opens the item's full review; its action is a teal link line (F4),
 * its condition a status pill. O1: never a decision from here. On a wide screen the row shows the item in
 * the detail pane instead, and the pane's button opens the full review. */
function KitRow({ entry }: { entry: InboxEntry }) {
  const selection = useContext(Selection);
  const selected = selection?.selected === entry.key;
  return <li className="inbox-row" data-urgent={entry.urgent || undefined} data-selected={selected || undefined}>
    <Link className="nv-row" data-leading="true" href={entry.href} aria-label={entry.label} data-inbox-key={entry.key}
      aria-current={selected ? "true" : undefined} onClick={event => selection?.select(entry, event)}>
      {entry.leading}
      <span className="nv-row__text">
        <span className="nv-row__title">{entry.title}</span>
        {entry.meta ? <span className="nv-row__meta">{entry.meta}</span> : null}
        <span className="nv-row__status">{entry.status}<span className="inbox-action" aria-hidden="true">{entry.action}</span></span>
      </span>
    </Link>
  </li>;
}

/** Review links remember the Inbox filter, so Back and the decision return to it (IS-14). */
function withFilter(href: string, filter: InboxFilter) {
  const url = new URL(href, "https://nevora.invalid");
  if (url.pathname !== "/app/requests") return href;
  url.searchParams.set("filter", filter);
  url.hash = "";
  return url.pathname + url.search;
}

const requestNote = "The dates, the length and any note are on the request. Approve or decline it there.";
/** TCD-02: what the pane's button leads to, item by item. */
const typeNote: Partial<Record<ActionItem["type"], string>> = {
  COVERAGE_GAP: "This shift still needs people. Open the coverage gap to fill it.",
  TARGET_MISSING: "Set a weekly hour target in Scheduling rules.",
  HOURS_REVIEW: "Their scheduled hours are outside their weekly target. Check the schedule.",
  AVAILABILITY_MISSING: "Only they can send it. Open Availability to see who hasn’t.",
  ACKNOWLEDGEMENT_MISSING: "Only they can confirm it. Open the schedule to see who hasn’t.",
  DEADLINE_MISSING: "Set when availability is due for this week, on the Schedule.",
  COVERAGE_RULES_MISSING: "Set how many people each shift needs in Scheduling rules.",
  TIMECARD: "Open the timecard to check it before it’s approved.",
  TIME_CORRECTION: "Open it to see the change they asked for.",
  ATTENDANCE: "Open Attendance to see what was recorded.",
};
const categoryNote: Record<ActionItem["category"], string> = {
  scheduling: "Open it to fix it on the schedule.",
  timekeeping: "Open it to see the recorded time.",
  requests: requestNote,
};

/** Codex's optional request facts (arrive with the backend merge): dates, partial-day times, length, location, note. */
type RequestFacts = { startDate: string; endDate: string; partialDay?: { start: string; end: string }; lengthText: string; locationName: string; note?: string; reviewHref?: string };
const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00Z`));
const timeText = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); if (h === 24 || (h === 0 && m === 0)) return "midnight"; return `${(h % 12) || 12}:${String(m).padStart(2, "0")}\u00a0${h < 12 ? "AM" : "PM"}`; };
function requestFacts(facts: RequestFacts): [string, ReactNode][] {
  const dates = facts.startDate === facts.endDate ? dayText(facts.startDate) : `${dayText(facts.startDate)} – ${dayText(facts.endDate)}`;
  return [
    ["Dates", <span key="d" className="nv-keep">{dates}</span>],
    ...(facts.partialDay ? [["Time", <span key="t" className="nv-nowrap">{timeText(facts.partialDay.start)}&nbsp;– {timeText(facts.partialDay.end)}</span>] as [string, ReactNode]] : []),
    ["Length", facts.lengthText],
    ["Works at", facts.locationName],
    ...(facts.note ? [["Note", facts.note] as [string, ReactNode]] : []),
  ];
}

function itemEntry(item: ActionItem, calm: boolean, filter: InboxFilter, timeZone: string): InboxEntry {
  const urgent = item.priority === "URGENT" && !calm;
  const request = item.category === "requests";
  const Icon = urgent ? WarningCircleIcon : item.category === "timekeeping" ? ClockIcon : request ? UserCheckIcon : CalendarBlankIcon;
  const action = actionCenterNavigation(item);
  const shown = presentItem({ ...item, detail: mobileActionDetail(item.detail) }, action.label, timeZone);
  const facts = request ? (item as ActionItem & { request?: RequestFacts }).request : undefined;
  return { key: item.id, href: withFilter(action.href, filter), label: `${shown.action}: ${shown.title}, ${shown.detail.replace(/\u00a0/g, " ")}`, urgent,
    leading: request && shown.person ? <Avatar initials={initials(shown.person)} waiting /> : <Tile tone={urgent ? "urgent" : request ? "review" : "neutral"}><Icon size={20} weight="bold" /></Tile>,
    title: shown.title, meta: <MetaParts text={shown.detail} />, action: shown.action,
    status: request ? <Status tone="review">Waiting</Status> : urgent ? <Status tone="urgent">Not covered</Status> : undefined,
    note: calm ? "This time has passed. Review it for the record; it doesn’t need action now."
      : facts ? "Approve or decline it on the full request." : item.category === "requests" ? requestNote : typeNote[item.type] ?? categoryNote[item.category],
    facts: facts ? requestFacts(facts) : undefined };
}

function ItemRow({ item, calm = false, filter = "all", timeZone = "UTC" }: { item: ActionItem; /** Past work (C2): no urgent styling. */ calm?: boolean; filter?: InboxFilter; timeZone?: string }) {
  return <KitRow entry={itemEntry(item, calm, filter, timeZone)} />;
}

function shiftEntry(shift: TodayShift, timeZone: string): InboxEntry {
  const running = shift.status === "not_clocked_in";
  const href = running ? `/app/employees/${encodeURIComponent(shift.employeeId)}` : `/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`;
  const action = running ? "Contact" : "Review timecard";
  // The pill says what happened, so the meta line is only when and where.
  const when = running ? `Started ${clock(shift.startAt, timeZone)}` : `${clock(shift.startAt, timeZone)}\u00a0– ${clock(shift.endAt, timeZone)}`;
  const condition = running ? "Not clocked in" : `No ${CLOCK_IN}`;
  return { key: `shift:${shift.id}`, href, label: `${action} for ${shift.employeeName}: ${condition}`, urgent: true,
    leading: <Avatar initials={initials(shift.employeeName)} />, title: shift.employeeName,
    meta: <><span className="nv-nowrap">{when}</span> · <span className="nv-nowrap">{shift.locationName}</span></>, action,
    status: <Status tone="urgent">{condition}</Status>,
    // TCD-08: the pane says each thing once: the pill is the condition, the facts are when and where, the note is what to do.
    paneMeta: false,
    facts: [["Shift", <span key="t" className="nv-nowrap">{clock(shift.startAt, timeZone)}&nbsp;– {clock(shift.endAt, timeZone)}</span>], ["Location", shift.locationName]],
    note: running ? "Check in with them, or look at the Clocker." : "Check the timecard before you approve it.",
    secondary: running ? { href: `/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`, label: "Open timecard" } : undefined };
}

function ShiftRow({ shift, timeZone }: { shift: TodayShift; timeZone: string }) {
  return <KitRow entry={shiftEntry(shift, timeZone)} />;
}

function Group({ items, calm, filter, timeZone }: { items: ActionItem[]; calm: boolean; filter: InboxFilter; timeZone: string }) {
  return <ul className="nv-rows inbox-list">{groupInboxItems(items).map(entry => entry.kind === "item"
    ? <ItemRow key={entry.item.id} item={entry.item} calm={calm} filter={filter} timeZone={timeZone} />
    : <li key={entry.key} className="premium-group">
      <details>
        <summary className="nv-row" data-leading="true">
          <Tile tone={entry.items[0].priority === "URGENT" && !calm ? "urgent" : "neutral"}><CalendarBlankIcon size={20} weight="bold" /></Tile>
          <span className="nv-row__text"><span className="nv-row__title">{groupHeading(entry.items[0].type, entry.items.length, entry.title)}</span>
            {entry.items.some(item => item.dateTime) ? <span className="nv-row__meta">Oldest first</span> : null}</span>
          <span className="nv-row__trail"><CaretDownIcon className="inbox-group-caret" size={18} aria-hidden="true" /></span>
        </summary>
        <ul className="nv-rows inbox-list">{entry.items.map(item => <ItemRow key={item.id} item={item} calm={calm} filter={filter} timeZone={timeZone} />)}</ul>
      </details>
    </li>)}</ul>;
}

function Section({ id, title, count, note, children }: { id: string; title: string; count: number; note?: string; children: ReactNode }) {
  return <Card id={`inbox-${id}`} titleLabel={`${title}, ${count}`} title={<>{title}<span className="inbox-section-count" aria-hidden="true">{count}</span></>}>
    {note ? <p className="inbox-section-note">{note}</p> : null}
    {children}
  </Card>;
}

export function ManagerInbox({ weekStart, actorId, timeZone }: { weekStart: string; actorId: string; timeZone: string }) {
  const { snapshot, connection, refresh } = useActionCenter(weekStart, actorId);
  const { snapshot: today, refresh: refreshToday } = useToday();
  // W2: ?filter= is the source of truth, so Back from a review restores it.
  const initialFilter = inboxFilter(useSearchParams()?.get("filter"));
  // Refresh asks both reads again: the action center and today's clock-ins.
  return <InboxSurface snapshot={snapshot} today={today} connection={connection} onRefresh={() => { refresh(); refreshToday(); }} timeZone={timeZone} initialFilter={initialFilter} />;
}

/** Presentation only: receives the released action center observation and today's shifts. */
export function InboxSurface({ snapshot, today = null, connection, onRefresh: refresh, timeZone, initialFilter = "all" }: {
  snapshot: ActionCenter | null; today?: Today | null; connection: ActionCenterConnection; onRefresh: () => void; timeZone: string; initialFilter?: InboxFilter;
}) {
  const [filter, setFilter] = useState<InboxFilter>(initialFilter);
  // Phase 4: on a wide screen the Inbox is a list with a detail pane. The URL keeps the selection, so Back from a review restores it.
  const wide = useSyncExternalStore(wideSubscribe, () => window.matchMedia(WIDE).matches, () => false);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => typeof window === "undefined" ? null : new URL(window.location.href).searchParams.get("item"));
  const focusPane = useRef(false);
  // IS-P4-17: a Refresh the user asks for says so until the new read lands (background re-reads stay silent).
  const [refreshFrom, setRefreshFrom] = useState<string | null>(null);
  // ST-P4-03: once the list has shown, a pause, an offline spell, a refresh or a failed read keeps both columns
  // and the list's last height on desktop (as Home does), so nothing collapses and the scroll position holds.
  const listColumn = useRef<HTMLDivElement>(null);
  const [lastListHeight, setLastListHeight] = useState(0);
  const [hasShown, setHasShown] = useState(false);
  // Follow the URL when it changes underneath us (Back, a new link).
  const [urlFilter, setUrlFilter] = useState(initialFilter);
  if (urlFilter !== initialFilter) { setUrlFilter(initialFilter); setFilter(initialFilter); }
  // W2: the filter lives in the URL, so a review page's Back returns to it.
  const choose = (value: InboxFilter) => {
    setFilter(value);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("filter"); else url.searchParams.set("filter", value);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  };
  const ready = connection === "ready" && snapshot?.state === "ready" ? snapshot : null;
  // The workspace's date at the time of this observation, so server and browser agree.
  const day = ready ? new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ready.observedAt)) : undefined;
  const shifts = today?.state === "ready" ? today.missed : [];
  // IS-6: when clock-ins can't be read, say so instead of quietly dropping them.
  const todayFailed = today?.state === "unavailable";
  const value = ready ? needsYou(ready.items, day, shifts) : null;
  const total = value ? value.count + value.planning.length + value.past.length : 0;
  const updated = ready ? clock(ready.observedAt, timeZone) : null;
  const show = (group: InboxFilter) => filter === "all" || filter === group;
  // The rows on screen, in order; the pane shows the selected one, or the first.
  const entries: InboxEntry[] = value ? [
    ...(show("now") ? [...value.noClockIn.map(shift => shiftEntry(shift, timeZone)), ...value.now.map(item => itemEntry(item, false, filter, timeZone))] : []),
    ...(show("requests") ? value.requests.map(item => itemEntry(item, false, filter, timeZone)) : []),
    ...(show("planning") ? [...value.planning.map(item => itemEntry(item, false, filter, timeZone)), ...value.past.map(item => itemEntry(item, true, filter, timeZone))] : []),
  ] : [];
  const current = entries.find(entry => entry.key === selectedKey) ?? entries[0] ?? null;
  const select = (entry: InboxEntry, event: MouseEvent<HTMLAnchorElement>) => {
    if (!wide || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    focusPane.current = true;
    setSelectedKey(entry.key);
    const url = new URL(window.location.href);
    url.searchParams.set("item", entry.key);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  };
  const showing = !!ready && total > 0;
  const userRefreshing = refreshFrom !== null && !!ready && ready.observedAt === refreshFrom;
  if (refreshFrom !== null && !userRefreshing) setRefreshFrom(null);
  if (showing && !hasShown) setHasShown(true);
  // IS-P4-21: when the list goes away under the reader's focus, focus lands on the status message, not on the page body.
  useEffect(() => {
    if (ready || !hasShown) return;
    if (document.activeElement === document.body || document.activeElement === null) document.querySelector<HTMLElement>(".premium-inbox .inbox-status-message")?.focus({ preventScroll: true });
  }, [ready, hasShown]);
  useLayoutEffect(() => {
    const column = listColumn.current;
    if (!column || !showing) return;
    const measure = () => setLastListHeight(Math.round(column.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(column);
    return () => observer.disconnect();
  }, [showing]);
  // IS-P4-04: a selected row inside a closed group (a deep link, Back, or the Plan ahead fallback) opens its group, so it shows.
  const shownKey = wide && current ? current.key : null;
  useEffect(() => {
    if (!shownKey) return;
    document.querySelector<HTMLElement>(`[data-inbox-key="${CSS.escape(shownKey)}"]`)?.closest("details:not([open])")?.setAttribute("open", "");
  }, [shownKey]);
  useEffect(() => {
    if (!focusPane.current) return;
    focusPane.current = false;
    document.getElementById("inbox-detail-title")?.focus({ preventScroll: true });
  }, [selectedKey]);

  return <div className="nv-page manager-inbox premium-inbox" data-nv-page="" data-inbox-state={ready ? (total ? "ready" : "clear") : connection}>
    <PageBand title="Inbox"
      eyebrow={updated ? <Freshness>Updated <time dateTime={ready!.observedAt}>{updated}</time></Freshness>
        : connection === "offline" ? <Freshness state="offline">Offline</Freshness> : connection === "paused" ? <Freshness state="stale">Paused</Freshness>
        : connection === "loading" || connection === "reconnecting" ? "Checking…" : <Freshness state="stale">Not available</Freshness>}
      summary={<span className="premium-inbox-summary">{value ? `${needsYouDetail(value)}${todayFailed ? " Clock-ins can’t be checked right now." : ""}` : connection === "loading" || connection === "reconnecting" ? "Checking what needs you…" : "Requests and problems to resolve."}</span>}
      aside={<button type="button" className="nv-band-control" onClick={() => { if (userRefreshing) return; if (ready) setRefreshFrom(ready.observedAt); refresh(); }}
        disabled={connection === "loading" || connection === "reconnecting"} aria-disabled={userRefreshing || undefined}>
        <ArrowsClockwiseIcon size={18} aria-hidden="true" />{userRefreshing ? "Refreshing…" : "Refresh"}
        <span className="nv-sr" role="status">{userRefreshing ? "Refreshing the Inbox…" : ""}</span>
      </button>}
      // ST-02: the filters are there from the first paint (disabled until the read is ready), so the band never grows.
      // IS-59: while they are disabled the scrolling row would become an empty Tab stop; tabIndex -1 keeps it out.
      extra={!ready || total ? <div className="nv-filters premium-inbox-filters" role="group" aria-label="Show" tabIndex={ready ? undefined : -1}>
        {filters.map(entry => <button key={entry.value} type="button" className="nv-filter" aria-pressed={filter === entry.value} disabled={!ready} onClick={() => choose(entry.value)}>{entry.label}</button>)}
        <KeepSelectedVisible />
      </div> : null} />
    <KitStack>
      <Selection.Provider value={{ selected: shownKey, select }}>
      {/* The pane's column is there in every state but "all caught up", so the list never changes width. */}
      <div className="inbox-columns" data-detail={!ready || total ? "true" : undefined}>
      {/* IS-P4-06: Up and Down move between rows and group headings (D6). */}
      {/* ST-P4-03: the held height is part of this render, so the page never empties under the reader and scroll stays put. */}
      <div className="inbox-list-column" ref={listColumn} data-row-nav=".inbox-row, .premium-group > details > summary"
        style={!ready && hasShown && lastListHeight ? { minHeight: `${lastListHeight}px` } : undefined}>
      {/* Desktop only, first in reading and Tab order (IS-P4-16). It appears once the list has shown, so it doesn't jump on load. */}
      {ready || hasShown ? <AllRequests /> : null}
      {!ready ? <Card><div className="inbox-status nv-card__body">
        {/* ST-26: the status line comes first, so it stays put when the placeholder rows go. */}
        <p role="status" tabIndex={-1} className="inbox-status-message">{statusText[connection]}</p>
        {connection === "loading" || connection === "reconnecting" ? <div className="premium-skeleton" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span>)}</div> : null}
        {connection === "access_lost" ? <Link className="nv-link" href="/login">Sign in</Link>
          : connection === "unavailable" || connection === "ready" ? <button type="button" className="nv-btn" data-kind="primary" onClick={() => { refresh(); focusAfterRetry(".premium-inbox .nv-content .nv-card:not(:has(.inbox-status)) :is(.nv-card__title, h2, h3)", ".inbox-status .nv-btn"); }}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button> : null}
      </div></Card> : total === 0 ? <Card><div className="inbox-clear nv-card__body">
        <EmptyState illustration="all-caught-up" status title="All caught up">
          Nothing needs you right now.{ready.limitedAttendance ? " Some attendance comparisons are unavailable." : ""}
        </EmptyState>
        {ready.limitedAttendance ? null : <Celebration kind="INBOX_CLEAR" eventKey={ready.observedAt.slice(0, 10)} confirmed />}
      </div></Card> : <>
        {show("now") && todayFailed ? <Card title="Clock-ins">
          <div className="nv-card__body"><p className="premium-note">Today’s clock-ins can’t be checked right now, so shifts with no clock-in aren’t listed. Everything else here is current.</p>
            <button type="button" className="nv-btn" data-kind="secondary" onClick={refresh}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button></div>
        </Card> : null}
        {show("now") && (value!.noClockIn.length || value!.now.length) ? <div id="missed-punches">
          <Section id="urgent" title="Act now" count={value!.noClockIn.length + value!.now.length}>
            <ul className="nv-rows inbox-list">
              {value!.noClockIn.map(shift => <ShiftRow key={shift.id} shift={shift} timeZone={timeZone} />)}
              {value!.now.map(item => <ItemRow key={item.id} item={item} filter={filter} timeZone={timeZone} />)}
            </ul>
          </Section>
        </div> : null}
        {show("requests") && value!.requests.length ? <Section id="requests" title="Requests" count={value!.requests.length}>
          <Group items={value!.requests} calm={false} filter={filter} timeZone={timeZone} />
        </Section> : null}
        {show("planning") && value!.planning.length ? <Section id="exceptions" title="Plan ahead" count={value!.planning.length} note="Setup and planning for the coming weeks. None of it is urgent.">
          <Group items={value!.planning} calm={false} filter={filter} timeZone={timeZone} />
        </Section> : null}
        {show("planning") && value!.past.length ? <Section id="past" title="Earlier this week" count={value!.past.length} note="These times have passed. Review them for the record; they don’t need action now.">
          <Group items={value!.past} calm filter={filter} timeZone={timeZone} />
        </Section> : null}
        {filter !== "all" && !hasEntries(filter, value!) ? <Card title={filters.find(entry => entry.value === filter)?.label}>
          <div className="nv-card__body"><p className="premium-note">{emptyText[filter]}</p>
            {filter === "requests" ? <Link className="nv-link" href="/app/requests?tab=approved">See decided time off</Link> : null}</div>
        </Card> : null}
        {ready.limitedAttendance ? <p className="inbox-note">Some attendance comparisons are unavailable. Check the attendance view for details.</p> : null}
      </>}
      </div>
      <div className="inbox-side-column">
        {ready && total ? current ? <InboxDetail entry={current} /> : null
          : !ready ? <DetailPlaceholder still={connection !== "loading" && connection !== "reconnecting"} /> : null}
      </div>
      </div>
      </Selection.Provider>
    </KitStack>
  </div>;
}

const WIDE = "(min-width: 1024px)";
function wideSubscribe(change: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
}

/** The desktop detail pane: the selected row's facts and its one action, which opens the full review. */
function InboxDetail({ entry }: { entry: InboxEntry }) {
  return <section className="nv-card inbox-detail" aria-labelledby="inbox-detail-title"
    onKeyDown={event => {
      // Escape, or Shift+Tab from the heading, goes back to the selected row (IS-P4-06).
      const back = event.key === "Escape" || (event.key === "Tab" && event.shiftKey && event.target === document.getElementById("inbox-detail-title"));
      if (!back) return;
      const row = document.querySelector<HTMLElement>(`[data-inbox-key="${CSS.escape(entry.key)}"]`);
      if (!row) return;
      event.preventDefault();
      row.closest("details")?.setAttribute("open", "");
      row.focus();
    }}>
    <div className="inbox-detail__head">
      {entry.leading}
      <div className="inbox-detail__heading">
        <h2 className="inbox-detail__title" id="inbox-detail-title" tabIndex={-1}>{entry.title}</h2>
        {entry.meta && entry.paneMeta !== false ? <p className="inbox-detail__meta">{entry.meta}</p> : null}
      </div>
    </div>
    {entry.status ? <div className="inbox-detail__status">{entry.status}</div> : null}
    {entry.facts ? <dl className="inbox-detail__facts">{entry.facts.map(([label, fact]) => <div key={label} data-fact={label === "Note" ? "note" : undefined}><dt>{label}</dt><dd>{fact}</dd></div>)}</dl> : null}
    {entry.note ? <p className="inbox-detail__note">{entry.note}</p> : null}
    <div className="inbox-detail__actions">
      <Button href={entry.href}>{entry.action}</Button>
      {entry.secondary ? <Link className="nv-link" href={entry.secondary.href}>{entry.secondary.label}</Link> : null}
    </div>
  </section>;
}

/** While the Inbox loads, the pane holds its place. */
function DetailPlaceholder({ still = false }: { still?: boolean }) {
  return <section className="nv-card inbox-detail inbox-detail--placeholder" aria-hidden="true">
    <div className={still ? "premium-skeleton premium-skeleton--still" : "premium-skeleton"}><span className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span></div>
  </section>;
}

/** D-4: Requests folds into Inbox on desktop, so its three pages are one step away here. Desktop only. TCD-07: not "All requests",
 * which the Time off page uses for the Inbox's Requests filter. */
function AllRequests() {
  const { modules } = usePresentation();
  const pages = [
    { href: "/app/requests", title: "Time off", meta: "Pending, approved and declined", icon: <CalendarMinusIcon size={20} weight="bold" /> },
    { href: "/app/exchange", title: "Shift requests", meta: "Swaps and shifts people can’t work", icon: <ArrowsLeftRightIcon size={20} weight="bold" /> },
    { href: "/app/availability", title: "Availability", meta: "When people can work", icon: <UserCheckIcon size={20} weight="bold" /> },
  ].filter(page => pathEnabled(page.href, modules));
  if (!pages.length) return null;
  return <Card id="inbox-all-requests" title="Request pages">
    <Rows label="Request pages">
      {pages.map(page => <Row key={page.href} href={page.href} title={page.title} meta={page.meta} leading={<Tile>{page.icon}</Tile>} />)}
    </Rows>
  </Card>;
}

function hasEntries(filter: InboxFilter, value: ReturnType<typeof needsYou>) {
  if (filter === "now") return value.noClockIn.length + value.now.length > 0;
  if (filter === "requests") return value.requests.length > 0;
  if (filter === "planning") return value.planning.length + value.past.length > 0;
  return true;
}
