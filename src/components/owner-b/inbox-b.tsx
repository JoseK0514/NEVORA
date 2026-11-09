"use client";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { reviewTimeOffAction } from "@/app/app/requests/actions";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { ActionCenterConnection } from "@/components/manager-action-center";
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

export function InboxB({ ready, families, total, connection, statusLine, todayFailed, onRefresh, back }: {
  ready: Extract<ActionCenter, { state: "ready" }> | null; families: Family[]; total: number | null; connection: ActionCenterConnection; statusLine: string;
  todayFailed: boolean; onRefresh: () => void; back: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const items = new Map((ready?.items ?? []).map(item => [item.id, item]));
  const shown = families.filter(family => filter === "all" || family.id === filter);
  const cards: ReactNode[] = [];
  for (const family of shown) for (const group of family.groups) cards.push(<GroupCard key={group.id} group={group} items={items} />);
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
        : cards.length ? cards : <BCard label="Things to do"><div className="b-notice"><BIcon tone="green"><CheckIcon weight="bold" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">You’re all set</span><span className="b-notice__s">Nothing needs you right now.</span></span></div></BCard>}
      <BCard label="More">
        <BList label="More">
          <BRow lead={<BIcon tone="grey"><SunIcon weight="bold" /></BIcon>} title="Time off requests" sub="Every request, waiting and decided" href="/app/requests" />
          <BRow lead={<BIcon tone="grey"><ArrowsLeftRightIcon weight="bold" /></BIcon>} title="Shift requests" sub="Swaps and covers between teammates" href="/app/exchange" />
          <BRow lead={<BIcon tone="grey"><CheckIcon weight="bold" /></BIcon>} title="Done and older" sub="Not counted in today’s total" href="/app/inbox?view=more" label="Done and older, not counted in today’s total" />
        </BList>
      </BCard>
    </BStack>
  </BScreen>;
}

function GroupCard({ group, items }: { group: Group; items: Map<string, ActionItem> }) {
  return <BCard title={group.title} count={count(group)} id={`b-todo-${group.id}`}>
    <BList label={group.title}>{group.rows.map((row, index) => {
      if (group.id === "open") {
        // "Today, 12–7 AM" over "Main Office · Needs 1": the day joins the time so the line under it stays short.
        const parts = (row.detail ?? "").split(" · ");
        const day = parts.length > 1 && !/Needs|open/.test(parts[0]) ? parts.shift() : undefined;
        const title = day ? `${day}, ${compactRange(row.title).replace(/^Open all day$/, "all day")}` : compactRange(row.title);
        return <BRow key={row.key} lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={title} sub={parts.join(" · ").replace(/Needs[\s\u00a0](\d+)[\s\u00a0](person|people)/, "Needs $1")} href={row.href} label={row.label}
        trail={<BButtonLink href={row.href} kind={index === 0 ? "teal" : "ghost"} label={`Find cover: ${row.title}`}>Find cover</BButtonLink>} />;
      }
      if (group.id === "missed") return <BRow key={row.key} lead={<BAvatar name={row.title} ring="late" />} title={row.title} chip={row.value ? <BChip tone="amber">{`${row.value} late`}</BChip> : undefined}
        sub={row.detail} href={row.href} label={row.label} />;
      const item = items.get(row.key);
      const requestId = group.id === "time-off" ? requestIdOf(item) : null;
      if (requestId) return <BRow key={row.key} lead={<BAvatar name={row.title} />} title={`${row.title} · Time off`} sub={row.detail} href={item?.request?.reviewHref ?? row.href} label={row.label}
        actions={<form action={reviewTimeOffAction} aria-label={`Review time off for ${row.title}`}>
          <input type="hidden" name="requestId" value={requestId} /><input type="hidden" name="returnTo" value="inbox" /><input type="hidden" name="returnFilter" value="all" />
          <Decide name={row.title} />
        </form>} />;
      const icon = group.id === "swaps" ? <ArrowsLeftRightIcon weight="bold" /> : group.id === "time-off" ? <SunIcon weight="bold" /> : group.id === "timecards" ? <CheckIcon weight="bold" /> : <ClockIcon weight="bold" />;
      return <BRow key={row.key} lead={<BIcon tone={["time-off", "swaps", "cant-work", "requests"].includes(group.id) ? "teal" : "grey"}>{icon}</BIcon>} title={row.title}
        chip={row.value ? <BChip>{row.value}</BChip> : undefined} sub={row.detail} href={row.href} label={row.label} />;
    })}</BList>
  </BCard>;
}

/** Decline and Approve, side by side under the request. While the decision is out both are disabled and the pressed one says so. */
function Decide({ name }: { name: string }) {
  const { pending, data } = useFormStatus();
  const decision = data?.get("decision");
  return <span className="b-decide" aria-busy={pending}>
    <BButton kind="quiet" type="submit" name="decision" value="DENIED" disabled={pending} label={pending ? undefined : `Decline time off for ${name}`}>{pending && decision === "DENIED" ? "Declining…" : "Decline"}</BButton>
    <BButton kind="teal" type="submit" name="decision" value="APPROVED" disabled={pending} label={pending ? undefined : `Approve time off for ${name}`}>{pending && decision === "APPROVED" ? "Approving…" : "Approve"}</BButton>
    <span className="b-sr" role="status">{pending ? "Saving your decision…" : ""}</span>
  </span>;
}
