import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";

export default function ExchangePage() {
  return (
    <>
      <PageHeader
        eyebrow="Employee self-service"
        title="Shift Exchange"
        description="Employees can offer coverage or propose a swap, but the schedule changes only after manager approval."
      />
      <section className="content-grid two">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Available shift</p><h2>Friday · Oct 2</h2></div><StatusPill tone="info">Open</StatusPill></div>
          <p className="large-detail">6:00 AM – 2:00 PM</p>
          <p className="muted">Location 1 · Offered by Carlos Cruz</p>
          <button className="button primary full">Review eligible employees</button>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Swap request</p><h2>Maria ↔ Carlos</h2></div><StatusPill tone="warning">Manager pending</StatusPill></div>
          <p>Maria: Saturday 8–4</p><p>Carlos: Friday 6–2</p>
          <p className="success-note">Both employees meet the current scheduling criteria.</p>
        </article>
      </section>
    </>
  );
}
