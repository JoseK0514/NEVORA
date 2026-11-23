"use client";
import { useSyncExternalStore } from "react";
import { PremiumHomeSurface, type PremiumHomeWeek } from "@/components/premium-home";
import { WhosWorkingView } from "@/components/whos-working-corp";
import { useActionCenter } from "@/components/manager-action-center";
import { useToday } from "@/components/manager-today";
import { useClockMonitor } from "@/components/clean/use-clock-monitor";
import type { HomeBWeek } from "@/components/owner-b/home-b";
import type { ActionCenter } from "@/lib/action-center/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { Today } from "@/lib/today/project";

/* Home for a Manager limited to some locations (Nov 22, 2026): the company Manager's Direction B Home (HomeB through
 * the corporate Home), fed by the reads that already follow this Manager's scope: Today (/api/manager/today), the clock
 * monitor and the scoped action center. Nothing company-wide is read or shown; payroll and timecard counts, which have no
 * scoped read, are left out. With a location chosen from the band's menu, each section keeps only that place's rows. */

/** Today's shifts, clock-ins and missed punches at one location; counts follow the rows kept. */
export function todayAt(today: Today | null, locationId?: string): Today | null {
  if (!locationId || today?.state !== "ready") return today;
  const shifts = today.shifts.filter(shift => shift.locationId === locationId);
  return { ...today, shifts, missed: today.missed.filter(shift => shift.locationId === locationId),
    counts: { scheduled: shifts.length, clockedIn: new Set(shifts.filter(shift => shift.status === "clocked_in" || shift.status === "on_break").map(shift => shift.employeeId)).size,
      late: shifts.filter(shift => shift.late).length, notClockedIn: shifts.filter(shift => shift.status === "not_clocked_in").length } };
}

export function monitorAt(monitor: ClockMonitor | null, locationId?: string): ClockMonitor | null {
  if (!locationId || monitor?.state !== "ready") return monitor;
  return { ...monitor, employees: monitor.employees.filter(person => person.locationId === locationId) };
}

/** Items tied to a place keep that place's; a request or correction with no location stays (it is a person's, in scope). */
export function actionsAt(actions: ActionCenter | null, locationId?: string): ActionCenter | null {
  if (!locationId || actions?.state !== "ready") return actions;
  const items = actions.items.filter(item => !item.locationId || item.locationId === locationId);
  const of = (category: "scheduling" | "requests" | "timekeeping") => items.filter(item => item.category === category).length;
  return { ...actions, items, counts: { total: items.length, scheduling: of("scheduling"), requests: of("requests"), timekeeping: of("timekeeping") } };
}

function onlineSubscribe(change: () => void) {
  window.addEventListener("online", change); window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
}

export type ScopedHomeProps = {
  greeting: string; dateLabel: string; timeZone: string; workspaceName: string;
  weekStart: string; actorId: string;
  week: PremiumHomeWeek; homeB: HomeBWeek;
  /** The location chosen in the band's menu; none means every location this Manager manages. */
  locationId?: string;
};

export function ScopedHomeLive({ weekStart, actorId, locationId, ...props }: ScopedHomeProps) {
  const { snapshot: today, refreshing, refresh } = useToday();
  const { monitor, refreshing: monitorRefreshing, paused: monitorPaused } = useClockMonitor();
  const online = useSyncExternalStore(onlineSubscribe, () => navigator.onLine, () => true);
  const read = useActionCenter(weekStart, actorId, false, true);
  const actions = read.connection === "ready" ? read.snapshot : null;
  // Gaps G41 (Nov 23, 2026): with one place chosen, Who's working opens on that place too (it dropped ?location=).
  const homeB = locationId ? { ...props.homeB, attendanceHref: `/app?view=attendance&location=${encodeURIComponent(locationId)}` } : props.homeB;
  return <PremiumHomeSurface {...props} homeB={homeB} corporate today={todayAt(today, locationId)} monitor={monitorAt(monitor, locationId)}
    monitorPending={monitor === null && monitorRefreshing && !monitorPaused} todayRefreshing={refreshing} onRetryToday={refresh}
    actions={actionsAt(actions, locationId)} actionsConnection={read.connection} onRetryActions={read.refresh}
    nextPay={null} payrollStatus={null} liveReaders="today actions" offline={!online} />;
}

/** Home's "Who's working" for this Manager: the company page's view from the same two scoped reads (who is clocked in,
 * who hasn't clocked in, missed clock-ins). The attendance review is company-wide, so it isn't here. */
export function ScopedWhosWorking({ homeHref, locationId, place }: { homeHref: string; locationId?: string; place?: string }) {
  const { monitor, refreshing } = useClockMonitor();
  const { snapshot: today, refresh } = useToday();
  return <WhosWorkingView monitor={monitorAt(monitor, locationId)} today={todayAt(today, locationId)} refreshing={refreshing} onRetry={refresh} homeHref={homeHref} place={place} />;
}
