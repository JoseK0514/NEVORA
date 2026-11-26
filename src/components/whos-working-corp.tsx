"use client";
import "./whos-working-corp.css";
import { useEffect, useState, type ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { CorpAvatar, CorpBody, CorpButton, CorpCard, CorpCount, CorpNav, CorpPage, CorpRow, CorpTitle } from "./corp/corp";
import { BChip, BCount, BSegs } from "./owner-b/b-kit";
import { AttendanceReviewProvider, openPastLimitEntries, sinceLabel, useSharedAttendanceReview } from "./manager-attendance-review";
import { useClockMonitor } from "./clean/use-clock-monitor";
import { useToday } from "./manager-today";
import type { ClockMonitor } from "@/lib/time-clock";
import type { Today } from "@/lib/today/project";
import { attendanceWords } from "@/lib/action-center/present";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { WHOS_WORKING_COPY } from "./whos-working-copy";
import { RetryButton } from "@/components/kit/retry-button";

/* Who's working (Release 1, board O-OnShift): Home's "Who's working" link. Who is clocked in now (the clock monitor), who
 * hasn't clocked in for a shift that started, and published shifts that ended with no clock-in (Today). The attendance
 * review and time corrections follow, unchanged. Presentation only: the same two reads Home uses. */

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const clockEn = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
/** How long ago the shift started ("24 min", "1 h 5 min"). The card's heading says "Not clocked in"; "late" is kept for
 * someone who clocked in after their start (Jose's attendance words, Nov 11, 2026). */
const lateBy = (start: string, observedAt: string) => {
  const minutes = Math.floor((Date.parse(observedAt) - Date.parse(start)) / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}` : `${Math.max(minutes, 1)} min`;
};
const SHOWN = 5;
/** R3: one count voice. The label, then the figure in grey, no brackets ("Clocked in 2"). */
const headed = (title: string, n: number) => <>{title}<CorpCount>{n}</CorpCount></>;
const REVIEW_FRAGMENT = /^#(?:review$|attendance-.)/;
const CORRECTION_FRAGMENT = /^#correction-./;

/** The label the attendance review gives an entry open past the review limit (manager-attendance-review.tsx): WHOS_WORKING_COPY.noClockOut. */

export function WhosWorkingCorp({ children, homeHref = "/app" }: { children?: ReactNode; homeHref?: string }) {
  // Review 30 (D29): one attendance review read for the page, so the rows and the folded "Clock-ins to check" row show what
  // it flags, and the review (children) shows the same read when it is opened.
  return <AttendanceReviewProvider><WhosWorkingLive homeHref={homeHref}>{children}</WhosWorkingLive></AttendanceReviewProvider>;
}

function WhosWorkingLive({ children, homeHref }: { children?: ReactNode; homeHref: string }) {
  const { monitor, refreshing } = useClockMonitor();
  const { snapshot: today, refresh, refreshing: todayRefreshing } = useToday();
  const shared = useSharedAttendanceReview();
  const review = shared?.state.review?.state === "ready" && !shared.state.paused ? shared.state.review : null;
  return <WhosWorkingView monitor={monitor} today={today} refreshing={refreshing} todayRefreshing={todayRefreshing} onRetry={refresh} homeHref={homeHref}
    toCheck={review ? review.signalCount : null} openPastLimit={openPastLimitEntries(review)}>{children}</WhosWorkingView>;
}

export function WhosWorkingView({ monitor, today, refreshing = false, todayRefreshing = false, onRetry, homeHref = "/app", children, toCheck = null, openPastLimit = new Set(), place }: {
  monitor: ClockMonitor | null; today: Today | null; refreshing?: boolean; onRetry?: () => void;
  /** Today's shifts are being read again: Try again stays busy until that read settles (English flag A6). */ todayRefreshing?: boolean; homeHref?: string; children?: ReactNode;
  /** Review 30 (D29): how many clock-ins the attendance review flags, when its read is ready. */
  toCheck?: number | null;
  /** The time entries the review flags as open past 12 hours with no clock-out. */
  openPastLimit?: ReadonlySet<string>;
  /** The place a location Manager is looking at; named once beside the date. */
  place?: string;
}) {
  const lang = usePortalLang(), t = WHOS_WORKING_COPY[lang], NO_CLOCK_OUT = t.noClockOut, ATTENDANCE_WORDS = attendanceWords(lang);
  const clock = (iso: string, zone: string) => t.times(clockEn(iso, zone));
  const [all, setAll] = useState(false);
  // Closing F1 (NV-240): time corrections live under Time (Time corrections), so the row here is only the flagged clock-ins
  // (the attendance review), open when a link points at them: #review or one flagged clock-in (#attendance-…), which the
  // review then focuses. A link to one correction request (#correction-…, from Things to do) goes on to Time corrections,
  // which focuses it there. Read after mount: the server render has no fragment, and a client navigation sets it at commit.
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => {
    const sync = () => {
      if (CORRECTION_FRAGMENT.test(window.location.hash)) window.location.replace(`/app/timecards/corrections${window.location.hash}`);
      else if (REVIEW_FRAGMENT.test(window.location.hash)) setReviewOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const ready = monitor?.state === "ready" ? monitor : null;
  const timeZone = ready?.timeZone ?? (today?.state === "ready" ? today.timeZone : "UTC");
  const people = ready ? [...ready.employees].sort((a, b) => a.clockInAt.localeCompare(b.clockInAt)) : [];
  const shown = all ? people : people.slice(0, SHOWN);
  const day = today?.state === "ready" ? today : null;
  const late = day ? day.missed.filter(shift => shift.status === "not_clocked_in") : [];
  const none = day ? day.missed.filter(shift => shift.status === "no_punches") : [];
  const places = new Set([...people.map(person => person.locationId), ...(day?.shifts ?? []).map(shift => shift.locationId)]).size > 1;
  const dateLine = day ? new Intl.DateTimeFormat(t.locale, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${day.today}T12:00:00Z`)) : t.today;
  // Review 30 (D29): a clock-in from an earlier day says its day ("In since 9:59 PM yesterday"), never only a time.
  const todayDate = day?.today ?? (ready ? new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(ready.observedAt)) : null);
  const since = (iso: string) => t.times((todayDate ? sinceLabel(iso, timeZone, todayDate) : null) ?? clockEn(iso, timeZone));
  const flagged = openPastLimit.size;
  // Nov 1 upscale: the time of the last read sits on the Clocked in card ("Updated 2:37 PM"), so the subtitle is the day.
  const sub = place ? `${dateLine} · ${place}` : dateLine;
  // A7: a single-column page, capped at the kit's narrow width on desktop.
  return <CorpPage className="c-who c-page--narrow" labelledBy="who-title">
    <CorpNav back={{ href: homeHref, label: t.home }} title={t.title} phoneOnly />
    <CorpTitle id="who-title" title={t.title} sub={sub} wide />
    <p className="c-phone-sub" aria-hidden="true">{sub}</p>
    {/* R3: grey text, not a pill. Nov 1 upscale: it says when the list was read ("Updated 2:37 PM") instead of "Live". */}
    <CorpCard id="who-in" label={ready ? headed(t.clockedIn, people.length) : t.clockedIn} aside={ready ? <span className="c-meta c-num">{t.updated(clock(ready.observedAt, timeZone))}</span> : undefined}>
      {!ready ? <CorpBody><p className="c-who__state" aria-busy={refreshing || undefined}>{monitor?.state === "unavailable" ? t.unavailable : t.checking}</p></CorpBody>
        : people.length ? <ul className="c-rows" aria-label={t.clockedInNow}>{shown.map(person => <li key={person.timeEntryId}>
          <CorpRow href={`/app/employees/${encodeURIComponent(person.employeeId)}`} bold avatar={<CorpAvatar name={person.employeeName} initials={initials(person.employeeName)} />}
            title={openPastLimit.has(person.timeEntryId) ? <><span className="c-who__name">{person.employeeName}</span><BChip tone="red">{NO_CLOCK_OUT}</BChip></> : person.employeeName}
            /* Final verification F (F25): the time and the place are the kit's facts line: each stays whole where it fits
              ("In since 11:09 AM" no longer leaves "In since" alone at 320), and no line starts or ends with the dot. */
            detail={<BSegs parts={[person.state === "ON_BREAK" && person.breakStartAt ? t.onBreakSince(since(person.breakStartAt)) : t.inSince(since(person.clockInAt)), places ? person.locationName : null]} />}
            chevron />
        </li>)}</ul> : <div className="c-empty c-empty--card"><b className="c-empty__title">{t.noOne}</b><span className="c-empty__body">{t.noOneBody}</span></div>}
      {ready && !all && people.length > SHOWN ? <button type="button" className="c-who__more" onClick={() => setAll(true)}>{t.showMore(people.length - SHOWN)}</button> : null}
    </CorpCard>
    {today?.state === "unavailable" ? <CorpCard as="div" ariaLabel={t.shiftsToday}><CorpBody>
      <p className="c-who__state">{t.shiftsUnavailable}</p>
      {onRetry ? <RetryButton as={CorpButton} kind="secondary" size="md" busy={todayRefreshing} onClick={onRetry}>{t.tryAgain}</RetryButton> : null}
    </CorpBody></CorpCard> : null}
    {late.length ? <CorpCard id="who-late" label={headed(ATTENDANCE_WORDS.notClockedIn, late.length)}><ul className="c-rows" aria-label={ATTENDANCE_WORDS.notClockedIn}>{late.map(shift => <li key={shift.id}>
      <CorpRow href={`/app/employees/${encodeURIComponent(shift.employeeId)}`} bold title={shift.employeeName} avatar={<CorpAvatar name={shift.employeeName} initials={initials(shift.employeeName)} />}
        detail={<BSegs parts={[t.due(clock(shift.startAt, timeZone)), places ? shift.locationName : null]} />} value={day ? lateBy(shift.startAt, day.observedAt) : undefined} valueTone="amber" chevron />
    </li>)}</ul></CorpCard> : null}
    {none.length ? <CorpCard id="who-none" label={headed(t.missed, none.length)}><ul className="c-rows" aria-label={t.missedLabel}>{none.map(shift => <li key={shift.id}>
      <CorpRow href={`/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`} bold title={shift.employeeName} avatar={<CorpAvatar name={shift.employeeName} initials={initials(shift.employeeName)} />}
        detail={<BSegs parts={[`${clock(shift.startAt, timeZone)} – ${clock(shift.endAt, timeZone)}`, places ? shift.locationName : null]} />} chevron />
    </li>)}</ul></CorpCard> : null}
    {children ? <CorpCard as="div" ariaLabel={t.review}>
      {/* Review 30 (D29): the folded row says how many clock-ins wait, and a punch open past 12 hours shows its red chip
        here too, so it is seen without opening the review. */}
      {/* Final polish D3 (#25): the folded row is this card's heading, so its words take the card label's size and weight
        (17/22 at 700, as "Clocked in" and "Not clocked in" above), and the red chip follows the sub-line instead of
        sitting between the heading and it. Gaps G65 (Nov 23, 2026): the row is named by what it shows ("Clock-ins to
        check 2 Times that don't match…"), with aria-expanded for open or closed instead of an aria-label that words it
        differently. It is CorpRow's markup (a bold title, a detail line, a trail), which has no aria-expanded; the spaces
        between the parts draw nothing (each sits in a flex box) and keep the spoken words apart. */}
      <button type="button" className="c-row" aria-expanded={reviewOpen} aria-controls={reviewOpen ? "review" : undefined} onClick={() => setReviewOpen(open => !open)}>
        <span className="c-row__main">
          <span className="c-row__title c-row__title--b"><span className="c-who__name c-who__check">{t.toCheck}</span>{toCheck ? <>{" "}<BCount>{toCheck}</BCount></> : null}</span>{" "}
          <span className="c-row__detail"><span>{t.toCheckDetail}</span>{flagged ? <>{" "}<BChip tone="red">{flagged === 1 ? NO_CLOCK_OUT : t.flaggedMany(flagged, NO_CLOCK_OUT)}</BChip></> : null}</span>
        </span>
        <span className="c-row__trail"><CaretDownIcon className={reviewOpen ? "c-chev c-who__caret c-who__caret--open" : "c-chev c-who__caret"} weight="bold" aria-hidden="true" /></span>
      </button>
    </CorpCard> : null}
    {children && reviewOpen ? <div className="c-who__review" id="review">{children}</div> : null}
  </CorpPage>;
}
