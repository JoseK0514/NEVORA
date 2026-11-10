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
 * (it showed the "off" text under "Setup needs a check"). */
function describe(p: Props) {
    const s = p.snapshot, busy = ['pending', 'loading'].includes(s.state), review = !!p.review && p.review === s.generation && !busy && !p.paused;
    const title = p.paused ? 'Device settings paused' : s.state === 'enabled' ? 'Alerts are on' : s.state === 'denied' ? 'Permission is blocked' : s.state === 'revoked' ? 'Device setup changed' : s.state === 'error' ? 'Setup needs a check' : s.state === 'unavailable' ? 'Alerts are unavailable' : busy ? 'Checking this device…' : 'Alerts are off';
    const text = p.paused ? 'Return to NEVORA to check this account and device.' : s.state === 'enabled' ? 'The NEVORA app is set up for this account. Alerts also depend on workplace and phone settings.' : s.state === 'denied' ? 'Allow NEVORA notifications in your phone settings, then check again.' : s.state === 'revoked' ? 'The server and this app could not confirm the same setup. Review app setup or turn off the previous setup.' : s.state === 'error' ? 'NEVORA couldn’t confirm this phone’s alert setup. Check again, or review the app’s setup.' : busy ? 'Checking permission and this app’s enrollment…' : 'Get schedule changes, request answers and updates in the NEVORA app. Your phone may ask for notification permission.';
    const acts = !busy && !p.paused, enable = s.state === 'ready', off = !!s.generation && !review && !p.recover, setup = ['error', 'revoked'].includes(s.state) && !p.recover;
    return { s, busy, review, title, text, acts, enable, off, setup, recover: !!p.recover && !busy && !p.paused };
}
/** The card view: the Owner's device popover and, in the Employee app, the presentation a phone held sideways keeps. */
export function NativeDeviceSettingsView(p: Props) {
    const d = describe(p), s = d.s;
    return <section className="c-card native-device-card" aria-label="App alerts" aria-busy={d.busy}>
  <div className="c-card__head"><h2 className="c-card__label">This device</h2></div>
  <div className="c-card__body">
   <h3 tabIndex={-1} data-native-status>{d.title}</h3>
   <p>{d.text}</p>
   {d.acts ? <div className="c-btns c-btns--stack">
    {d.enable ? <button type="button" className="c-btn" onClick={p.onEnable}>Turn on alerts</button> : null}
    <button type="button" className="c-btn c-btn--secondary" onClick={p.onRefresh}>Check again</button>
    {d.off ? <button type="button" className="c-btn c-btn--danger" data-native-review-off onClick={p.onReview}>Turn off alerts</button> : null}
    {d.setup ? <button type="button" className="c-btn c-btn--secondary" data-native-review-setup onClick={p.onReviewSetup}>Review app setup</button> : null}
   </div> : null}
   {d.recover ? <div role="group" aria-label="Use this app for this account?" tabIndex={-1} data-native-confirm>
    <p>Turn on app alerts for the account you are signed in to now? This replaces any previous account’s alert setup in this app. Your other devices stay the same.</p>
    <div className="c-btns c-btns--stack"><button type="button" className="c-btn c-btn--secondary" onClick={p.onKeep}>Keep current setup</button><button type="button" className="c-btn" onClick={p.onRecover}>Turn on for this account</button></div>
   </div> : null}
   {d.review ? <div role="group" aria-label="Turn off alerts here?" tabIndex={-1} data-native-confirm>
    <p>Turn off alerts for this account in this app? Your phone permission and other devices stay the same. An alert already queued by your phone may still appear.</p>
    <div className="c-btns c-btns--stack"><button type="button" className="c-btn c-btn--secondary" onClick={p.onKeep}>Keep current setup</button><button type="button" className="c-btn c-btn--danger" onClick={p.onTurnOff}>Turn off alerts</button></div>
   </div> : null}
   <p className="c-note">Your notifications always stay in NEVORA. Your phone’s settings can block app alerts.</p>
   {s.message ? <p role="status">{s.message}</p> : null}
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
    const d = describe(p), s = d.s;
    return <BScreen back>
    <BHero back={{ href: '/app/notifications', label: 'Notifications' }} title="Alerts" titleId="b-native-alerts-title"/>
    <BStack>
      <section className="b-card nd-card" aria-label="App alerts" aria-busy={d.busy}>
        <div className="b-card__h"><h2>This device</h2></div>
        <div className="nd-state">
          {ring(p, d.busy)}
          <h3 className="nd-title" tabIndex={-1} data-native-status>{d.title}</h3>
          <p className="nd-text">{d.text}</p>
        </div>
        {d.acts ? <div className="nd-acts">
          {/* Review B1 (NV-320, Jose: follow the report): one primary, the red action last. */}
          {d.enable ? <BButton kind="teal" big full onClick={p.onEnable}>Turn on alerts</BButton> : null}
          <BButton kind={d.enable ? "quiet" : "teal"} big full onClick={p.onRefresh}>Check again</BButton>
          {d.setup ? <button type="button" className="b-btn b-btn--quiet b-btn--big b-btn--full" data-native-review-setup onClick={p.onReviewSetup}>Review app setup</button> : null}
          {d.off ? <button type="button" className="b-btn b-btn--big b-btn--full eb-btn-outline-danger" data-native-review-off onClick={p.onReview}>Turn off alerts</button> : null}
        </div> : null}
        <BCardNote center>Your notifications always stay in NEVORA. Your phone’s settings can block app alerts.</BCardNote>
      </section>
      {d.recover ? <div className="b-card nd-confirm" role="group" aria-labelledby="nd-confirm-recover" tabIndex={-1} data-native-confirm>
        <h2 className="nd-confirm__t" id="nd-confirm-recover">Use alerts for this account?</h2>
        <p className="nd-text">Turn on app alerts for the account you are signed in to now? This replaces any previous account’s alert setup in this app. Your other devices stay the same.</p>
        <div className="nd-acts"><BButton kind="quiet" big full onClick={p.onKeep}>Keep current setup</BButton><BButton kind="teal" big full onClick={p.onRecover}>Turn on for this account</BButton></div>
      </div> : null}
      {d.review ? <div className="b-card nd-confirm" role="group" aria-labelledby="nd-confirm-off" tabIndex={-1} data-native-confirm>
        <h2 className="nd-confirm__t" id="nd-confirm-off">Turn off alerts here?</h2>
        <p className="nd-text">Turn off alerts for this account in this app? Your phone permission and other devices stay the same. An alert already queued by your phone may still appear.</p>
        <div className="nd-acts"><BButton kind="quiet" big full onClick={p.onKeep}>Keep current setup</BButton><button type="button" className="b-btn b-btn--big b-btn--full eb-btn-danger" onClick={p.onTurnOff}>Turn off alerts</button></div>
      </div> : null}
      {s.message ? <p className="b-note eb-callout" role="status">{s.message}</p> : null}
    </BStack>
  </BScreen>;
}
/** The phone app's Alerts page when the workplace hasn't made app alerts available (Direction B). */
export function NativeAlertsUnavailableB() {
    return <BScreen back>
    <BHero back={{ href: '/app/notifications', label: 'Notifications' }} title="Alerts" titleId="b-native-alerts-title"/>
    <BStack>
      <section className="b-card nd-card" aria-label="App alerts">
        <div className="b-card__h"><h2>This device</h2></div>
        <div className="nd-state"><Ring tone="grey"><BellSlashIcon size={28} weight="bold"/></Ring>
          <p className="nd-text">Your workplace has not made app alerts available. Your notifications remain in NEVORA.</p></div>
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
        const refresh = () => { if (!ended && document.visibilityState !== 'hidden' && document.hasFocus() && navigator.onLine !== false) {
            setPaused(false);
            void owner.start();
        } };
        const visibility = () => document.visibilityState === 'hidden' ? pause() : refresh();
        const end = () => { ended = true; owner.dispose(); setPaused(true); setReview(null); setRecover(false); };
        window.addEventListener('nevora:native-ready', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', refresh);
        window.addEventListener('blur', pause);
        window.addEventListener('pagehide', pause);
        window.addEventListener('offline', pause);
        window.addEventListener('online', refresh);
        window.addEventListener('nevora:signout', end);
        document.addEventListener('visibilitychange', visibility);
        refresh();
        return () => { owner.dispose(); client.current = null; window.removeEventListener('nevora:native-ready', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('pageshow', refresh); window.removeEventListener('blur', pause); window.removeEventListener('pagehide', pause); window.removeEventListener('offline', pause); window.removeEventListener('online', refresh); window.removeEventListener('nevora:signout', end); document.removeEventListener('visibilitychange', visibility); };
    }, []);
    const reviewing = review && review === snapshot.generation;
    useEffect(() => { if (reviewing || recover)
        { const confirm = find('[data-native-confirm]'); confirm?.focus(); confirm?.scrollIntoView({ block: 'center' }); } }, [reviewing, recover]); // eslint-disable-line react-hooks/exhaustive-deps -- find reads the current DOM
    useEffect(()=>{
        if(!actionPending.current||paused||['pending','loading'].includes(snapshot.state))return;
        actionPending.current=false;
        const heading=find('[data-native-status]');
        heading?.focus();heading?.scrollIntoView({block:'nearest'});
    },[snapshot.state,paused]); // eslint-disable-line react-hooks/exhaustive-deps -- find reads the current DOM
    const view = { snapshot, paused, review, recover,
        onEnable: () => { actionPending.current = true; void client.current?.enable(); },
        onRefresh: () => { void client.current?.start(); },
        onReview: () => { reviewOpener.current = 'off'; setRecover(false); setReview(snapshot.generation ?? null); },
        onReviewSetup: () => { reviewOpener.current = 'setup'; setReview(null); setRecover(true); },
        onRecover: () => { if (!recover || paused) return; actionPending.current = true; setRecover(false); void client.current?.enable(true); },
        onKeep: () => { setReview(null); setRecover(false); requestAnimationFrame(() => find(`[data-native-review-${reviewOpener.current}]`)?.focus()); },
        onTurnOff: () => { if (!reviewing || !review) return; actionPending.current = true; const expected = review; setReview(null); void client.current?.turnOff(expected); } };
    return page ? <><NativeDeviceSettingsB {...view}/><div ref={surface}><NativeDeviceSettingsView {...view}/></div></>
        : <div ref={surface}><NativeDeviceSettingsView {...view}/></div>;
}
