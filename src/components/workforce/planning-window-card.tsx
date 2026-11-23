import Link from "next/link";
import { CorpCard } from "@/components/corp/corp";
import { BChip } from "@/components/owner-b/b-kit";
import { addDays } from "@/lib/date-utils";
import { dateRange } from "@/lib/duration-format";
import { WEEKDAYS } from "./weekdays";

/* SCRUM-215 (Nov 19, 2026): when the company's week doesn't start on Monday, the schedule shows the planning week (GET
 * /api/workforce/calendar/{date}, read on the server through the same function) above the Monday-keyed editor. The seven
 * days are grouped by the schedule week each belongs to, with that week's original label, because a planning week can
 * span two publication weeks: each part is edited and published in its own week, and published history keeps it. */
export type PlanningWindow = { startsOn: number; startDate: string; endDate: string; days: { date: string; scheduleWeekStart: string }[];
  shifts: { date: string; locationId: string }[]; locations: { id: string; name: string; shortName?: string }[]; publishLocationIds: string[] };

const words = {
  en: { title: "Planning week", locale: "en-US", shifts: (n: number) => n === 1 ? "1 shift" : `${n} shifts`, none: "No shifts",
    part: (range: string) => `Schedule week ${range}`, open: "Open", viewing: "Showing",
    spans: "This planning week spans two schedule weeks. Each part is edited and published with its own week.",
    publish: (names: string) => `You can publish: ${names}`, publishNone: "Publishing is done by an Owner.", publishAll: "You publish every location." },
  es: { title: "Semana de planificación", locale: "es-PR", shifts: (n: number) => n === 1 ? "1 turno" : `${n} turnos`, none: "Sin turnos",
    part: (range: string) => `Semana de horario ${range}`, open: "Abrir", viewing: "En pantalla",
    spans: "Esta semana de planificación abarca dos semanas de horario. Cada parte se edita y se publica con su propia semana.",
    publish: (names: string) => `Puedes publicar: ${names}`, publishNone: "La publicación la hace un dueño.", publishAll: "Publicas todas las localidades." },
};

function day(date: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function PlanningWindowCard({ window: w, viewingWeek, owner, locationQuery, lang = "en" }: { window: PlanningWindow; viewingWeek: string; owner: boolean; locationQuery: string; lang?: "en" | "es" }) {
  const t = words[lang];
  const range = `${day(w.startDate, t.locale, { weekday: "short", month: "short", day: "numeric" })} – ${day(w.endDate, t.locale, { weekday: "short", month: "short", day: "numeric" })}`;
  const parts = [...new Set(w.days.map(d => d.scheduleWeekStart))];
  const publishable = w.locations.filter(location => w.publishLocationIds.includes(location.id)).map(location => location.shortName || location.name);
  return <CorpCard id="schedule-planning-week" label={t.title} aside={<span className="pw-range">{range}</span>} lang={lang}><div className="pw-card">
    {parts.length > 1 ? <p className="pw-note">{t.spans}</p> : null}
    <div className="pw-parts">{parts.map(monday => {
      const days = w.days.filter(d => d.scheduleWeekStart === monday);
      const label = t.part(dateRange(monday, addDays(monday, 6), { year: "never", locale: t.locale }));
      return <section key={monday} className="pw-part" aria-label={label}>
        <div className="pw-part__h"><span className="pw-part__t">{label}</span>
          {monday === viewingWeek ? <BChip tone="teal">{t.viewing}</BChip> : <Link className="pw-open" href={`/app/schedule?week=${monday}${locationQuery}`}>{t.open}</Link>}</div>
        <ul className="pw-days">{days.map(d => {
          const count = w.shifts.filter(shift => shift.date === d.date).length;
          return <li key={d.date} className="pw-day"><span className="pw-day__w">{WEEKDAYS[lang][new Date(`${d.date}T12:00:00Z`).getUTCDay()].slice(0, 3)}</span>
            <span className="pw-day__d">{day(d.date, t.locale, { day: "numeric" })}</span><span className="pw-day__n">{count ? t.shifts(count) : t.none}</span></li>;
        })}</ul>
      </section>;
    })}</div>
    {owner ? null : <p className="pw-note pw-note--foot">{publishable.length === 0 ? t.publishNone : publishable.length === w.locations.length ? t.publishAll : t.publish(publishable.join(", "))}</p>}
  </div></CorpCard>;
}
export { words as PLANNING_WINDOW_WORDS };
