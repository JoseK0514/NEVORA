'use client';

import Link from 'next/link';
import {useState, type ReactNode, type RefObject} from 'react';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {TrashIcon} from '@phosphor-icons/react/dist/ssr/Trash';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {LockSimpleIcon} from '@phosphor-icons/react/dist/ssr/LockSimple';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CalendarPlusIcon} from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import {SignOutIcon} from '@phosphor-icons/react/dist/ssr/SignOut';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {BriefcaseIcon} from '@phosphor-icons/react/dist/ssr/Briefcase';
import {BButton, BButtonLink, BCard, BChip, BHero, BIcon, BScreen, BStack} from '../owner-b/b-kit';
import {BCardNote} from './parts';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../../lib/employee-view';
import {timeZoneLabel} from '../../lib/time-zone-label';
import type {AuthLang} from '../../lib/auth-copy';
import {switchTo} from '../auth-premium/lang-switch';
import type {CalendarCommand} from '../../lib/calendar/types';
import type {CalendarClientState} from '../../lib/calendar/client';
import {DEVICE_TURN_OFF_PENDING_MESSAGE, type DeviceSnapshot} from '../../lib/notifications/device-client';
import type {DeletionFormState} from '@/app/app/account/delete/actions';
import {logout} from '@/app/login/actions';
import './account.css';

/* Employee phones, Direction B, the Account group (mock e-profile, e-calendar, e-alerts, e-delete). Each screen draws the
 * read, state and commands its page already owns; the corporate layout beside it is what tablets and desktop show. */

const Chev = () => <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" />;

/** A read-only field: a small grey label over its value. */
function Field({label, value}: {label: string; value: string}) {
  return <li className="b-li"><div className="b-row eb-field"><span className="b-row__tx"><span className="b-row__s">{label}</span><span className="b-row__t">{value}</span></span></div></li>;
}

/** Profile and settings (board E-Profile): Personal info as label-over-value rows, Display with the language switch,
 * Security. The read is the page's own (one controller for both presentations). */
export function EmployeeProfileB({state, onRetry, lang, passkeys, policies, ending, lead}: {
  state: PrivatePanelState<EmployeeViewSnapshot>; onRetry: () => void; lang: AuthLang; passkeys: boolean; policies: boolean; ending: boolean;
  /** A Lead's desktop adds a small Calendar and alerts card (eb-desk; Direction B, Nov 8, 2026). */
  lead?: boolean;
}) {
  const ready = !state.paused && state.snapshot?.state === 'ready' && state.snapshot.kind === 'profile' ? state.snapshot : null;
  const denied = state.snapshot?.state === 'unavailable' && state.snapshot.reason === 'access_denied';
  const phase = state.paused ? 'paused' : ready ? 'ready' : denied ? 'denied' : state.refreshing ? 'loading' : 'unavailable';
  const value = (text: string | undefined) => text ?? '–';
  return <BScreen back>
    <BHero back={{href: '/app/more', label: 'More'}} title="Profile and settings" titleId="b-profile-title" />
    <BStack>
      {ending ? <BCard><p className="b-state eb-pad" role="status">Signing out…</p></BCard> : <>
        <BCard title="Personal info" id="b-profile-personal">
          <ul className="b-list" aria-label="Your work profile">
            <Field label="Name" value={value(ready?.profile.name)} />
            <Field label="Locations" value={value(ready?.profile.locations.join(' · '))} />
            <Field label="Time zone" value={value(ready ? timeZoneLabel(ready.profile.timeZone).replace(/ time$/, '') : undefined)} />
          </ul>
          {ready ? null : <div className="eb-status">
            <p className="b-state" role="status">{state.paused ? 'Profile paused. Return to this window while online to refresh.' : denied ? 'Your access changed. Sign in again to check your current details.' : state.refreshing ? 'Checking your current work details…' : 'We couldn’t load your details.'}</p>
            {denied ? <BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink> : phase === 'unavailable' ? <BButton kind="quiet" full onClick={onRetry}>Try again</BButton> : null}
          </div>}
        </BCard>
        <BCard title="Display" id="b-profile-display">
          <ul className="b-list"><li className="b-li"><div className="b-row eb-pref">
            <span className="b-row__tx"><span className="b-row__t" id="b-profile-language">Language</span><span className="b-row__s" id="b-profile-language-hint">Sign-in pages only. The rest of NEVORA is in English for now.</span></span>
            <div className="eb-lseg" role="group" aria-labelledby="b-profile-language" aria-describedby="b-profile-language-hint">
              {([['en', 'English'], ['es', 'Español']] as const).map(([code, name]) => <button key={code} type="button" lang={code} aria-pressed={lang === code} onClick={() => { if (code !== lang) switchTo(code); }}>{name}</button>)}
            </div>
          </div></li></ul>
        </BCard>
        {lead ? <div className="eb-desk eb-calalerts"><BCard title="Calendar and alerts" id="b-profile-calendar"><ul className="b-list">
          <li className="b-li"><Link className="b-row b-row--link" href="/app/profile/calendar"><BIcon tone="grey"><CalendarPlusIcon weight="bold" /></BIcon>
            <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">Add to calendar</span></span><span className="b-row__s">Apple, Google or Outlook</span></span><Chev /></Link></li>
          <li className="b-li"><Link className="b-row b-row--link" href="/app/profile/device-alerts"><BIcon tone="grey"><BellIcon weight="bold" /></BIcon>
            <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">Alerts on this device</span></span><span className="b-row__s">Settings for this browser</span></span><Chev /></Link></li>
        </ul></BCard></div> : null}
        {passkeys || policies ? <BCard title="Security" id="b-profile-security">
          <ul className="b-list">
            {passkeys ? <li className="b-li"><Link id="b-profile-passkeys" className="b-row b-row--link" href="/app/profile/passkeys"><BIcon tone="grey"><KeyIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">Passkeys</span></span></span><Chev /></Link></li> : null}
            {policies ? <li className="b-li"><Link id="b-profile-account-deletion" className="b-row b-row--link eb-danger" href="/app/account/delete"><BIcon tone="red"><TrashIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">Delete my account</span></span></span><Chev /></Link></li> : null}
          </ul>
        </BCard> : null}
      </>}
    </BStack>
  </BScreen>;
}

export const CALENDAR_PROVIDERS = [
  {id: 'apple', name: 'Apple Calendar', detail: 'iPhone, iPad and Mac', steps: ['Copy your private link from NEVORA.', 'On iPhone or iPad, open Calendar, then Calendars and Add Calendar. Choose Add Subscription Calendar.', 'Paste the link and follow the setup prompts. On Mac, choose File, then New Calendar Subscription.'], guide: ['Apple setup guide', 'https://support.apple.com/en-us/102301']},
  {id: 'google', name: 'Google Calendar', detail: 'Set up on a computer', steps: ['Copy your private link from NEVORA.', 'On a computer, open Google Calendar. Beside Other calendars, choose Add other calendars, then From URL.', 'Paste the link and choose Add calendar. The Google Calendar phone app can’t add a link.'], guide: ['Google setup guide', 'https://support.google.com/calendar/answer/37100?hl=en']},
  {id: 'outlook', name: 'Outlook', detail: 'Set up on the web', steps: ['Copy your private link from NEVORA.', 'In Outlook on the web, open Calendar, then Add calendar and Subscribe from web.', 'Paste the link and choose Import.'], guide: ['Outlook setup guide', 'https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web']},
] as const;

type CalendarBProps = Omit<CalendarClientState, 'pendingKind'> & {pendingKind?: CalendarCommand['kind'] | null; onCommand: (kind: CalendarCommand['kind']) => void; onCopy: () => void; onRetry: () => void;
  confirmation: {kind: 'ROTATE' | 'REVOKE'; generation: string | null} | null; open: string | null; onOpen: (id: string | null) => void;
  onAsk: (kind: 'ROTATE' | 'REVOKE', button: HTMLButtonElement) => void; onCancel: () => void; onConfirm: () => void;
  feedbackRef?: RefObject<HTMLDivElement | null>; confirmRef?: RefObject<HTMLDivElement | null>; resetRef?: RefObject<HTMLButtonElement | null>; revokeRef?: RefObject<HTMLButtonElement | null>};

/** Add to calendar (board E-Calendar): the link card with its status chip, what it does, the keep-it-private note and the
 * one primary action; the setup steps per calendar app; Reset and Revoke, each reviewed first. Same client owner. */
export function EmployeeCalendarB({status, url, paused, busy, notice, pendingKind, onCommand, onCopy, onRetry, confirmation, open, onOpen, onAsk, onCancel, onConfirm, feedbackRef, confirmRef, resetRef, revokeRef}: CalendarBProps) {
  const available = !paused && status && 'authority' in status, active = available && status.state === 'active', unknown = !!pendingKind;
  const currentUrl = active ? url : null, confirmationCurrent = active && !busy && !unknown && confirmation && confirmation.generation === status.generation;
  const chip = !available ? null : active ? <BChip tone="teal">Active</BChip> : <BChip>{status.state === 'revoked' ? 'Turned off' : 'Off'}</BChip>;
  return <BScreen back>
    <BHero back={{href: '/app/more', label: 'More'}} title="Add to calendar" titleId="b-calendar-title" sub="Keep your shifts in the calendar you already use" />
    <BStack>
      <section className="b-card" aria-labelledby="b-calendar-heading" aria-busy={busy}>
        <div className="b-card__h"><h2 id="b-calendar-heading">Your calendar link</h2>{chip}</div>
        <div className="eb-body">
          {paused ? <p className="b-state" role="status">Calendar settings paused. Return to this window to check your link.</p> : busy ? <p className="b-state" role="status">Saving your calendar request…</p> : !status ? <p className="b-state" role="status">Checking your calendar link…</p> : !available ? <>
            <p className="b-state" role="status">{status.state === 'unauthorized' ? 'Your access could not be confirmed. Sign in again to manage your link.' : 'Calendar settings could not be checked. Try again to see the current status.'}</p>
            {status.state === 'unauthorized' ? <BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink> : <BButton kind="quiet" full onClick={onRetry}>Try again</BButton>}
          </> : <>
            <p className="eb-para">Your calendar app picks up schedule changes the next time it refreshes, which can take a while.</p>
            <div className="eb-tint"><BIcon tone="amber"><LockSimpleIcon weight="bold" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">Keep the link to yourself</span><span className="b-notice__s">Anyone with it can see your shift times and locations.</span></span></div>
            {unknown ? <p className="eb-para">Your previous request still needs to be checked before you can change this link.</p>
              : active ? currentUrl ? <div className="eb-in">
                <label className="eb-label" htmlFor="b-calendar-link">Your private calendar link</label>
                <textarea className="eb-input eb-input--area" id="b-calendar-link" readOnly spellCheck={false} autoComplete="off" value={currentUrl} rows={3} aria-describedby="b-calendar-link-hint" onFocus={event => {
                  const field = event.currentTarget; field.select();
                  requestAnimationFrame(() => { if (document.activeElement === field) field.select(); });
                }} />
                <p className="eb-hint" id="b-calendar-link-hint">Shown once. Copy it now, or reset it later to get a new link.</p>
              </div> : <p className="eb-para">For your privacy the link is shown only once. Get a new link if you need to copy it again.</p>
              : status.state === 'revoked' ? <p className="eb-para">Future access through the previous link has stopped.</p> : null}
            {!status.canIssue && !active ? <p className="eb-para">No eligible work location is currently available. Ask your manager to review your access.</p> : null}
          </>}
          {available && !busy && !unknown ? active ? currentUrl ? <BButton kind="teal" big full onClick={onCopy}>Copy calendar link</BButton> : null
            : status.canIssue ? <BButton kind="teal" big full onClick={() => onCommand('ISSUE')}>Create calendar link</BButton> : null : null}
        </div>
      </section>
      <div ref={feedbackRef} tabIndex={-1} className={notice && !paused ? 'eb-feedback' : 'eb-feedback eb-feedback--empty'}>
        {notice && !paused ? <p className="b-note eb-callout" role="status">{notice}</p> : null}
        {unknown && !paused && !busy && available ? <BButton kind="quiet" full onClick={onRetry}>Retry original request</BButton> : null}
      </div>
      {available && !busy ? <>
        <BCard title="Or add it straight to" id="b-calendar-providers">
          <ul className="b-list">{CALENDAR_PROVIDERS.map(provider => {
            const expanded = open === provider.id;
            return <li className="b-li" key={provider.id}>
              <button type="button" className="b-row b-row--link eb-expand" aria-expanded={expanded} aria-controls={'b-calendar-steps-' + provider.id} onClick={() => onOpen(expanded ? null : provider.id)}>
                <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{provider.name}</span></span><span className="b-row__s">{provider.detail}</span></span>
                <CaretDownIcon className="b-chev eb-expand__caret" size={18} weight="bold" aria-hidden="true" />
              </button>
              {expanded ? <div className="eb-steps" id={'b-calendar-steps-' + provider.id}><ol>{provider.steps.map(step => <li key={step}>{step}</li>)}</ol>
                <a className="eb-textlink" href={provider.guide[1]} target="_blank" rel="noreferrer">{provider.guide[0]}<span className="b-sr"> (opens a new tab)</span></a></div> : null}
            </li>;
          })}</ul>
        </BCard>
        {confirmationCurrent ? <div ref={confirmRef} id="b-calendar-link-confirmation" className="b-card" role="group" aria-labelledby="b-calendar-confirm-title" tabIndex={-1}>
          <div className="b-card__h"><h2 id="b-calendar-confirm-title">{confirmation.kind === 'ROTATE' ? 'Get a new calendar link?' : 'Turn off your calendar link?'}</h2></div>
          <div className="eb-body"><p className="eb-para">{confirmation.kind === 'ROTATE' ? 'The old link stops working right away. Copy the new link and add it to your calendar app again.' : 'Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app.'}</p>
            <div className="eb-btns"><BButton kind="quiet" onClick={onCancel}>Keep current link</BButton><button type="button" className="b-btn eb-btn-danger" onClick={onConfirm}>{confirmation.kind === 'ROTATE' ? 'Get a new link' : 'Turn off link'}</button></div></div>
        </div> : active && !unknown ? <div className="eb-manage">
          {status.canIssue ? <button ref={resetRef} type="button" className="eb-textbtn eb-textbtn--danger" aria-controls="b-calendar-link-confirmation" aria-expanded={false} onClick={event => onAsk('ROTATE', event.currentTarget)}>Get a new link</button> : null}
          {status.canIssue ? <p className="b-note">The old link stops working right away.</p> : null}
          <button ref={revokeRef} type="button" className="eb-textbtn" aria-controls="b-calendar-link-confirmation" aria-expanded={false} onClick={event => onAsk('REVOKE', event.currentTarget)}>Turn off link</button>
        </div> : null}
      </> : null}
    </BStack>
  </BScreen>;
}

type AlertsBProps = {snapshot: DeviceSnapshot | null; paused: boolean; enabled: boolean; canInstall: boolean; confirm: boolean; onEnable(): void; onRefresh(): void; onPostpone(): void; onInstall(): void;
  onReview(): void; onKeep(): void; onTurnOff(): void; onTest(): void; installMessage?: string; ending?: boolean;
  confirmationRef?: RefObject<HTMLDivElement | null>; feedbackRef?: RefObject<HTMLDivElement | null>; turnOffRef?: RefObject<HTMLButtonElement | null>};

/** Alerts on this device (board E-NotificationSettings): one card with the state chip, what it means and its actions;
 * turning off is reviewed first. The device owner and its commands are the page's own. */
export function EmployeeAlertsB({confirmationRef, feedbackRef, turnOffRef, ending, ...p}: AlertsBProps) {
  const s = p.snapshot, allowed = p.enabled && !p.paused && !s?.accessChanged, state = allowed ? s?.state : null, busy = state === 'loading' || state === 'pending', cleanup = !!s?.cleanupPending;
  const title = !p.enabled ? 'Your workplace hasn’t turned on device alerts' : p.paused ? 'Device settings paused' : s?.accessChanged ? 'Your access changed' : !s ? 'Checking this device…' : cleanup ? 'Alerts may still be on' : state === 'enabled' ? 'Alerts are on' : state === 'denied' ? 'Permission is blocked' : state === 'revoked' ? 'Device access changed' : state === 'install' ? 'Open from your Home Screen' : state === 'unavailable' ? 'Alerts are unavailable' : state === 'error' ? 'Setup needs a check' : busy ? 'Checking this device…' : 'Alerts are off';
  const chip = !p.enabled ? <BChip>Unavailable</BChip> : !allowed || !s || busy ? null : cleanup ? <BChip tone="amber">Check</BChip> : state === 'enabled' ? <BChip tone="teal">On</BChip> : state === 'denied' ? <BChip tone="red">Blocked</BChip> : state === 'error' || state === 'revoked' ? <BChip tone="amber">Check</BChip> : <BChip>Off</BChip>;
  const settled = allowed && s && !busy && !p.confirm;
  const primary = settled && (state === 'ready' || state === 'dismissed') ? <BButton kind="teal" big full onClick={p.onEnable}>{state === 'dismissed' ? 'Review setup' : 'Turn on alerts'}</BButton>
    : settled && state === 'install' && p.canInstall ? <BButton kind="teal" big full onClick={p.onInstall}>Add to Home Screen</BButton> : null;
  const recheck = settled && (state === 'error' || state === 'denied' || state === 'unavailable' || cleanup);
  const turnOff = settled && (state === 'enabled' || state === 'revoked' || state === 'error' || state === 'denied' && s.server.enabled);
  const test = settled && !cleanup && state === 'enabled' && s.server.localOwned && s.server.testAllowed;
  const text = !p.enabled ? 'Your notifications always stay in NEVORA, and your phone’s settings can turn off every alert.'
    : p.paused ? 'Return to this window to check the current status. No new setup will start automatically.'
    : s?.accessChanged ? <><Link className="eb-textlink" href="/login">Sign in again</Link> to check this account and device.</>
    : !s || busy ? state === 'pending' ? 'Finishing your device request…' : 'Checking permission and this device’s enrollment…'
    : cleanup ? 'Check again asks NEVORA for the latest status. Retry turn off sends your earlier turn-off request again.' : state === 'enabled' ? 'This browser is set up for your account. Alerts also depend on your workplace and device settings.' : state === 'denied' ? 'Allow notifications in your browser or device settings, then check again here. NEVORA cannot change that permission for you.' : state === 'revoked' ? 'Permission or this browser’s setup changed. Turn off the previous setup before starting again.' : state === 'install' ? 'Add NEVORA to your Home Screen, then open it from that icon to set up alerts.' : state === 'unavailable' ? 'This browser or the current configuration cannot set up alerts. You can keep using your notifications in NEVORA.' : state === 'error' ? 'We could not verify this device. Check again before starting a new request. You can also turn off a previous setup.' : state === 'dismissed' ? 'Setup is postponed. You can return whenever you are ready.' : 'Get schedule changes, request answers and updates on this device. If permission is needed, your browser will ask.';
  const checking = p.enabled && !p.paused && !s?.accessChanged && (!s || busy);
  return <BScreen back>
    <BHero back={{href: '/app/notifications', label: 'Notifications'}} title="Alerts on this device" titleId="b-alerts-title" sub="Settings for this browser only" />
    <BStack>
      {ending ? <BCard><p className="b-state eb-pad" role="status">Signing out…</p></BCard> : <>
        <section className="b-card" aria-labelledby="b-device-status-title" aria-busy={allowed && (busy || !s)}>
          <div className="b-card__h"><h2 id="b-device-card-title">This device</h2>{chip}</div>
          <div className="b-notice eb-notice"><BIcon tone="grey"><BellIcon weight="bold" /></BIcon><span className="b-notice__tx">
            <span className="b-notice__t" id="b-device-status-title">{title}</span><span className="b-notice__s" role={checking ? 'status' : undefined}>{text}</span></span></div>
          {state === 'install' && s ? <p className="eb-para eb-pad">{s.capabilities.requiresStandalone ? 'In Safari, open Share, then Add to Home Screen. Turn on Open as Web App if offered. Open NEVORA from the new icon.' : 'Open your browser menu and choose Install app or Add to Home Screen if offered. Open NEVORA from the new icon.'}</p> : null}
          {primary || recheck || test || turnOff || settled && state === 'ready' ? <div className="eb-body eb-body--acts">
            {primary}
            {recheck || test ? <div className="eb-btns">{recheck ? <BButton kind="quiet" onClick={p.onRefresh}>Check again</BButton> : null}{test ? <BButton kind="quiet" onClick={p.onTest}>Test notification</BButton> : null}</div> : null}
            {turnOff ? <button type="button" ref={turnOffRef} className="b-btn b-btn--full eb-btn-outline-danger" onClick={cleanup ? p.onTurnOff : p.onReview}>{cleanup ? 'Retry turn off' : 'Turn off alerts'}</button> : null}
            {settled && state === 'ready' ? <button type="button" className="eb-textbtn" onClick={p.onPostpone}>Not now</button> : null}
          </div> : null}
          {p.enabled ? <BCardNote>Your notifications always stay in NEVORA, and your phone’s settings can turn off every alert.</BCardNote> : null}
        </section>
        {allowed && p.confirm && !busy ? <div ref={confirmationRef} className="b-card" tabIndex={-1} role="group" aria-labelledby="b-device-turnoff-title">
          <div className="b-card__h"><h2 id="b-device-turnoff-title">Turn off alerts here?</h2></div>
          <div className="eb-body"><p className="eb-para">NEVORA will try to stop alerts for this account in this browser. We’ll check the result before confirming they’re off.</p><p className="eb-para">Your browser permission, other devices, and notifications in NEVORA stay the same. An alert already queued by your device may still appear.</p>
            <div className="eb-btns"><BButton kind="quiet" onClick={p.onKeep}>Keep current setup</BButton><button type="button" className="b-btn eb-btn-danger" onClick={p.onTurnOff}>Turn off alerts</button></div></div>
        </div> : null}
        <div ref={feedbackRef} tabIndex={-1} className="eb-feedback">{allowed && s?.message ? <p className="b-note eb-callout" role="status">{cleanup ? DEVICE_TURN_OFF_PENDING_MESSAGE : state === 'error' ? 'Setup could not finish. Check again before starting a new request. You can ask your manager for help.' : s.message}</p> : null}
          {allowed && p.installMessage ? <p className="b-note eb-callout" role="status">{p.installMessage}</p> : null}</div>
      </>}
    </BStack>
  </BScreen>;
}

/** Delete account (board E-DeleteAccount), the parts that aren't the form: what we delete and what your workplace keeps
 * (the form follows this screen, b-keep); the receipt; or the signed-out and changed-account outcomes. */
export function EmployeeDeleteB({state, period, workplace, outcomeRef, missingPeriod, support}: {
  state: DeletionFormState; period: string | null; workplace?: string | null; outcomeRef?: RefObject<HTMLDivElement | null>;
  /** The unresolved-fact marker the page shows for a missing period. */
  missingPeriod: ReactNode; support: (reference?: string) => ReactNode;
}) {
  const receipt = state.kind === 'received' || state.kind === 'duplicate', ended = state.kind === 'signed_out' || state.kind === 'changed';
  const within = period ?? missingPeriod;
  return <BScreen back={!receipt && !ended}>
    <BHero back={!receipt && !ended ? {href: '/app/profile#profile-account-deletion', label: 'Profile'} : undefined} title={receipt ? 'Deletion requested' : 'Delete account'} titleId="b-deletion-title"
      sub={receipt || ended ? undefined : 'Your NEVORA sign-in, not your job'} />
    <BStack>
      {receipt ? <>
        <div className="b-card" ref={outcomeRef} tabIndex={-1} role="status" aria-labelledby="b-deletion-done-title">
          <div className="b-card__h"><h2>Your request</h2><BChip tone="teal">Received</BChip></div>
          <div className="eb-body"><p className="eb-lead" id="b-deletion-done-title">{state.kind === 'received' ? 'Your deletion request was received' : 'A deletion request is already in progress'}</p><p className="eb-para">Keep your reference until it’s done.</p>
            <Reference reference={state.reference} confirmedAt={state.confirmedAt} /></div>
        </div>
        <BCard title="What happens next" id="b-deletion-next">
          <ul className="b-list">
            <Point icon={<SignOutIcon weight="bold" />} tone="red" title="You’re signed out everywhere" text="You can’t sign in again with your password or a passkey. Calendar feed links and device alerts have stopped." />
            <Point icon={<ClockIcon weight="bold" />} title="We delete your account" text={<>We aim to finish within {within}. If we have your email address, we’ll email you when it’s done.</>} />
            <Point icon={<BriefcaseIcon weight="bold" />} title="Your job doesn’t change" text="Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep." />
          </ul>
          <BCardNote>To ask about it, email {support(state.reference)} with your reference. We’ll never ask for your password. Changed your mind? Contact support before the request is processed.</BCardNote>
        </BCard>
        <form action={logout}><BButton type="submit" kind="teal" big full>Done</BButton></form>
      </> : ended ? <div className="b-card" ref={outcomeRef} tabIndex={-1} role="alert" aria-labelledby="b-deletion-ended-title">
        <div className="eb-body"><h2 className="eb-lead" id="b-deletion-ended-title">{state.kind === 'signed_out' ? 'You’re signed out' : 'A different account is signed in'}</h2>
          <p className="eb-para">{state.kind === 'signed_out' ? 'We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue.' : 'Nothing was sent. Go to Profile to see the account that’s signed in now.'}</p>
          <BButtonLink href={state.kind === 'signed_out' ? '/login' : '/app/profile'} kind="teal" full>{state.kind === 'signed_out' ? 'Sign in' : 'Go to Profile'}</BButtonLink></div>
      </div> : <>
        <BCard title="What we delete" id="b-deletion-effects">
          <ul className="b-list">
            <Point icon={<SignOutIcon weight="bold" />} tone="red" title="Your access ends right away" text="You’re signed out on every device and can’t sign in again with your password or a passkey. Calendar feed links and device alerts stop." />
            <Point icon={<ClockIcon weight="bold" />} title={<>Deleted within {within}</>} text="We aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can’t cancel it in the app." />
          </ul>
        </BCard>
        <BCard title={`What ${workplace ?? 'your employer'} keeps`} id="b-deletion-kept">
          <p className="eb-para eb-para--lg eb-pad">Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</p>
          <ul className="b-list eb-list-top"><li className="b-li"><Link className="b-row b-row--link" href="/app/profile/account-deletion"><span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">What may be kept</span></span></span><Chev /></Link></li></ul>
        </BCard>
      </>}
    </BStack>
  </BScreen>;
}

function Point({icon, tone = 'grey', title, text}: {icon: ReactNode; tone?: 'grey' | 'red'; title: ReactNode; text: ReactNode}) {
  return <li className="b-li"><div className="b-notice eb-point"><BIcon tone={tone}>{icon}</BIcon><span className="b-notice__tx"><span className="b-notice__t">{title}</span><span className="b-notice__s">{text}</span></span></div></li>;
}

/** The deletion reference with Copy (the receipt's own; its copied note is local to the button). */
function Reference({reference, confirmedAt}: {reference: string; confirmedAt: string}) {
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null), at = receivedAt(confirmedAt);
  return <div className="eb-ref">
    <span className="eb-label">Reference</span>
    <strong className="eb-ref__v ad-reference">{reference}</strong>
    {at ? <span className="b-row__s">Received {at}</span> : null}
    <BButton kind="quiet" full onClick={() => { navigator.clipboard?.writeText(reference).then(() => setCopied('yes'), () => setCopied('no')) ?? setCopied('no'); }}>Copy reference</BButton>
    <p className="b-note eb-copied" role="status">{copied === 'yes' ? 'Reference copied.' : copied === 'no' ? 'Couldn’t copy. Write the reference down instead.' : ''}</p>
  </div>;
}

/** Postgres timestamptz text ("2026-10-27 23:45:01.123456-04") as a local date and time, or null. */
export function receivedAt(text: string) {
  const iso = text.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/([+-]\d\d)$/, '$1:00');
  const time = Date.parse(iso);
  return Number.isFinite(time) ? new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'}).format(time) : null;
}
