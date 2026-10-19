"use client";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowsClockwiseIcon, CalendarBlankIcon, ClockCounterClockwiseIcon, ClockIcon, LockKeyIcon, UserCheckIcon, UsersThreeIcon, WarningCircleIcon, WrenchIcon } from "@phosphor-icons/react/ssr";
import { Avatar, Button, Card, CardBody, Freshness, KitLink, KitStack, MetaParts, NextUp, PageBand, Progress, Row, Rows, StatGrid, Status, Tile } from "@/components/kit/kit";
import { CLOCK_IN, presentItem } from "@/lib/action-center/present";
import { useToday } from "./manager-today";
import { useSharedHomeRead, type ActionCenterConnection } from "./manager-action-center";
import { actionCenterNavigation } from "./action-center-navigation";
import { mobileActionDetail } from "./manager-action-center";
import { withoutSetupItems } from "@/lib/action-center/setup";
import { needsYou, needsYouSentence, type NeedsYou } from "@/lib/action-center/needs-you";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";

/* Manager and Owner Home (premium direction, phase 2). Reads nothing new: the
 * published-shift snapshot (Today) and the shared action center read. */

export type PremiumHomeWeek = {
  weekStart: string;
  weekLabel: string;
  plannedShifts: number;
  availabilitySubmitted: number;
  availabilityEligible: number;
  /** Matches the Schedule tab: published, draft, or not started. */
  locations: { name: string; state: "published" | "draft" | "not_started" }[];
  lastPublished?: string | null;
};

export type PremiumHomeProps = {
  greeting: string;
  dateLabel: string;
  timeZone: string;
  week: PremiumHomeWeek;
  /** The Owner setup card, when it applies. */
  setup?: ReactNode;
  /** When the Owner setup card lists the setup items, they leave Planning. */
  setupHoldsItems?: boolean;
};

const clock = (iso: string, timeZone: string) => {
  try { return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
  catch { return ""; }
};
const workspaceDay = (iso: string, timeZone: string) => {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); }
  catch { return undefined; }
};
const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

/** Live Home: one Today read and the shared action center read. */
export function PremiumHomeLive(props: PremiumHomeProps) {
  const { snapshot: today, refreshing, refresh } = useToday();
  const online = useSyncExternalStore(onlineSubscribe, () => navigator.onLine, () => true);
  const shared = useSharedHomeRead();
  const read = shared?.read;
  const actions = read && read.connection === "ready" ? read.snapshot : null;
  return <PremiumHomeSurface {...props} today={today} todayRefreshing={refreshing} onRetryToday={refresh}
    actions={actions} actionsConnection={read?.connection ?? "loading"} onRetryActions={read?.refresh}
    setupHoldsItems={props.setupHoldsItems ?? !!shared?.setup} liveReaders="today actions" offline={!online} />;
}

function onlineSubscribe(change: () => void) {
  window.addEventListener("online", change); window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
}

export type PremiumHomeSurfaceProps = PremiumHomeProps & {
  today: Today | null;
  todayRefreshing?: boolean;
  onRetryToday?: () => void;
  actions: ActionCenter | null;
  actionsConnection: ActionCenterConnection;
  onRetryActions?: () => void;
  /** Names the private readers behind a live Home; the preview has none. */
  liveReaders?: string;
  offline?: boolean;
};

/** Presentation only, so the fictional preview can show Home without a session. */
export function PremiumHomeSurface({ greeting, dateLabel, timeZone, week, setup, setupHoldsItems = false, today, todayRefreshing = false, onRetryToday,
  actions, actionsConnection, onRetryActions, liveReaders, offline = false }: PremiumHomeSurfaceProps) {
  const readyToday = today?.state === "ready" ? today : null;
  const readyActions = actions?.state === "ready" ? (setupHoldsItems ? withoutSetupItems(actions).snapshot : actions) : null;
  const items = readyActions?.state === "ready" ? readyActions.items : [];
  const day = readyActions?.state === "ready" ? workspaceDay(readyActions.observedAt, timeZone) : undefined;
  const todayFailed = today?.state === "unavailable";
  const value = readyActions && (readyToday || todayFailed) ? needsYou(items, day, readyToday?.missed ?? []) : null;
  // The Planning row opens the Inbox, which lists every planning item, so it counts the same list.
  const planningCount = actions?.state === "ready" ? needsYou(actions.items, day).planning.length : 0;
  const retryAll = () => { onRetryActions?.(); onRetryToday?.(); focusAfterRetry(".premium-home__now > :first-child:not(.premium-skeleton-card)", ".premium-pending-failed .nv-btn"); };
  // ST-25: every summary is one short line, as long as "Checking what needs you…", so the band never grows.
  // The cards below say what failed (Today's card for clock-ins, Next up for the rest).
  const summary = value ? needsYouSentence(value.count)
    : actionsConnection === "offline" ? "You’re offline."
    : actionsConnection === "paused" ? "Paused while you’re away."
    : actionsConnection === "unavailable" || actionsConnection === "access_lost" || today?.state === "unavailable" ? "Couldn’t load everything."
    : "Checking what needs you…";

  // WR-64 / ST-28: once Home has shown what needs you, a pause, an offline spell, a failed refresh or the reload on
  // return keeps the column, the Next up card and the Plan ahead card at their last heights, so nothing moves.
  const nowColumn = useRef<HTMLDivElement>(null);
  const last = useRef({ column: 0, nextUp: 0, planning: 0, ready: false });
  const holding = !value;
  // The Plan ahead row stays only if it was showing when Home last had data (React's "store the previous value" pattern).
  const [lastPlanningCount, setLastPlanningCount] = useState<number | null>(null);
  if (value && planningCount !== lastPlanningCount) setLastPlanningCount(planningCount);
  // A layout effect, so the hold is in place before the paused frame paints.
  useLayoutEffect(() => {
    const column = nowColumn.current;
    if (!column) return;
    const planning = () => document.getElementById("home-planning");
    const pin = (element: Element | null | undefined, height: number) => {
      if (!(element instanceof HTMLElement)) return;
      element.style.height = height ? `${height}px` : "";
    };
    if (value) {
      column.style.height = "";
      delete column.dataset.holding;
      const measure = () => {
        // ST-28: only ever record the real cards, never a placeholder that a late callback might see.
        if (column.querySelector(".premium-skeleton-card")) return;
        last.current = { ready: true, column: column.getBoundingClientRect().height,
          nextUp: column.firstElementChild?.getBoundingClientRect().height ?? 0,
          planning: planning()?.getBoundingClientRect().height ?? 0 };
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(column);
      const plan = planning();
      if (plan) observer.observe(plan);
      return () => observer.disconnect();
    }
    const hold = holding && last.current.ready;
    pin(column, hold ? last.current.column : 0);
    if (hold) column.dataset.holding = ""; else delete column.dataset.holding;
    pin(column.firstElementChild, hold ? last.current.nextUp : 0);
    pin(planning(), hold ? last.current.planning : 0);
  }, [value, holding, actionsConnection, offline]);
  return <div className="nv-page premium-home" data-nv-page="" data-live-readers={liveReaders}>
    <PageBand eyebrow={dateLabel} title={greeting} summary={<span role="status">{summary}</span>} />
    <KitStack className="premium-home__grid">
      <div className="premium-home__today">
        <TodayCard today={today} refreshing={todayRefreshing} onRetry={onRetryToday} timeZone={timeZone} offline={offline} paused={actionsConnection === "paused"} />
      </div>
      <div className="premium-home__now" ref={nowColumn}>
        {value ? <NowCards value={value} timeZone={timeZone} /> : <PendingCard connection={offline ? "offline" : actionsConnection} onRetry={retryAll} />}
      </div>
      {setup ? <div className="premium-home__setup">{setup}</div> : null}
      <div className="premium-home__week">
        <WeekCard week={week} />
        {value && planningCount ? <PlanningCard count={planningCount} /> : !value && (lastPlanningCount === null || lastPlanningCount > 0) ? <PlanningCard count={actionsConnection === "loading" || actionsConnection === "reconnecting" ? null : "unavailable"} /> : null}
        <ToolsCard week={week} />
      </div>
    </KitStack>
  </div>;
}

function TodayCard({ today, refreshing, onRetry, timeZone, offline = false, paused = false }: { today: Today | null; refreshing: boolean; onRetry?: () => void; timeZone: string; offline?: boolean; paused?: boolean }) {
  // TC-55: offline and paused say so in the stamp, with "–" until the numbers return.
  if (!today && (offline || paused)) return <Card title="Today" meta={offline ? <Freshness state="offline">Offline</Freshness> : <Freshness state="stale">Paused</Freshness>} foot="Published shifts only">
    <StatGrid stats={[{ label: "Scheduled today", value: "–" }, { label: "Clocked in now", value: "–" }, { label: `No ${CLOCK_IN}`, value: "–" }]} />
  </Card>;
  // ST-01: the loading card has the real card's shape, so nothing moves when numbers arrive.
  // ST-24: "Loading…" holds the width of the real stamp, so the head wraps the same way at large text.
  if (!today) return <Card title="Today" meta={<span className="premium-meta-hold"><span className="premium-meta-hold__ghost" aria-hidden="true"><Freshness>Updated 12:00 PM</Freshness></span><Freshness state="stale">Loading…</Freshness></span>} foot="Published shifts only">
    <div className="premium-skeleton-values" aria-hidden="true">
      <StatGrid stats={[{ label: "Scheduled today", value: "–" }, { label: "Clocked in now", value: "–" }, { label: `No ${CLOCK_IN}`, value: "–" }]} />
    </div>
  </Card>;
  // ST-27: a failed read keeps the card's shape (three stats with "–"), so nothing below moves.
  if (today.state !== "ready") return <Card title="Today" meta={<button type="button" className="premium-today-retry" aria-disabled={refreshing || undefined}
      onClick={() => { if (refreshing || !onRetry) return; onRetry(); focusAfterRetry("#home-today .nv-card__title", ".premium-today-retry"); }}>
      <ArrowsClockwiseIcon size={16} aria-hidden="true" />{refreshing ? "Trying…" : "Try again"}
    </button>} foot="Today’s numbers aren’t available.">
    <StatGrid stats={[{ label: "Scheduled today", value: "–" }, { label: "Clocked in now", value: "–" }, { label: `No ${CLOCK_IN}`, value: "–" }]} />
  </Card>;
  const { counts, observedAt } = today;
  return <Card id="home-today" title="Today" meta={<Freshness>Updated <time dateTime={observedAt}>{clock(observedAt, timeZone)}</time></Freshness>}
    foot={<>Published shifts only{counts.late ? ` · ${plural(counts.late, "person", "people")} clocked in after start` : ""}</>}>
    <StatGrid stats={[
      { label: "Scheduled today", value: counts.scheduled, href: "/app/schedule" },
      { label: "Clocked in now", value: counts.clockedIn, href: "/app?view=attendance" },
      // The same shifts Next up counts: started, or finished with no punches.
      { label: `No ${CLOCK_IN}`, value: today.missed.length, href: "/app/inbox?filter=now", tone: today.missed.length > 0 ? "urgent" : undefined,
        ariaLabel: plural(today.missed.length, "shift with no clock-in", "shifts with no clock-in").replace("\u00a0", " ") },
    ]} />
  </Card>;
}

type HeroPick = { title: string; body?: string; href: string; label: string; icon: ReactNode; tone: "urgent" | "review" };

function noClockInPick(shifts: TodayShift[], timeZone: string): HeroPick {
  const first = shifts[0];
  const running = shifts.filter(shift => shift.status === "not_clocked_in");
  const names = shifts.length === 1 ? first.employeeName : `${first.employeeName} and ${plural(shifts.length - 1, "other", "others")}`;
  const single = shifts.length === 1;
  return {
    title: plural(shifts.length, `shift with no ${CLOCK_IN}`, `shifts with no ${CLOCK_IN}`),
    body: `${names}\u00a0· ${first.locationName.replace(/ /g, "\u00a0")}${single ? `, ${clock(first.startAt, timeZone)}` : ""}`,
    href: single
      ? running.length ? `/app/employees/${encodeURIComponent(first.employeeId)}` : `/app/timecards#timecard-${encodeURIComponent(first.employeeId)}`
      : "/app/inbox?filter=now",
    label: single ? (running.length ? "Contact" : "Review timecard") : "Review in Inbox",
    icon: <ClockIcon size={22} weight="bold" />, tone: "urgent",
  };
}

/** F6: a review opened from Home says "Back to Home" and returns here after the decision. */
function fromHome(href: string) {
  const url = new URL(href, "https://nevora.invalid");
  if (url.pathname !== "/app/requests") return href;
  url.searchParams.set("from", "home");
  return url.pathname + url.search + url.hash;
}

function homeAction(item: ActionItem) {
  const action = actionCenterNavigation(item);
  return { ...action, href: fromHome(action.href) };
}

function itemPick(item: ActionItem, tone: "urgent" | "review", timeZone: string): HeroPick {
  const action = homeAction(item);
  const shown = presentItem({ ...item, detail: mobileActionDetail(item.detail) }, action.label, timeZone);
  return {
    title: shown.title, body: shown.detail, href: action.href, label: shown.action, tone,
    icon: item.category === "requests" ? <UserCheckIcon size={22} weight="bold" /> : tone === "urgent" ? <WarningCircleIcon size={22} weight="bold" /> : <CalendarBlankIcon size={22} weight="bold" />,
  };
}

/** Next up (the one hero action), then whatever else needs you, at most three rows. */
function NowCards({ value, timeZone }: { value: NeedsYou; timeZone: string }) {
  if (value.count === 0) return <Card title="Needs you">
    <CardBody><p className="premium-note">Nothing needs you right now. New requests and shifts with no clock‑in show up here.</p></CardBody>
  </Card>;
  const [first, ...rest] = [...value.now, ...value.requests];
  const hero = value.noClockIn.length ? noClockInPick(value.noClockIn, timeZone) : itemPick(first, first.priority === "URGENT" ? "urgent" : "review", timeZone);
  const others = value.noClockIn.length ? [...value.now, ...value.requests] : rest;
  return <>
    <NextUp title={hero.title} body={hero.body} icon={hero.icon} tone={hero.tone} action={{ href: hero.href, label: hero.label }} />
    {others.length ? <Card id="home-needs-you" title="Also needs you" meta={others.length > 3 ? `Showing 3 of ${others.length}` : undefined}
      foot={<KitLink href="/app/inbox">{others.length > 3 ? `See all ${others.length} in Inbox` : "Open Inbox"}</KitLink>}>
      <Rows label="Also needs you">
        {others.slice(0, 3).map(item => {
          const action = homeAction(item);
          const shown = presentItem({ ...item, detail: mobileActionDetail(item.detail) }, action.label, timeZone);
          const request = item.category === "requests";
          return <Row key={item.id} href={action.href} label={`${shown.action}: ${shown.title}, ${shown.detail.replace(/\u00a0/g, " ")}`}
            leading={request && shown.person ? <Avatar initials={initials(shown.person)} waiting /> : <Tile tone={item.priority === "URGENT" ? "urgent" : "neutral"}>{item.priority === "URGENT" ? <WarningCircleIcon size={20} weight="bold" /> : <CalendarBlankIcon size={20} weight="bold" />}</Tile>}
            title={shown.title} meta={<MetaParts text={shown.detail} />}
            status={request ? <Status tone="review">Waiting</Status> : item.priority === "URGENT" ? <Status tone="urgent">Not covered</Status> : undefined} />;
        })}
      </Rows>
    </Card> : null}
  </>;
}

function PendingCard({ connection, onRetry }: { connection: ActionCenterConnection; onRetry?: () => void }) {
  const busy = connection === "loading" || connection === "reconnecting";
  // ST-01: while loading, hold the space Next up and three rows will take.
  if (busy) return <>
    <section className="nv-card nv-nextup premium-skeleton-card" aria-label="Next up" aria-busy="true">
      <p className="nv-nextup__label">Next up</p>
      <div className="nv-nextup__main" aria-hidden="true"><span className="premium-skeleton__dot" /><span className="premium-skeleton-lines"><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></div>
      <div className="nv-nextup__cut" aria-hidden="true" />
      <span className="premium-skeleton__button" aria-hidden="true" />
      <span className="sr-only" role="status">Checking what needs you…</span>
    </section>
    <Card title="Also needs you" meta="Loading…">
      <div className="premium-skeleton premium-skeleton--rows" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span>)}</div>
    </Card>
  </>;
  // ST-25: a failed read keeps the loading shape (Next up, then Also needs you), so nothing below moves.
  const message = connection === "offline" ? "Updates when you reconnect." : connection === "paused" ? "Updates when you’re back."
    : connection === "access_lost" ? "Sign in again to see what needs you." : "What needs you isn’t available right now.";
  return <>
    <section className="nv-card nv-nextup premium-skeleton-card premium-pending-failed" aria-label="Next up">
      <p className="nv-nextup__label">Next up</p>
      {/* IS-54: the band summary is the one live region; this message is read in place. */}
      <div className="nv-nextup__main"><p className="premium-note">{message}</p></div>
      <div className="nv-nextup__cut" aria-hidden="true" />
      {connection === "access_lost" ? <Button href="/login" kind="secondary">Sign in</Button>
        : onRetry && connection !== "offline" && connection !== "paused" ? <button type="button" className="nv-btn" data-kind="primary" onClick={onRetry}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button>
        : <span className="premium-skeleton__button premium-skeleton__button--still" aria-hidden="true" />}
    </section>
    <Card title="Also needs you" meta={<Freshness state={connection === "offline" ? "offline" : "stale"}>{connection === "offline" ? "Offline" : connection === "paused" ? "Paused" : "Not available"}</Freshness>}>
      <div className="premium-skeleton premium-skeleton--rows premium-skeleton--still" aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span>)}</div>
    </Card>
  </>;
}

function WeekCard({ week }: { week: PremiumHomeWeek }) {
  const published = week.locations.filter(location => location.state === "published");
  const open = week.locations.filter(location => location.state !== "published");
  const one = open[0];
  const openNote = open.length === 0 ? (week.locations.length ? "Every location is published." : "No locations yet.")
    : open.length === 1 ? (one.state === "draft" ? `${one.name} is still a draft.` : `${one.name} isn’t started yet.`)
    : `${open.length} locations aren’t published yet.`;
  return <Card id="home-week" title="This week" meta={week.weekLabel}
    foot={<span className="premium-week-foot"><span>{plural(week.plannedShifts, "shift", "shifts")} planned, drafts included</span><KitLink href={`/app/schedule?week=${encodeURIComponent(week.weekStart)}`}>Open schedule</KitLink></span>}>
    <Progress label="Schedules published" value={published.length} max={week.locations.length}
      valueText={`${published.length} of ${plural(week.locations.length, "location", "locations")}`}
      tone={open.length ? "review" : undefined} note={openNote} />
    <Progress label="Availability received" value={week.availabilitySubmitted} max={week.availabilityEligible}
      valueText={`${week.availabilitySubmitted} of ${plural(week.availabilityEligible, "person", "people")}`} note="Employees and leads only" />
  </Card>;
}

function PlanningCard({ count }: { count: number | null | "unavailable" }) {
  return <Card id="home-planning">
    <Rows label="Plan ahead">
      <Row href="/app/inbox?filter=planning" title="Plan ahead" meta={count === null ? "Checking…" : count === "unavailable" ? "Not available right now." : `${plural(count, "item", "items")} for the coming weeks. None are urgent.`}
        leading={<Tile><CalendarBlankIcon size={20} weight="bold" /></Tile>} />
    </Rows>
  </Card>;
}

/** Team tools: the views and recovery tasks Home used to list as shortcuts. */
function ToolsCard({ week }: { week: PremiumHomeWeek }) {
  const w = encodeURIComponent(week.weekStart);
  return <Card id="home-tools" title="Team tools">
    <Rows label="Team tools">
      <Row href={`/app?week=${w}&view=attendance`} title="Attendance" meta="Clock-ins today and corrections to review" leading={<Tile><ClockIcon size={20} weight="bold" /></Tile>} />
      <Row href={`/app?week=${w}&view=team`} title="Team overview" meta="Hours and availability by person" leading={<Tile><UsersThreeIcon size={20} weight="bold" /></Tile>} />
      <Row href={`/app?week=${w}&view=activity`} title="Schedule activity" meta={week.lastPublished ? `Last published ${week.lastPublished}` : "Publications and changes"} leading={<Tile><ClockCounterClockwiseIcon size={20} weight="bold" /></Tile>} />
      <Row href="/app/clocker-recovery" title="Clocker recovery" meta={"Reconnect a shared clock\u2011in device"} leading={<Tile><WrenchIcon size={20} weight="bold" /></Tile>} />
      <Row href="/app/account-recovery" title="Account recovery" meta="Help someone get back into their account" leading={<Tile><LockKeyIcon size={20} weight="bold" /></Tile>} />
    </Rows>
  </Card>;
}
