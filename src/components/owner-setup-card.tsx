'use client';

import {CorpRow} from '@/components/corp/corp';
import { QuietList, QuietRow, QuietSection } from './quiet/quiet';
import Link from 'next/link';
import {createContext, useContext, useId, type ReactNode} from 'react';
import type {SetupProgress} from '@/lib/today/project';
import {CaretRightIcon, CheckIcon, CircleIcon, SquaresFourIcon} from '@phosphor-icons/react/ssr';
import {lower, WORD_PRESETS} from '@/lib/workspace-presentation/words';
import {hasSetupGaps, setupDoneCount, type SetupSteps} from '@/lib/action-center/setup';
import {usePresentation} from './presentation-context';
import {useHomeSetupSteps} from './manager-action-center';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {OWNER_HOME_COPY, type OwnerHomeCopy} from './owner-home-copy';

/** Two whole strings, so B5 can translate them; never "missing". */
export function hoursReason(count: number, words: {person: string; people: string}, t: OwnerHomeCopy = OWNER_HOME_COPY.en) {
  return t.hoursReason(count, lower(words.person), lower(words.people));
}

/** The caret stays with the last word; it is an icon, so it isn't read aloud. */
function StepLink({href, label, describedBy}: {href: string; label: string; describedBy: string}) {
  const words = label.split(' '), last = words.pop();
  return <Link className="owner-setup-link" href={href} aria-describedby={describedBy}>
    {words.join(' ')} <span className="owner-setup-nowrap">{last}<CaretRightIcon size={16} weight="bold" aria-hidden="true"/></span>
  </Link>;
}

/* Phase 9: a done step carries the one done mark's bold check (no filled circle); an open step keeps its bold ring. */
function Step({done, title, children}: {done: boolean; title: string; children?: ReactNode}) {
  const t = OWNER_HOME_COPY[usePortalLang()];
  return <li className="owner-setup-step" data-state={done ? 'done' : 'open'}>
    {done ? <CheckIcon className="owner-setup-mark" size={20} weight="bold" aria-hidden="true"/> : <CircleIcon className="owner-setup-mark" size={20} weight="bold" aria-hidden="true"/>}
    {done ? <p className="owner-setup-done-row"><strong>{title}</strong><span className="owner-setup-done">{t.done}</span></p> : <div className="owner-setup-open">{children}</div>}
  </li>;
}

/** "Finish setting up" (Owner Home): the two configuration checks Tasks already
 * reports, each linked to the section that fixes it. No motion, no celebration. */
export function OwnerSetupCard({steps, locationCount}: {steps: SetupSteps | null; locationCount: number}) {
  const {words} = usePresentation();
  const lang = usePortalLang(), t = OWNER_HOME_COPY[lang];
  const id = useId();
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const coverageReason = `${id}-coverage`, hoursReasonId = `${id}-hours`;
  return <div className="home-layout-setup">
    <section className="owner-setup-card" aria-labelledby={`${id}-title`}>
      <div className="owner-setup-summary">
        <h2 id={`${id}-title`}>{t.finishSettingUp}</h2>
        <p className="owner-setup-count"><span>{done}</span> {t.ofTwoDone}</p>
        <span className="home-progress owner-setup-progress" aria-hidden="true"><span style={{width: `${done * 50}%`}}/></span>
      </div>
      <ul className="owner-setup-steps">
        <Step done={!steps.coverageOpen} title={t.coveragePeriods}>
          {locationCount === 0
            ? <><StepLink href="/app/settings/locations" label={t.addLocation} describedBy={coverageReason}/><p id={coverageReason}>{t.thenSetStaffing}</p></>
            : <><StepLink href="/app/schedule/settings#coverage-staffing" label={t.setCoverage} describedBy={coverageReason}/><p id={coverageReason}>{t.eachLocationNeeds}</p></>}
        </Step>
        <Step done={steps.missingTargets === 0} title={t.weeklyTargets}>
          <StepLink href="/app/schedule/settings#target-hours" label={t.setTargets} describedBy={hoursReasonId}/>
          <p id={hoursReasonId}>{hoursReason(steps.missingTargets, lang === 'es' ? (WORD_PRESETS.find(preset => preset.en.person === words.person)?.es ?? words) : words, t)}</p>
        </Step>
      </ul>
    </section>
  </div>;
}

/** The live card: steps from the shared Home read (first paint from server props). */
export function OwnerSetupCardLive({locationCount}: {locationCount: number}) {
  return <OwnerSetupCard steps={useHomeSetupSteps()} locationCount={locationCount}/>;
}

/** Clean Manager (v3): the same two checks as one slim row on Home, linking to the next open step.
 * It disappears when setup is complete. The full card above stays for its other callers. */
export function OwnerSetupRow({steps, locationCount}: {steps: SetupSteps | null; locationCount: number}) {
  const t = OWNER_HOME_COPY[usePortalLang()];
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const next = steps.coverageOpen
    ? locationCount === 0 ? {href: '/app/settings/locations', label: t.steps.location} : {href: '/app/schedule/settings#coverage-staffing', label: t.steps.setCoverage}
    : {href: '/app/schedule/settings#target-hours', label: t.steps.setTargets};
  return <section className="nv-card cm-setup" aria-label={t.finishSettingUp}>
    <ul className="nv-rows">
      <li><Link className="nv-row" href={next.href} data-leading="true">
        <span className="nv-tile" data-tone="accent" aria-hidden="true"><SquaresFourIcon size={18} weight="bold"/></span>
        <span className="nv-row__text"><span className="nv-row__title">{t.finishSettingUp}</span><span className="nv-row__meta">{t.next(next.label)}</span></span>
        <span className="nv-row__trail">{t.doneOf(done, 2)}</span>
        <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true"/>
      </Link></li>
    </ul>
  </section>;
}

export function OwnerSetupRowLive({locationCount}: {locationCount: number}) {
  return <OwnerSetupRow steps={useHomeSetupSteps()} locationCount={locationCount}/>;
}

/** Quiet (v4): Home's Setup section, one row naming the next step. Gone once setup is complete. */
export function OwnerSetupQuiet({steps, locationCount}: {steps: SetupSteps | null; locationCount: number}) {
  const t = OWNER_HOME_COPY[usePortalLang()];
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const next = steps.coverageOpen
    ? locationCount === 0 ? {href: '/app/settings/locations', label: t.steps.location} : {href: '/app/schedule/settings#coverage-staffing', label: t.steps.setCoverage}
    : {href: '/app/schedule/settings#target-hours', label: t.steps.setTargets};
  return <QuietSection id="home-setup" title={t.setup}>
    <QuietList label={t.setup}><QuietRow href={next.href} title={t.stepsDone(done)} detail={t.nextComma(next.label)} /></QuietList>
  </QuietSection>;
}

export function OwnerSetupQuietLive({locationCount}: {locationCount: number}) {
  return <OwnerSetupQuiet steps={useHomeSetupSteps()} locationCount={locationCount}/>;
}

/** Backend (Nov 15, 2026): the Today read's setup facts for the actor's permitted locations. Home provides them; null
 * when the read hasn't come back or doesn't carry them. */
export const HomeSetupProgress = createContext<SetupProgress | null>(null);

export type SetupItem = {done: boolean; step: string; href: string};
/** The setup steps in order. The two configuration checks come from Things to do, as before; the server's setup facts
 * add the team, a published schedule, a registered time clock, clock-in PINs and (with payroll) the pay schedule. With
 * no facts the list is the two checks alone, so a missing read is never shown as more setup done. A registered tablet
 * is only that: it doesn't say punching is on. */
export function setupItems(steps: SetupSteps, locationCount: number, progress: SetupProgress | null, payroll: boolean, t: OwnerHomeCopy = OWNER_HOME_COPY.en): SetupItem[] {
  const items: SetupItem[] = [];
  if (progress) items.push({done: progress.teamSize > 1, step: t.steps.team, href: '/app/employees'});
  items.push(locationCount === 0 ? {done: !steps.coverageOpen, step: t.steps.location, href: '/app/settings/locations'}
    : {done: !steps.coverageOpen, step: t.steps.coverage, href: '/app/schedule/settings#coverage-staffing'});
  items.push({done: steps.missingTargets === 0, step: t.steps.targets, href: '/app/schedule/settings#target-hours'});
  if (progress) {
    items.push({done: progress.publishedSchedule, step: t.steps.publish, href: '/app/schedule'});
    items.push({done: progress.registeredClocks > 0, step: t.steps.clock, href: '/app/settings/clocker'});
    items.push({done: progress.peopleWithPins > 0, step: t.steps.pins, href: '/app/settings/clocker/pins'});
    if (payroll) items.push({done: progress.paySchedule, step: t.steps.pay, href: '/app/settings/payroll'});
  }
  return items;
}

/** Corporate Home (Release 1): setup is one row inside Things to do, so Home keeps three cards.
 * R7 (copy row 5): "1 of 2 done · Next: weekly hour targets"; with the server's facts, "3 of 7 done · Next: …". */
export function OwnerSetupCorp({steps, locationCount, progress = null, payroll = false}: {steps: SetupSteps | null; locationCount: number; progress?: SetupProgress | null; payroll?: boolean}) {
  const t = OWNER_HOME_COPY[usePortalLang()];
  if (!steps) return null;
  const items = setupItems(steps, locationCount, progress, payroll, t), next = items.find(item => !item.done);
  if (!next) return null;
  const done = items.filter(item => item.done).length;
  return <div id="home-setup" className="c-home__setup"><CorpRow href={next.href} title={t.finishSettingUp} detail={t.doneNext(done, items.length, next.step)} chevron /></div>;
}

export function OwnerSetupCorpLive({locationCount, payroll = false}: {locationCount: number; payroll?: boolean}) {
  return <OwnerSetupCorp steps={useHomeSetupSteps()} locationCount={locationCount} progress={useContext(HomeSetupProgress)} payroll={payroll}/>;
}
