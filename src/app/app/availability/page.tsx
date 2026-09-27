import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";

export default function AvailabilityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Scheduling inputs"
        title="Availability"
        description="Normal weekly availability will feed the same rules engine used by the schedule."
      />
      <section className="panel">
        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => (
          <div className="availability-row" key={day}>
            <strong>{day}</strong>
            {index === 2 || index === 6 ? (
              <StatusPill>Unavailable</StatusPill>
            ) : (
              <>
                <StatusPill tone="success">Available</StatusPill>
                <span>6:00 AM – 4:00 PM</span>
              </>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
