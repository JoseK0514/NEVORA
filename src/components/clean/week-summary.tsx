import { Card, KitLink, Progress } from "@/components/kit/kit";
import type { PremiumHomeWeek } from "@/components/premium-home";

/* The week's planning facts (schedules published, availability received, shifts planned). Home showed this until the
 * clean Manager app (v3); Schedule owns it now. Presentation only: the facts come from the dashboard's existing read.
 * Schedule folds them into its title lines (scheduleWeekFacts, below) as the v3 mockup does; the card stays for reuse. */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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

/** The same facts for Schedule. A location may name the day it was last published ("Oct 16"). */
export type ScheduleWeekLocation = PremiumHomeWeek["locations"][number] & { id: string; publishedOn?: string | null };
export type ScheduleWeek = Omit<PremiumHomeWeek, "locations" | "availabilitySubmitted" | "availabilityEligible"> & {
  locations: ScheduleWeekLocation[];
  /** Null when the availability read failed: the line is left out rather than shown as zero. */
  availability: { submitted: number; eligible: number } | null;
};

export type ScheduleWeekFacts = {
  /** Phone subtitle after the week: "Main Office published". Empty when nothing can be said. */
  published: string;
  /** Desktop subtitle parts, one per location: "Main Office published Oct 16", "West Office not planned". */
  locations: { location: ScheduleWeekLocation; text: string }[];
  /** Desktop subtitle tail: "availability 0 of 8". */
  availabilityShort: string | null;
  /** Phone footnote: "Availability received from 0 of 8 people." (employees and leads only, as on Home). */
  availabilityNote: string | null;
};

const stateWords = { published: "published", draft: "draft", not_started: "not planned" } as const;

export function scheduleWeekFacts(week: ScheduleWeek): ScheduleWeekFacts {
  const published = week.locations.filter(location => location.state === "published");
  const all = week.locations.length;
  const publishedLine = !all ? ""
    : !published.length ? (all === 1 ? `${week.locations[0].name} ${stateWords[week.locations[0].state]}` : "Not published yet")
    : published.length === all && all > 2 ? "All locations published"
    : published.length <= 2 ? `${published.map(location => location.name).join(" and ")} published`
    : `${published.length} of ${all} locations published`;
  const availability = week.availability;
  return {
    published: publishedLine,
    locations: week.locations.map(location => ({ location,
      text: `${location.name} ${stateWords[location.state]}${location.state === "published" && location.publishedOn ? ` ${location.publishedOn}` : ""}` })),
    availabilityShort: availability ? `availability ${availability.submitted} of ${availability.eligible}` : null,
    availabilityNote: availability ? `Availability received from ${availability.submitted} of ${plural(availability.eligible, "person", "people").replace(" ", " ")}.` : null,
  };
}
