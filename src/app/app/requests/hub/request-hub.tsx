import Link from "next/link";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { UserCheckIcon } from "@phosphor-icons/react/dist/ssr/UserCheck";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { NavIcon } from "@/components/nav-icon";
import { Card, KitStack, PageBand, Row, Rows, Tile } from "@/components/kit/kit";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";

/** Phase 3: Requests on the kit. One band, then the same two groups (Start a request, Track your requests)
 * as kit cards with the standard row; the help stays a quiet disclosure. Routes are unchanged. */
export function RequestHub({ modules = ALL_MODULES_ON }: { modules?: EnabledModules }) {
  const purpose = modules.timeOff && modules.marketplace ? "Ask for time off or change a shift." : modules.timeOff ? "Ask for time off." : modules.marketplace ? "Change one of your shifts." : "Tell your manager when you can work.";
  return (
    <div className="nv-page employee-view request-hub premium-request-hub" data-nv-page="">
      <PageBand title="Requests" summary={purpose} />
      <KitStack>
        <Card title="Start a request" id="request-hub-start">
          <Rows label="Start a request">
            {modules.timeOff ? <Row href="/app/requests?tab=new" title="Request time off" meta="A full day or a few hours" leading={<Tile><CalendarMinusIcon size={20} /></Tile>} /> : null}
            {modules.marketplace ? <Row href="/app/schedule?intent=swap" title="Swap a shift" meta="Or offer it for coverage. Starts in My schedule" leading={<Tile><ArrowsLeftRightIcon size={20} /></Tile>} /> : null}
            <Row href="/app/availability" title="Update availability" meta="When you can and can’t work" leading={<Tile><UserCheckIcon size={20} /></Tile>} />
          </Rows>
        </Card>

        {modules.timeOff || modules.marketplace ? <Card title="Track your requests" id="request-hub-track">
          <Rows label="Track your requests">
            {modules.timeOff ? <Row href="/app/requests?tab=my" title="My time-off requests" meta="Pending, approved and past requests" leading={<Tile><ClockCounterClockwiseIcon size={20} /></Tile>} /> : null}
            {modules.marketplace ? <Row href="/app/exchange?tab=requests" title="My shift requests" meta="Swaps, coverage and callouts" leading={<Tile><ArrowsLeftRightIcon size={20} /></Tile>} /> : null}
          </Rows>
        </Card> : null}

        {modules.timeOff && modules.marketplace ? <details className="request-hub-help nv-card">
          <summary><span>Which request should I use?</span><CaretDownIcon size={18} aria-hidden="true" /></summary>
          <div className="request-hub-help-content">
            <p><strong>Time off</strong> is for a date or time range you need away from work.</p>
            <p><strong>Shift requests</strong> are for changes to a specific scheduled shift, including swaps, coverage and callouts.</p>
            <p>For a swap or callout, start with your scheduled shift.</p>
            <Link href="/app/schedule"><span>Open my schedule</span><NavIcon name="arrowRight" size={16} /></Link>
          </div>
        </details> : null}
      </KitStack>
    </div>
  );
}
