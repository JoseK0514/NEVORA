import { keepWhole } from "@/lib/keep-whole";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CorpButtonLink, CorpCard, CorpRow, CorpRows } from "@/components/corp/corp";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { REQUESTS_COPY } from "../requests-copy";
import { EmployeeRequestsCorp, requestsSubtitle, timeOffDetail, timeOffPill, type CorpRequestRow } from "@/components/employee-requests-corp";

/* Requests on the corporate kit (Release 1, board G-E-Requests), the desktop page: "Requests" with New request, then the
 * person's time off Waiting and Decided. The same own-request read the Time off page uses; a failed read says so and
 * never reads as "no requests". This page has no shift-request read, so those keep their own row to My shift requests. */

export type HubTimeOffRequest = {
  id: string; status: string; startDate: string; endDate: string;
  startTime?: string | null; endTime?: string | null; createdAt: string;
};

export function RequestHub({ modules = ALL_MODULES_ON, requests, lang = "en" }: {
  modules?: EnabledModules;
  /** The person's own time-off requests, newest first; null when they couldn't be read. Omitted when time off is off. */
  requests?: readonly HubTimeOffRequest[] | null;
  timeZone?: string;
  /** The person's language (readPageLang on the page). */
  lang?: PortalLang;
}) {
  const t = REQUESTS_COPY[lang];
  const row = (request: HubTimeOffRequest): CorpRequestRow => ({
    key: request.id, id: `request-${request.id}`, href: `/app/requests?requestId=${encodeURIComponent(request.id)}`,
    title: t.title, detail: keepWhole(timeOffDetail(request)), pill: timeOffPill(request.status),
  });
  const list = requests ?? [];
  const waiting = list.filter(request => request.status === "PENDING");
  const sub = modules.timeOff && requests === null ? t.couldntLoad : requestsSubtitle(modules);
  const shiftRequests = modules.marketplace ? <CorpCard id="requests-shifts" label={t.shiftRequests}>
    <CorpRows><li><CorpRow href="/app/exchange" icon={<ArrowsLeftRightIcon weight="bold" className="c-ic" />} bold title={t.swapsCover} detail={t.startFromShift} /></li></CorpRows>
  </CorpCard> : null;
  return <EmployeeRequestsCorp sub={sub} newHref={modules.timeOff ? "/app/requests?tab=new" : null}
      waiting={modules.timeOff && requests ? waiting.map(row) : null}
      decided={modules.timeOff && requests ? list.filter(request => request.status !== "PENDING").slice(0, 3).map(row) : null}
    decidedHref="/app/requests?filter=decided"
      notice={modules.timeOff && requests === null ? <CorpCard id="requests-unavailable" label={t.title}>
        <div className="c-card__body"><p className="c-ereq__state" role="status">{t.couldntCheck}</p>
          <CorpButtonLink href="/app/requests" kind="secondary" size="md" full>{t.openTimeOff}</CorpButtonLink></div>
      </CorpCard> : null}
      after={shiftRequests} />;
}
