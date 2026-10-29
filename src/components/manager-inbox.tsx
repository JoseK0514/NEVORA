"use client";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";

import Link from "next/link";
import { ScopedReadFrame, type ScopedObservation } from "./company-access/scoped-read-frame";
import { useToday } from "./manager-today";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowsLeftRightIcon, CalendarBlankIcon, CaretDownIcon, CaretRightIcon, ChatTextIcon, ClockIcon, PhoneIcon, PlusIcon, UserCheckIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { useActionCenter, mobileActionDetail, type ActionCenterConnection } from "./manager-action-center";
import { actionCenterNavigation } from "./action-center-navigation";
import { EmptyState } from "./empty-state";
import { Celebration } from "./celebration";
import { Avatar, Button, Card, Freshness, KitStack, MetaParts, PageBand, Status, Tile } from "./kit/kit";
import { QuietHeader } from "./quiet/quiet";
import { usePresentation } from "./presentation-context";
import { pathEnabled } from "@/lib/workspace-presentation/modules";
import { CLOCK_IN, presentItem } from "@/lib/action-center/present";
import { groupInboxItems, inboxFilter, type InboxFilter } from "@/lib/action-center/inbox";
import { needsYou, needsYouSentence } from "@/lib/action-center/needs-you";
import { keepWhole } from "@/lib/keep-whole";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";

const statusText = {
  loading: "Loading your Inbox…", reconnecting: "Reconnecting…", offline: "You’re offline. This updates when you reconnect.", paused: "Paused while you’re away. It updates when you come back.",
  unavailable: "The Inbox isn’t available right now.", access_lost: "Sign in again to see your Inbox.", ready: "The Inbox isn’t available right now.",
} as const;

const filters: { value: InboxFilter; label: string }[] = [
  { value: "now", label: "Act now" }, { value: "requests", label: "Requests" }, { value: "planning", label: "Plan ahead" },
];

const emptyText: Record<InboxFilter, string> = {
  all: "Nothing needs you right now.",
  now: "Nothing to act on now.",
  requests: "No requests are waiting.",
  planning: "Nothing to plan ahead right now.",
};

const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

/** What one Inbox row shows, and what the desktop detail pane shows for it (Phase 4). */
type InboxEntry = {
  key: string; href: string; label: string; leading?: ReactNode; title: ReactNode; meta?: ReactNode; action: string; status?: ReactNode; urgent?: boolean;
  /** Clean Manager (v3): a short value on the right ("2h 15m", "Waiting"). Decoration: the status says it to screen readers. */
  trailing?: ReactNode; trailingTone?: "urgent" | "review";
  /** Quiet (v4): a row whose only action is one small button ("Find cover"). */
  button?: string;
  /** Detail pane only: labelled facts and one plain sentence on what to do. */
  facts?: [string, ReactNode][]; note?: string; secondary?: { href: string; label: string }[]; paneMeta?: boolean;
  /** PD5: a phone number the manager already sees on Team, so a no-clock-in can be answered with Call or Text. */
  contact?: { phone: string; name: string; observation: ScopedObservation };
};

/** Phone numbers by employee ID, from the Team directory the viewer can already read (company-wide Managers and Owners). */
type InboxContacts = { phones: Readonly<Record<string, string>>; observation: ScopedObservation };
const Phones = createContext<InboxContacts | null>(null);
/** "tel:" and "sms:" take digits and a leading plus only. */
const dialable = (phone: string) => phone.trim().replace(/(?!^\+)[^\d]/g, "");

/** Desktop list and detail (Phase 4): the row a wide screen has selected, and how to select one. */
const Selection = createContext<{ selected: string | null; select: (entry: InboxEntry, event: MouseEvent<HTMLAnchorElement>) => void } | null>(null);

/** One row. The whole row opens the item's full review; its action is a teal link line (F4),
 * its condition a status pill. O1: never a decision from here. On a wide screen the row shows the item in
 * the detail pane instead, and the pane's button opens the full review. */
function KitRow({ entry }: { entry: InboxEntry }) {
  const selection = useContext(Selection);
  const selected = selection?.selected === entry.key;
  // Quiet (v4): name, one detail line, a value on the right (the one red is how late someone is), a chevron or one small button.
  return <li className="inbox-row" data-urgent={entry.urgent || undefined} data-selected={selected || undefined}>
    {entry.button ? <div className={`q-row${entry.leading ? " q-row--av" : ""}${entry.meta ? "" : " q-row--one"}`} data-inbox-key={entry.key} aria-current={selected ? "true" : undefined}>
      {entry.leading}
      <span className="q-rt"><b>{entry.title}</b>{entry.meta ? <i>{entry.meta}</i> : null}</span>
      <Link className="q-bs" href={entry.href} aria-label={entry.label} onClick={event => selection?.select(entry, event)}>{entry.button}</Link>
    </div> : <Link className={`q-row${entry.leading ? " q-row--av" : ""}${entry.meta ? "" : " q-row--one"}`} href={entry.href} aria-label={entry.label} data-inbox-key={entry.key}
      aria-current={selected ? "true" : undefined} onClick={event => selection?.select(entry, event)}>
      {entry.leading}
      <span className="q-rt"><b>{entry.title}</b>{entry.meta ? <i>{entry.meta}</i> : null}</span>
      {entry.trailing ? <span className={`q-rv${entry.trailingTone === "urgent" ? " q-rv--alert" : ""}`} aria-hidden="true">{entry.trailing}</span> : null}
      <CaretRightIcon className="q-chev" aria-hidden="true" />
    </Link>}
  </li>;
}

/** Review links remember the Inbox filter, so Back and the decision return to it (IS-14),
 * and the row they came from, so Back to Inbox reselects it (IS-P4-11; the review reads `item`). */
function withFilter(href: string, filter: InboxFilter, item?: string) {
  const url = new URL(href, "https://nevora.invalid");
  if (url.pathname !== "/app/requests") return href;
  url.searchParams.set("filter", filter);
  if (item) url.searchParams.set("item", item);
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
const wholeDays = (start: string, end: string) => { const days = Math.round((Date.parse(`${end}T12:00:00Z`) - Date.parse(`${start}T12:00:00Z`)) / 86_400_000) + 1; return days === 1 ? "Full day" : `${days} full days`; };
function requestFacts(facts: RequestFacts): [string, ReactNode][] {
  // Each day stays whole; at large text a range breaks only after the dash.
  const dates = facts.startDate === facts.endDate ? <span className="nv-nowrap">{dayText(facts.startDate)}</span>
    : <><span className="nv-nowrap">{dayText(facts.startDate)}{"\u00a0–"}</span> <span className="nv-nowrap">{dayText(facts.endDate)}</span></>;
  return [
    ["Dates", <span key="d" className="nv-keep">{dates}</span>],
    ...(facts.partialDay ? [["Time", <span key="t" className="nv-keep">{keepWhole(`${timeText(facts.partialDay.start)} – ${timeText(facts.partialDay.end)}`)}</span>] as [string, ReactNode]] : []),
    // r4 QA: whole days read as the review does ("Full day", "2 full days"); a partial day keeps the read's duration.
    ["Length", facts.partialDay ? facts.lengthText : wholeDays(facts.startDate, facts.endDate)],
    ["Works at", facts.locationName],
    ...(facts.note ? [["Note", facts.note] as [string, ReactNode]] : []),
  ];
}

function itemEntry(item: ActionItem, calm: boolean, filter: InboxFilter, timeZone: string): InboxEntry {
  const urgent = item.priority === "URGENT" && !calm;
  const request = item.category === "requests";
  const action = actionCenterNavigation(item);
  const shown = presentItem({ ...item, detail: mobileActionDetail(item.detail) }, action.label, timeZone);
  const facts = request ? (item as ActionItem & { request?: RequestFacts }).request : undefined;
  return { key: item.id, href: withFilter(action.href, filter, item.id), label: `${shown.action}: ${shown.title}, ${shown.detail.replace(/\u00a0/g, " ")}`, urgent,
    leading: request && shown.person ? <span className="q-av" aria-hidden="true">{initials(shown.person)}</span> : undefined,
    title: shown.title, meta: <MetaParts text={shown.detail} />, action: shown.action,
    status: request ? <Status tone="review">Waiting</Status> : urgent ? <Status tone="urgent">Not covered</Status> : undefined,
    trailing: undefined,
    note: calm ? "This time has passed. Review it for the record; it doesn’t need action now."
      : facts ? "Approve or decline it on the full request." : item.category === "requests" ? requestNote : typeNote[item.type] ?? categoryNote[item.category],
    facts: facts ? requestFacts(facts) : undefined };
}

function ItemRow({ item, calm = false, filter = "all", timeZone = "UTC" }: { item: ActionItem; /** Past work (C2): no urgent styling. */ calm?: boolean; filter?: InboxFilter; timeZone?: string }) {
  return <KitRow entry={itemEntry(item, calm, filter, timeZone)} />;
}

/** "3h 15m" since the shift started, from the observation time (never the browser clock). */
function lateBy(shift: TodayShift, observedAt: string | undefined) {
  if (!observedAt) return undefined;
  const minutes = Math.floor((Date.parse(observedAt) - Date.parse(shift.startAt)) / 60_000);
  if (!(minutes > 0)) return undefined;
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

export function shiftEntry(shift: TodayShift, timeZone: string, observedAt?: string, showPlace = true, phone?: string, observation?: ScopedObservation): InboxEntry {
  const contact = phone && observation && dialable(phone) ? { phone: dialable(phone), name: shift.employeeName, observation } : undefined;
  const running = shift.status === "not_clocked_in";
  const href = running ? `/app/employees/${encodeURIComponent(shift.employeeId)}` : `/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`;
  const action = running ? "Contact" : "Review timecard";
  // The pill says what happened, so the meta line is only when and where.
  const when = running ? `Shift began at ${clock(shift.startAt, timeZone)}` : `Shift ended at ${clock(shift.endAt, timeZone)}`;
  const condition = running ? "Not clocked in" : `No ${CLOCK_IN}`;
  return { key: `shift:${shift.id}`, href, label: `${action} for ${shift.employeeName}: ${condition}`, urgent: true,
    leading: <span className="q-av" aria-hidden="true">{initials(shift.employeeName)}</span>, title: shift.employeeName,
    // P3-WR-11: each part stays whole and moves to the next line as a unit, so nothing is clipped at large text.
    meta: showPlace ? <MetaParts text={`${keepWhole(when)} · ${shift.locationName}`} /> : keepWhole(when), action,
    status: <Status tone="urgent">{condition}</Status>,
    trailing: running ? lateBy(shift, observedAt) : undefined, trailingTone: "urgent",
    // TCD-08: the pane says each thing once: the pill is the condition, the facts are when and where, the note is what to do.
    paneMeta: false,
    facts: [["Shift", <span key="t" className="nv-keep">{keepWhole(`${clock(shift.startAt, timeZone)} – ${clock(shift.endAt, timeZone)}`)}</span>], ["Location", shift.locationName],
      ...(shift.positionName ? [["Role", shift.positionName] as [string, ReactNode]] : []),
      ...(contact ? [["Phone", <a key="p" className="nv-link nv-keep" href={`tel:${contact.phone}`}>{phone}</a>] as [string, ReactNode]] : [])],
    ...(contact ? { contact } : {}),
    note: running ? "Check in with them, or look at the Clocker." : "Check the timecard before you approve it.",
    // v3: the shift and the person are one step from here too.
    secondary: [
      ...(running ? [{ href: `/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`, label: "Open timecard" }] : []),
      // No "Edit shift" yet: Today's shift ids are the published snapshot's, not the live shift's (see CODEX.md).
      ...(running ? [] : [{ href: `/app/employees/${encodeURIComponent(shift.employeeId)}`, label: "View profile" }]),
    ] };
}

function ShiftRow({ shift, timeZone, observedAt, showPlace }: { shift: TodayShift; timeZone: string; observedAt?: string; showPlace?: boolean }) {
  const phones = useContext(Phones);
  return <KitRow entry={shiftEntry(shift, timeZone, observedAt, showPlace, phones?.phones[shift.employeeId], phones?.observation)} />;
}

/** A coverage gap shown under "Open shifts today": the place is the title, the time the detail. */
function gapEntry(item: ActionItem, filter: InboxFilter, timeZone: string): InboxEntry {
  const entry = itemEntry(item, false, filter, timeZone);
  const parts = mobileActionDetail(item.detail).split(" · ");
  return { ...entry, leading: <span className="q-av q-av--open" aria-hidden="true"><PlusIcon className="q-ic" aria-hidden="true" /></span>, title: gapPlace(item), meta: parts[1] ? keepWhole(parts[1]) : entry.meta, trailing: undefined, trailingTone: undefined, button: "Find cover" };
}
function gapPlace(item: ActionItem) {
  return /\bat (.+)$/.exec(item.title)?.[1] ?? item.detail.split(" · ")[0] ?? item.title;
}

/** A row that opens to show its items: the label, a short detail, and a count on the right (a native disclosure). */
function Disclosure({ title, meta, count, items, children }: { title: ReactNode; meta?: ReactNode; count: ReactNode; items: ActionItem[]; children: ReactNode }) {
  return <li className="premium-group cm-disclosure">
    <GroupDisclosure items={items}>
      <summary className={meta ? "q-row" : "q-row q-row--one"}>
        <span className="q-rt"><b>{title}</b>{meta ? <i>{meta}</i> : null}</span>
        <span className="q-rv q-rv--l">{count}</span>
        <CaretDownIcon className="q-chev inbox-group-caret" aria-hidden="true" />
      </summary>
      <ul className="q-list inbox-list">{children}</ul>
    </GroupDisclosure>
  </li>;
}

/** Plan ahead, one row per kind (clean Manager v3). Labels say what the count counts. */
const planLabel: Partial<Record<ActionItem["type"], string>> = {
  COVERAGE_GAP: "Open shifts later this week", TARGET_MISSING: "People without hour targets", DEADLINE_MISSING: "Availability deadline",
  AVAILABILITY_MISSING: "Availability not sent", ACKNOWLEDGEMENT_MISSING: "Schedule not confirmed", TIMECARD: "Timecards to review",
  HOURS_REVIEW: "Hours outside targets", COVERAGE_RULES_MISSING: "Coverage rules not set", TIME_CORRECTION: "Time corrections", ATTENDANCE: "Attendance to review",
};
/** One planning item on its own row: the kind as the label, and what's missing on the right. */
function planEntry(item: ActionItem, filter: InboxFilter, timeZone: string): InboxEntry {
  const entry = itemEntry(item, false, filter, timeZone);
  const missing = item.type === "DEADLINE_MISSING" || item.type === "COVERAGE_RULES_MISSING";
  return { ...entry, leading: undefined, title: planLabel[item.type] ?? entry.title, meta: missing ? undefined : entry.meta, trailing: missing ? "Not set" : undefined, trailingTone: undefined };
}

function planGroups(items: ActionItem[]) {
  const groups = new Map<string, ActionItem[]>();
  for (const item of items) groups.set(item.type, [...(groups.get(item.type) ?? []), item]);
  return [...groups].map(([type, list]) => ({ type: type as ActionItem["type"], items: list }));
}

/** ST-P4-13: a newly mounted selected group starts open, before the disclosure transition can run.
 * The initial value stays constant: native toggles and other groups keep their user-owned open state on re-reads. */
function GroupDisclosure({ items, children }: { items: ActionItem[]; children: ReactNode }) {
  const selection = useContext(Selection);
  const [initiallyOpen] = useState(() => items.some(item => item.id === selection?.selected));
  return <details open={initiallyOpen}>{children}</details>;
}


function Section({ id, title, count, note, children }: { id: string; title: string; count: number; note?: string; children: ReactNode }) {
  return <section id={`inbox-${id}`} aria-labelledby={`inbox-${id}-title`}>
    <div className="q-grp"><h2 id={`inbox-${id}-title`} aria-label={`${title}, ${count}`}>{title}</h2></div>
    {note ? <p className="q-help">{note}</p> : null}
    {children}
  </section>;
}

export function ManagerInbox({ contacts, ...props }: { weekStart: string; actorId: string; timeZone: string; contacts?: InboxContacts; coverageFirst?: boolean }) {
  return <Phones.Provider value={contacts ?? null}><InboxView {...props} /></Phones.Provider>;
}

function InboxView({ weekStart, actorId, timeZone, coverageFirst }: { weekStart: string; actorId: string; timeZone: string; coverageFirst?: boolean }) {
  const { snapshot, connection, refresh } = useActionCenter(weekStart, actorId);
  const { snapshot: today, refresh: refreshToday } = useToday();
  // W2: ?filter= is the source of truth, so Back from a review restores it.
  const initialFilter = inboxFilter(useSearchParams()?.get("filter"));
  // Refresh asks both reads again: the action center and today's clock-ins.
  return <InboxSurface snapshot={snapshot} today={today} connection={connection} onRefresh={() => { refresh(); refreshToday(); }} timeZone={timeZone} initialFilter={initialFilter} coverageFirst={coverageFirst} />;
}

/** Presentation only: receives the released action center observation and today's shifts. */
export function InboxSurface({ snapshot, today = null, connection, onRefresh: refresh, timeZone, initialFilter = "all", coverageFirst = false }: {
  snapshot: ActionCenter | null; today?: Today | null; connection: ActionCenterConnection; onRefresh: () => void; timeZone: string; initialFilter?: InboxFilter; coverageFirst?: boolean;
}) {
  const phones = useContext(Phones);
  // Quiet (v4): three segments; "all" (an old link) opens Act now.
  const [filter, setFilter] = useState<InboxFilter>(initialFilter === "all" ? "now" : initialFilter);
  // Phase 4: on a wide screen the Inbox is a list with a detail pane. The URL keeps the selection, so Back from a review restores it.
  const wide = useSyncExternalStore(wideSubscribe, () => window.matchMedia(WIDE).matches, () => false);
  const [selectedKey, setSelectedKey] = useState<string | null>(() => typeof window === "undefined" ? null : new URL(window.location.href).searchParams.get("item"));
  const focusPane = useRef(false);
  // r4 QA: on a phone, reloading /app/inbox?item=… opens that item's sheet again; closing the sheet drops it from the URL.
  const [sheetOpen, setSheetOpen] = useState(() => typeof window !== "undefined" && new URL(window.location.href).searchParams.has("item"));
  // IS-P4-17: a Refresh the user asks for says so until the new read lands (background re-reads stay silent).
  const [refreshFrom, setRefreshFrom] = useState<string | null>(null);
  // ST-P4-03: once the list has shown, a pause, an offline spell, a refresh or a failed read keeps both columns
  // and the list's last height on desktop (as Home does), so nothing collapses and the scroll position holds.
  const listColumn = useRef<HTMLDivElement>(null);
  const [lastListHeight, setLastListHeight] = useState(0);
  const [hasShown, setHasShown] = useState(false);
  // Follow the URL when it changes underneath us (Back, a new link).
  const [urlFilter, setUrlFilter] = useState(initialFilter);
  if (urlFilter !== initialFilter) { setUrlFilter(initialFilter); setFilter(initialFilter === "all" ? "now" : initialFilter); }
  // W2: the filter lives in the URL, so a review page's Back returns to it.
  const choose = (value: InboxFilter) => {
    setFilter(value);
    const url = new URL(window.location.href);
    if (value === "all") url.searchParams.delete("filter"); else url.searchParams.set("filter", value);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  };
  const ready = connection === "ready" && snapshot?.state === "ready" ? snapshot : null;
  // Final phone pass P2-7: a pause (the window lost focus) closes the item sheet for good; coming back shows the list, not a
  // sheet that reopens by itself.
  if (connection === "paused" && sheetOpen) setSheetOpen(false);
  useEffect(() => {
    if (connection !== "paused" || wide) return;
    const url = new URL(window.location.href);
    if (url.searchParams.has("item")) { url.searchParams.delete("item"); window.history.replaceState(window.history.state, "", url); }
  }, [connection, wide]);
  // The workspace's date at the time of this observation, so server and browser agree.
  const day = ready ? new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ready.observedAt)) : undefined;
  const shifts = today?.state === "ready" ? today.missed : [];
  // IS-6: when clock-ins can't be read, say so instead of quietly dropping them.
  const todayFailed = today?.state === "unavailable";
  const value = ready ? needsYou(ready.items, day, shifts) : null;
  const total = value ? value.count + value.planning.length + value.past.length : 0;
  const updated = ready ? clock(ready.observedAt, timeZone) : null;
  const show = (group: InboxFilter) => filter === "all" || filter === group;
  // Clean Manager (v3): the parts of "Act now", each under its own heading.
  const gaps = value ? value.now.filter(item => item.type === "COVERAGE_GAP") : [];
  const otherNow = value ? value.now.filter(item => item.type !== "COVERAGE_GAP") : [];
  const gapPlaces = [...new Set(gaps.map(gapPlace))].map(place => ({ place, items: gaps.filter(item => gapPlace(item) === place) }));
  // The rows on screen, in order; the pane shows the selected one, or the first. The pane keeps an item's full title.
  const entries: InboxEntry[] = value ? [
    ...(show("now") ? (() => {
      const missed = value.noClockIn.map(shift => shiftEntry(shift, timeZone, ready?.observedAt, true, phones?.phones[shift.employeeId], phones?.observation));
      const urgent = (coverageFirst ? [...gapPlaces.flatMap(group => group.items), ...otherNow] : value.now).map(item => itemEntry(item, false, filter, timeZone));
      return coverageFirst ? [...urgent, ...missed] : [...missed, ...urgent];
    })() : []),
    ...(show("requests") ? value.requests.map(item => itemEntry(item, false, filter, timeZone)) : []),
    ...(show("planning") ? [...value.planning.map(item => itemEntry(item, false, filter, timeZone)), ...value.past.map(item => itemEntry(item, true, filter, timeZone))] : []),
  ] : [];
  const current = entries.find(entry => entry.key === selectedKey) ?? entries[0] ?? null;
  const select = (entry: InboxEntry, event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    // Quiet (v4): on a phone the row opens its review, as the mockup's chevron says; the pane is for wide screens.
    if (!wide) return;
    event.preventDefault();
    // v3: below 1024px the item opens in a half-height sheet; on wide screens, in the pane.
    if (wide) focusPane.current = true; else setSheetOpen(true);
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
  // IS-P4-22: when the list comes back and focus was lost with the message, it lands on the selected row or the first section heading.
  // The first list after load is not a "return": focus stays where the reader is (v3 QA: no ring on the first row).
  const firstShow = useRef(true);
  useEffect(() => {
    if (!hasShown) return;
    if (firstShow.current && ready) { firstShow.current = false; return; }
    if (document.activeElement !== document.body && document.activeElement !== null) return;
    if (!ready) { document.querySelector<HTMLElement>(".premium-inbox .inbox-status-message")?.focus({ preventScroll: true }); return; }
    const row = document.querySelector<HTMLElement>(".premium-inbox [data-inbox-key][aria-current]");
    const heading = document.querySelector<HTMLElement>(".premium-inbox .nv-content .nv-card:not(#inbox-all-requests) .nv-card__title");
    const target = row && row.getClientRects().length ? row : heading;
    if (!target) return;
    if (!target.matches("a, button, summary, [tabindex]")) target.tabIndex = -1;
    (target.matches("a, button") ? target : target.querySelector<HTMLElement>("a, button") ?? target).focus({ preventScroll: true });
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
  // IS-P4-04, ST-P4-13: open the selected group before paint, including the first ready frame.
  const shownKey = wide && current ? current.key : null;
  useLayoutEffect(() => {
    if (!shownKey) return;
    document.querySelector<HTMLElement>(`[data-inbox-key="${CSS.escape(shownKey)}"]`)?.closest("details:not([open])")?.setAttribute("open", "");
  }, [shownKey]);
  useEffect(() => {
    if (!focusPane.current) return;
    focusPane.current = false;
    document.getElementById("inbox-detail-title")?.focus({ preventScroll: true });
  }, [selectedKey]);

  const plan = value ? planGroups(value.planning) : [];
  const counts: Record<InboxFilter, number> = value
    ? { all: value.count, now: value.noClockIn.length + value.now.length, requests: value.requests.length, planning: plan.length + (value.past.length ? 1 : 0) }
    : { all: 0, now: 0, requests: 0, planning: 0 };
  const missedShown = 3;
  const missedPlaces = value ? new Set(value.noClockIn.map(shift => shift.locationName)).size > 1 : false;

  const missedSection = value && (show("now") && value!.noClockIn.length ? <div key="missed" id="missed-punches">
          <Section id="missed" title="Not clocked in" count={value!.noClockIn.length}>
            <ul className="q-list inbox-list">
              {value!.noClockIn.slice(0, missedShown).map(shift => <ShiftRow key={shift.id} shift={shift} timeZone={timeZone} observedAt={ready?.observedAt} showPlace={missedPlaces} />)}
              {value!.noClockIn.length > missedShown ? <li className="premium-group cm-more">
                <details open={value!.noClockIn.slice(missedShown).some(shift => `shift:${shift.id}` === shownKey) || undefined}>
                  <summary className="q-row q-row--one"><span className="q-rt"><b>{`Show ${value!.noClockIn.length - missedShown} more`}</b></span><CaretDownIcon className="q-chev" aria-hidden="true" /></summary>
                  <ul className="q-list inbox-list">{value!.noClockIn.slice(missedShown).map(shift => <ShiftRow key={shift.id} shift={shift} timeZone={timeZone} observedAt={ready?.observedAt} showPlace={missedPlaces} />)}</ul>
                </details>
              </li> : null}
            </ul>
          </Section>
        </div> : null);
  const urgentSection = value && (show("now") && value!.now.length ? <Section key="urgent" id="urgent" title={otherNow.length ? "Act now" : "Open shifts"} count={value!.now.length}>
          <ul className="q-list inbox-list">
            {gapPlaces.map(({ place, items }) => items.length === 1
              ? <KitRow key={items[0].id} entry={gapEntry(items[0], filter, timeZone)} />
              : <Disclosure key={place} title={place} items={items} count={items.length}
                  meta={<MetaParts text={items.map(item => mobileActionDetail(item.detail).split(" · ")[1]).filter(Boolean).join(" · ")} />}>
                  {items.map(item => <KitRow key={item.id} entry={gapEntry(item, filter, timeZone)} />)}
                </Disclosure>)}
            {otherNow.map(item => <ItemRow key={item.id} item={item} filter={filter} timeZone={timeZone} />)}
          </ul>
        </Section> : null);

  // Quiet (v4, approved Oct 23): title, three segments (Act now, Requests, Plan ahead), then plain lists. No band, no footer.
  return <div className="q-page manager-inbox premium-inbox cm-inbox" data-nv-page="" data-inbox-state={ready ? (total ? "ready" : "clear") : connection}>
    <div className="q-bar" />
    <QuietHeader title="Inbox" sub={<span className="q-sr premium-inbox-summary">{value ? `${needsYouSentence(value.count)}${todayFailed ? " Clock-ins can’t be checked right now." : ""}` : connection === "loading" || connection === "reconnecting" ? "Checking what needs you…" : "Requests and problems to resolve."}</span>} />
    {/* ST-02: the segments are there from the first paint (disabled until the read is ready), so nothing moves. */}
    {!ready || total ? <div className="q-seg premium-inbox-filters" role="group" aria-label="Show">
      {filters.map(entry => <button key={entry.value} type="button" aria-pressed={filter === entry.value} disabled={!ready} onClick={() => choose(entry.value)}
        aria-label={value && counts[entry.value] ? `${entry.label}, ${counts[entry.value]}` : undefined}>{entry.label}{value && counts[entry.value] && entry.value !== "planning" ? ` · ${counts[entry.value]}` : ""}</button>)}
    </div> : null}
    <div>
      <Selection.Provider value={{ selected: shownKey, select }}>
      {/* The pane's column is there in every state but "all caught up", so the list never changes width. */}
      <div className="inbox-columns" data-detail={!ready || total ? "true" : undefined}>
      {/* IS-P4-06: Up and Down move between rows and group headings (D6). */}
      {/* ST-P4-03: the held height is part of this render, so the page never empties under the reader and scroll stays put. */}
      <div className="inbox-list-column" ref={listColumn} data-row-nav=".inbox-row, .premium-group > details > summary"
        style={!ready && hasShown && lastListHeight ? { minHeight: `${lastListHeight}px` } : undefined}>
      {!ready ? <div className="inbox-status">
        {/* ST-26: the status line comes first, so it stays put. */}
        <p role="status" tabIndex={-1} className="q-empty inbox-status-message" style={{ marginTop: 24 }}>{statusText[connection]}</p>
        {connection === "access_lost" ? <Link className="q-btn q-btn--sec" href="/login">Sign in</Link>
          : connection === "unavailable" || connection === "ready" ? <button type="button" className="q-btn q-btn--sec" onClick={() => { refresh(); focusAfterRetry(".premium-inbox .q-grp h2", ".inbox-status .q-btn"); }}>Try again</button> : null}
      </div> : total === 0 ? <div className="inbox-clear">
        <p className="q-empty" role="status" style={{ marginTop: 24 }}>Nothing needs you right now.{ready.limitedAttendance ? " Some attendance comparisons are unavailable." : ""}</p>
      </div> : <>
        {show("now") && todayFailed ? <section aria-label="Clock-ins">
          <p className="q-empty" style={{ marginTop: 24 }}>Clock-ins can’t be checked right now.</p>
          <button type="button" className="q-btn q-btn--sec" onClick={refresh}>Try again</button>
        </section> : null}
        {coverageFirst ? [urgentSection, missedSection] : [missedSection, urgentSection]}
        {show("requests") && (value!.requests.length || filter === "requests") ? <Section id="requests" title="Requests" count={value!.requests.length}>
          <ul className="q-list inbox-list">
            {groupInboxItems(value!.requests).flatMap(entry => entry.kind === "item" ? [entry.item] : entry.items).map(item => <ItemRow key={item.id} item={item} filter={filter} timeZone={timeZone} />)}
            {/* Phones had no way to the request lists; this row is that way on every width (clean Manager v3). */}
            <AllRequests />
          </ul>
        </Section> : null}
        {show("planning") && (value!.planning.length || value!.past.length) ? <Section id="exceptions" title="Plan ahead" count={value!.planning.length}>
          <ul className="q-list inbox-list">
            {plan.map(group => group.items.length === 1 && group.type !== "COVERAGE_GAP"
              ? <KitRow key={group.items[0].id} entry={planEntry(group.items[0], filter, timeZone)} />
              : <Disclosure key={group.type} title={planLabel[group.type] ?? group.items[0].title} items={group.items} count={group.items.length}>
                  {group.items.map(item => <ItemRow key={item.id} item={item} filter={filter} timeZone={timeZone} />)}
                </Disclosure>)}
            {value!.past.length ? <Disclosure title="Earlier this week" items={value!.past} count={value!.past.length}>
              {value!.past.map(item => <ItemRow key={item.id} item={item} calm filter={filter} timeZone={timeZone} />)}
            </Disclosure> : null}
          </ul>

        </Section> : null}
        {filter !== "all" && !hasEntries(filter, value!) ? <p className="q-empty" style={{ marginTop: 24 }}>{emptyText[filter]}</p> : null}
        {ready.limitedAttendance ? <p className="q-help inbox-note">Some attendance comparisons are unavailable.</p> : null}
      </>}
      </div>
      {!wide && sheetOpen && ready && current && current.key === selectedKey ? <ItemSheet entry={current} onClose={() => { setSheetOpen(false); const url = new URL(window.location.href); if (url.searchParams.has("item")) { url.searchParams.delete("item"); window.history.replaceState(window.history.state, "", url); } }} /> : null}
      <div className="inbox-side-column">
        {ready && total ? current ? <InboxDetail entry={current} /> : null
          : !ready ? <DetailPlaceholder still={connection !== "loading" && connection !== "reconnecting"} /> : null}
      </div>
      </div>
      </Selection.Provider>
    </div>
  </div>;
}

const WIDE = "(min-width: 1024px)";
function wideSubscribe(change: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
}

/** The desktop detail pane: the selected row's facts and its one action, which opens the full review. */
export function InboxDetail({ entry, sheet = false }: { entry: InboxEntry; sheet?: boolean }) {
  // Review fix (33/50): the phone sheet renders while the pane exists too; distinct ids keep the page valid.
  const titleId = sheet ? "inbox-sheet-title" : "inbox-detail-title";
  const detail = <section className="nv-card inbox-detail" aria-labelledby={titleId}
    onKeyDown={event => {
      if (sheet) return;
      // Escape, or Shift+Tab from the heading, goes back to the selected row (IS-P4-06).
      const back = event.key === "Escape" || (event.key === "Tab" && event.shiftKey && event.target === document.getElementById(titleId));
      if (!back) return;
      const row = document.querySelector<HTMLElement>(`[data-inbox-key="${CSS.escape(entry.key)}"]`);
      if (!row) return;
      event.preventDefault();
      row.closest("details")?.setAttribute("open", "");
      (row.matches("a, button, [tabindex]") ? row : row.querySelector<HTMLElement>("a, button") ?? row).focus();
    }}>
    <div className="inbox-detail__head">
      {entry.leading}
      <div className="inbox-detail__heading">
        <h2 className="inbox-detail__title" id={titleId} tabIndex={-1}>{entry.title}</h2>
        {entry.meta && entry.paneMeta !== false ? <p className="inbox-detail__meta">{entry.meta}</p> : null}
      </div>
    </div>
    {entry.status ? <div className="inbox-detail__status">{entry.status}</div> : null}
    {entry.facts ? <dl className="inbox-detail__facts">{entry.facts.map(([label, fact]) => <div key={label} data-fact={label === "Note" ? "note" : undefined}><dt>{label}</dt><dd>{fact}</dd></div>)}</dl> : null}
    {entry.note ? <p className="inbox-detail__note">{entry.note}</p> : null}
    <div className="inbox-detail__actions">
      <Button href={entry.href}>{entry.action}</Button>
      {entry.contact ? <>
        <a className="nv-btn" data-kind="secondary" href={`tel:${entry.contact.phone}`} aria-label={`Call ${entry.contact.name}`}><PhoneIcon size={18} aria-hidden="true" />Call</a>
        <a className="nv-btn" data-kind="secondary" href={`sms:${entry.contact.phone}`} aria-label={`Text ${entry.contact.name}`}><ChatTextIcon size={18} aria-hidden="true" />Text</a>
      </> : null}
      {entry.secondary?.map(link => <Link key={link.href} className="nv-btn" data-kind="secondary" href={link.href}>{link.label}</Link>)}
    </div>
  </section>;
  return entry.contact ? <ScopedReadFrame observation={entry.contact.observation}>{detail}</ScopedReadFrame> : detail;
}

/** Phones and tablets: the selected item in a half-height sheet (a modal dialog: focus moves in, Escape or Done closes it,
 * and focus returns to the row). The row's link still works without JavaScript. */
function ItemSheet({ entry, onClose }: { entry: InboxEntry; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
    document.getElementById("inbox-sheet-title")?.focus({ preventScroll: true });
  }, []);
  return <dialog ref={dialog} className="cm-sheet" aria-labelledby="inbox-sheet-title" onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="cm-sheet__bar"><span className="cm-sheet__grab" aria-hidden="true" />
      <form method="dialog"><button type="submit" className="cm-sheet__done">Done</button></form></div>
    <InboxDetail entry={entry} sheet />
  </dialog>;
}

/** While the Inbox loads, the pane holds its place. */
function DetailPlaceholder({ still = false }: { still?: boolean }) {
  return <section className="nv-card inbox-detail inbox-detail--placeholder" aria-hidden="true">
    <div className={still ? "premium-skeleton premium-skeleton--still" : "premium-skeleton"}><span className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span></div>
  </section>;
}

/** D-4 with the clean Manager row (v3): one "All requests" row that opens to the three request pages, so phones reach
 * them too and each is one step from the Inbox. Turned-off modules leave the list. */
function AllRequests() {
  const { modules } = usePresentation();
  const pages = [
    { href: "/app/requests", title: "Time off", meta: "Pending, approved and declined" },
    { href: "/app/exchange", title: "Shift requests", meta: "Swaps and shifts people can’t work" },
    { href: "/app/availability", title: "Availability", meta: "When people can work" },
  ].filter(page => pathEnabled(page.href, modules));
  if (!pages.length) return null;
  return <li className="premium-group cm-disclosure cm-all-requests"><details>
    <summary className="nv-row" data-leading="true">
      <Tile><ArrowsLeftRightIcon size={20} weight="bold" /></Tile>
      <span className="nv-row__text"><span className="nv-row__title">All requests</span></span>
      <CaretDownIcon className="inbox-group-caret" size={16} weight="bold" aria-hidden="true" />
    </summary>
    <ul className="q-list inbox-list">{pages.map(page => <li key={page.href}><Link className="nv-row" href={page.href}>
      <span className="nv-row__text"><span className="nv-row__title">{page.title}</span><span className="nv-row__meta">{page.meta}</span></span>
      <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true" />
    </Link></li>)}</ul>
  </details></li>;
}

function hasEntries(filter: InboxFilter, value: ReturnType<typeof needsYou>) {
  if (filter === "now") return value.noClockIn.length + value.now.length > 0;
  if (filter === "requests") return value.requests.length > 0;
  if (filter === "planning") return value.planning.length + value.past.length > 0;
  return true;
}
