import Link from "next/link";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { UserCheckIcon } from "@phosphor-icons/react/dist/ssr/UserCheck";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { NavIcon } from "@/components/nav-icon";
import { RequestHubMotion } from "./request-hub-motion";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";

export function RequestHub({ modules = ALL_MODULES_ON }: { modules?: EnabledModules }) {
  return (
    <RequestHubMotion>
      <header className="request-hub-heading">
        <div>
          <h1>Requests</h1>
          <p>{modules.timeOff && modules.marketplace ? "Ask for time off or change a shift." : modules.timeOff ? "Ask for time off." : modules.marketplace ? "Change one of your shifts." : "Tell your manager when you can work."}</p>
        </div>
      </header>

      {/* Codex U3: one compact launcher in grouped rows (the Planning ahead pattern), not large repeated cards. */}
      <section className="request-hub-group" aria-labelledby="request-hub-start">
        <h2 id="request-hub-start">Start a request</h2>
        <ul>
          {modules.timeOff ? <li><Link className="request-hub-row" href="/app/requests?tab=new">
            <CalendarMinusIcon size={22} aria-hidden="true" /><span><strong>Request time off</strong><small>A full day or a few hours</small></span><CaretRightIcon className="request-hub-caret" size={18} aria-hidden="true" />
          </Link></li> : null}
          {modules.marketplace ? <li><Link className="request-hub-row" href="/app/schedule?intent=swap">
            <ArrowsLeftRightIcon size={22} aria-hidden="true" /><span><strong>Swap a shift</strong><small>Or offer it for coverage. Starts in My schedule</small></span><CaretRightIcon className="request-hub-caret" size={18} aria-hidden="true" />
          </Link></li> : null}
          <li><Link className="request-hub-row" href="/app/availability">
            <UserCheckIcon size={22} aria-hidden="true" /><span><strong>Update availability</strong><small>When you can and can&apos;t work</small></span><CaretRightIcon className="request-hub-caret" size={18} aria-hidden="true" />
          </Link></li>
        </ul>
      </section>

      {modules.timeOff || modules.marketplace ? <section className="request-hub-group" aria-labelledby="request-hub-track">
        <h2 id="request-hub-track">Track your requests</h2>
        <ul>
          {modules.timeOff ? <li><Link className="request-hub-row request-hub-history" href="/app/requests?tab=my">
            <ClockCounterClockwiseIcon size={22} aria-hidden="true" /><span><strong>My time-off requests</strong><small>Pending, approved and past requests</small></span><CaretRightIcon className="request-hub-caret" size={18} aria-hidden="true" />
          </Link></li> : null}
          {modules.marketplace ? <li><Link className="request-hub-row request-hub-action-secondary" href="/app/exchange?tab=requests">
            <ArrowsLeftRightIcon size={22} aria-hidden="true" /><span><strong>My shift requests</strong><small>Swaps, coverage and callouts</small></span><CaretRightIcon className="request-hub-caret" size={18} aria-hidden="true" />
          </Link></li> : null}
        </ul>
      </section> : null}

      {modules.timeOff && modules.marketplace ? <details className="request-hub-help">
        <summary><span>Which request should I use?</span><CaretDownIcon size={18} aria-hidden="true" /></summary>
        <div className="request-hub-help-content">
          <p><strong>Time off</strong> is for a date or time range you need away from work.</p>
          <p><strong>Shift requests</strong> are for changes to a specific scheduled shift, including swaps, coverage and callouts.</p>
          <p>For a swap or callout, start with your scheduled shift.</p>
          <Link href="/app/schedule"><span>Open my schedule</span><NavIcon name="arrowRight" size={16} /></Link>
        </div>
      </details> : null}
    </RequestHubMotion>
  );
}
