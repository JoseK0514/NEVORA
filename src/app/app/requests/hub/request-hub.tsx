import Link from "next/link";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { NavIcon } from "@/components/nav-icon";
import { RequestHubMotion } from "./request-hub-motion";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";

export function RequestHub({ modules = ALL_MODULES_ON }: { modules?: EnabledModules }) {
  const none = !modules.timeOff && !modules.marketplace;
  return (
    <RequestHubMotion>
      <header className="request-hub-heading">
        <div>
          <h1>Requests</h1>
          <p>{modules.timeOff && modules.marketplace ? "Time off or a shift change. Start here." : modules.timeOff ? "Ask for time off. Start here." : modules.marketplace ? "A change to one of your shifts. Start here." : "Your availability and schedule."}</p>
        </div>
        <Link className="request-hub-schedule" href="/app/schedule">
          <NavIcon name="schedule" size={18} />
          <span>My schedule</span>
          <NavIcon name="arrowRight" size={16} />
        </Link>
      </header>

      <section className="request-hub-choices" aria-label="Request types">
        {modules.timeOff ? <article className="request-hub-card request-hub-timeoff">
          <span className="request-hub-icon" aria-hidden="true">
            <CalendarMinusIcon size={32} weight="duotone" />
          </span>
          <div className="request-hub-card-copy">
            <h2>Time off</h2>
            <p>Make room for life outside work.</p>
            <ul>
              <li>A full day or just a few hours</li>
              <li>Check the status of your requests</li>
            </ul>
          </div>
          <div className="request-hub-actions">
            <Link className="request-hub-action request-hub-action-primary" href="/app/requests?tab=new">
              <span>Request time off</span>
              <NavIcon name="arrowRight" size={20} />
            </Link>
            <Link className="request-hub-history" href="/app/requests?tab=my">
              <span>View my time-off requests</span>
              <NavIcon name="chevronRight" size={16} />
            </Link>
          </div>
        </article> : null}

        {modules.marketplace ? <article className="request-hub-card">
          <span className="request-hub-icon" aria-hidden="true">
            <ArrowsLeftRightIcon size={32} weight="duotone" />
          </span>
          <div className="request-hub-card-copy">
            <h2>Shift requests</h2>
            <p>When your plans and your shift don&apos;t line up.</p>
            <ul>
              <li>Review swaps, coverage and callouts</li>
              <li>Track responses and request history</li>
            </ul>
          </div>
          <div className="request-hub-actions">
            <Link className="request-hub-action request-hub-action-secondary" href="/app/exchange?tab=requests">
              <span>Open shift requests</span>
              <NavIcon name="arrowRight" size={20} />
            </Link>
            <p className="request-hub-action-hint">Choose a shift to start a swap or callout.</p>
          </div>
        </article> : null}
        {none ? <article className="request-hub-card">
          <div className="request-hub-card-copy">
            <h2>Availability</h2>
            <p>Your company handles time off and shift changes outside NEVORA. You can still tell your manager when you can work.</p>
          </div>
          <div className="request-hub-actions">
            <Link className="request-hub-action request-hub-action-primary" href="/app/availability">
              <span>Update availability</span>
              <NavIcon name="arrowRight" size={20} />
            </Link>
          </div>
        </article> : null}
      </section>

      <aside className="request-hub-guidance" aria-label="Request guidance">
        <div className="request-hub-guidance-copy">
          <span className="request-hub-guidance-icon"><NavIcon name="requests" size={22} /></span>
          <div>
            <h2>Keep track of what happens next.</h2>
            <p>Open the relevant request page to see its status and any available actions.</p>
          </div>
        </div>
        {modules.timeOff && modules.marketplace ? <details className="request-hub-help">
          <summary><span>Which request should I use?</span><CaretDownIcon size={18} aria-hidden="true" /></summary>
          <div className="request-hub-help-content">
            <p><strong>Time off</strong> is for a date or time range you need away from work.</p>
            <p><strong>Shift requests</strong> is for changes to a specific scheduled shift, including swaps, coverage and callouts.</p>
            <p>For a swap or callout, start with your scheduled shift.</p>
            <Link href="/app/schedule"><span>Open my schedule</span><NavIcon name="arrowRight" size={16} /></Link>
          </div>
        </details> : null}
      </aside>
    </RequestHubMotion>
  );
}
