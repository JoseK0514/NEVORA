import { redirect } from "next/navigation";
import { NavIcon } from "@/components/nav-icon";
import { PageHeader } from "@/components/page-header";
import { isManagerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  return (
    <div className="employee-my-time-page">
      <PageHeader
        eyebrow="Employee Time"
        title="My Time"
        description="Your kiosk punches and worked-time history will appear here."
      />

      <section className="employee-my-time-card">
        <div className="employee-my-time-empty">
          <span aria-hidden="true">
            <NavIcon name="clock" size={20} />
          </span>
          <strong>Time records are coming next</strong>
          <small>
            Phase 2 will populate this page from Fuel kiosk clock-ins,
            clock-outs, breaks, and approved time corrections.
          </small>
        </div>
      </section>
    </div>
  );
}
