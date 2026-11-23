'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BellRingingIcon } from '@phosphor-icons/react/dist/ssr/BellRinging';
import { BellSlashIcon } from '@phosphor-icons/react/dist/ssr/BellSlash';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { PauseIcon } from '@phosphor-icons/react/dist/ssr/Pause';
import { ProhibitIcon } from '@phosphor-icons/react/dist/ssr/Prohibit';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr/Warning';
import { NativeDeviceController, type NativeDeviceSnapshot } from '../../lib/native-shell/device-client';
import { nativeDeviceRuntime } from '../../lib/native-shell/device-runtime';
import { BButton, BHero, BScreen, BStack } from '../owner-b/b-kit';
import { BCardNote } from '../employee-b/parts';
import { shown } from '../employee-b/account-host';
import './device-settings.css';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { NATIVE_SHELL_COPY } from './native-shell-copy';

type Words = typeof NATIVE_SHELL_COPY.en;
type Props = {
    snapshot: NativeDeviceSnapshot;
    review?: string | null;
    recover?: boolean;
    paused?: boolean;
    onEnable(): void;
    onRefresh(): void;
    onReview(): void;
    onKeep(): void;
    onTurnOff(): void;
    onReviewSetup?(): void;
    onRecover?(): void;
};
/** The words and which controls show, shared by both presentations. Review B2 (NV-060): the error state has its own line
 * (it showed the "off" text under "Setup needs a check"). Nov 23 (L1 fix): no line repeats the title or a button's words,
 * and each state has one main action (`main`): Turn on alerts when off, Review app setup when the setup changed, Check
 * again otherwise. The rest are white secondaries; Turn off alerts is a secondary with red words, always last. */
function describe(p: Props, t: Words) {
    const s = p.snapshot, busy = ['pending', 'loading'].includes(s.state), review = !!p.review && p.review === s.generation && !busy && !p.paused;
    const title = p.paused ? t.pausedTitle : s.state === 'enabled' ? t.onTitle : s.state === 'denied' ? t.blockedTitle : s.state === 'revoked' ? t.changedTitle : s.state === 'error' ? t.errorTitle : s.state === 'unavailable' ? t.unavailableTitle : busy ? t.checkingTitle : t.offTitle;
    const text = p.paused ? t.pausedText : s.state === 'enabled' ? t.onText : s.state === 'denied' ? t.blockedText : s.state === 'revoked' ? t.changedText : s.state === 'error' ? t.errorText : busy ? t.checkingText : t.offText;
    const acts = !busy && !p.paused, enable = s.state === 'ready', off = !!s.generation && !review && !p.recover, setup = ['error', 'revoked'].includes(s.state) && !p.recover;
    // While a confirmation is open, its own action is the main one; the state card's actions step down to secondaries.
    const main: 'enable' | 'setup' | 'refresh' | 'none' = review || (p.recover && !busy && !p.paused) ? 'none' : enable ? 'enable' : setup && s.state === 'revoked' ? 'setup' : 'refresh';
    const message = s.message && !p.paused && s.message.trim() !== text.trim() ? s.message : null;
    return { s, busy, review, title, text, message, acts, enable, off, setup, main, recover: !!p.recover && !busy && !p.paused };
}
/** The card view: the Owner's device popover and, in the Employee app, the presentation a phone held sideways keeps. */
export function NativeDeviceSettingsView(p: Props) {
    const t = NATIVE_SHELL_COPY[usePortalLang()];
    const d = describe(p, t), s = d.s;
    const kind = (which: typeof d.main) => d.main === which ? 'c-btn' : 'c-btn c-btn--secondary nd-btn-2';
    const refresh = <button key="refresh" type="button" className={kind('refresh')} onClick={p.onRefresh}>{t.checkAgain}</button>;
    const setup = d.setup ? <button key="setup" type="button" className={kind('setup')} data-native-review-setup onClick={p.onReviewSetup}>{t.reviewSetup}</button> : null;
    return <section className="c-card native-device-card" aria-labelledby="nd-card-h" aria-busy={d.busy}>
  <div className="c-card__head"><h2 className="c-card__label" id="nd-card-h">{t.thisDevice}</h2></div>
  <div className="c-card__body">
   {/* Review F2 (NV-213): the same state block as the Alerts page (ring, title, explanation). */}
   <div className="nd-state">{ring(p, d.busy)}<h3 className="nd-title" tabIndex={-1} data-native-status>{d.title}</h3><p className="nd-text">{d.text}</p>
    {/* One live line, in place from the start, so a failure's own message is announced when it appears. */}
    <div role="status" className="nd-live">{d.message ? <p className="nd-msg" data-tone={['error', 'revoked', 'denied'].includes(s.state) ? 'amber' : undefined}>{d.message}</p> : null}</div></div>
   {p.paused ? <div className="c-btns c-btns--stack"><button type="button" className="c-btn" onClick={p.onRefresh}>{t.checkNow}</button></div> : null}
   {d.acts ? <div className="c-btns c-btns--stack">
    {d.enable ? <button type="button" className="c-btn" onClick={p.onEnable}>{t.turnOn}</button> : null}
    {d.main === 'setup' ? [setup, refresh] : [refresh, setup]}
    {d.off ? <button type="button" className="c-btn c-btn--secondary nd-btn-2 nd-btn-off" data-native-review-off onClick={p.onReview}>{t.turnOff}</button> : null}
   </div> : null}
   {d.recover ? <div role="group" aria-labelledby="nd-card-recover" tabIndex={-1} data-native-confirm className="nd-card-confirm">
    <h3 className="nd-confirm__t" id="nd-card-recover">{t.recoverTitle}</h3>
    <p>{t.recoverText}</p>
    <div className="c-btns c-btns--stack"><button type="button" className="c-btn" onClick={p.onRecover}>{t.turnOnForAccount}</button><button type="button" className="c-btn c-btn--secondary nd-btn-2" onClick={p.onKeep}>{t.keepSetup}</button></div>
   </div> : null}
   {d.review ? <div role="group" aria-labelledby="nd-card-off" tabIndex={-1} data-native-confirm className="nd-card-confirm">
    <h3 className="nd-confirm__t" id="nd-card-off">{t.offAskTitle}</h3>
    <p>{t.offAskText}</p>
    <div className="c-btns c-btns--stack"><button type="button" className="c-btn c-btn--danger" onClick={p.onTurnOff}>{t.turnOff}</button><button type="button" className="c-btn c-btn--secondary nd-btn-2" onClick={p.onKeep}>{t.keepSetup}</button></div>
   </div> : null}
   <p className="c-note">{t.alwaysInNevora}</p>
  </div>
 </section>;
}
/** The 64px state ring (Direction B): teal on, red blocked, amber check, grey off or paused. */
function Ring({ tone, children }: { tone: 'teal' | 'red' | 'amber' | 'grey'; children: ReactNode }) {
    return <span className="nd-ring" data-tone={tone} aria-hidden="true">{children}</span>;
}
function ring(p: Props, busy: boolean) {
    const state = p.snapshot.state;
    if (p.paused) return <Ring tone="grey"><PauseIcon size={28} weight="bold"/></Ring>;
    // Review B1 (NV-208): checking is grey (teal means alerts are on).
    if (busy) return <Ring tone="grey"><HourglassMediumIcon size={28} weight="bold"/></Ring>;
    if (state === 'enabled') return <Ring tone="teal"><BellRingingIcon size={28} weight="bold"/></Ring>;
    if (state === 'denied') return <Ring tone="red"><ProhibitIcon size={28} weight="bold"/></Ring>;
    if (state === 'revoked' || state === 'error') return <Ring tone="amber"><WarningIcon size={28} weight="bold"/></Ring>;
    return <Ring tone="grey"><BellSlashIcon size={28} weight="bold"/></Ring>;
}
/** Direction B (Nov 9, 2026): the phone app's Alerts page as the browser's Alerts screen draws it: the band with the way
 * back to Notifications, one card with the state as a 64px ring, its explanation and the stacked pill actions, and the
 * two confirmations as their own cards. Same words, controls, handlers and data-native-* hooks as the card view. */
export function NativeDeviceSettingsB(p: Props) {
    const t = NATIVE_SHELL_COPY[usePortalLang()];
    const d = describe(p, t), s = d.s;
    const cls = (which: typeof d.main) => `b-btn b-btn--${d.main === which ? 'teal' : 'quiet nd-btn-2'} b-btn--big b-btn--full`;
    const refresh = <button key="refresh" type="button" className={cls('refresh')} onClick={p.onRefresh}>{t.checkAgain}</button>;
    const setup = d.setup ? <button key="setup" type="button" className={cls('setup')} data-native-review-setup onClick={p.onReviewSetup}>{t.reviewSetup}</button> : null;
    return <BScreen back>
    <BHero back={{ href: '/app/notifications', label: t.notifications }} title={t.alerts} titleId="b-native-alerts-title"/>
    <BStack>
      {/* Review B6 (NV-211): "This device" is the centred stack's eyebrow, not a left header over centred content. NV-060:
        * a failure's own message sits in the card under its explanation (amber ink), not in a teal note under the card. */}
      <section className="b-card nd-card" aria-labelledby="nd-device-h" aria-busy={d.busy}>
        <div className="nd-state">
          <h2 className="nd-eyebrow" id="nd-device-h">{t.thisDevice}</h2>
          {ring(p, d.busy)}
          <h3 className="nd-title" tabIndex={-1} data-native-status>{d.title}</h3>
          <p className="nd-text">{d.text}</p>
          <div role="status" className="nd-live">{d.message ? <p className="nd-msg" data-tone={['error', 'revoked', 'denied'].includes(s.state) ? 'amber' : undefined}>{d.message}</p> : null}</div>
        </div>
        {/* Review F2 (NV-209): paused has one way forward, Check now (it also ends the pause). */}
        {p.paused ? <div className="nd-acts"><BButton kind="teal" big full onClick={p.onRefresh}>{t.checkNow}</BButton></div> : null}
        {d.acts ? <div className="nd-acts">
          {/* One solid main action first, white secondaries after it, the red-worded turn-off last (Nov 23, L1 fix). */}
          {d.enable ? <BButton kind="teal" big full onClick={p.onEnable}>{t.turnOn}</BButton> : null}
          {d.main === 'setup' ? [setup, refresh] : [refresh, setup]}
          {d.off ? <button type="button" className="b-btn b-btn--quiet nd-btn-2 nd-btn-off b-btn--big b-btn--full" data-native-review-off onClick={p.onReview}>{t.turnOff}</button> : null}
        </div> : null}
        <BCardNote center>{t.alwaysInNevora}</BCardNote>
      </section>
      {d.recover ? <div className="b-card nd-confirm" role="group" aria-labelledby="nd-confirm-recover" tabIndex={-1} data-native-confirm>
        <h2 className="nd-confirm__t" id="nd-confirm-recover">{t.recoverTitle}</h2>
        <p className="nd-text">{t.recoverText}</p>
        <div className="nd-acts"><button type="button" className="b-btn b-btn--quiet nd-btn-2 b-btn--big b-btn--full" onClick={p.onKeep}>{t.keepSetup}</button><BButton kind="teal" big full onClick={p.onRecover}>{t.turnOnForAccount}</BButton></div>
      </div> : null}
      {d.review ? <div className="b-card nd-confirm" role="group" aria-labelledby="nd-confirm-off" tabIndex={-1} data-native-confirm>
        <h2 className="nd-confirm__t" id="nd-confirm-off">{t.offAskTitle}</h2>
        <p className="nd-text">{t.offAskText}</p>
        <div className="nd-acts"><button type="button" className="b-btn b-btn--quiet nd-btn-2 b-btn--big b-btn--full" onClick={p.onKeep}>{t.keepSetup}</button><button type="button" className="b-btn b-btn--big b-btn--full eb-btn-danger" onClick={p.onTurnOff}>{t.turnOff}</button></div>
      </div> : null}
    </BStack>
  </BScreen>;
}
/** The phone app's Alerts page when the workplace hasn't made app alerts available (Direction B). */
export function NativeAlertsUnavailableB() {
    const t = NATIVE_SHELL_COPY[usePortalLang()];
    return <BScreen back>
    <BHero back={{ href: '/app/notifications', label: t.notifications }} title={t.alerts} titleId="b-native-alerts-title"/>
    <BStack>
      <section className="b-card nd-card" aria-labelledby="nd-device-h">
        <div className="nd-state"><h2 className="nd-eyebrow" id="nd-device-h">{t.thisDevice}</h2><Ring tone="grey"><BellSlashIcon size={28} weight="bold"/></Ring>
          <p className="nd-text">{t.notAvailable}</p></div>
      </section>
    </BStack>
  </BScreen>;
}
/** `page`: the Employee's Alerts page in the app, drawn in Direction B with the card view as the sideways-phone fallback;
 * otherwise the card alone (the Owner's device popover). Focus goes to whichever copy is on screen. */
export function NativeDeviceSettings({ page = false }: { page?: boolean }) {
    const [snapshot, setSnapshot] = useState<NativeDeviceSnapshot>({ state: 'loading' }), [paused, setPaused] = useState(false), [review, setReview] = useState<string | null>(null), [recover, setRecover] = useState(false), client = useRef<NativeDeviceController | null>(null), surface = useRef<HTMLDivElement>(null);
    const actionPending=useRef(false),reviewOpener=useRef('off');
    const find = (selector: string) => shown(surface.current?.querySelector<HTMLElement>(selector), page ? document.querySelector<HTMLElement>(`.b-screen ${selector}`) : null);
    useEffect(() => {
        const owner = new NativeDeviceController(nativeDeviceRuntime(), setSnapshot);
        client.current = owner;
        let ended = false;
        const pause = () => { owner.pause(); setPaused(true); setReview(null); setRecover(false); };
        // Review F2 (NV-209): the phone's permission prompt takes focus while Turn on alerts is in flight; that blur is not
        // the person leaving, so it doesn't pause the check (hidden, pagehide and offline still do).
        const blurred = () => { if (!actionPending.current) pause(); };
        const refresh = () => { if (!ended && document.visibilityState !== 'hidden' && document.hasFocus() && navigator.onLine !== false) {
            setPaused(false);
            void owner.start();
        } };
        const visibility = () => document.visibilityState === 'hidden' ? pause() : refresh();
        const end = () => { ended = true; owner.dispose(); setPaused(true); setReview(null); setRecover(false); };
        window.addEventListener('nevora:native-ready', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', refresh);
        window.addEventListener('blur', blurred);
        window.addEventListener('pagehide', pause);
        window.addEventListener('offline', pause);
        window.addEventListener('online', refresh);
        window.addEventListener('nevora:signout', end);
        document.addEventListener('visibilitychange', visibility);
        refresh();
        return () => { owner.dispose(); client.current = null; window.removeEventListener('nevora:native-ready', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); window.removeEventListener('blur', blurred); window.removeEventListener('pagehide', pause); window.removeEventListener('offline', pause); window.removeEventListener('online', refresh); window.removeEventListener('nevora:signout', end); document.removeEventListener('visibilitychange', visibility); };
    }, []);
    const reviewing = review && review === snapshot.generation;
    useEffect(() => { if (reviewing || recover)
        { const confirm = find('[data-native-confirm]'); confirm?.focus(); confirm?.scrollIntoView({ block: 'center' }); } }, [reviewing, recover]); // eslint-disable-line hooks-preserved/exhaustive-deps -- find reads the current DOM
    useEffect(()=>{
        if(!actionPending.current||paused||['pending','loading'].includes(snapshot.state))return;
        actionPending.current=false;
        const heading=find('[data-native-status]');
        heading?.focus();heading?.scrollIntoView({block:'nearest'});
    },[snapshot.state,paused]); // eslint-disable-line hooks-preserved/exhaustive-deps -- find reads the current DOM
    const view = { snapshot, paused, review, recover,
        onEnable: () => { actionPending.current = true; void client.current?.enable(); },
        onRefresh: () => { setPaused(false); void client.current?.start(); },
        onReview: () => { reviewOpener.current = 'off'; setRecover(false); setReview(snapshot.generation ?? null); },
        onReviewSetup: () => { reviewOpener.current = 'setup'; setReview(null); setRecover(true); },
        onRecover: () => { if (!recover || paused) return; actionPending.current = true; setRecover(false); void client.current?.enable(true); },
        onKeep: () => { setReview(null); setRecover(false); requestAnimationFrame(() => find(`[data-native-review-${reviewOpener.current}]`)?.focus()); },
        onTurnOff: () => { if (!reviewing || !review) return; actionPending.current = true; const expected = review; setReview(null); void client.current?.turnOff(expected); } };
    return page ? <><NativeDeviceSettingsB {...view}/><div ref={surface}><NativeDeviceSettingsView {...view}/></div></>
        : <div ref={surface}><NativeDeviceSettingsView {...view}/></div>;
}
