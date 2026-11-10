"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { ActionCenterConnection } from "@/components/manager-action-center";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { useLeaveStaffing, type StaffingState } from "@/components/leave-staffing/use-leave-staffing";
import { conflictsFor } from "@/components/leave-staffing/conflict-check";
import { MAX_STAFFING_WEEKS, weeksFor } from "@/lib/time-off-staffing/client";
import { conflictShift } from "@/lib/time-off-staffing/present";
import { compactRange, BAvatar, BButton, BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BSeg, BStack } from "./b-kit";

/* Direction B, Things to do on a phone (mock screen "Owner · Things to do"). The same groups, rows, links and counts as the
 * corporate page (groupThingsToDo); the glass chips filter them by job. An open shift's Find cover opens the same coverage
 * page as its row; a time off request carries Decline and Approve, which post the same review action as the request's own
 * page and come back here. */

type Row = { key: string; href: string; label: string; title: string; detail?: string; value?: string };
type Group = { id: string; title: string; rows: Row[]; count?: number };
type Family = { id: string; title: string; groups: Group[] };
type Filter = "all" | "card-open" | "review" | "card-requests";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const count = (group: Group) => group.count ?? group.rows.length;
const familyCount = (family: Family) => family.groups.reduce((total, group) => total + count(group), 0);
const requestIdOf = (item?: ActionItem) => { try { return item?.request ? new URL(item.request.reviewHref, "https://nevora.invalid").searchParams.get("requestId") : null; } catch { return null; } };
const FILTER_LABEL: Record<Exclude<Filter, "all">, string> = { "card-open": "Shifts", review: "Time", "card-requests": "Requests" };

export function InboxB({ ready, families, waiting = [], total, connection, statusLine, todayFailed, onRefresh, back }: {
  ready: Extract<ActionCenter, { state: "ready" }> | null; families: Family[]; waiting?: Group[]; total: number | null; connection: ActionCenterConnection; statusLine: string;
  todayFailed: boolean; onRefresh: () => void; back: boolean;
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
  const cards: ReactNode[] = [];
  for (const family of shown) for (const group of family.groups) cards.push(<GroupCard key={group.id} group={group} items={items} staffing={staffing} checked={checked} />);
  return <BScreen back={back}>
    <BHero back={back ? { href: "/app", label: "Home" } : undefined} title="Things to do" titleId="b-todo-title"
      sub={<>{total === null ? statusLine : total === 0 ? "Nothing needs you right now" : `${plural(total, "thing needs", "things need")} you`}<span role="status" className="b-sr">{statusLine}</span></>}>
      {families.length ? <BSeg label="Show" items={[
        { key: "all", label: `All ${total ?? 0}`, current: filter === "all", onSelect: () => setFilter("all") },
        ...families.map(family => ({ key: family.id, label: `${FILTER_LABEL[family.id as Exclude<Filter, "all">] ?? family.title} ${familyCount(family)}`, current: filter === family.id, onSelect: () => setFilter(family.id as Filter) })),
      ]} /> : null}
    </BHero>
    <BStack>
      {todayFailed ? <BCard label="Clock-ins"><div className="b-notice"><span className="b-notice__tx"><span className="b-notice__t">Clock-ins can’t be checked right now</span></span>
        <BButton kind="ghost" onClick={onRefresh}>Try again</BButton></div></BCard> : null}
      {!ready ? <BCard label="Things to do"><div className="b-notice"><span className="b-notice__tx"><span className="b-notice__t" aria-busy={connection === "loading" || connection === "reconnecting" || undefined}>{statusLine}</span></span>
        {connection === "unavailable" || connection === "ready" ? <BButton kind="ghost" onClick={onRefresh}>Try again</BButton> : connection === "access_lost" ? <BButtonLink href="/login" kind="ghost">Sign in</BButtonLink> : null}</div></BCard>
        : cards.length || waiting.length ? <>{cards}{/* Review B2 (NV-002): reviews that wait (not due today) are listed after today's cards. */}
          {filter === "all" || filter === "review" ? waiting.map(group => <GroupCard key={group.id} group={{ ...group, title: `${group.title} · waiting` }} items={items} staffing={staffing} checked={checked} />) : null}</> : <BCard label="Things to do"><div className="b-notice"><BIcon tone="green"><CheckIcon weight="bold" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">You’re all set</span><span className="b-notice__s">Nothing needs you right now.</span></span></div></BCard>}
      <BCard label="More">
        <BList label="More">
          <BRow lead={<BIcon tone="grey"><SunIcon weight="bold" /></BIcon>} title="Time off requests" sub="Every request, waiting and decided" href="/app/requests" />
          <BRow lead={<BIcon tone="grey"><ArrowsLeftRightIcon weight="bold" /></BIcon>} title="Shift requests" sub="Swaps and covers between teammates" href="/app/exchange" />
          <BRow lead={<BIcon tone="grey"><CheckIcon weight="bold" /></BIcon>} title="Later and done" sub="Plan ahead and earlier this week" href="/app/inbox?view=more" label="Later and done: plan ahead and earlier this week" />
        </BList>
      </BCard>
    </BStack>
  </BScreen>;
}

function GroupCard({ group, items, staffing, checked }: { group: Group; items: Map<string, ActionItem>; staffing: StaffingState; checked: Set<string> }) {
  return <BCard title={group.title} count={count(group)} id={`b-todo-${group.id}`}>
    <BList label={group.title}>{group.rows.map((row, index) => {
      if (group.id === "open") {
        // "Today, 12–7 AM" over "Main Office · Needs 1": the day joins the time so the line under it stays short.
        const parts = (row.detail ?? "").split(" · ");
        const day = parts.length > 1 && !/Needs|open/.test(parts[0]) ? parts.shift() : undefined;
        const title = day ? `${day}, ${compactRange(row.title).replace(/^Open all day$/, "all day")}` : compactRange(row.title);
        return <BRow key={row.key} lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={title} sub={parts.join(" · ").replace(/Needs[\s\u00a0](\d+)[\s\u00a0](person|people)/, "Needs $1")} href={row.href} label={row.label}
        trail={<BButtonLink href={row.href} kind="ghost" label={`Find cover: ${row.title}`}>Find cover</BButtonLink>} />;
      }
      // Approved leave over a published shift: the schedule's job ("Fill Maria Rivera’s shift"), no Approve or Decline.
      if (group.id === "repair") return <BRow key={row.key} lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={row.title}
        chip={row.value ? <BChip tone="amber">{row.value}</BChip> : <BChip tone="amber">Approved leave</BChip>} sub={row.detail} href={row.href} label={row.label}
        trail={<BButtonLink href={row.href} kind="ghost" label={`Fill shift: ${row.title}`}>Fill</BButtonLink>} />;
      if (group.id === "missed") return <BRow key={row.key} lead={<BAvatar name={row.title} ring="late" />} title={row.title} chip={row.value ? <BChip tone="amber">{`${row.value} late`}</BChip> : undefined}
        sub={row.detail} href={row.href} label={row.label} />;
      const item = items.get(row.key);
      const requestId = group.id === "time-off" ? requestIdOf(item) : null;
      if (requestId) {
        const conflicts = checked.has(requestId) ? conflictsFor(staffing, requestId) : null;
        const clear = conflicts !== null && conflicts.length === 0;
        const reviewHref = item?.request?.reviewHref ?? row.href;
        const note = conflicts?.length ? <span className="b-leave-note" data-tone="amber"><WarningIcon weight="bold" aria-hidden="true" />{`On the schedule: ${conflictShift(conflicts[0])}${conflicts.length > 1 ? ` +${conflicts.length - 1}` : ""}`}</span>
          : conflicts ? null : <span className="b-leave-note">{!checked.has(requestId) ? "Check the schedule on its page" : staffing.status === "loading" ? "Checking the schedule…" : staffing.status === "expired" ? "Schedule check expired" : staffing.status === "paused" ? "Schedule check paused" : "Couldn’t check the schedule"}</span>;
        return <BRow key={row.key} lead={<BAvatar name={row.title} />} title={`${row.title} · Time off`} sub={<>{row.detail}{note}</>} href={reviewHref} label={row.label}
          actions={<form action={reviewTimeOffAction}>
            <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="returnTo" value="inbox" /><input type="hidden" name="returnFilter" value="all" />
            <Decide name={row.title} approve={clear} reviewHref={reviewHref} />
          </form>} />;
      }
      const icon = group.id === "swaps" ? <ArrowsLeftRightIcon weight="bold" /> : group.id === "time-off" ? <SunIcon weight="bold" /> : group.id.endsWith("timecards") ? <CheckIcon weight="bold" /> : <ClockIcon weight="bold" />;
      return <BRow key={row.key} lead={<BIcon tone={group.id === "cant-work" ? "amber" : ["time-off", "swaps", "requests"].includes(group.id) ? "teal" : "grey"}>{icon}</BIcon>} title={row.title}
        chip={row.value ? <BChip>{row.value}</BChip> : undefined} sub={row.detail} href={row.href} label={row.label} />;
    })}</BList>
  </BCard>;
}

/** Decline and Approve, side by side under the request. While the decision is out both are disabled and the pressed one says so. */
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
    {approve ? <BButton kind="teal" type="submit" name="decision" value="APPROVED" disabled={pending} label={pending ? undefined : `Approve time off for ${name}`}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</BButton>
      : <BButtonLink href={reviewHref} kind="teal" label={`Review time off for ${name}`}>Review</BButtonLink>}
    <span className="b-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </span>;
}
