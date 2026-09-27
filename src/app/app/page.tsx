import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  const session = await requireSession();
  const manager = isManagerRole(session.role);

  return (
    <>
      <PageHeader
        eyebrow="Fuel Coffee Drive"
        title={`Welcome, ${session.firstName}`}
        description={
          manager
            ? "Manage the week, employee requests, and coverage from one place."
            : "Your schedule, availability, and shift requests are all in one place."
        }
        actions={<Link className="button primary" href="/app/schedule">
          {manager ? "Open Schedule" : "My Schedule"}
        </Link>}
      />

      <section className="metric-grid">
        <article className="metric-card">
          <span>{manager ? "Schedule" : "This week"}</span>
          <strong>{manager ? "Ready to build" : "My shifts"}</strong>
          <StatusPill tone="info">{manager ? "2 locations" : "Schedule"}</StatusPill>
        </article>
        <article className="metric-card">
          <span>Availability</span>
          <strong>Weekly</strong>
          <StatusPill>Manage</StatusPill>
        </article>
        <article className="metric-card">
          <span>Requests</span>
          <strong>{manager ? "Review" : "My requests"}</strong>
          <StatusPill tone="warning">Open</StatusPill>
        </article>
        <article className="metric-card">
          <span>Shift Exchange</span>
          <strong>Coverage</strong>
          <StatusPill tone="success">Available</StatusPill>
        </article>
      </section>

      <section className="content-grid two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Schedule</p>
              <h2>{manager ? "Build the next week" : "See your upcoming shifts"}</h2>
            </div>
            <Link href="/app/schedule" className="text-link">Open</Link>
          </div>
          <p className="muted">
            {manager
              ? "Schedules stay in draft until management publishes them."
              : "Only published schedule changes will appear in your employee view."}
          </p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Self-service</p>
              <h2>Requests & coverage</h2>
            </div>
          </div>
          <p className="muted">
            Time off, offered shifts, and swaps all use the same scheduling rules before approval.
          </p>
        </article>
      </section>
    </>
  );
}
