"use client";

import Link from "next/link";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { coverageCopy } from "./coverage-copy";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { BDoneMark } from "@/components/owner-b/b-kit";
import { addDays } from "@/lib/date-utils";
import { durationText } from "@/lib/duration-text";
import { CorpBody,CorpButtonLink,CorpCard,CorpNav,CorpNote,CorpPage,CorpRows,CorpTime,CorpTitle } from "./corp/corp";
import { ManagerIssueFocus } from "./manager-issue-focus";
import { ScheduleCoverPick } from "./schedule-cover-pick";
import { KeptSaved, UnlessSaved } from "./coverage-saved";
import "./coverage-assistant.css";

export type CoverageEmployee = {
  employeeId: string;
  employeeName: string;
  role?: string;
  primaryLocationName?: string;
  scheduledHours?: number;
  targetHours?: number;
  hoursNeeded?: number;
  priorUnderTargetWeeks?: number;
  href?: string;
};

export type CoverageAssistantProps = {
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  positionName?: string;
  designatedLead: boolean;
  backHref: string;
  candidates: CoverageEmployee[];
  status: "READY" | "CHOOSE" | "STALE" | "RESOLVED";
  requirements?: { label: string; href: string; selected: boolean }[];
  refreshHref?: string;
  saved?: boolean;
  repair?: boolean;
  reviewOnly?: boolean;
  /** Add shift, prefilled with this day, time and location (the existing form; its review checks the person). */
  addShiftHref?: string;
  /** Scheduling rules, where this time's coverage need is set. */
  rulesHref?: string;
};

const hours = (value: number) => durationText(Math.round(value * 60));

/** "12h of 32h this week", "18h this week · No target set" (planned hours, not recorded time). */
function personDetail(employee: CoverageEmployee, t = coverageCopy().assistant) {
  if (employee.scheduledHours === undefined) return t.availableForShift;
  if (employee.targetHours === undefined) return t.noTarget(hours(employee.scheduledHours));
  return employee.targetHours > 0 ? t.ofTarget(hours(employee.scheduledHours), hours(employee.targetHours)) : t.thisWeek(hours(employee.scheduledHours));
}

/** Find cover (Release 1, board O-FindCover): the open shift, then who can work it, best fit first, and Assign, which
 * opens the existing review. Same reads and review links as before; nothing is saved on this page. */
export function CoverageAssistant(props: CoverageAssistantProps) {
  const lang = usePortalLang(), c = coverageCopy(lang), t = c.assistant;
  const overnight = props.endTime < props.startTime || props.endTime.slice(0, 5) === "24:00";
  const nextDay = overnight ? c.ends(addDays(props.date, 1)) : null;
  const shortDate = c.shortDate(props.date);
  const count = props.candidates.length;
  // R3 / copy table 28: no "Not filled" pill (the card already says Open shift); a change of state is plain grey text.
  // G63 (Nov 23, 2026): each fact once. After a save, "Replacement saved." says it; otherwise the Covered state does. A
  // stale gap says "Coverage changed" in its own card, so the shift card carries no second "Changed".
  const state = props.status === "RESOLVED" ? <UnlessSaved saved={!!props.saved}><span className="c-meta c-cover__state">{t.covered}</span></UnlessSaved> : null;
  const facts = [props.positionName, shortDate, props.locationName, props.designatedLead ? t.leadNeeded : null, nextDay].filter(Boolean).join(" · ");
  const needs = props.requirements?.length && (props.status === "READY" || props.status === "CHOOSE") && (props.requirements.length > 1 || props.status === "CHOOSE") ? props.requirements : null;
  return <CorpPage className="c-cover c-page--narrow" labelledBy="coverage-title">
    <CorpNav back={{ href: props.backHref, label: t.schedule }} title={t.title} titleId="coverage-title" phoneOnly />
    <CorpTitle title={t.title} wide />
    <ManagerIssueFocus prefix="coverage-" />
    <KeptSaved saved={!!props.saved}><CorpNote icon={<BDoneMark />}>{t.saved}</CorpNote></KeptSaved>
    <div className="wa-target" id="coverage-issue" tabIndex={-1}>
      <CorpCard id="coverage-shift" label={props.status === "RESOLVED" ? t.shift : c.openShift} aside={state ?? undefined}>
        <CorpBody>
          <span className="c-big">{/* The kit's time parts know "AM" and "PM" only, so the Spanish range ("10:00 p. m. – 6:00 a. m.") is drawn whole. */}
            {lang === "es" ? <span className="c-time">{`${c.time(props.startTime)} – ${c.time(props.endTime)}`}</span> : <CorpTime start={c.time(props.startTime)} end={c.time(props.endTime)} />}</span>
          <span className="c-line3">{facts}</span>
        </CorpBody>
        {needs ? <nav className="c-cover__needs" aria-label={t.chooseWhat}>
          <p className="c-cover__needs-label">{props.status === "CHOOSE" ? t.chooseWhat : t.whatItNeeds}</p>
          <CorpRows label={t.whatItNeeds}>{needs.map(requirement => <li key={requirement.href}>
            <Link className="c-row c-row--one" href={requirement.href} aria-current={requirement.selected ? "true" : undefined}>
              <span className="c-row__main"><span className="c-row__title">{requirement.label}</span></span>
              {requirement.selected ? <span className="c-meta c-cover__state">{t.selected}</span> : null}
            </Link>
          </li>)}</CorpRows>
        </nav> : null}
      </CorpCard>
    </div>
    {/* Copy table 29–33 and R14: plain words, no "lead" (the role is on hold), and no big zero. */}
    {props.status === "READY" ? <CorpCard id="coverage-people" label={t.whoCanCover} aside={count ? <span className="c-meta c-cover__state">{t.free(count)}</span> : undefined}>
      {count ? <ScheduleCoverPick repair={props.repair} reviewOnly={props.reviewOnly} people={props.candidates.map(employee => ({ employeeId: employee.employeeId, employeeName: employee.employeeName, detail: personDetail(employee, t), href: employee.href }))} />
        : <CorpBody>
          {/* Owner premium (structure-experience F1/F2): a decision, not a dead end. The same read; the next steps are the
            existing Add shift form (its review checks the person) and the coverage need in Scheduling rules. */}
          <p className="c-cover__empty">{t.noOneFree}</p>
          {/* G63: the place is on the shift card and "Give to someone" is the button, so the line says neither again. */}
          <p className="c-line3">{t.everyoneBusy}</p>
          {props.addShiftHref || props.rulesHref ? <div className="c-cover__next">
            {props.addShiftHref ? <CorpButtonLink href={props.addShiftHref} kind="secondary" size="md">{t.giveToSomeone}</CorpButtonLink> : null}
            {props.rulesHref ? <Link className="c-link c-link--l" href={props.rulesHref}>{t.changeNeeded}</Link> : null}
          </div> : null}
        </CorpBody>}
    </CorpCard>
      // G63: a covered shift needs nothing more (the band's "‹ Schedule" is the way back), and a choice of needs is already
      // asked in the shift card. Only a stale gap gets a second card: what happened, and Refresh.
      : props.status === "STALE" ? <CorpCard id="coverage-people" label={t.changed}>
        {props.refreshHref ? <CorpBody><CorpButtonLink href={props.refreshHref} full><ArrowClockwiseIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" />{t.refresh}</CorpButtonLink></CorpBody> : null}
      </CorpCard> : null}
    {props.status === "READY" && props.candidates.some(candidate => candidate.href) && !props.reviewOnly
      ? <CorpNote center>{t.reviewFirst}</CorpNote> : null}
  </CorpPage>;
}
