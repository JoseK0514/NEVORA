import { keepWhole } from "@/lib/keep-whole";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CorpButtonLink, CorpCard, CorpRow, CorpRows } from "@/components/corp/corp";
import { EmployeeRequestsCorp, timeOffDetail, timeOffPill, type CorpRequestRow } from "@/components/employee-requests-corp";

/* Requests on the corporate kit (Release 1, board G-E-Requests), the desktop page: "Requests" with New request, then the
 * person's time off Waiting and Decided. The same own-request read the Time off page uses; a failed read says so and
 * never reads as "no requests". This page has no shift-request read, so those keep their own row to My shift requests. */

export type HubTimeOffRequest = {
  id: string; status: string; startDate: string; endDate: string;
  startTime?: string | null; endTime?: string | null; createdAt: string;
};

export function RequestHub({ modules = ALL_MODULES_ON, requests }: {
  modules?: EnabledModules;
  /** The person's own time-off requests, newest first; null when they couldn't be read. Omitted when time off is off. */
  requests?: readonly HubTimeOffRequest[] | null;
  timeZone?: string;
}) {
  const row = (request: HubTimeOffRequest): CorpRequestRow => ({
    key: request.id, id: `request-${request.id}`, href: `/app/requests?requestId=${encodeURIComponent(request.id)}`,
    title: "Time off", detail: keepWhole(timeOffDetail(request)), pill: timeOffPill(request.status),
  });
  const list = requests ?? [];
  const waiting = list.filter(request => request.status === "PENDING");
  const sub = modules.timeOff && requests ? (waiting.length ? `${waiting.length} waiting for approval` : "Nothing waiting")
    : modules.timeOff && requests === null ? "Couldn’t load your requests" : modules.marketplace ? "Swaps and shift changes" : "Time off and shift changes";
  const shiftRequests = modules.marketplace ? <CorpCard id="requests-shifts" label="Shift requests">
    <CorpRows><li><CorpRow href="/app/exchange" icon={<ArrowsLeftRightIcon className="c-ic" />} bold title="Swaps, cover and can’t work" detail="Start one from a shift on your schedule" /></li></CorpRows>
  </CorpCard> : null;
  return <EmployeeRequestsCorp sub={sub} newHref={modules.timeOff ? "/app/requests?tab=new" : null}
      waiting={modules.timeOff && requests ? waiting.map(row) : null}
      decided={modules.timeOff && requests ? list.filter(request => request.status !== "PENDING").slice(0, 3).map(row) : null}
    decidedHref="/app/requests?filter=decided"
      notice={modules.timeOff && requests === null ? <CorpCard id="requests-unavailable" label="Time off">
        <div className="c-card__body"><p className="c-ereq__state" role="status">Your time-off requests couldn’t be checked.</p>
          <CorpButtonLink href="/app/requests" kind="secondary" size="md" full>Open time off</CorpButtonLink></div>
      </CorpCard> : null}
      after={shiftRequests} />;
}
