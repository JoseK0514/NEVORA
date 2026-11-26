'use client';

import Link from 'next/link';
import {useState, type ReactNode, type RefObject} from 'react';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {TrashIcon} from '@phosphor-icons/react/dist/ssr/Trash';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CalendarPlusIcon} from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import {SignOutIcon} from '@phosphor-icons/react/dist/ssr/SignOut';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {BriefcaseIcon} from '@phosphor-icons/react/dist/ssr/Briefcase';
import {BButton, BButtonLink, BCallout, BCard, BChip, BHero, BIcon, BScreen, BStack} from '../owner-b/b-kit';
import {BCardNote} from './parts';
import {ACCOUNT_LOCALE, accountCopy} from './account-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import type {EmployeeViewSnapshot} from '../../lib/employee-view';
import {timeZoneLabel} from '../../lib/time-zone-label';
import type {AuthLang} from '../../lib/auth-copy';
import {useProfileLanguageChange} from '../employee-mobile/use-profile-language-change';
import {profileCopy} from '../employee-mobile/profile-copy';
import type {CalendarCommand} from '../../lib/calendar/types';
import type {CalendarClientState} from '../../lib/calendar/client';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';
import {deviceAlertsCopy} from '../employee-mobile/device-alerts-copy';
import {deviceFeedback} from '../employee-mobile/device-feedback-copy';
import type {DeletionFormState} from '@/app/app/account/delete/actions';
import {logout} from '@/app/login/actions';
import './account.css';

/* Employee phones, Direction B, the Account group (mock e-profile, e-calendar, e-alerts, e-delete). Each screen draws the
 * read, state and commands its page already owns; the corporate layout beside it is what tablets and desktop show. */

const Chev = () => <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" />;

/** A read-only field: a small grey label over its value, and an optional grey line saying what the value is for. */
function Field({label, value, help}: {label: string; value: string; help?: string}) {
  // Phase 8 (review C, row 13): the hint belongs to the value; from 768px it sits under the value, not in the label column.
  return <li className="b-li"><div className="b-row eb-field"><span className="b-row__tx"><span className="b-row__s">{label}</span><span className="b-row__t">{value}</span>{help ? <span className="b-row__s eb-field__help">{help}</span> : null}</span></div></li>;
}

/** Profile and settings (board E-Profile): Personal info as label-over-value rows, Display with the language switch,
 * Security. The read is the page's own (one controller for both presentations). */
export function EmployeeProfileB({state, onRetry, lang, passkeys, policies, ending, name, employeeId}: {
  state: PrivatePanelState<EmployeeViewSnapshot>; onRetry: () => void; lang: AuthLang; passkeys: boolean; policies: boolean; ending: boolean;
  /** Kept for callers; since Phase 4 (EM-030) the Calendar and alerts card shows for an Employee and a Lead alike. */
  lead?: boolean;
  /** The signed-in name the shell already shows, for Name while the profile read is unavailable (review B6, NV-285). */
  name?: string;
  /** The Employee ID this person signs in with, from the page's session (inspection Nov 14, BR-13). Hidden while paused, like Name. */
  employeeId?: string;
}) {
  const ready = !state.paused && state.snapshot?.state === 'ready' && state.snapshot.kind === 'profile' ? state.snapshot : null;
  const denied = state.snapshot?.state === 'unavailable' && state.snapshot.reason === 'access_denied';
  const phase = state.paused ? 'paused' : ready ? 'ready' : denied ? 'denied' : state.refreshing ? 'loading' : 'unavailable';
  const value = (text: string | undefined) => text ?? '–';
  const portalLang = usePortalLang(), copy = accountCopy(portalLang), t = copy.profile, c = copy.common;
  const languageCopy = profileCopy[portalLang], {pick, busy, failed} = useProfileLanguageChange();
  return <BScreen back>
    <BHero back={{href: '/app/more', label: c.more}} title={t.title} titleId="b-profile-title" />
    <BStack>
      {ending ? <BCard><p className="b-state eb-pad" role="status">{c.signingOut}</p></BCard> : <>
        <BCard title={t.personal} id="b-profile-personal">
          <ul className="b-list" aria-label={t.listLabel}>
            <Field label={t.name} value={value(ready?.profile.name ?? (state.paused ? undefined : name))} />
            <Field label={t.employeeId} value={value(state.paused ? undefined : employeeId)} help={t.idHelp} />
            <Field label={t.locations} value={value(ready?.profile.locations.join(' · '))} />
            <Field label={t.timeZone} value={value(ready ? timeZoneLabel(ready.profile.timeZone).replace(/ time$/, '') : undefined)} />
          </ul>
          {/* Phase 4 (EM-029): the values can't be changed here, so the card says who changes them. */}
          {ready ? <BCardNote>{copy.personalNote}</BCardNote> : null}
          {ready ? null : <div className="eb-status">
            <p className="b-state" role="status">{state.paused ? t.paused : denied ? t.denied : state.refreshing ? t.checking : t.failed}</p>
            {denied ? <BButtonLink href="/login" kind="teal" full>{c.signIn}</BButtonLink> : phase === 'unavailable' ? <BButton kind="quiet" full onClick={onRetry}>{c.tryAgain}</BButton> : null}
          </div>}
        </BCard>
        <BCard title={t.display} id="b-profile-display">
          <ul className="b-list"><li className="b-li"><div className="b-row eb-pref">
            <span className="b-row__tx"><span className="b-row__t" id="b-profile-language">{t.language}</span><span className="b-row__s" id="b-profile-language-hint" role={failed ? "status" : undefined}>{failed ? languageCopy.languageFailed : languageCopy.languageHint}</span></span>
            <div className="eb-lseg" role="group" aria-labelledby="b-profile-language" aria-describedby="b-profile-language-hint">
              {([['en', 'English'], ['es', 'Español']] as const).map(([code, name]) => <button key={code} type="button" lang={code} aria-pressed={lang === code} disabled={busy} onClick={() => { if (code !== lang) void pick(code); }}>{name}</button>)}
            </div>
          </div></li></ul>
        </BCard>
        {/* Phase 4 (EM-030): the same card for an Employee and a Lead; both use both features. */}
        <div className="eb-desk eb-calalerts"><BCard title={t.calendarAlerts} id="b-profile-calendar"><ul className="b-list">
          <li className="b-li"><Link className="b-row b-row--link" href="/app/profile/calendar"><BIcon tone="grey"><CalendarPlusIcon weight="bold" /></BIcon>
            <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{t.addCalendar}</span></span><span className="b-row__s">{t.calendarSub}</span></span><Chev /></Link></li>
          <li className="b-li"><Link className="b-row b-row--link" href="/app/profile/device-alerts"><BIcon tone="grey"><BellIcon weight="bold" /></BIcon>
            <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{t.alerts}</span></span><span className="b-row__s">{copy.alertsSub}</span></span><Chev /></Link></li>
        </ul></BCard></div>
        {/* Review B6 (NV-293): "Security" when it holds passkeys; "Account" when deletion is all it holds. */}
        {passkeys || policies ? <BCard title={passkeys ? t.security : t.account} id="b-profile-security">
          <ul className="b-list">
            {passkeys ? <li className="b-li"><Link id="b-profile-passkeys" className="b-row b-row--link" href="/app/profile/passkeys"><BIcon tone="grey"><KeyIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{t.passkeys}</span></span></span><Chev /></Link></li> : null}
            {policies ? <li className="b-li"><Link id="b-profile-account-deletion" className="b-row b-row--link" href="/app/account/delete"><BIcon tone="red"><TrashIcon weight="bold" /></BIcon>
              <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{copy.deleteTitle}</span></span><span className="b-row__s">{copy.deleteSub}</span></span><Chev /></Link></li> : null}
          </ul>
        </BCard> : null}
      </>}
    </BStack>
  </BScreen>;
}

/** The calendar apps (English, for callers that list them); the screen reads each app's words in the person's language. */
const providerEn = accountCopy('en').calendar.provider;
export const CALENDAR_PROVIDERS = [
  {id: 'apple', name: 'Apple Calendar', detail: providerEn.apple.detail, steps: providerEn.apple.steps, guide: [providerEn.apple.guide, 'https://support.apple.com/en-us/102301']},
  {id: 'google', name: 'Google Calendar', detail: providerEn.google.detail, steps: providerEn.google.steps, guide: [providerEn.google.guide, 'https://support.google.com/calendar/answer/37100?hl=en']},
  {id: 'outlook', name: 'Outlook', detail: providerEn.outlook.detail, steps: providerEn.outlook.steps, guide: [providerEn.outlook.guide, 'https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web']},
] as const;

type CalendarBProps = Omit<CalendarClientState, 'pendingKind'> & {pendingKind?: CalendarCommand['kind'] | null; onCommand: (kind: CalendarCommand['kind']) => void; onCopy: () => void; onRetry: () => void;
  confirmation: {kind: 'ROTATE' | 'REVOKE'; generation: string | null} | null; open: string | null; onOpen: (id: string | null) => void;
  onAsk: (kind: 'ROTATE' | 'REVOKE', button: HTMLButtonElement) => void; onCancel: () => void; onConfirm: () => void;
  feedbackRef?: RefObject<HTMLDivElement | null>; confirmRef?: RefObject<HTMLDivElement | null>; resetRef?: RefObject<HTMLButtonElement | null>; revokeRef?: RefObject<HTMLButtonElement | null>};

/** Add to calendar (board E-Calendar): the link card with its status chip, what it does, the keep-it-private note and the
 * one primary action; the setup steps per calendar app; Reset and Revoke, each reviewed first. Same client owner. */
export function EmployeeCalendarB({status, url, paused, busy, notice, pendingKind, onCommand, onCopy, onRetry, confirmation, open, onOpen, onAsk, onCancel, onConfirm, feedbackRef, confirmRef, resetRef, revokeRef}: CalendarBProps) {
  const available = !paused && status && 'authority' in status, active = available && status.state === 'active', unknown = !!pendingKind;
  const copy = accountCopy(usePortalLang()), t = copy.calendar, c = copy.common;
  const currentUrl = active ? url : null, confirmationCurrent = active && !busy && !unknown && confirmation && confirmation.generation === status.generation;
  // Final polish, round 2 (M2): a setting's state in a card header has one look, the chip: teal while it is on ("Active",
  // "On"), grey while it is off or unavailable, as on Alerts on this device. (Final review C, row 16, drew "Off" as words.)
  const chip = !available ? null : active ? <BChip tone="teal">{t.active}</BChip> : <BChip>{status.state === 'revoked' ? t.turnedOff : t.off}</BChip>;
  return <BScreen back>
    <BHero back={{href: '/app/more', label: c.more}} title={t.title} titleId="b-calendar-title" sub={t.sub} />
    <BStack>
      <section className="b-card" aria-labelledby="b-calendar-heading" aria-busy={busy}>
        <div className="b-card__h"><h2 id="b-calendar-heading">{t.subscription}</h2>{chip}</div>
        <div className="eb-body">
          {paused ? <p className="b-state" role="status">{t.paused}</p> : busy ? <p className="b-state" role="status">{t.saving}</p> : !status ? <p className="b-state" role="status">{t.checking}</p> : !available ? <>
            <p className="b-state" role="status">{status.state === 'unauthorized' ? t.unauthorized : t.failed}</p>
            {status.state === 'unauthorized' ? <BButtonLink href="/login" kind="teal" full>{c.signIn}</BButtonLink> : <BButton kind="quiet" full onClick={onRetry}>{c.tryAgain}</BButton>}
          </> : <>
            {/* Phase 9 (spec 2.2): privacy information is the kit's teal callout with ShieldCheck (no circle in a tint). */}
            <BCallout tone="teal" icon="privacy" title={t.privateTitle}>{t.privateText}</BCallout>
            {unknown ? <p className="eb-para">{t.unknown}</p>
              : active ? currentUrl ? <div className="eb-in">
                <label className="eb-label" htmlFor="b-calendar-link">{t.linkLabel}</label>
                <textarea className="eb-input eb-input--area" id="b-calendar-link" readOnly spellCheck={false} autoComplete="off" value={currentUrl} rows={3} aria-describedby="b-calendar-link-hint" onFocus={event => {
                  const field = event.currentTarget; field.select();
                  requestAnimationFrame(() => { if (document.activeElement === field) field.select(); });
                }} />
                <p className="eb-hint" id="b-calendar-link-hint">{t.linkHint}</p>
              </div> : <p className="eb-para">{t.shownOnce}</p>
              : status.state === 'revoked' ? <p className="eb-para">{t.revoked}</p> : null}
            {!status.canIssue && !active ? <p className="eb-para">{t.noLocation}</p> : null}
          </>}
          {available && !busy && !unknown ? active ? currentUrl ? <BButton kind="teal" big full onClick={onCopy}>{t.copy}</BButton> : null
            : status.canIssue ? <BButton kind="teal" big full onClick={() => onCommand('ISSUE')}>{t.create}</BButton> : null : null}
        </div>
      </section>
      <div ref={feedbackRef} tabIndex={-1} className={notice && !paused ? 'eb-feedback' : 'eb-feedback eb-feedback--empty'}>
        {notice && !paused ? <BCallout tone="teal" role="status">{notice}</BCallout> : null}
        {unknown && !paused && !busy && available ? <BButton kind="quiet" full onClick={onRetry}>{t.retry}</BButton> : null}
      </div>
      {available && !busy ? <>
        <BCard title={t.providers} id="b-calendar-providers">
          <ul className="b-list">{CALENDAR_PROVIDERS.map(provider => {
            const expanded = open === provider.id, said = t.provider[provider.id];
            return <li className="b-li" key={provider.id}>
              <button type="button" className="b-row b-row--link eb-expand" aria-expanded={expanded} aria-controls={'b-calendar-steps-' + provider.id} onClick={() => onOpen(expanded ? null : provider.id)}>
                {/* Phase 4 (EM-017): each calendar's row leads with the calendar glyph, as every row that opens does. */}
                <BIcon tone="grey"><CalendarPlusIcon weight="bold" /></BIcon>
                <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{provider.name}</span></span><span className="b-row__s">{said.detail}</span></span>
                <CaretDownIcon className="b-chev eb-expand__caret" size={18} weight="bold" aria-hidden="true" />
              </button>
              {expanded ? <div className="eb-steps" id={'b-calendar-steps-' + provider.id}><ol>{said.steps.map(step => <li key={step}>{step}</li>)}</ol>
                <a className="eb-textlink" href={provider.guide[1]} target="_blank" rel="noreferrer">{said.guide}<span className="b-sr">{c.opensNewTab}</span></a></div> : null}
            </li>;
          })}</ul>
        </BCard>
        {confirmationCurrent ? <div ref={confirmRef} id="b-calendar-link-confirmation" className="b-card" role="group" aria-labelledby="b-calendar-confirm-title" tabIndex={-1}>
          <div className="b-card__h"><h2 id="b-calendar-confirm-title">{confirmation.kind === 'ROTATE' ? t.rotateTitle : t.revokeTitle}</h2></div>
          <div className="eb-body"><p className="eb-para">{confirmation.kind === 'ROTATE' ? t.rotateText : t.revokeText}</p>
            <div className="eb-btns"><BButton kind="quiet" onClick={onCancel}>{t.keep}</BButton><button type="button" className="b-btn eb-btn-danger" onClick={onConfirm}>{confirmation.kind === 'ROTATE' ? t.newLink : t.turnOff}</button></div></div>
        </div> : active && !unknown ? <div className="eb-manage">
          {status.canIssue ? <button ref={resetRef} type="button" className="eb-textbtn eb-textbtn--danger" aria-controls="b-calendar-link-confirmation" aria-expanded={false} onClick={event => onAsk('ROTATE', event.currentTarget)}>{t.newLink}</button> : null}
          {status.canIssue ? <p className="b-note">{t.oldStops}</p> : null}
          <button ref={revokeRef} type="button" className="eb-textbtn" aria-controls="b-calendar-link-confirmation" aria-expanded={false} onClick={event => onAsk('REVOKE', event.currentTarget)}>{t.turnOff}</button>
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
  const lang = usePortalLang(), copy = accountCopy(lang), t = copy.alerts, c = copy.common;
  const title = !p.enabled ? t.tNotEnabled : p.paused ? t.tPaused : s?.accessChanged ? t.tAccess : !s ? t.tChecking : cleanup ? t.tCleanup : state === 'enabled' ? t.tOn : state === 'denied' ? t.tDenied : state === 'revoked' ? t.tRevoked : state === 'install' ? t.tInstall : state === 'unavailable' ? t.tUnavailable : state === 'error' ? t.tError : busy ? t.tChecking : t.tOff;
  const chip = !p.enabled ? <BChip>{c.unavailable}</BChip> : !allowed || !s || busy ? null : cleanup ? <BChip tone="amber">{c.check}</BChip> : state === 'enabled' ? <BChip tone="teal">{t.on}</BChip> : state === 'denied' ? <BChip tone="red">{t.blocked}</BChip> : state === 'error' || state === 'revoked' ? <BChip tone="amber">{c.check}</BChip> : <BChip>{t.off}</BChip>;
  const settled = allowed && s && !busy && !p.confirm;
  const primary = settled && (state === 'ready' || state === 'dismissed') ? <BButton kind="teal" big full onClick={p.onEnable}>{state === 'dismissed' ? t.reviewSetup : t.turnOn}</BButton>
    : settled && state === 'install' && p.canInstall ? <BButton kind="teal" big full onClick={p.onInstall}>{t.addHome}</BButton> : null;
  const recheck = settled && (state === 'error' || state === 'denied' || state === 'unavailable' || cleanup);
  const turnOff = settled && (state === 'enabled' || state === 'revoked' || state === 'error' || state === 'denied' && s.server.enabled);
  const test = settled && !cleanup && state === 'enabled' && s.server.localOwned && s.server.testAllowed;
  const text = !p.enabled ? t.xNotEnabled
    : p.paused ? t.xPaused
    : s?.accessChanged ? <><Link className="eb-textlink" href="/login">{t.xSignInAgain}</Link>{t.xAccessRest}</>
    : !s || busy ? state === 'pending' ? t.xPending : t.xChecking
    : cleanup ? t.xCleanup : state === 'enabled' ? t.xOn : state === 'denied' ? t.xDenied : state === 'revoked' ? t.xRevoked : state === 'install' ? t.xInstall : state === 'unavailable' ? t.xUnavailable : state === 'error' ? t.xError : state === 'dismissed' ? t.xDismissed : t.xReady;
  const checking = p.enabled && !p.paused && !s?.accessChanged && (!s || busy);
  return <BScreen back>
    <BHero back={{href: '/app/notifications', label: c.notifications}} title={t.title} titleId="b-alerts-title" sub={t.sub} />
    <BStack>
      {ending ? <BCard><p className="b-state eb-pad" role="status">{c.signingOut}</p></BCard> : <>
        <section className="b-card" aria-labelledby="b-device-status-title" aria-busy={allowed && (busy || !s)}>
          <div className="b-card__h"><h2 id="b-device-card-title">{t.device}</h2>{chip}</div>
          <div className="b-notice eb-notice"><BIcon tone="grey"><BellIcon weight="bold" /></BIcon><span className="b-notice__tx">
            <span className="b-notice__t" id="b-device-status-title">{title}</span><span className="b-notice__s" role={checking ? 'status' : undefined}>{text}</span></span></div>
          {state === 'install' && s ? <p className="eb-para eb-pad">{s.capabilities.requiresStandalone ? t.installSafari : t.installOther}</p> : null}
          {primary || recheck || test || turnOff || settled && state === 'ready' ? <div className="eb-body eb-body--acts">
            {primary}
            {recheck || test ? <div className="eb-btns">{recheck ? <BButton kind="quiet" onClick={p.onRefresh}>{t.checkAgain}</BButton> : null}{test ? <BButton kind="quiet" onClick={p.onTest}>{t.test}</BButton> : null}</div> : null}
            {turnOff ? <button type="button" ref={turnOffRef} className="b-btn b-btn--full eb-btn-outline-danger" onClick={cleanup ? p.onTurnOff : p.onReview}>{cleanup ? t.retryTurnOff : t.turnOff}</button> : null}
            {settled && state === 'ready' ? <button type="button" className="eb-textbtn" onClick={p.onPostpone}>{t.notNow}</button> : null}
          </div> : null}
          {p.enabled ? <BCardNote>{t.xNotEnabled}</BCardNote> : null}
        </section>
        {allowed && p.confirm && !busy ? <div ref={confirmationRef} className="b-card" tabIndex={-1} role="group" aria-labelledby="b-device-turnoff-title">
          <div className="b-card__h"><h2 id="b-device-turnoff-title">{t.confirmTitle}</h2></div>
          <div className="eb-body"><p className="eb-para">{t.confirmText1}</p><p className="eb-para">{t.confirmText2}</p>
            <div className="eb-btns"><BButton kind="quiet" onClick={p.onKeep}>{t.keep}</BButton><button type="button" className="b-btn eb-btn-danger" onClick={p.onTurnOff}>{t.turnOff}</button></div></div>
        </div> : null}
        <div ref={feedbackRef} tabIndex={-1} className="eb-feedback">{/* Phase 9 (spec 2.2): the note's tone follows the card's chip: amber
          * where it says Check (setup could not finish, turn-off pending), teal information otherwise. */}
          {allowed && s?.message ? <BCallout tone={cleanup || state === 'error' ? 'amber' : 'teal'} role="status">{cleanup ? deviceAlertsCopy[lang].turnOffPending : state === 'error' ? t.setupFailed : deviceFeedback(s.message, lang)}</BCallout> : null}
          {allowed && p.installMessage ? <BCallout tone="teal" role="status">{deviceFeedback(p.installMessage, lang)}</BCallout> : null}</div>
      </>}
    </BStack>
  </BScreen>;
}

/** Delete account (board E-DeleteAccount), the parts that aren't the form: what we delete and what your workplace keeps
 * (the form follows this screen, b-keep); the receipt; or the signed-out and changed-account outcomes. */
export function EmployeeDeleteB({state, period, workplace, outcomeRef, missingPeriod, support, keptHref = '/app/profile/account-deletion', profileHref = '/app/profile#profile-account-deletion', owner = false, lastOwner = false}: {
  state: DeletionFormState; period: string | null; workplace?: string | null; outcomeRef?: RefObject<HTMLDivElement | null>;
  /** Owners and Managers (Phase 2): where "What may be kept" opens, the Owner's workspace sentence, and the LAST_OWNER card. */
  keptHref?: string; profileHref?: string; owner?: boolean;
  /** The LAST_OWNER card shows under this band, drawn once by the page (deletion.tsx). */ lastOwner?: boolean;
  /** The unresolved-fact marker the page shows for a missing period. */
  missingPeriod: ReactNode; support: (reference?: string) => ReactNode;
}) {
  const receipt = state.kind === 'received' || state.kind === 'duplicate', ended = state.kind === 'signed_out' || state.kind === 'changed' || lastOwner;
  const within = period ?? missingPeriod;
  const copy = accountCopy(usePortalLang()), t = copy.deletion;
  return <BScreen back={!receipt && !ended}>
    {/* Review B6 (NV-159): a form's screen hides the tab bar, the bell and the avatar (account.css). */}
    {!receipt && !ended ? <span className="eb-form" hidden /> : null}
    <BHero back={!receipt && !ended ? {href: profileHref, label: copy.common.profile} : undefined} title={receipt ? t.requested : t.title} titleId="b-deletion-title"
      sub={receipt || ended ? undefined : t.sub} />
    <BStack>
      {lastOwner ? null : receipt ? <>
        <div className="b-card" ref={outcomeRef} tabIndex={-1} role="status" aria-labelledby="b-deletion-done-title">
          <div className="b-card__h"><h2>{t.yourRequest}</h2><BChip tone="teal">{t.received}</BChip></div>
          <div className="eb-body"><p className="eb-lead" id="b-deletion-done-title">{state.kind === 'received' ? t.receivedLead : t.duplicateLead}</p><p className="eb-para">{t.keepReference}</p>
            <Reference reference={state.reference} confirmedAt={state.confirmedAt} /></div>
        </div>
        <BCard title={t.next} id="b-deletion-next">
          <ul className="b-list">
            <Point icon={<SignOutIcon weight="bold" />} tone="red" title={t.signedOutTitle} text={t.signedOutText} />
            <Point icon={<ClockIcon weight="bold" />} title={t.deleteTitle} text={<>{t.aimBefore}{within}{t.aimAfter}</>} />
            <Point icon={<BriefcaseIcon weight="bold" />} title={t.jobTitle} text={t.jobText} />
          </ul>
          <BCardNote>{t.askBefore}{support(state.reference)}{t.askAfter}</BCardNote>
        </BCard>
        <form action={logout}><BButton type="submit" kind="teal" big full>{t.done}</BButton></form>
      </> : ended ? <div className="b-card" ref={outcomeRef} tabIndex={-1} role="alert" aria-labelledby="b-deletion-ended-title">
        <div className="eb-body"><h2 className="eb-lead" id="b-deletion-ended-title">{state.kind === 'signed_out' ? t.endedSignedOut : t.endedChanged}</h2>
          <p className="eb-para">{state.kind === 'signed_out' ? t.endedSignedOutText : t.endedChangedText}</p>
          <BButtonLink href={state.kind === 'signed_out' ? '/login' : '/app/profile'} kind="teal" full>{state.kind === 'signed_out' ? copy.common.signIn : t.goProfile}</BButtonLink></div>
      </div> : <>
        <BCard title={t.effects} id="b-deletion-effects">
          <ul className="b-list">
            <Point icon={<SignOutIcon weight="bold" />} tone="red" title={t.accessTitle} text={t.accessText} />
            <Point icon={<ClockIcon weight="bold" />} title={<>{t.within}{within}</>} text={t.contentText} />
          </ul>
        </BCard>
        <BCard title={t.kept(workplace ?? null)} id="b-deletion-kept">
          <p className="eb-para eb-para--lg eb-pad">{t.jobText}</p>
          {owner ? <p className="eb-para eb-pad">{t.workspaceBefore}{support()}{t.workspaceAfter}</p> : null}
          <ul className="b-list eb-list-top"><li className="b-li"><Link className="b-row b-row--link" href={keptHref}><span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{t.mayBeKept}</span></span></span><Chev /></Link></li></ul>
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
  const lang = usePortalLang(), t = accountCopy(lang).deletion;
  const [copied, setCopied] = useState<'yes' | 'no' | null>(null), at = receivedAt(confirmedAt, ACCOUNT_LOCALE[lang]);
  return <div className="eb-ref">
    <span className="eb-label">{t.reference}</span>
    <strong className="eb-ref__v ad-reference">{reference}</strong>
    {at ? <span className="b-row__s">{t.receivedAt(at)}</span> : null}
    <BButton kind="quiet" full onClick={() => { navigator.clipboard?.writeText(reference).then(() => setCopied('yes'), () => setCopied('no')) ?? setCopied('no'); }}>{t.copyReference}</BButton>
    <p className="b-note eb-copied" role="status">{copied === 'yes' ? t.copied : copied === 'no' ? t.copyFailed : ''}</p>
  </div>;
}

/** Postgres timestamptz text ("2026-10-27 23:45:01.123456-04") as a local date and time, or null. */
export function receivedAt(text: string, locale = 'en-US') {
  const iso = text.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/([+-]\d\d)$/, '$1:00');
  const time = Date.parse(iso);
  return Number.isFinite(time) ? new Intl.DateTimeFormat(locale, {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'}).format(time) : null;
}
