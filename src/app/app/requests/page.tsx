import {ResponsiveEmployeePlanning} from '@/components/employee-mobile/planning';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { keepWhole } from "@/lib/keep-whole";
import { TimeOffWithdrawal } from "@/components/time-off-withdrawal";
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import { randomUUID } from "node:crypto";
import { ManagerTimeOff } from "@/components/manager-time-off";
import { isTimeOffReviewerRole } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { TimeOffHashLink, TimeOffSheet } from "./time-off-signature";
import { getWorkspace } from "@/lib/data/workspaces";
import { CorpButtonLink, CorpNav, CorpNote, CorpPage, CorpRows, CorpSegments, CorpTitle } from "@/components/corp/corp";
import { TimeOffListRow, TimeOffRequestCard, canWithdrawTimeOff, timeOffDates, type TimeOffView } from "@/components/employee-mobile/timeoff-parts";
import "@/components/employee-mobile/timeoff-corp.css";
import { TimeOffWaitB } from "@/components/employee-b/timeoff-b";
import "./owner-lists.css";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { REQUESTS_COPY } from "./requests-copy";

/* Employee Time off on the corporate kit (Release 1, boards E-TimeOffDetail and E-TimeOffSheet), in the desktop column.
 * The phone draws the same pages from its planning read (employee-mobile/timeoff). Same reads, actions and fields. */

export async function generateMetadata() { return { title: REQUESTS_COPY[await readPageLang()].title }; }

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    submitted?: string;
    reviewed?: string;
    tab?: string;
    requestId?: string;
    from?: string;
    filter?: string;
    cancelled?: string;
    decided?: string;
  }>;
}) {
  const moduleOff = await moduleGate("timeOff");
  if (moduleOff) return moduleOff;

  const session = await requireSession();
  const manager = isTimeOffReviewerRole(session.role);
  const params = await searchParams;

  if (manager) return ManagerTimeOff(params);

  const mine = await listEmployeeTimeOffRequests(session.id);
  // ?tab=new (or a failed send) opens the request sheet over the list.
  const sheetOpen = params.tab === "new" || !!params.error;
  const view = params.filter === "decided" ? "decided" : "waiting";
  const lang = await readPageLang();
  const t = REQUESTS_COPY[lang];
  const zone = await getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC");

  const notice = params.error ? <p className="c-error" role="alert">{t.sendFailed}</p> : null;
  const status = params.submitted ? t.submitted : params.reviewed ? t.reviewed : null;

  type Request = (typeof mine)[number];
  const shape = (request: Request): TimeOffView => ({ id: request.id, status: request.status, startDate: request.startDate, endDate: request.endDate, startTime: request.startTime ?? null, endTime: request.endTime ?? null,
    note: request.reason ?? null, createdAt: request.createdAt ?? null, reviewedAt: request.reviewedAt ?? null, reviewer: request.reviewerName ?? null });
  // Review B2 (NV-140): waiting soonest first; decided most recently decided first.
  const shown = mine.filter(request => view === "decided" ? request.status !== "PENDING" : request.status === "PENDING")
    .sort(view === "decided" ? (a, b) => String(b.reviewedAt ?? "").localeCompare(String(a.reviewedAt ?? "")) : (a, b) => a.startDate.localeCompare(b.startDate));
  const detail = !sheetOpen && params.requestId ? mine.find(request => request.id === params.requestId) ?? null : undefined;
  const listHref = view === "decided" ? "/app/requests?filter=decided" : "/app/requests";

  const proof = await requireSessionMutationProof();
  return <ResponsiveEmployeePlanning authority={employeeViewAuthority(proof,'planning')} view="timeoff" selection={sheetOpen?'new':params.requestId??'list'} filter={view}><CorpPage className="tof-desk c-page--narrow" lang={lang === "es" ? "es" : undefined}>
    {/* Direction B: before the phone's private read starts, its first frame is this page's hero, checking (phones only). */}
    <TimeOffWaitB selection={sheetOpen ? "new" : params.requestId ?? "list"} filter={view} />
    <CorpNav back={{ href: "/app/requests/hub", label: t.requests }} title={t.title} phoneOnly />
    <CorpTitle title={t.title} wide />
    {status ? <CorpNote><span role="status">{status}</span></CorpNote> : null}
    {detail !== undefined ? detail ? <>
      <TimeOffRequestCard request={shape(detail)} zone={zone} headingId={`request-${detail.id}-dates`} />
      {detail.status === "PENDING" && detail.employeeId === session.id ? canWithdrawTimeOff(detail.id)
        ? <section className="c-card tof-withdraw" aria-label={t.withdrawRequest}><TimeOffWithdrawal requestId={detail.id} dateLabel={keepWhole(timeOffDates(shape(detail)))} /></section>
        : <CorpNote>{t.contactManager}</CorpNote> : null}
    </> : <CorpNote><span role="status">{t.unavailable}</span></CorpNote> : <>
      <TimeOffHashLink />
      <CorpSegments label={t.segmentsLabel} items={[
        { href: "/app/requests", label: t.waiting, current: view === "waiting" },
        { href: "/app/requests?filter=decided", label: t.decided, current: view === "decided" },
      ]} />
      <section className="c-card" aria-label={view === "decided" ? t.decidedRequests : t.waitingRequests}>
        {shown.length ? <CorpRows>{shown.map(request => <TimeOffListRow key={request.id} id={`request-${request.id}`} request={shape(request)}
          href={`/app/requests?requestId=${encodeURIComponent(request.id)}${view === "decided" ? "&filter=decided" : ""}`} />)}</CorpRows>
          : <p className="c-empty"><b>{view === "decided" ? t.noDecisions : t.nothingWaiting}</b>{view === "decided" ? t.decidedEmpty : mine.length ? t.waitingEmpty : t.noRequests}</p>}
      </section>
      <CorpButtonLink href="/app/requests?tab=new" full className="tof-new">{t.requestTimeOff}</CorpButtonLink>
    </>}
    <TimeOffSheet open={sheetOpen} closeHref={listHref} requestId={randomUUID()} draftOwner={session.id} notice={notice} />
  </CorpPage></ResponsiveEmployeePlanning>;
}
