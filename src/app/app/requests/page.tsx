import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";

export default function RequestsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Approvals"
        title="Requests"
        description="Time off, shift coverage, and swaps come into one manager review queue."
      />
      <div className="segmented request-tabs">
        <button className="selected">All</button><button>Time Off</button><button>Coverage</button><button>Swaps</button>
      </div>
      <section className="content-grid two">
        <article className="panel request-card">
          <div><p className="eyebrow">Time off</p><h2>Maria Rivera</h2><p>October 12 · Full day</p></div>
          <StatusPill tone="warning">Pending</StatusPill>
          <div className="request-actions"><button className="button secondary">Deny</button><button className="button primary">Approve</button></div>
        </article>
        <article className="panel request-card">
          <div><p className="eyebrow">Shift coverage</p><h2>Carlos → Ana</h2><p>Friday · 7:00 AM – 3:00 PM · Location 1</p></div>
          <StatusPill tone="success">Eligible</StatusPill>
          <div className="request-actions"><button className="button secondary">Deny</button><button className="button primary">Approve</button></div>
        </article>
      </section>
    </>
  );
}
