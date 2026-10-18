'use client';

import Link from 'next/link';
import {useId, type ReactNode} from 'react';
import {CaretRightIcon, CheckCircleIcon, CircleIcon} from '@phosphor-icons/react/ssr';
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
