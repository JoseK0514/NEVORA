import { redirect } from "next/navigation";
import { NavIcon } from "@/components/nav-icon";
import { isManagerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export default async function MyTimePage() {
  const session = await requireSession();

  if (isManagerRole(session.role)) {
    redirect("/app");
  }

  return (
    <div className="employee-view employee-my-time-view">
      <header className="employee-view-heading">
        <div>
          <p className="employee-view-eyebrow">Your worked time</p>
          <h1>My Time</h1>
        </div>
      </header>

      <section className="employee-view-surface employee-time-readiness" aria-labelledby="time-readiness-title">
        <span className="employee-time-readiness-icon" aria-hidden="true">
          <NavIcon name="clock" size={20} />
        </span>
        <div>
          <h2 id="time-readiness-title">Timekeeping isn&apos;t connected yet</h2>
          <p>
            When timekeeping is connected, your Clocker clock-ins, clock-outs,
            breaks, worked hours, and approved corrections will appear here.
          </p>
        </div>
      </section>
    </div>
  );
}
