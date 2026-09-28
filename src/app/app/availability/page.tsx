import { PageHeader } from "@/components/page-header";
import { AvailabilityEditor } from "@/components/availability-editor";
import { requireSession } from "@/lib/auth/session";
import { listAvailability } from "@/lib/data/availability";
import type { AvailabilityState } from "@/lib/availability-presets";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireSession();
  const availability = await listAvailability(session.id);
  const params = await searchParams;

  const initialAvailability = Object.fromEntries(
    ALL_DAYS.map((dayOfWeek) => {
      const existing = availability.find(
        (window) => window.dayOfWeek === dayOfWeek,
      );

      return [
        dayOfWeek,
        {
          available: Boolean(existing),
          startTime: existing?.startTime ?? "06:00",
          endTime: existing?.endTime ?? "18:00",
        },
      ];
    }),
  ) as AvailabilityState;

  return (
    <div className="availability-page">
      <PageHeader
        eyebrow="My scheduling inputs"
        title="Availability"
        description="Set the hours you normally can work. This becomes the baseline for schedules, coverage, and shift swaps."
      />

      {params.error ? (
        <p className="form-error">
          Every available day needs a valid start and end time.
        </p>
      ) : null}

      {params.saved ? (
        <p className="form-success">Your weekly availability has been updated.</p>
      ) : null}

      <AvailabilityEditor initialAvailability={initialAvailability} />
    </div>
  );
}
