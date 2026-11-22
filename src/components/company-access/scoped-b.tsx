import { CalendarDotsIcon } from "@phosphor-icons/react/dist/ssr/CalendarDots";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import type { OperationalAuthorityView } from "@/lib/company-access/model";
import { CorpCard, CorpEmptyRow, CorpLink, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { ManagerClockMonitor } from "@/components/manager-clock-monitor";
import { ScopedReadFrame } from "./scoped-read-frame";
import "./scoped-b.css";

/** An open shift this week, as readScopedCoverageGaps returns it; null when that read failed. */
export type ScopedOpenShift = { id: string; title: string; detail: string; href: string };

const placeName = (locations: { name: string; shortName?: string }[]) => locations.length === 1 ? (locations[0].shortName || locations[0].name) : null;

/** Open shifts with their Find cover links; the one card both screens share (each fact once per screen). */
/** "Sun, Nov 22 · 12:00 AM–9:30 AM · Need 1 employee" → title "Sun, Nov 22 · 12:00 AM–9:30 AM", detail "Need 1 employee".
 * The read's own title ("Coverage gap at Condado") repeats the place the page already names, so it isn't shown. */
function gapRow(shift: ScopedOpenShift) {
  const parts = shift.detail.split(" · ");
  return parts.length >= 3 ? { title: parts.slice(0, 2).join(" · "), detail: parts.slice(2).join(" · ") } : { title: shift.detail, detail: shift.title };
}

function OpenShiftsCard({ openShifts, limit, moreHref, postedHref }: { openShifts: ScopedOpenShift[] | null | undefined; limit?: number; moreHref?: string; postedHref?: string }) {
  if (openShifts === undefined) return null;
  if (openShifts === null) return <CorpCard label="Open shifts"><CorpEmptyRow>Couldn’t check open shifts. Reload to try again.</CorpEmptyRow></CorpCard>;
  const shown = limit ? openShifts.slice(0, limit) : openShifts;
  return <CorpCard label="Open shifts" count={openShifts.length || undefined} id="open-shifts">
    {openShifts.length ? <CorpRows label="Open shifts">
      {shown.map(shift => { const row = gapRow(shift); return <li key={shift.id}><CorpRow title={row.title} detail={row.detail} href={shift.href}
        trail={<span className="c-scoped__cta">Find cover</span>} /></li>; })}
      {moreHref && openShifts.length > shown.length ? <li><CorpRow title={`See all ${openShifts.length}`} href={moreHref} one /></li> : null}
    </CorpRows> : <CorpEmptyRow>Every shift this week is covered.</CorpEmptyRow>}
    {postedHref ? <div className="c-scoped__foot"><CorpLink href={postedHref}>Posted open shifts</CorpLink></div> : null}
  </CorpCard>;
}

/** Home for a Manager limited to some locations (Phase 2 direction A, Nov 22, 2026): the same Direction B page as the
 * other Managers', limited to their place. The band names the place, open shifts this week come first with Find cover,
 * then shortcuts and who's clocked in. Same reads as before plus this week's open shifts (readScopedCoverageGaps, the
 * read the Schedule already uses). No explanation of what company-wide access adds: the closed pages say it where it applies. */
export function ScopedHomeB({ view, openShifts, scheduleHref }: {
  view: Extract<OperationalAuthorityView, { state: "ready" }>; openShifts?: ScopedOpenShift[] | null; scheduleHref: string;
}) {
  const place = placeName(view.locations);
  return <ScopedReadFrame observation={view}><CorpPage className="c-scoped c-scoped-home" labelledBy="scoped-home-title">
      <CorpNav title={place ?? "Home"} titleId="scoped-home-title" phoneOnly />
      <CorpTitle title={place ?? "Home"} sub={place ? undefined : view.locations.map(l => l.shortName || l.name).join(" · ")} wide />
      <OpenShiftsCard openShifts={openShifts} limit={3} moreHref={scheduleHref + "#open-shifts"} />
      <CorpCard ariaLabel="Shortcuts">
        <CorpRows label="Shortcuts">
          <li><CorpRow title="Schedule" icon={<CalendarDotsIcon weight="bold" />} href={scheduleHref} /></li>
          <li><CorpRow title="Add shift" icon={<PlusIcon weight="bold" />} href="/app/schedule/new" /></li>
          <li><CorpRow title="Team" icon={<UsersThreeIcon weight="bold" />} href="/app/employees" /></li>
        </CorpRows>
      </CorpCard>
      <ManagerClockMonitor />
  </CorpPage></ScopedReadFrame>;
}
