"use client";

import Link from "next/link";
import { MissedPunches } from "./manager-today";
import { useState, type ReactNode } from "react";
import { ArrowsClockwiseIcon, CalendarBlankIcon, CaretDownIcon, ClockIcon, UserCheckIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { useActionCenter, mobileActionDetail, type ActionCenterConnection } from "./manager-action-center";
import { actionCenterNavigation } from "./action-center-navigation";
import { EmptyState } from "./empty-state";
import { Celebration } from "./celebration";
import { SkeletonRows } from "./skeleton";
import { groupInboxItems, inboxSections } from "@/lib/action-center/inbox";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";

type Filter = "all" | "exceptions" | "requests";
const statusText = {
  loading: "Loading inbox…", reconnecting: "Reconnecting…", offline: "Inbox unavailable offline", paused: "Updates paused — return to this tab to refresh.",
  unavailable: "Inbox unavailable — try again.", access_lost: "Sign in again to view the inbox.", ready: "Inbox unavailable — try again.",
} as const;

/** O1: no decision from here. The Inbox item carries no dates, duration or
 * note, so every request opens its full review, which shows them first. */
function Row({ item }: { item: ActionItem }) {
  const Icon = item.priority === "URGENT" ? WarningCircleIcon : item.category === "timekeeping" ? ClockIcon : item.category === "requests" ? UserCheckIcon : CalendarBlankIcon;
  const action = actionCenterNavigation(item);
  return <li className={`inbox-row${item.priority === "URGENT" ? " is-urgent" : ""}`}><div className="inbox-row-content">
    <span className="inbox-icon" aria-hidden="true"><Icon size={20} /></span>
    <div className="inbox-copy">
      <strong>{item.title}</strong>
      <p>{mobileActionDetail(item.detail)}</p>
      <Link className="inbox-link" href={action.href} aria-label={`${action.label}: ${item.title}`}>{action.label}</Link>
    </div>
  </div></li>;
}

export function ManagerInbox({ weekStart, actorId, timeZone }: { weekStart: string; actorId: string; timeZone: string }) {
  const { snapshot, connection, refresh } = useActionCenter(weekStart, actorId);
  return <InboxSurface snapshot={snapshot} connection={connection} onRefresh={refresh} timeZone={timeZone} lead={<MissedPunches />} />;
}

/** Presentation only: receives the released action center observation. */
export function InboxSurface({ snapshot, connection, onRefresh: refresh, timeZone, lead }: { snapshot: ActionCenter | null; connection: ActionCenterConnection; onRefresh: () => void; timeZone: string; /** Shown under the page header (D1), e.g. missed punches. */ lead?: ReactNode }) {
  const [filter, setFilter] = useState<Filter>("all");
  const ready = connection === "ready" && snapshot?.state === "ready" ? snapshot : null;
  const sections = ready ? inboxSections(ready.items) : [];
  const counts = { all: ready?.items.length ?? 0, exceptions: ready?.items.filter(item => item.category !== "requests").length ?? 0, requests: ready?.counts.requests ?? 0 };
  const shown = sections.map(section => ({ ...section, items: section.items.filter(item => filter === "all" || (filter === "requests" ? item.category === "requests" : item.category !== "requests")) })).filter(section => section.items.length);
  const updated = ready ? new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(ready.observedAt)) : null;

  return <div className="manager-inbox" data-inbox-state={ready ? (ready.items.length ? "ready" : "clear") : connection}>
    <header className="inbox-header">
      <div><h1>Inbox</h1><p>Exceptions first, then requests from your team.</p></div>
      <div className="inbox-freshness">
        {updated ? <small>Updated <time dateTime={ready!.observedAt}>{updated}</time></small> : null}
        <button type="button" className="inbox-refresh" onClick={refresh} disabled={connection === "loading" || connection === "reconnecting"}>
          <ArrowsClockwiseIcon size={18} aria-hidden="true" />Refresh
        </button>
      </div>
    </header>
    {lead}
    {ready && ready.items.length ? <div className="inbox-filters" role="group" aria-label="Show">
      {(["all", "exceptions", "requests"] as const).map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
        {value === "all" ? "All" : value === "exceptions" ? "To review" : "Requests"}<span className="sr-only">,</span> <span className="inbox-filter-count">{counts[value]}</span>
      </button>)}
    </div> : null}
    {!ready ? <div className="inbox-status">
      {connection === "loading" || connection === "reconnecting" ? <SkeletonRows rows={4} /> : null}
      <p role="status">{statusText[connection]}</p>
      {connection === "access_lost" ? <Link className="inbox-link" href="/login">Sign in</Link> : null}
    </div> : ready.items.length === 0 ? <div className="inbox-clear">
      <EmptyState illustration="all-caught-up" status title="Inbox clear">
        Nothing needs a decision in the checked sources.{ready.limitedAttendance ? " Some attendance comparisons are unavailable." : ""}
      </EmptyState>
      {ready.limitedAttendance ? null : <Celebration kind="INBOX_CLEAR" eventKey={ready.observedAt.slice(0, 10)} confirmed />}
    </div> : <>
      {shown.map(section => <section key={section.id} className="inbox-section" data-section={section.id} aria-labelledby={`inbox-${section.id}`}>
        <h2 id={`inbox-${section.id}`}>{section.title}<span className="sr-only">,</span> <span className="inbox-section-count">{section.items.length}</span></h2>
        <ul className="inbox-list">{groupInboxItems(section.items).map(entry => entry.kind === "item" ? <Row key={entry.item.id} item={entry.item} />
          : <li key={entry.key} className={`inbox-group${entry.items[0].priority === "URGENT" ? " is-urgent" : ""}`}>
            <details>
              <summary><span className="inbox-icon" aria-hidden="true">{entry.items[0].priority === "URGENT" ? <WarningCircleIcon size={20} /> : <CalendarBlankIcon size={20} />}</span>
                <span className="inbox-copy"><strong>{entry.title}</strong><p>{entry.items.length} items · earliest first</p></span>
                <span className="inbox-section-count">{entry.items.length}</span><CaretDownIcon className="inbox-group-caret" size={18} aria-hidden="true" /></summary>
              <ul className="inbox-list">{entry.items.map(item => <Row key={item.id} item={item} />)}</ul>
            </details>
          </li>)}</ul>
      </section>)}
      {ready.limitedAttendance ? <p className="inbox-note">Some attendance comparisons are unavailable. Check the attendance view for details.</p> : null}
    </>}
  </div>;
}
