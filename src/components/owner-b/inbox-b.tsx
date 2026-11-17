"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { UserMinusIcon } from "@phosphor-icons/react/dist/ssr/UserMinus";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { ActionCenterConnection } from "@/components/manager-action-center";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { useLeaveStaffing, type StaffingState } from "@/components/leave-staffing/use-leave-staffing";
import { conflictsFor } from "@/components/leave-staffing/conflict-check";
import { MAX_STAFFING_WEEKS, weeksFor } from "@/lib/time-off-staffing/client";
import { conflictShift } from "@/lib/time-off-staffing/present";
import { reviewCopy } from "@/components/review-details/copy";
import { BAvatar, BButton, BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BSeg, BStack, BState, BWhen } from "./b-kit";

/* Direction B, Things to do on a phone (mock screen "Owner · Things to do"). The same groups, rows, links and counts as the
 * corporate page (groupThingsToDo); the glass chips filter them by job. An open shift's Find cover opens the same coverage
 * page as its row; a time off request carries Decline and Approve, which post the same review action as the request's own
 * page and come back here. */

type Row = { key: string; href: string; label: string; title: string; detail?: string; value?: string; person?: string; lines?: string[]; quiet?: boolean };
type Group = { id: string; title: string; rows: Row[]; count?: number; note?: string };
type Family = { id: string; title: string; groups: Group[] };
type Filter = "all" | "card-open" | "review" | "card-requests";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const t = reviewCopy();
/** Phase 4 (U09): a row's further lines (the other shift of a swap, a cover request's result, who reviews it). */
const subOf = (row: Row): ReactNode => row.lines?.length ? <>{row.detail}{row.lines.map(line => <span key={line} className="b-row__more">{line}</span>)}</> : row.detail;
const count = (group: Group) => group.count ?? group.rows.length;
const familyCount = (family: Family) => family.groups.reduce((total, group) => total + count(group), 0);
const requestIdOf = (item?: ActionItem) => { try { return item?.request ? new URL(item.request.reviewHref, "https://nevora.invalid").searchParams.get("requestId") : null; } catch { return null; } };
const FILTER_LABEL: Record<Exclude<Filter, "all">, string> = { "card-open": "Shifts", review: "Time", "card-requests": "Requests" };

/** Closing F1 (NV-075): Things to do's own read, when it isn't ready, is one state card (said once, not also in the band). */
function ReadState({ connection, statusLine, onRefresh }: { connection: ActionCenterConnection; statusLine: string; onRefresh: () => void }) {
  if (connection === "loading" || connection === "reconnecting") return <BState kind="loading" line={statusLine} />;
  if (connection === "offline") return <BState kind="offline" title="You’re offline" line="Things to do updates when you reconnect." />;
  if (connection === "paused") return <BState kind="paused" title="Paused while you’re away" line="It updates when you come back to this page." />;
  if (connection === "access_lost") return <BState kind="locked" title="Your session ended" line="Sign in again to see what needs you." action={{ label: "Sign in", href: "/login" }} />;
  return <BState kind="failed" title="Things to do didn’t load" line="Check your connection, then try again." action={{ label: "Try again", onClick: onRefresh }} />;
}

/** Closing F1 (NV-002): Later and done says what it holds ("Plan ahead 47 · Earlier 3"), so nothing waits unseen. */
export type LaterCounts = { plan: number; earlier: number };
// Phase 3 (OW-033): "38 planned · 8 done" fits the shortcut's one line (it was "Plan ahead 38 · Earlier this week 8").
const laterLine = (later?: LaterCounts) => !later ? "Plan ahead and earlier this week" : later.plan + later.earlier === 0 ? "Nothing later or done"
  : [later.plan ? `${later.plan} planned` : null, later.earlier ? `${later.earlier} done` : null].filter(Boolean).join(" · ");

/** Phase 3 (OW-035): one glyph per kind, and one tone rule. Amber waits on you; teal is information; grey is done or not
 * open yet. People's rows (time off, clock-ins) lead with the person's avatar instead. */
function kindIcon(id: string): { tone: "amber" | "teal" | "grey"; icon: ReactNode } {
  if (id === "swaps") return { tone: "amber", icon: <ArrowsLeftRightIcon weight="bold" /> };
  if (id === "cant-work") return { tone: "amber", icon: <UserMinusIcon weight="bold" /> };
  if (id.endsWith("corrections")) return { tone: "amber", icon: <ClockCounterClockwiseIcon weight="bold" /> };
  if (id === "closed-timecards") return { tone: "grey", icon: <ListChecksIcon weight="bold" /> };
  if (id.endsWith("timecards")) return { tone: "teal", icon: <ListChecksIcon weight="bold" /> };
  if (id === "time-off" || id === "requests") return { tone: "amber", icon: <SunIcon weight="bold" /> };
  if (id === "plan") return { tone: "grey", icon: <CalendarBlankIcon weight="bold" /> };
  if (id === "earlier") return { tone: "grey", icon: <CheckIcon weight="bold" /> };
  return { tone: "amber", icon: <ClockIcon weight="bold" /> };
}

export function InboxB({ ready, families, waiting = [], closed = [], total, exact = true, uncheckedReviews = 0, connection, statusLine, todayFailed, onRefresh, back, later }: {
  /** Phase 4 (U03): false when the count is a lower bound (clock-ins unread, or review facts missing): the band says
   * "At least N" and the page never offers all-clear. */
  exact?: boolean; uncheckedReviews?: number;
  ready: Extract<ActionCenter, { state: "ready" }> | null; families: Family[]; waiting?: Group[];
  /** Phase 3 (MG-005): what can't be decided yet (timecards of a pay period still open): one grey card, no count pill. */
  closed?: Group[]; total: number | null; connection: ActionCenterConnection; statusLine: string;
  todayFailed: boolean; onRefresh: () => void; back: boolean; later?: LaterCounts;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const items = new Map((ready?.items ?? []).map(item => [item.id, item]));
  const shown = families.filter(family => filter === "all" || family.id === filter);
  // Nov 9, 2026: before a time off row's Approve, the published shifts it overlaps. One read covers the weeks of every
  // waiting request here; a row offers Approve only once that check is back with no overlap, otherwise Review (its page).
  const leaves = useMemo(() => (ready?.items ?? []).flatMap(item => { const id = requestIdOf(item); return id && item.request ? [{ id, weeks: weeksFor(item.request.startDate, item.request.endDate) }] : []; }), [ready]);
  const weeks = useMemo(() => [...new Set(leaves.flatMap(leave => leave.weeks ?? []))].sort().slice(0, MAX_STAFFING_WEEKS), [leaves]);
  const { state: staffing } = useLeaveStaffing(weeks.length ? { weeks } : null);
  const checked = useMemo(() => new Set(leaves.filter(leave => leave.weeks?.every(week => weeks.includes(week))).map(leave => leave.id)), [leaves, weeks]);
  // Phase 3 (MG-005): the count is everything that can be decided today (corrections included; needsYou counts them), so
  // the tabs add up to it. The timecards of a pay period that has ended are approved on Timecards; the band names them
  // after the count, so nothing on the page is outside what the band says.
  const timecards = waiting.filter(group => group.id.endsWith("timecards")).reduce((sum, group) => sum + count(group), 0);
  const needs = total === null ? null : total === 0 ? exact ? "Nothing needs you right now" : t.notAllChecked : t.needYou(total, exact);
  // Home's rows open a kind here ("/app/inbox#todo-corrections"): the card with that kind comes into view.
  const hasCards = !!ready;
  useEffect(() => {
    if (!hasCards) return;
    const id = window.location.hash.slice(1);
    if (!/^todo-[a-z-]+$/.test(id)) return;
    const kinds: Record<string, string> = { "todo-review": "todo-not-clocked-in,todo-missed,todo-now,todo-corrections,todo-timecards,todo-waiting-timecards", "todo-requests": "todo-time-off,todo-swaps,todo-cant-work,todo-requests" };
    const card = (kinds[id] ?? id).split(",").map(kind => document.getElementById(`b-${kind}`)).find(Boolean);
    card?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [hasCards]);
  const cards: ReactNode[] = [];
  for (const family of shown) for (const group of family.groups) cards.push(<GroupCard key={group.id} group={group} items={items} staffing={staffing} checked={checked} />);
  return <BScreen back={back}>
    <BHero back={back ? { href: "/app", label: "Home" } : undefined} title="Things to do" titleId="b-todo-title"
      sub={needs === null ? undefined : <>{timecards ? `${needs} · ${plural(timecards, "timecard", "timecards").replace(" ", "\u00a0")} to approve` : needs}<span role="status" className="b-sr">{statusLine}</span></>}>
      {families.length ? <BSeg label="Show" items={[
        // Review F5 (NV-103): each count is the segmented control's count pill; the name still reads "All, 13".
        { key: "all", label: total === null ? "All" : <>All<span className="c-count c-num">{total}</span></>, aria: total === null ? undefined : `All, ${total}`, current: filter === "all", onSelect: () => setFilter("all") },
        ...families.map(family => { const name = FILTER_LABEL[family.id as Exclude<Filter, "all">] ?? family.title, count = familyCount(family);
          return { key: family.id, label: <>{name}<span className="c-count c-num">{count}</span></>, aria: `${name}, ${count}`, current: filter === family.id, onSelect: () => setFilter(family.id as Filter) }; }),
      ]} /> : null}
    </BHero>
    <BStack>
      {/* Phase 2 (package D): one Try again for one failure. When the list failed too, its card under this one carries the
        retry (the same refresh), so this card only says what is missing. */}
      {todayFailed ? <BCard label="Clock-ins"><BState kind="failed" title="Clock-ins can’t be checked right now" line="People who haven’t clocked in may not be listed."
        action={!ready && !["loading", "reconnecting", "offline", "paused", "access_lost"].includes(connection) ? undefined : { label: "Try again", onClick: onRefresh }} /></BCard> : null}
      {!ready ? <BCard label="Things to do"><ReadState connection={connection} statusLine={statusLine} onRefresh={onRefresh} /></BCard>
        : cards.length || waiting.length || closed.length ? <>{cards}{/* Review B2 (NV-002): reviews that wait are listed after today's cards. Phase 3
          (MG-005, OW-014): no "· waiting" suffix; what isn't open yet is one grey card at the bottom with no count pill. */}
          {filter === "all" || filter === "review" ? <>{waiting.map(group => <GroupCard key={group.id} group={group} items={items} staffing={staffing} checked={checked} />)}
            {closed.map(group => <GroupCard key={group.id} group={group} items={items} staffing={staffing} checked={checked} quiet />)}</> : null}</> : exact ? <BCard label="Things to do"><div className="b-notice"><BIcon tone="green"><CheckIcon weight="bold" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">You’re all set</span><span className="b-notice__s">Nothing needs you right now.</span></span></div></BCard>
          : <BCard label="Things to do"><div className="b-notice"><BIcon tone="amber"><WarningIcon weight="bold" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">{t.nothingListed}</span><span className="b-notice__s">{t.nothingListedLine}</span></span></div></BCard>}
      {ready && uncheckedReviews ? <p className="b-note">{t.correctionsUnchecked(uncheckedReviews)}</p> : null}
      {/* Review B5 (NV-250): on desktop the shortcuts stay in reach while the list scrolls (sticky), with one-line sub-lines. */}
      <BCard label="More" id="b-todo-more">
        <BList label="More">
          <BRow lead={<BIcon tone="grey"><SunIcon weight="bold" /></BIcon>} title="Time off requests" sub="Waiting and decided" href="/app/requests" />
          <BRow lead={<BIcon tone="grey"><ArrowsLeftRightIcon weight="bold" /></BIcon>} title="Shift requests" sub="Swaps and covers" href="/app/exchange" />
          {/* Nov 14, 2026 inspection (AR-9): who can work is one tap from the requests it helps decide. */}
          <BRow lead={<BIcon tone="grey"><CalendarCheckIcon weight="bold" /></BIcon>} title="Availability" sub="Who can work, and when" href="/app/availability" />
          <BRow lead={<BIcon tone="grey"><CheckIcon weight="bold" /></BIcon>} title="Later and done" sub={laterLine(later)} href="/app/inbox?view=more" label={`Later and done: ${laterLine(later).toLowerCase()}`} />
        </BList>
      </BCard>
    </BStack>
  </BScreen>;
}

/** Review B5 (NV-031): Later and done is a Direction B page on phones too (the band with "‹ Things to do"), so the phone
 * no longer shows the white header and a title straddling the band. The same groups as the desktop list. */
export function LaterB({ ready, groups, statusLine, onRefresh, connection = "unavailable" }: { ready: boolean; groups: Group[]; statusLine: string; onRefresh: () => void; connection?: ActionCenterConnection }) {
  const none = new Map<string, ActionItem>(), idle: StaffingState = { status: "loading" }, unchecked = new Set<string>();
  return <BScreen back>
    <BHero back={{ href: "/app/inbox", label: "Things to do" }} title="Later and done" titleId="b-later-title" />
    <BStack>
      {!ready ? <BCard label="Later and done"><ReadState connection={connection} statusLine={statusLine} onRefresh={onRefresh} /></BCard>
        : groups.length ? groups.map(group => <GroupCard key={group.id} group={group} items={none} staffing={idle} checked={unchecked} />)
        : <BCard label="Later and done"><div className="b-notice"><BIcon tone="green"><CheckIcon weight="bold" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">Nothing later or done</span><span className="b-notice__s">Planning items and earlier gaps appear here.</span></span></div></BCard>}
    </BStack>
  </BScreen>;
}

function GroupCard({ group, items, staffing, checked, quiet }: { group: Group; items: Map<string, ActionItem>; staffing: StaffingState; checked: Set<string>; quiet?: boolean }) {
  // Phase 4 (U03): a card that only lists what another reviewer decides carries no count pill.
  return <BCard title={group.title} count={quiet || (count(group) === 0 && group.rows.every(row => row.quiet)) ? undefined : count(group)} id={`b-todo-${group.id}`}>
    {group.note ? <p className="b-card__note">{group.note}</p> : null}
    <BList label={group.title}>{group.rows.map((row) => {
      if (group.id === "open") {
        // "Today, 12–7 AM" over "Main Office · Needs 1": the day joins the time so the line under it stays short.
        const parts = (row.detail ?? "").split(" · ");
        const day = parts.length > 1 && !/Needs|open/.test(parts[0]) ? parts.shift() : undefined;
        // Review B7 (NV-068): rows keep full times with a spaced en dash from 768px. Jose (Nov 15, 2026, item 5): phones
        // write the short form ("3–4:30 PM"), as the Schedule's day list does.
        const time = row.title.replace(/^Open all day$/, "all day");
        return <BRow key={row.key} lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={<>{day ? `${day}, ` : null}<BWhen text={day ? time : row.title} /></>} sub={parts.join(" · ").replace(/Needs[\s\u00a0](\d+)[\s\u00a0](person|people)/, "Needs $1")} href={row.href} label={row.label}
        trail={<BButtonLink href={row.href} kind="ghost" label={`Find cover: ${row.title}`}>Find cover</BButtonLink>} />;
      }
      // Approved leave over a published shift: the schedule's job ("Fill Maria Rivera’s shift"), no Approve or Decline.
      if (group.id === "repair") return <BRow key={row.key} lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={row.title}
        chip={row.value ? <BChip tone="amber">{row.value}</BChip> : <BChip tone="amber">Approved time off</BChip>} sub={row.detail} href={row.href} label={row.label}
        trail={<BButtonLink href={row.href} kind="ghost" label={`Fill shift: ${row.title}`}>Fill</BButtonLink>} />;
      // Jose's attendance words (Nov 11, 2026): a shift in progress with no punch is "Not clocked in" (its chip says how
      // long ago it started); "Missed" is only a shift that ended with no punch.
      if (group.id === "missed" || group.id === "not-clocked-in") return <BRow key={row.key} lead={<BAvatar name={row.title} ring="late" />} title={row.title}
        chip={row.value ? <BChip tone="amber">{`Started ${row.value} ago`}</BChip> : undefined} sub={row.detail} href={row.href} label={row.label} />;
      const item = items.get(row.key);
      const requestId = group.id === "time-off" ? requestIdOf(item) : null;
      if (requestId) {
        const conflicts = checked.has(requestId) ? conflictsFor(staffing, requestId) : null;
        const clear = conflicts !== null && conflicts.length === 0;
        const reviewHref = item?.request?.reviewHref ?? row.href;
        const note = conflicts?.length ? <span className="b-leave-note" data-tone="amber"><WarningIcon weight="bold" aria-hidden="true" />{`On the schedule: ${conflictShift(conflicts[0])}${conflicts.length > 1 ? ` +${conflicts.length - 1}` : ""}`}</span>
          : conflicts ? null : <span className="b-leave-note">{!checked.has(requestId) ? "Check the schedule on its page" : staffing.status === "loading" ? "Checking the schedule…" : staffing.status === "expired" ? "Schedule check expired" : staffing.status === "paused" ? "Schedule check paused" : "Couldn’t check the schedule"}</span>;
        // Phase 3 (OW-012): a row with buttons has no chevron (the row itself opens the request); the buttons end the row.
        return <BRow key={row.key} lead={<BAvatar name={row.title} />} title={row.title} sub={<>{row.detail}{note}</>} href={reviewHref} label={row.label} chevron={false}
          actions={<form action={reviewTimeOffAction}>
            <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="returnTo" value="inbox" /><input type="hidden" name="returnFilter" value="all" />
            <Decide name={row.title} approve={clear} reviewHref={reviewHref} />
          </form>} />;
      }
      const kind = kindIcon(group.id);
      // Phase 3 (MG-012): swaps and can't-work requests are decisions too, so they end with the same tinted Review pill
      // as time off (their page holds Approve and Decline).
      const review = group.id === "swaps" || group.id === "cant-work";
      return <BRow key={row.key} lead={<BIcon tone={row.quiet ? "grey" : kind.tone}>{kind.icon}</BIcon>} title={row.title}
        chip={row.value ? <BChip>{row.value}</BChip> : undefined} sub={subOf(row)} href={row.href} label={row.label}
        trail={review ? <BButtonLink href={row.href} kind="ghost" label={`Review ${row.title}`}>Review</BButtonLink> : undefined} />;
    })}</BList>
  </BCard>;
}

/** Decline and Approve, side by side under the request. While the decision is out both are disabled and the pressed one says so.
 * Nov 14, 2026 inspection (OW-001): a list of requests carries no filled primary. Approve (or Review) is the tinted pill and
 * Decline a quiet text button (manager-inbox-corp.css); the handlers and the 44px targets are the same. */
function Decide({ name, approve, reviewHref }: { name: string; approve: boolean; reviewHref: string }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  // Review B1 (NV-125): Decline asks once ("Decline Ana's time off?"), so a mis-tap can't decline it; Approve stays one tap.
  const [confirming, setConfirming] = useState<boolean | null>(null);
  const pair = useRef<HTMLSpanElement>(null);
  // Focus follows the swap: to Keep when the question opens, back to Decline when it closes (the pressed button is gone).
  useEffect(() => { if (confirming !== null) pair.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [confirming]);
  if (confirming && !pending) return <span ref={pair} className="b-decide b-decide--confirm" role="group" aria-label={`Decline time off for ${name}?`}>
    <BButton kind="quiet" onClick={() => setConfirming(false)} label={`Keep time off request for ${name}`}>Keep</BButton>
    <BButton kind="danger" type="submit" name="decision" value="DENIED" label={`Decline time off for ${name}`}>Decline</BButton>
  </span>;
  return <span ref={pair} className="b-decide" aria-busy={pending}>
    <BButton kind="quiet" onClick={() => setConfirming(true)} disabled={pending} label={pending ? undefined : `Decline time off for ${name}`}>{pending && decision === "DENIED" ? "Declining…" : "Decline"}</BButton>
    {/* Approve only once the schedule check came back with no overlap; otherwise its page shows the shifts first. */}
    {approve ? <BButton kind="ghost" type="submit" name="decision" value="APPROVED" disabled={pending} label={pending ? undefined : `Approve time off for ${name}`}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</BButton>
      : <BButtonLink href={reviewHref} kind="ghost" label={`Review time off for ${name}`}>Review</BButtonLink>}
    <span className="b-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </span>;
}
