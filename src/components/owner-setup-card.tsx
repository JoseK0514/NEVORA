'use client';

import {CorpRow} from '@/components/corp/corp';
import { QuietList, QuietRow, QuietSection } from './quiet/quiet';
import Link from 'next/link';
import {useId, type ReactNode} from 'react';
import {CaretRightIcon, CheckCircleIcon, CircleIcon, SquaresFourIcon} from '@phosphor-icons/react/ssr';
import {lower} from '@/lib/workspace-presentation/words';
import {hasSetupGaps, setupDoneCount, type SetupSteps} from '@/lib/action-center/setup';
import {usePresentation} from './presentation-context';
import {useHomeSetupSteps} from './manager-action-center';

/** Two whole strings, so B5 can translate them; never "missing". */
export function hoursReason(count: number, words: {person: string; people: string}) {
  return count === 1 ? `1 ${lower(words.person)} has no weekly hour target.` : `${count} ${lower(words.people)} have no weekly hour target.`;
}

/** The caret stays with the last word; it is an icon, so it isn't read aloud. */
function StepLink({href, label, describedBy}: {href: string; label: string; describedBy: string}) {
  const words = label.split(' '), last = words.pop();
  return <Link className="owner-setup-link" href={href} aria-describedby={describedBy}>
    {words.join(' ')} <span className="owner-setup-nowrap">{last}<CaretRightIcon size={16} aria-hidden="true"/></span>
  </Link>;
}

function Step({done, title, children}: {done: boolean; title: string; children?: ReactNode}) {
  return <li className="owner-setup-step" data-state={done ? 'done' : 'open'}>
    {done ? <CheckCircleIcon className="owner-setup-mark" size={20} weight="fill" aria-hidden="true"/> : <CircleIcon className="owner-setup-mark" size={20} aria-hidden="true"/>}
    {done ? <p className="owner-setup-done-row"><strong>{title}</strong><span className="owner-setup-done">Done</span></p> : <div className="owner-setup-open">{children}</div>}
  </li>;
}

/** "Finish setting up" (Owner Home): the two configuration checks Tasks already
 * reports, each linked to the section that fixes it. No motion, no celebration. */
export function OwnerSetupCard({steps, locationCount}: {steps: SetupSteps | null; locationCount: number}) {
  const {words} = usePresentation();
  const id = useId();
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const coverageReason = `${id}-coverage`, hoursReasonId = `${id}-hours`;
  return <div className="home-layout-setup">
    <section className="owner-setup-card" aria-labelledby={`${id}-title`}>
      <div className="owner-setup-summary">
        <h2 id={`${id}-title`}>Finish setting up</h2>
        <p className="owner-setup-count"><span>{done}</span> of 2 done</p>
        <span className="home-progress owner-setup-progress" aria-hidden="true"><span style={{width: `${done * 50}%`}}/></span>
      </div>
      <ul className="owner-setup-steps">
        <Step done={!steps.coverageOpen} title="Coverage periods">
          {locationCount === 0
            ? <><StepLink href="/app/settings/locations" label="Add a location" describedBy={coverageReason}/><p id={coverageReason}>Then set its staffing and coverage periods.</p></>
            : <><StepLink href="/app/schedule/settings#coverage-staffing" label="Set coverage periods" describedBy={coverageReason}/><p id={coverageReason}>Each location needs a minimum staff count, a lead rule and a coverage period.</p></>}
        </Step>
        <Step done={steps.missingTargets === 0} title="Weekly hour targets">
          <StepLink href="/app/schedule/settings#target-hours" label="Set weekly hour targets" describedBy={hoursReasonId}/>
          <p id={hoursReasonId}>{hoursReason(steps.missingTargets, words)}</p>
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
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const next = steps.coverageOpen
    ? locationCount === 0 ? {href: '/app/settings/locations', label: 'add a location'} : {href: '/app/schedule/settings#coverage-staffing', label: 'set coverage periods'}
    : {href: '/app/schedule/settings#target-hours', label: 'set weekly hour targets'};
  return <section className="nv-card cm-setup" aria-label="Finish setting up">
    <ul className="nv-rows">
      <li><Link className="nv-row" href={next.href} data-leading="true">
        <span className="nv-tile" data-tone="accent" aria-hidden="true"><SquaresFourIcon size={18} weight="fill"/></span>
        <span className="nv-row__text"><span className="nv-row__title">Finish setting up</span><span className="nv-row__meta">{`Next: ${next.label}`}</span></span>
        <span className="nv-row__trail">{`${done} of 2`}</span>
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
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const next = steps.coverageOpen
    ? locationCount === 0 ? {href: '/app/settings/locations', label: 'add a location'} : {href: '/app/schedule/settings#coverage-staffing', label: 'set coverage periods'}
    : {href: '/app/schedule/settings#target-hours', label: 'set weekly hour targets'};
  return <QuietSection id="home-setup" title="Setup">
    <QuietList label="Setup"><QuietRow href={next.href} title={`${done} of 2 steps done`} detail={`Next, ${next.label}`} /></QuietList>
  </QuietSection>;
}

export function OwnerSetupQuietLive({locationCount}: {locationCount: number}) {
  return <OwnerSetupQuiet steps={useHomeSetupSteps()} locationCount={locationCount}/>;
}

/** Corporate Home (Release 1): setup is one row inside Things to do, so Home keeps three cards. */
export function OwnerSetupCorp({steps, locationCount}: {steps: SetupSteps | null; locationCount: number}) {
  if (!steps || !hasSetupGaps(steps)) return null;
  const done = setupDoneCount(steps);
  const next = steps.coverageOpen
    ? locationCount === 0 ? {href: '/app/settings/locations', label: 'add a location'} : {href: '/app/schedule/settings#coverage-staffing', label: 'set coverage periods'}
    : {href: '/app/schedule/settings#target-hours', label: 'set weekly hour targets'};
  // R7 (copy row 5): "1 of 2 done · Next: weekly hour targets".
  const step = steps.coverageOpen ? locationCount === 0 ? 'add a location' : 'coverage periods' : 'weekly hour targets';
  return <div id="home-setup" className="c-home__setup"><CorpRow href={next.href} title="Finish setting up" detail={`${done} of 2 done · Next: ${step}`} chevron /></div>;
}

export function OwnerSetupCorpLive({locationCount}: {locationCount: number}) {
  return <OwnerSetupCorp steps={useHomeSetupSteps()} locationCount={locationCount}/>;
}
