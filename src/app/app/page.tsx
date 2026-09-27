import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        eyebrow="Sunday · Sep 27"
        title="Good evening, Jose"
        description="Here is what needs attention before the next schedule goes out."
        actions={<Link className="button primary" href="/app/schedule">Open Schedule</Link>}
      />

      <section className="metric-grid">
        <article className="metric-card">
          <span>This week</span>
          <strong>Published</strong>
          <StatusPill tone="success">Location 1</StatusPill>
        </article>
        <article className="metric-card">
          <span>Next week</span>
          <strong>Draft</strong>
          <StatusPill tone="warning">Needs review</StatusPill>
        </article>
        <article className="metric-card">
          <span>Pending requests</span>
          <strong>3</strong>
          <StatusPill tone="info">Review</StatusPill>
        </article>
        <article className="metric-card">
          <span>Open shifts</span>
          <strong>2</strong>
          <StatusPill>Coverage</StatusPill>
        </article>
      </section>

      <section className="content-grid two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Upcoming</p>
              <h2>Monday staffing</h2>
            </div>
            <Link href="/app/schedule" className="text-link">View schedule</Link>
          </div>
          <div className="staffing-row"><span>Location 1</span><strong>6 employees</strong></div>
          <div className="staffing-row"><span>Location 2</span><strong>5 employees</strong></div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Approvals</p>
              <h2>Needs your attention</h2>
            </div>
          </div>
          <div className="request-preview">
            <div>
              <strong>Maria Rivera</strong>
              <span>Day off · Oct 12</span>
            </div>
            <StatusPill tone="warning">Pending</StatusPill>
          </div>
          <div className="request-preview">
            <div>
              <strong>Carlos → Ana</strong>
              <span>Shift coverage · Friday 7–3</span>
            </div>
            <StatusPill tone="warning">Pending</StatusPill>
          </div>
        </article>
      </section>
    </>
  );
}
