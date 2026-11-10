"use client";
import { useState } from "react";
import { CorpAvatar, CorpCard, CorpRow, CorpRows } from "./corp/corp";
import { BFilters } from "./owner-b/b-kit";
import { TeamLivePill, teamStateOf, useTeamLive, type TeamState } from "./team-live";

/** One active person's row, as the server page lays it out (name, "Position · Location", the row's spoken label). */
export type TeamDeskRow = { id: string; name: string; initials: string; detail: string; href: string; label: string };
type Filter = "all" | "working" | "late" | "off";
const inFilter = (filter: Filter, state: TeamState | null) => filter === "all" || (filter === "working" ? state === "working" || state === "break" : state === filter);

/** Closing F1 (NV-091, NV-104): desktop and tablet Team get the phone's filters (All · Clocked in · Late · Off today, from the
 * same Team live read) at the top of the People card, each row's live chip and a trailing chevron (the row opens the person's
 * page). Under All the card keeps its first `limit` people ("See all N" stays on the section); a filter lists everyone it
 * matches. The filters wait for the live read, so nothing is ever counted as "Off" before it is known. */
export function TeamDeskPeople({ rows, limit, peopleLabel }: { rows: TeamDeskRow[]; limit?: number; peopleLabel: string }) {
  const live = useTeamLive();
  const [filter, setFilter] = useState<Filter>("all");
  const count = (key: Filter) => rows.filter(row => inFilter(key, teamStateOf(live, row.id))).length;
  const shown = rows.filter(row => inFilter(filter, teamStateOf(live, row.id)));
  const listed = filter === "all" && limit ? shown.slice(0, limit) : shown;
  return <CorpCard as="div">
    {live.ready && rows.length ? <BFilters label="Show" items={[
      { key: "all", label: "All", count: rows.length, current: filter === "all", onSelect: () => setFilter("all") },
      { key: "working", label: "Clocked in", count: count("working"), current: filter === "working", onSelect: () => setFilter("working") },
      { key: "late", label: "Late", count: count("late"), current: filter === "late", onSelect: () => setFilter("late") },
      { key: "off", label: "Off today", count: count("off"), current: filter === "off", onSelect: () => setFilter("off") },
    ]} /> : null}
    {listed.length ? <CorpRows label={peopleLabel}>{listed.map(row => <li key={row.id}>
      <CorpRow href={row.href} bold title={row.name} detail={row.detail} avatar={<CorpAvatar name={row.name} initials={row.initials} />}
        trail={<TeamLivePill employeeId={row.id} />} chevron label={row.label} />
    </li>)}</CorpRows>
      : <p className="c-team__empty c-team__empty--filter" role="status">{filter === "working" ? "No one is clocked in right now." : filter === "late" ? "No one is late." : "No one is off today."}</p>}
  </CorpCard>;
}
