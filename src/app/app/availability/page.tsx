import {ResponsiveEmployeePlanning} from '@/components/employee-mobile/planning';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { getWorkspace } from "@/lib/data/workspaces";
import { keepWhole } from "@/lib/keep-whole";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { availabilityCopy, esBusinessDateTime } from "@/components/availability-copy";
import { esWeekRange } from "@/components/copy-receipt-copy";
import { businessDate, formatBusinessDateTime } from "@/lib/business-time";
import { ManagerAvailability } from "@/components/manager-availability";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { AvailabilitySignatureEditor } from "@/components/availability-signature";
import { CorpLink, CorpNav, CorpPage, CorpPill, CorpTitle } from "@/components/corp/corp";
import "@/components/availability-corp.css";
import { availabilityWeekLabel } from "@/components/availability-week-label";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { listAvailability } from "@/lib/data/availability";
import { getAvailabilitySubmissionStatus } from "@/lib/data/availability-submissions";
import type { AvailabilitySubmissionStatus } from "@/lib/assistance/availability-submission";
import {
  getUpcomingAvailabilityWeek,
  getWeekSettings,
  listWeeklyAvailability,
} from "@/lib/data/week-settings";
import {
  formatWeekRange,
  addDays, isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import type { AvailabilityState } from "@/lib/availability-presets";
import "../requests/owner-lists.css";
import { AvailabilityB, AvailabilityStatusB, availabilitySubB } from "@/components/employee-b/availability-b";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
}

function buildState(
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
): AvailabilityState {
  return Object.fromEntries(
    ALL_DAYS.map((dayOfWeek) => {
      const existing = availability.find(
        (window) => window.dayOfWeek === dayOfWeek,
      );

      return [
        dayOfWeek,
        {
          available: Boolean(existing),
          startTime: existing?.startTime ?? "06:00",
          endTime: existing?.endTime === "24:00" ? "00:00" : existing?.endTime ?? "18:00",
        },
      ];
    }),
  ) as AvailabilityState;
}

function submissionStatusCopy(status: AvailabilitySubmissionStatus, hasDeadline = true, t = availabilityCopy().page) {
  if (status.state === "LOCKED") {
    if (!status.submitted) {
      return {
        label: t.lockedNotSubmitted,
        detail: t.lockedNotSubmittedDetail,
      };
    }

    return {
      label: t.lockedSubmitted,
      detail:
        status.windowCount === 0
          ? t.lockedUnavailableDetail
          : t.lockedDetail,
    };
  }

  if (status.state === "SUBMITTED_UNAVAILABLE") {
    return {
      label: t.submittedUnavailable,
      detail: t.submittedUnavailableDetail,
    };
  }

  if (status.state === "SUBMITTED") {
    return {
      label: t.submitted,
      detail: t.submittedDetail,
    };
  }

  return {
    label: t.notSubmitted,
    detail: hasDeadline ? t.notSubmittedDeadline : t.notSubmittedNoDeadline,
  };
}

export async function generateMetadata() {
  return { title: availabilityCopy(await readPageLang()).page.title };
}

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    week?: string;
    employeeId?: string;
  }>;
}) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentWeek = weekStartFor(businessDate(new Date(), workspace.timeZone));
  if (manager) return ManagerAvailability({ timeZone: workspace.timeZone, week: params.week, currentWeek, employeeId: params.employeeId });

  const selectedWeek = validWeek(params.week) ? params.week! : undefined;
  const lang = await readPageLang(), t = availabilityCopy(lang).page;

  const [normalAvailability, upcomingWeek] = await Promise.all([
    listAvailability(session.id),
    getUpcomingAvailabilityWeek(currentWeek),
  ]);

  let initialAvailability = buildState(normalAvailability);
  let settings = null;
  let submissionStatus: AvailabilitySubmissionStatus | null = null;

  if (selectedWeek) {
    const [weekSettings, weekly, status] = await Promise.all([
      getWeekSettings(selectedWeek),
      listWeeklyAvailability(session.id, selectedWeek),
      getAvailabilitySubmissionStatus(session.id, selectedWeek),
    ]);
    settings = weekSettings;
    submissionStatus = status;

    initialAvailability = buildState(weekly);
  }

  // Server-rendered deadline status intentionally reflects the current request time.
  // eslint-disable-next-line hooks-preserved/purity
  const requestTime = Date.now();
  const locked = Boolean(
    selectedWeek &&
      settings?.availabilityDeadline &&
      requestTime > new Date(settings.availabilityDeadline).getTime(),
  );
  const submissionCopy = submissionStatus
    ? submissionStatusCopy(submissionStatus, Boolean(settings?.availabilityDeadline), t)
    : null;

  // Release 1 (board E-Availability): one card of seven day rows, a line under it, then Save. The usual week links to
  // one schedule week; a week shows its state and arrows to the weeks around it.
  const deadline = selectedWeek && settings?.availabilityDeadline ? new Date(settings.availabilityDeadline) : null;
  const nextWeek = upcomingWeek?.weekStart ?? addDays(currentWeek, 7);
  const pill = !selectedWeek ? null : locked ? <CorpPill tone="neutral">{t.closed}</CorpPill>
    : submissionStatus?.submitted ? <CorpPill tone="teal">{submissionStatus.windowCount === 0 ? t.unavailableAllWeek : t.submitted}</CorpPill>
    : <CorpPill tone="amber">{deadline ? t.due(deadline, workspace.timeZone) : t.notSubmitted}</CorpPill>;
  const card = selectedWeek
    ? { label: lang === "es" ? esWeekRange(selectedWeek) : availabilityWeekLabel(selectedWeek), aside: <>{pill}<span className="c-avail__arrows">
      <Link href={`/app/availability?week=${addDays(selectedWeek, -7)}`} aria-label={t.previousWeek}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
      <Link href={`/app/availability?week=${addDays(selectedWeek, 7)}`} aria-label={t.nextWeek}><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true" /></Link></span></> }
    : { label: t.usualWeek, aside: <CorpLink href={`/app/availability?week=${nextWeek}`}>{t.changeOneWeek}</CorpLink> };
  const upcomingDue = !selectedWeek && upcomingWeek?.availabilityDeadline ? t.sendBy(upcomingWeek.weekStart, (lang === "es" ? esBusinessDateTime : formatBusinessDateTime)(upcomingWeek.availabilityDeadline, workspace.timeZone)) : null;
  const note = selectedWeek
    ? <span>{locked ? (submissionCopy?.detail ?? t.deadlinePassed) : deadline ? t.sendItBy(deadline, workspace.timeZone) : t.thisWeekOnly} <Link className="c-link" href="/app/availability">{t.usualWeekLink}</Link></span>
    : <span>{t.usualNote}</span>;
  const sub = selectedWeek ? keepWhole(t.usedForWeek(selectedWeek)) : upcomingDue ?? t.usedForFuture;
  const notices = <>
    {params.error ? <p className="c-error" role="alert">
      {params.error === "locked"
        ? t.errorLocked
        : params.error === "concurrent"
          ? t.errorConcurrent
          : params.error === "invalid_week"
          ? t.errorWeek
          : t.errorTimes}
    </p> : null}
    {params.saved ? <p className="c-note" role="status">{selectedWeek ? t.savedWeek : t.savedUsual}</p> : null}
  </>;

  const proof=await requireSessionMutationProof();
  return (
    <ResponsiveEmployeePlanning authority={employeeViewAuthority(proof,'planning')} view="availability" selection={selectedWeek??'normal'}><CorpPage className="c-avail c-page--narrow" lang={lang === "es" ? "es" : undefined}>
      {/* Direction B (phones): the phone page replaces this one once it loads; until then the same hero, not the old layout. */}
      <AvailabilityB lang={lang} sub={availabilitySubB(selectedWeek ?? null, selectedWeek ? formatWeekRange(selectedWeek) : undefined, lang)} change={selectedWeek ? null : `/app/availability?week=${nextWeek}`}>
        <AvailabilityStatusB lang={lang} message={t.loading} />
      </AvailabilityB>
      <CorpNav back={{ href: "/app/schedule", label: t.schedule }} title={t.title} phoneOnly />
      <CorpTitle wide title={t.title} sub={sub} />
      {notices}
      <AvailabilitySignatureEditor key={selectedWeek ?? "normal"} initialAvailability={initialAvailability} weekStart={selectedWeek} locked={locked} card={card} note={note} />
    </CorpPage></ResponsiveEmployeePlanning>
  );
}
