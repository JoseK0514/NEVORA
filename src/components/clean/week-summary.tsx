import { Card, KitLink, Progress } from "@/components/kit/kit";
import type { PremiumHomeWeek } from "@/components/premium-home";

/* The week's planning facts (schedules published, availability received, shifts planned). Home showed this until the
 * clean Manager app (v3); Schedule owns it now. Presentation only: the facts come from the dashboard's existing read. */

const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;

export function WeekSummary({ week }: { week: PremiumHomeWeek }) {
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
