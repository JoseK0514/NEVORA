"use client";
import {NativeDeviceSettings} from './native-shell/device-settings';
import {isPopoverOpen} from "./kit/popover-open";

import { useEffect, useRef, useState } from 'react';
import { AuthBrand } from './auth-brand';
import type { UserRole } from '../lib/domain';
import type { DeviceSetupState } from '../lib/notifications/device-state';
import { browserRuntime, DeviceController, observeController, type DeviceSnapshot } from '../lib/notifications/device-client';

type InstallEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type ContentProps = {
  state: DeviceSetupState; standalone: boolean | 'unknown'; ios: boolean; installPrompt: boolean; testAllowed: boolean; instructions: boolean; message?: string;
  onEnable(): void; onDismiss(): void; onInstructions(): void; onInstall(): void; onTurnOff(): void; onTest(): void; onRetry(): void;
};
const descriptions: Record<DeviceSetupState, string> = {
  loading: 'Checking this device…', unavailable: 'Notifications are unavailable in this browser or configuration. You can keep using NEVORA.',
  install: 'Open NEVORA from your Home Screen to set up notifications on this device.', ready: 'Enable notifications for schedule updates and requests on this device.',
  enabled: 'Notifications are enabled on this device.', denied: 'Notifications are blocked. Restore permission in your browser or device settings, then reopen NEVORA.',
  revoked: 'Browser notification access changed. Turn off the old enrollment, then check permission in your browser or device settings.',
  pending: 'Updating this device…', error: 'Device setup needs attention.', dismissed: 'Setup postponed. You can return here whenever you are ready.',
};
export function DeviceSetupContent(props: ContentProps) {
  const pending = props.state === 'loading' || props.state === 'pending';
  return <div className="portal-device-content" aria-busy={pending}>
    <AuthBrand />
    {/* Signature (phase 4): an example alert, shown only in the employee app's sheet. Decorative. */}
    <figure className="portal-device-example" aria-hidden="true"><span>N</span><span><b>NEVORA · Example</b><span><b>Your shift moved</b> Thursday is now 12:00 – 8:00 PM.</span></span><small>now</small></figure>
    {/* Release 1: Home Screen setup is for phones; the corporate shell hides these (.portal-device-install) on tablets and desktop. */}
    <h2 id="portal-device-title" className="portal-device-install">Keep NEVORA Handy</h2>
    <p className="portal-device-install">Add NEVORA to your Home Screen for quick access to your schedule.</p>
    {props.standalone === true ? <p className="portal-device-install">Opened as a standalone app.</p> : <>
      {props.standalone === 'unknown' ? <p className="portal-device-install">We cannot confirm whether this window is standalone.</p> : null}
      <div className="portal-device-actions portal-device-install">
        <button type="button" className="portal-device-button secondary" onClick={props.installPrompt ? props.onInstall : props.onInstructions}>{props.installPrompt ? 'Add to Home Screen' : 'Show install instructions'}</button>
      </div>
    </>}
    {props.instructions ? <p className="portal-device-instructions portal-device-install">{props.ios ? 'In Safari, use Share → Add to Home Screen. Enable “Open as Web App” if offered, then open NEVORA from the new icon.' : 'Open your browser menu and choose Install app or Add to Home Screen if available, then open NEVORA from the new icon.'} Reading these instructions does not install the app.</p> : null}
    <h3>Stay updated</h3>
    <p>Receive important schedule changes and reminders.</p>
    <p role="status">{descriptions[props.state]}</p>
    <div className="portal-device-actions">
      {props.state === 'ready' ? <button type="button" className="portal-device-button primary" onClick={props.onEnable}>Enable notifications</button> : null}
      {props.state === 'enabled' || props.state === 'revoked' || props.state === 'denied' || props.state === 'error' ? <button type="button" className="portal-device-button secondary" onClick={props.onTurnOff}>Turn off</button> : null}
      {props.state === 'enabled' && props.testAllowed ? <button type="button" className="portal-device-button primary" onClick={props.onTest}>Test notification</button> : null}
      {props.state === 'error' || props.state === 'denied' || props.state === 'unavailable' ? <button type="button" className="portal-device-button primary" onClick={props.onRetry}>Check again</button> : null}
      {pending ? <button type="button" className="portal-device-button primary" disabled>{props.state === 'loading' ? 'Checking…' : 'Updating…'}</button> : null}
      {!pending && ['ready', 'install', 'dismissed'].includes(props.state) ? <button type="button" className="portal-device-button secondary" onClick={props.onDismiss}>Not now</button> : null}
    </div>
    {props.message ? <p className="portal-device-message" role={props.state === 'error' ? 'alert' : 'status'}>{props.message}</p> : null}
  </div>;
}
export function NativePortalDeviceSetup({role}:{role:UserRole}) {
 return <div id="portal-device-settings" className="portal-device-settings" popover="auto" aria-label="Device settings" data-role={role}><div className="portal-device-heading"><strong>Device settings</strong><button type="button" className="portal-device-close c-done" popoverTarget="portal-device-settings" popoverTargetAction="hide">Done</button></div><NativeDeviceSettings/></div>;
}
export function PortalDeviceSetup({role}:{role:UserRole}) {
  const controller = useRef<DeviceController | null>(null);
  const popover = useRef<HTMLDivElement>(null);
  const popoverOpener = useRef<HTMLElement | null>(null);
  const installEvent = useRef<InstallEvent | null>(null);
  const offered = useRef(false);
  const [snapshot, setSnapshot] = useState<DeviceSnapshot | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [installMessage, setInstallMessage] = useState<string>();
  useEffect(() => {
    const client = new DeviceController(browserRuntime(), setSnapshot);
    controller.current = client;
    const dispose = observeController(client);
    void client.start();
    const beforeInstall = (event: Event) => { event.preventDefault(); installEvent.current = event as InstallEvent; setCanInstall(true); };
    const update = (event: MessageEvent) => {
      if (event.data?.version === 1 && event.data?.type === 'UPDATE_WAITING') setInstallMessage('An update is ready. Close NEVORA tabs and reopen when your work is saved.');
    };
    const visibility = () => { if (document.visibilityState === 'visible') void client.reconcile(); };
    const surface = popover.current;
    const toggle = (event: Event) => {
      const state = (event as ToggleEvent).newState;
      if (state === 'open') {
        client.reopen();
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          active.getAttribute('popovertarget') === 'portal-device-settings'
        ) {
          popoverOpener.current = active;
          requestAnimationFrame(() => {
            if (!isPopoverOpen(surface)) return;
            surface.querySelector<HTMLElement>('.portal-device-close')?.focus({ preventScroll: true });
          });
        } else {
          popoverOpener.current = null;
        }
        return;
      }
      const opener = popoverOpener.current;
      popoverOpener.current = null;
      if (!opener) return;
      requestAnimationFrame(() => {
        const active = document.activeElement;
        // Light dismissal can focus a different control before this frame.
        // Recover only stranded focus; preserve a visible outside destination.
        if (
          active instanceof HTMLElement &&
          active !== document.body && active !== document.documentElement &&
          !surface?.contains(active) && active.isConnected && active.getClientRects().length
        ) return;
        if (opener.isConnected && opener.getClientRects().length) {
          opener.focus({ preventScroll: true });
          return;
        }
        document.querySelector<HTMLElement>('.employee-more-trigger')?.focus({ preventScroll: true });
      });
    };
    surface?.addEventListener('toggle', toggle);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    navigator.serviceWorker?.addEventListener('message', update);
    return () => {
      dispose();
      controller.current = null;
      surface?.removeEventListener('toggle', toggle);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      navigator.serviceWorker?.removeEventListener('message', update);
    };
  }, []);
  useEffect(() => {
    if (offered.current || !snapshot || !['ready', 'install'].includes(snapshot.state)) return;
    offered.current = true;
    // Release 1: on a tablet or desktop the offer never opens by itself over the page (it opens from the sidebar's profile);
    // a desktop has no Home Screen to add to.
    if (window.matchMedia?.('(min-width: 768px)').matches) return;
    // A nonmodal offer uses the profile surface, without stealing active form focus.
    if (document.activeElement === document.body) popover.current?.showPopover();
  }, [snapshot]);
  function dismiss() {
    controller.current?.dismiss();
    if (!controller.current?.snapshot.message) popover.current?.hidePopover();
  }
  async function install() {
    const event = installEvent.current;
    if (!event) return;
    installEvent.current = null; setCanInstall(false);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setInstallMessage(choice.outcome === 'accepted' ? 'Browser install request accepted. Open NEVORA from its icon to confirm standalone use.' : 'Install postponed. You can use the browser menu later.');
    } catch { setInstallMessage('The browser install prompt is unavailable. Use the install instructions.'); setInstructions(true); }
  }
  return <div ref={popover} id="portal-device-settings" className="portal-device-settings" popover="auto" aria-labelledby="portal-device-title" data-role={role}>
    {/* Round 2 (R8): the kit sheet's header, the title centred and "Done" on the right (the × retired). */}
    <div className="portal-device-heading"><strong>Device settings</strong><button type="button" className="portal-device-close c-done" popoverTarget="portal-device-settings" popoverTargetAction="hide">Done</button></div>
    {snapshot ? <DeviceSetupContent state={snapshot.state} standalone={snapshot.standalone} ios={snapshot.capabilities.requiresStandalone} installPrompt={canInstall} testAllowed={snapshot.server.testAllowed} instructions={instructions} message={snapshot.message ?? installMessage}
      onEnable={() => { void controller.current?.enable(); }} onDismiss={dismiss} onInstructions={() => setInstructions(true)} onInstall={() => { void install(); }} onTurnOff={() => { void controller.current?.turnOff(); }} onTest={() => { void controller.current?.test(); }} onRetry={() => { void controller.current?.start(); }}/>
      : <p role="status">Checking this device…</p>}
  </div>;
}
