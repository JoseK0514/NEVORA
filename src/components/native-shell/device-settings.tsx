'use client';
import { useEffect, useRef, useState } from 'react';
import { NativeDeviceController, type NativeDeviceSnapshot } from '../../lib/native-shell/device-client';
import { nativeDeviceRuntime } from '../../lib/native-shell/device-runtime';
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
export function NativeDeviceSettingsView(p: Props) {
    const s = p.snapshot, busy = ['pending', 'loading'].includes(s.state), review = !!p.review && p.review === s.generation && !busy && !p.paused;
    const title = p.paused ? 'Device settings paused' : s.state === 'enabled' ? 'Alerts are on' : s.state === 'denied' ? 'Permission is blocked' : s.state === 'revoked' ? 'Device setup changed' : s.state === 'error' ? 'Setup needs a check' : s.state === 'unavailable' ? 'Alerts are unavailable' : busy ? 'Checking this device…' : 'Alerts are off';
    return <section className="c-card native-device-card" aria-label="App alerts" aria-busy={busy}>
  <div className="c-card__head"><h2 className="c-card__label">This device</h2></div>
  <div className="c-card__body">
   <h3 tabIndex={-1} data-native-status>{title}</h3>
   <p>{p.paused ? 'Return to NEVORA to check this account and device.' : s.state === 'enabled' ? 'The NEVORA app is set up for this account. Alerts also depend on workplace and phone settings.' : s.state === 'denied' ? 'Allow NEVORA notifications in your phone settings, then check again.' : s.state === 'revoked' ? 'The server and this app could not confirm the same setup. Review app setup or turn off the previous setup.' : busy ? 'Checking permission and this app’s enrollment…' : 'Get schedule changes, request answers and updates in the NEVORA app. Your phone may ask for notification permission.'}</p>
   {!busy && !p.paused ? <div className="c-btns c-btns--stack">
    {s.state === 'ready' ? <button type="button" className="c-btn" onClick={p.onEnable}>Turn on alerts</button> : null}
    <button type="button" className="c-btn c-btn--secondary" onClick={p.onRefresh}>Check again</button>
    {s.generation && !review ? <button type="button" className="c-btn c-btn--danger" data-native-review-off onClick={p.onReview}>Turn off alerts</button> : null}
    {['error', 'revoked'].includes(s.state) && !p.recover ? <button type="button" className="c-btn c-btn--secondary" data-native-review-setup onClick={p.onReviewSetup}>Review app setup</button> : null}
   </div> : null}
   {p.recover && !busy && !p.paused ? <div role="group" aria-label="Use this app for this account?" tabIndex={-1} data-native-confirm>
    <p>Turn on app alerts for the account you are signed in to now? This replaces any previous account’s alert setup in this app. Your other devices stay the same.</p>
    <div className="c-btns c-btns--stack"><button type="button" className="c-btn c-btn--secondary" onClick={p.onKeep}>Keep current setup</button><button type="button" className="c-btn" onClick={p.onRecover}>Turn on for this account</button></div>
   </div> : null}
   {review ? <div role="group" aria-label="Turn off alerts here?" tabIndex={-1} data-native-confirm>
    <p>Turn off alerts for this account in this app? Your phone permission and other devices stay the same. An alert already queued by your phone may still appear.</p>
    <div className="c-btns c-btns--stack"><button type="button" className="c-btn c-btn--secondary" onClick={p.onKeep}>Keep current setup</button><button type="button" className="c-btn c-btn--danger" onClick={p.onTurnOff}>Turn off alerts</button></div>
   </div> : null}
   <p className="c-note">Your notifications always stay in NEVORA. Your phone’s settings can block app alerts.</p>
   {s.message ? <p role="status">{s.message}</p> : null}
  </div>
 </section>;
}
export function NativeDeviceSettings() {
    const [snapshot, setSnapshot] = useState<NativeDeviceSnapshot>({ state: 'loading' }), [paused, setPaused] = useState(false), [review, setReview] = useState<string | null>(null), [recover, setRecover] = useState(false), client = useRef<NativeDeviceController | null>(null), surface = useRef<HTMLDivElement>(null);
    const actionPending=useRef(false),reviewOpener=useRef('off');
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
        surface.current?.querySelector<HTMLElement>('[data-native-confirm]')?.focus(); }, [reviewing, recover]);
    useEffect(()=>{
        if(!actionPending.current||paused||['pending','loading'].includes(snapshot.state))return;
        actionPending.current=false;
        const heading=surface.current?.querySelector<HTMLElement>('[data-native-status]');
        heading?.focus();heading?.scrollIntoView({block:'nearest'});
    },[snapshot.state,paused]);
    return <div ref={surface}><NativeDeviceSettingsView snapshot={snapshot} paused={paused} review={review} recover={recover}
        onEnable={()=>{actionPending.current=true;void client.current?.enable();}}
        onRefresh={()=>{void client.current?.start();}}
        onReview={()=>{reviewOpener.current='off';setRecover(false);setReview(snapshot.generation??null);}}
        onReviewSetup={()=>{reviewOpener.current='setup';setReview(null);setRecover(true);}}
        onRecover={()=>{if(!recover||paused)return;actionPending.current=true;setRecover(false);void client.current?.enable(true);}}
        onKeep={()=>{setReview(null);setRecover(false);requestAnimationFrame(()=>surface.current?.querySelector<HTMLElement>(`[data-native-review-${reviewOpener.current}]`)?.focus());}}
        onTurnOff={()=>{if(!reviewing||!review)return;actionPending.current=true;const expected=review;setReview(null);void client.current?.turnOff(expected);}}/></div>;
}
