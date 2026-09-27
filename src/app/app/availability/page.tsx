import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireSession } from "@/lib/auth/session";
import { listAvailability } from "@/lib/data/availability";
import { saveAvailabilityAction } from "@/app/app/availability/actions";

const DAYS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 0, label: "Sunday" },
];

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const session = await requireSession();
  const availability = await listAvailability(session.id);
  const params = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="My scheduling inputs"
        title="Availability"
        description="Set your normal weekly availability. Managers use this when building schedules and the shift exchange checks it automatically."
      />

      {params.error ? (
        <p className="form-error">Every available day needs a valid start and end time.</p>
      ) : null}
      {params.saved ? (
        <p className="form-success">Your weekly availability has been updated.</p>
      ) : null}

      <form action={saveAvailabilityAction} className="panel availability-editor">
        {DAYS.map((day) => {
          const existing = availability.find(
            (window) => window.dayOfWeek === day.dayOfWeek,
          );
          const available = Boolean(existing);

          return (
            <div className="availability-edit-row" key={day.dayOfWeek}>
              <div className="availability-day">
                <strong>{day.label}</strong>
                <StatusPill tone={available ? "success" : "neutral"}>
                  {available ? "Available" : "Unavailable"}
                </StatusPill>
              </div>

              <label className="availability-toggle">
                <input
                  type="checkbox"
                  name={`available-${day.dayOfWeek}`}
                  defaultChecked={available}
                />
                <span>Available</span>
              </label>

              <div className="availability-times">
                <label>
                  From
                  <input
                    type="time"
                    name={`start-${day.dayOfWeek}`}
                    defaultValue={existing?.startTime ?? "06:00"}
                  />
                </label>
                <label>
                  Until
                  <input
                    type="time"
                    name={`end-${day.dayOfWeek}`}
                    defaultValue={existing?.endTime ?? "18:00"}
                  />
                </label>
              </div>
            </div>
          );
        })}

        <div className="form-footer">
          <button className="button primary" type="submit">Save Availability</button>
        </div>
      </form>
    </>
  );
}
