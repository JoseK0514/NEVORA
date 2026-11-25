"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type MouseEvent, type RefObject } from 'react';
import { DeviceTabletIcon } from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { QuestionIcon } from '@phosphor-icons/react/dist/ssr/Question';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import type { ClockerDeviceView, ClockerLocationView, ClockerOwnerResult } from '../lib/clocker/views';
import { toast } from './toaster';
import { SettingsPageB } from '../app/app/settings/settings-b';
import './clocker-owner-page.css';
import { ButtonLabel, Field, FieldErrors, lockPageScroll, useFieldErrors } from '../app/app/settings/wave-c-form';
import { CorpButton } from './corp/corp';
import { QuietSheet } from './quiet/quiet-sheet';
import { BBusyLabel, BCallout, BCard, BChip, BIcon, BList, BSegsText, BState } from './owner-b/b-kit';
import { encodeQr, qrPath } from './access-recovery/qr';
import { setupLink } from './clocker-setup-link';
import { CLOCKER_DEVICE_UNCONFIRMED, clockerDeviceServerText, clockerOwnerCopy, clockerOwnerWhen, type ClockerOwnerCopy, type ClockerOwnerLang } from './clocker-owner-copy';
import './clocker-device-manager.css';
import './clocker-owner-b.css';
// Clocker UI step 2: the Inline radio rows are step 1's (clk-choice), so the two sheets draw the same choice.
import './team/clocker-location-access.css';

type Operation = 'REGISTER' | 'RENAME' | 'ROTATE' | 'REVOKE';
type Selection = { operation: Operation; device?: ClockerDeviceView };
type Ticket = { code: string; expiresAt: string; device: ClockerDeviceView; added: boolean };
const subscribe = () => () => {};
const needsSetup = (device: ClockerDeviceView) => device.state === 'UNREGISTERED' || device.state === 'PENDING' || device.state === 'EXPIRED';

/** What one tablet's row says: the exception as a chip (the normal state is plain grey words), then what and when.
 * Exported for its tests. The states are the server's: connected (ACTIVE), not set up yet (no code, a code that is still
 * good, a code that expired) and removed. A tablet whose location is inactive cannot be used, so the row says that. */
export function tabletLine(device: ClockerDeviceView, options: { place?: string; locationActive: boolean; timeZone: string; lang?: ClockerOwnerLang }) {
  const lang = options.lang ?? 'en', t = clockerOwnerCopy[lang];
  const when = (value: string) => clockerOwnerWhen(value, options.timeZone, lang);
  const place = options.place ?? t.locationUnavailable;
  if (device.state === 'REVOKED') return { tone: 'grey' as const, chip: null, sub: `${place} · ${t.removed}` };
  if (!options.locationActive) return { tone: 'amber' as const, chip: t.chipLocationInactive, sub: `${place} · ${t.locationOff}` };
  // Clocker UI step 2 (Option A, Jose, Nov 25): a connected tablet's line says how staff sign in on it, in place of
  // "Connected" (the row has no chip, so it is connected; the hidden count above the list still says it).
  if (device.state === 'ACTIVE') return { tone: 'grey' as const, chip: null, sub: `${place} · ${device.signInMode === 'NAME_PICKER' ? t.signInPicker : t.signInId} · ${device.lastSeenAt ? t.lastSeen(when(device.lastSeenAt)) : t.notUsedYet}` };
  if (device.state === 'PENDING') return { tone: 'amber' as const, chip: t.chipNotSetUp, sub: `${place} · ${device.enrollmentExpiresAt ? t.codeGoodUntil(when(device.enrollmentExpiresAt)) : t.noCodeYet}` };
  if (device.state === 'EXPIRED') return { tone: 'amber' as const, chip: t.chipCodeExpired, sub: `${place} · ${device.enrollmentExpiresAt ? t.codeExpired(when(device.enrollmentExpiresAt)) : t.codeExpiredPlain}` };
  return { tone: 'amber' as const, chip: t.chipNotSetUp, sub: `${place} · ${t.noCodeYet}` };
}

/** The setup code the server just issued, for the tablet to pick up (JR-26): a QR code of the kiosk link with the code in
 * its fragment, the three steps, how long it is good, Copy link, and the code itself behind Show code.
 *
 * The code is a credential. It lives in this component's props (the page's React state) from the server's answer until
 * the Owner taps Done, it expires, the tablet is removed or given a newer code, or the page goes away. While the card is
 * open it is also in the drawn QR path and in the "open its Clocker" link; the readable code is in the page only while
 * Show code is open. Copy puts it on the clipboard, which this page cannot clear. Nothing here logs or stores it. */
export function ClockerSetupTicket({ name, place, clockerKey, code, expiresAt, timeZone, added, onDone, lang = 'en', origin: givenOrigin }: {
  name: string; place: string; clockerKey: string; code: string; expiresAt: string; timeZone: string; added?: boolean; onDone: () => void; lang?: ClockerOwnerLang;
  /** For tests; the page reads its own origin. */ origin?: string;
}) {
  const t = clockerOwnerCopy[lang];
  const here = useSyncExternalStore(subscribe, () => window.location.origin, () => '');
  const origin = givenOrigin ?? here;
  const link = origin ? setupLink(origin, clockerKey, code) : '';
  const qr = useMemo(() => link ? encodeQr(link, 30) : null, [link]);
  const [shown, setShown] = useState(false);
  const [said, setSaid] = useState('');
  const codeField = useRef<HTMLTextAreaElement>(null);
  async function copy(text: string, done: string) {
    try { await navigator.clipboard.writeText(text); setSaid(done); }
    catch { setShown(true); setSaid(t.copyFailed); requestAnimationFrame(() => { codeField.current?.focus(); codeField.current?.select(); }); }
  }
  return <div className="ck-ticket">
    {added ? <p className="ck-step">{t.ticketStep}</p> : null}
    <h2 className="ck-ticket__t" id="clocker-code-title" tabIndex={-1}>{t.ticketTitle(name)}</h2>
    {/* Phase 8: the date and time it ends stay on one line ("Nov 18," / "12:15 AM" split on a phone). */}
    <p className="ck-ticket__s">{t.ticketWhere(place)} · {t.ticketValid(clockerOwnerWhen(expiresAt, timeZone, lang).replace(/ /g, '\u00A0'))}</p>
    <div className="ck-ticket__body">
      <div className="ck-qr">{qr
        ? <svg viewBox={`0 0 ${qr.size + 8} ${qr.size + 8}`} role="img" aria-label={t.qrLabel(name)} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="#FFFFFF" /><path d={qrPath(qr, 4)} fill="#111517" /></svg>
        : link ? <p className="ck-qr__none">{t.qrTooLong}</p> : <span className="ck-qr__wait" aria-hidden="true" />}</div>
      <div className="ck-ticket__how">
        <ol className="ck-steps" aria-label={t.ticketStepsLabel}>{t.ticketSteps.map((step, index) => <li key={step}><span className="ck-steps__n" aria-hidden="true">{index + 1}</span><span>{step}</span></li>)}</ol>
        <p className="ck-ticket__note">{t.ticketPrivate}</p>
      </div>
    </div>
    {shown ? <div className="ck-code">
      <label className="ck-code__l" htmlFor="clocker-setup-code">{t.codeLabel}</label>
      <textarea id="clocker-setup-code" ref={codeField} className="ck-code__v" value={code} readOnly rows={3} spellCheck={false} autoComplete="off" aria-describedby="clocker-setup-hint" onFocus={event => event.currentTarget.select()} />
      <p className="ck-code__h" id="clocker-setup-hint">{t.codeHelp(place)}</p>
    </div> : null}
    {/* Confirmations B (#23): one filled button (Done), Copy link as the white button, and the two rarely used ways
      (the readable code, opening Clocker on this device) as quiet links on one line above them. */}
    <div className="ck-ticket__links">
      <button type="button" className="b-btn b-btn--quiet ck-text" aria-expanded={shown} aria-controls="clocker-setup-code" onClick={() => setShown(value => !value)}>{shown ? t.hideCode : t.showCode}</button>
      {link ? <a className="b-btn b-btn--quiet ck-text" href={link} target="_blank" rel="noopener noreferrer">{t.openHere}</a> : null}
    </div>
    <div className="ck-ticket__acts">
      <button type="button" className="b-btn b-btn--ghost" disabled={!link} onClick={() => void copy(link, t.linkCopied)}>{t.copyLink}</button>
      {shown ? <button type="button" className="b-btn b-btn--ghost" onClick={() => void copy(code, t.codeCopied)}>{t.copyCode}</button> : null}
      <button type="button" className="b-btn b-btn--teal ck-ticket__done" onClick={onDone}>{t.ticketDone}</button>
    </div>
    <p role="status" className="ck-ticket__said">{said}</p>
  </div>;
}

type SignInMode = ClockerDeviceView['signInMode'];
export type SignInStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; mode: SignInMode } | { kind: 'failed'; message: string; refresh: boolean };
/** The form id the sign-in controls belong to: an empty form beside the tablet's options form, so a rename never carries
 * the sign-in fields and a sign-in save never carries the name. */
export const signInFormId = (deviceId: string) => `ck-signin-${deviceId}`;
/** The one request a sign-in change sends: exactly these four fields (the action refuses any other). */
export function signInModeForm(device: Pick<ClockerDeviceView, 'id' | 'version'>, mode: SignInMode) {
  const form = new FormData();
  form.set('operation', 'SET_SIGN_IN_MODE'); form.set('deviceId', device.id); form.set('expectedVersion', String(device.version)); form.set('signInMode', mode);
  return form;
}

/** Clocker UI step 2, Option A (Jose, Nov 25, 2026): "How staff sign in" in a tablet's options. Two Inline radio choices
 * (the step-1 look). Choosing the name picker shows the staff-only warning (amber BCallout) and turns the one teal action
 * into "Turn on name picker"; going back to Employee ID is a plain Save, with no warning. Only a connected tablet at an
 * active location can change; any other shows its sign-in read-only with one reason. The answer decides: the returned
 * tablet (its new version) replaces the old one in the list and in the sheet. A stale or unconfirmed answer locks the
 * choice behind one neutral title, the server's sentence and Reload (the screen reads `refresh`, never the words). */
/** One sign-in save: the four fields, the action's answer, and what the screen shows next. A refusal keeps the server's
 * sentence and whether a reload is needed; a request that never answered is not confirmed (never saved, never failed). */
export async function saveSignInMode(action: (form: FormData) => Promise<ClockerOwnerResult>, device: ClockerDeviceView, mode: SignInMode)
  : Promise<{ status: SignInStatus; device?: ClockerDeviceView }> {
  try {
    const result = await action(signInModeForm(device, mode));
    if (!result.ok) return { status: { kind: 'failed', message: result.error, refresh: result.refresh } };
    return { status: { kind: 'saved', mode: result.device.signInMode }, device: result.device };
  } catch { return { status: { kind: 'failed', message: CLOCKER_DEVICE_UNCONFIRMED, refresh: true } }; }
}

/** What the section draws for a given choice and status (exported for its tests). */
export function ClockerSignInView({ device, eligible, reason, t, lang, choice, status, onPick, onSave, resultRef }: {
  device: ClockerDeviceView; eligible: boolean; reason?: string; t: ClockerOwnerCopy; lang: ClockerOwnerLang;
  choice: SignInMode; status: SignInStatus; onPick(mode: SignInMode): void; onSave(): void; resultRef?: RefObject<HTMLDivElement | null>;
}) {
  const formId = signInFormId(device.id), saving = status.kind === 'saving', locked = status.kind === 'failed' && status.refresh;
  const changed = choice !== device.signInMode;
  const label = (mode: SignInMode) => mode === 'NAME_PICKER' ? t.signInPicker : t.signInId;
  if (!eligible) return <div className="clk ck-signin" data-readonly="">
    <p className="ck-signin__legend">{t.signInLegend}</p>
    <p className="ck-signin__now">{label(device.signInMode)}</p>
    {reason ? <p className="clk-hint">{reason}</p> : null}
  </div>;
  const choiceRow = (mode: SignInMode, line: string) => <label className="clk-choice">
    <input type="radio" form={formId} name="signInMode" value={mode} checked={choice === mode} onChange={() => onPick(mode)} />
    <span className="clk-choice__text">{label(mode)}<small>{line}</small></span>
  </label>;
  const warn = choice === 'NAME_PICKER' && changed && !locked;
  return <div className="clk ck-signin">
    <fieldset disabled={saving || locked} aria-describedby={warn ? `${formId}-warn` : undefined}>
      <legend className="ck-signin__legend">{t.signInLegend}</legend>
      {choiceRow('EMPLOYEE_ID', t.signInIdLine)}
      {choiceRow('NAME_PICKER', t.signInPickerLine)}
    </fieldset>
    {warn ? <BCallout tone="amber" icon="check" id={`${formId}-warn`} title={t.signInWarnTitle}>{t.signInWarnBody}</BCallout> : null}
    <div ref={resultRef} tabIndex={-1} className="clk-result">
      {status.kind === 'saved' ? <BCallout tone="green" title={t.signInSavedTitle} role="status">{status.mode === 'NAME_PICKER' ? t.signInSavedPicker(device.name) : t.signInSavedId(device.name)}</BCallout> : null}
      {status.kind === 'failed' ? <BCallout tone="amber" icon="unknown" title={t.signInCheckTitle} role="alert">{clockerDeviceServerText(status.message, lang)}</BCallout> : null}
    </div>
    {locked ? <button type="button" className="b-btn b-btn--teal b-btn--full ck-signin__go" onClick={() => window.location.reload()}>{t.signInReload}</button>
      : changed || saving ? <button type="button" className="b-btn b-btn--teal b-btn--full ck-signin__go" aria-busy={saving || undefined} onClick={onSave}>
        <BBusyLabel busy={saving} busyLabel={t.saving}>{choice === 'NAME_PICKER' ? t.signInTurnOn : t.signInSave}</BBusyLabel></button> : null}
  </div>;
}

/** Clocker UI step 2, Option A (Jose, Nov 25, 2026): "How staff sign in" in a tablet's options. Two Inline radio choices
 * (the step-1 look). Choosing the name picker shows the staff-only warning (amber BCallout) and turns the one teal action
 * into "Turn on name picker"; going back to Employee ID is a plain Save, with no warning. Only a connected tablet at an
 * active location can change; any other shows its sign-in read-only with one reason. The answer decides: the returned
 * tablet (its new version) replaces the old one in the list and in the sheet. A stale or unconfirmed answer locks the
 * choice behind one neutral title, the server's sentence and Reload (the screen reads `refresh`, never the words). */
export function ClockerSignIn({ device, eligible, reason, t, lang, action, onSaved }: {
  device: ClockerDeviceView; eligible: boolean; reason?: string; t: ClockerOwnerCopy; lang: ClockerOwnerLang;
  action(form: FormData): Promise<ClockerOwnerResult>; onSaved(device: ClockerDeviceView): void;
}) {
  const [choice, setChoice] = useState<SignInMode>(device.signInMode);
  const [status, setStatus] = useState<SignInStatus>({ kind: 'idle' });
  const busy = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (status.kind === 'saved' || status.kind === 'failed') resultRef.current?.focus({ preventScroll: false }); }, [status]);
  const locked = status.kind === 'failed' && status.refresh;
  async function save() {
    if (busy.current || choice === device.signInMode || locked) return;
    busy.current = true; setStatus({ kind: 'saving' });
    const next = await saveSignInMode(action, device, choice);
    busy.current = false;
    if (next.device) { onSaved(next.device); setChoice(next.device.signInMode); }
    setStatus(next.status);
  }
  const pick = (mode: SignInMode) => { if (status.kind === 'saving' || locked) return; setChoice(mode); if (status.kind !== 'idle') setStatus({ kind: 'idle' }); };
  return <ClockerSignInView device={device} eligible={eligible} reason={reason} t={t} lang={lang} choice={choice} status={status} onPick={pick} onSave={() => void save()} resultRef={resultRef} />;
}

/** Clocker tablets (Phase 6). The list of tablets with honest states, one tinted action and one quiet action per row,
 * adding a tablet in two steps (name and location, then the code for the tablet), and the sheet that renames, replaces or
 * removes one after saying what stops working. Every change still goes through the one server action; its answer decides
 * what the list shows. An answer that can't be confirmed is never shown as saved or as failed: the list is refreshed. */
export function ClockerDeviceManager({ initialDevices, locations, timeZone, action, shortNames = {}, lang = 'en' }: {
  initialDevices: ClockerDeviceView[]; locations: ClockerLocationView[]; timeZone: string;
  action(form: FormData): Promise<ClockerOwnerResult>;
  /** Each location's short name ("Condado") by id, as every other page names it; the full name when missing. */
  shortNames?: Record<string, string>;
  lang?: ClockerOwnerLang;
}) {
  const t: ClockerOwnerCopy = clockerOwnerCopy[lang];
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [devices, setDevices] = useState(initialDevices);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; refresh: boolean } | null>(null);
  const [notice, setNotice] = useState('');
  const [setup, setSetup] = useState<Ticket | null>(null);
  const sheetForm = useRef<HTMLFormElement>(null);
  const dismissed = useRef(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const setupCard = useRef<HTMLElement>(null);
  const errorBox = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const activeLocations = locations.filter(location => location.active);
  const connected = devices.filter(device => device.state === 'ACTIVE').length;
  const waiting = devices.filter(needsSetup).length;
  const revoked = devices.filter(device => device.state === 'REVOKED').length;
  const { errors, handlers, clear } = useFieldErrors({ name: { missing: t.nameMissing }, locationId: { missing: t.locationMissing } });
  const place = (id: string | undefined) => { const location = locations.find(item => item.id === id); return location ? shortNames[location.id] ?? location.name : undefined; };
  const locationActive = (device?: ClockerDeviceView) => !!locations.find(item => item.id === device?.locationId)?.active;

  useEffect(() => {
    if (!selection) return;
    // The sheet (QuietSheet) opens itself; a confirm that stops something working starts on Cancel, Add tablet on its
    // name. A tablet's options start on the sheet, so no keyboard rises over them.
    sheetForm.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
    const unlock = lockPageScroll();
    return unlock;
  }, [selection]);
  useEffect(() => {
    if (!setup) return;
    // The code leaves the page the moment it stops being good.
    const duration = Math.max(0, new Date(setup.expiresAt).getTime() - Date.now());
    const timeout = window.setTimeout(() => { setSetup(null); setNotice(t.ticketExpired); }, duration);
    return () => window.clearTimeout(timeout);
  }, [setup, t.ticketExpired]);
  useEffect(() => { if (setup) setupCard.current?.querySelector<HTMLElement>('#clocker-code-title')?.focus({ preventScroll: false }); }, [setup]);
  useEffect(() => { if (error) errorBox.current?.focus(); }, [error]);

  function open(next: Selection, event: MouseEvent<HTMLButtonElement>) {
    returnFocus.current = event.currentTarget;
    dismissed.current = false; setError(null); clear(); setSelection(next);
  }
  function close() {
    // Escape, a drag or a tap outside can close the sheet while a save is running: its answer then comes as a toast.
    if (busy.current) dismissed.current = true;
    const target = returnFocus.current;
    setSelection(null); setError(null);
    requestAnimationFrame(() => { if (target?.isConnected) target.focus({ preventScroll: true }); });
  }
  /** Done: a changed name saves (the same rename), otherwise the sheet closes. */
  function done() {
    const form = sheetForm.current, input = form?.elements.namedItem('name');
    if (form && selection?.device && input instanceof HTMLInputElement && input.value.trim() !== selection.device.name) form.requestSubmit();
    else close();
  }
  function closeTicket() { setSetup(null); setNotice(t.ticketClosed); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selection) return;
    if (!event.currentTarget.checkValidity()) return;
    // A tablet's options have one field, so Return in it submits: an unchanged name just closes, like Done.
    const name = event.currentTarget.elements.namedItem('name');
    if (selection.operation === 'RENAME' && selection.device && name instanceof HTMLInputElement && name.value.trim() === selection.device.name) { close(); return; }
    const form = new FormData(event.currentTarget);
    form.set('operation', selection.operation);
    if (selection.device) {
      form.set('deviceId', selection.device.id);
      form.set('expectedVersion', String(selection.device.version));
    }
    busy.current = true; setPending(true); setError(null);
    try {
      const result = await action(form);
      if (!result.ok) { if (dismissed.current) toast(result.refresh ? t.notConfirmedBody : result.error); setError({ message: result.error, refresh: result.refresh }); return; }
      setDevices(current => current.some(device => device.id === result.device.id)
        ? current.map(device => device.id === result.device.id ? result.device : device)
        : [...current, result.device]);
      setNotice('');
      // A newer code, or removing the tablet, ends an older code on screen.
      if (result.setup) setSetup({ ...result.setup, device: result.device, added: selection.operation === 'REGISTER' });
      else if (setup?.device.id === result.device.id && selection.operation === 'REVOKE') setSetup(null);
      else if (setup?.device.id === result.device.id) setSetup({ ...setup, device: result.device });
      // Phase 8: a new setup code is its own card, and focus moves to its title, so no toast says it again (a result drawn
      // inline sends no toast, Phase 7).
      // Confirmations B (#30): a removed tablet's row, in Removed, is the result; a toast would say it a second time
      // (the hidden status line above the list still reads the new counts). A sheet that was dismissed while the
      // removal ran keeps its toast: nothing else tells the Owner the answer arrived.
      if (!result.setup && (selection.operation !== 'REVOKE' || dismissed.current)) toast(selection.operation === 'RENAME' ? t.nameSaved : selection.operation === 'REVOKE' ? t.tabletRemoved : t.codeReady);
      busy.current = false;
      if (result.setup) { returnFocus.current = null; setSelection(null); setError(null); }
      else if (!dismissed.current) close();
    } catch { if (dismissed.current) toast(t.notConfirmedBody); setError({ message: t.notConfirmedBody, refresh: true }); }
    finally { busy.current = false; setPending(false); }
  }

  const ticketLocation = locations.find(location => location.id === setup?.device.locationId);
  const device = selection?.device;
  const firstSetup = !!device && needsSetup(device);
  const options = selection?.operation === 'RENAME';
  const rotateKind = device?.state === 'ACTIVE' ? 'replace' : device?.state === 'REVOKED' ? 'again' : 'code';
  const title = !selection ? '' : selection.operation === 'REGISTER' ? t.addTitle : options ? device?.name ?? ''
    : selection.operation === 'REVOKE' ? t.removeTitle(device?.name ?? '')
      : rotateKind === 'replace' ? t.replaceTitle(device?.name ?? '') : rotateKind === 'again' ? t.againTitle(device?.name ?? '') : t.codeTitle(device?.name ?? '');
  const body = !selection ? '' : selection.operation === 'REGISTER' ? t.addBody
    : options ? (firstSetup ? t.manageNotSetUp : device?.state === 'REVOKED' ? t.manageRemoved : t.manageAt(place(device?.locationId) ?? t.locationUnavailable))
      : selection.operation === 'REVOKE' ? t.removeBody : rotateKind === 'replace' ? t.replaceBody : rotateKind === 'again' ? t.againBody : t.codeBody;
  const submitLabel = !selection ? '' : selection.operation === 'REGISTER' ? t.addSubmit : options ? t.saveName : selection.operation === 'REVOKE' ? t.removeSubmit
    : rotateKind === 'replace' ? t.replaceSubmit : t.getCode;
  const rotate = () => { setError(null); setSelection({ operation: 'ROTATE', device: selection!.device }); };

  // Phase 2 (Settings part 2): the row's name is what it shows (its name and line), no aria-label that differs from it;
  // each action's name starts with its visible words ("Get setup code, Patio tablet").
  // One row per tablet (confirmations B; Jose: "organised"): a 36px lead, the name with its exception as the kit's status
  // label, the facts line, then ONE action in a fixed column (the white button) and the chevron. The row itself opens
  // the tablet's options (Manage): its button stretches over the row, and the action sits above it as its own target.
  // A removed tablet has no options, so its row is not a destination; its one action sets it up again.
  const row = (item: ClockerDeviceView) => {
    const active = locationActive(item), line = tabletLine(item, { place: place(item.locationId), locationActive: active, timeZone, lang });
    const removedRow = item.state === 'REVOKED';
    const go = removedRow
      ? <button type="button" className="b-btn b-btn--ghost ck-trow__go" data-clocker-device={item.id} aria-label={t.setUpAgainFor(item.name)} disabled={!hydrated || !active} onClick={event => open({ operation: 'ROTATE', device: item }, event)}>{t.setUpAgain}</button>
      : !active ? null : needsSetup(item)
        ? <button type="button" className="b-btn b-btn--ghost ck-trow__go" data-clocker-code={item.id} aria-label={item.state === 'UNREGISTERED' ? t.getCodeFor(item.name) : t.newCodeFor(item.name)} disabled={!hydrated} onClick={event => open({ operation: 'ROTATE', device: item }, event)}>{item.state === 'UNREGISTERED' ? t.getCode : t.newCode}</button> : null;
    const text = <span className="b-row__tx">
      <span className="b-row__t"><span className="b-row__tt">{item.name}</span>{line.chip ? <BChip tone="amber">{line.chip}</BChip> : null}</span>
      <span className="b-row__s"><BSegsText text={line.sub} /></span>
    </span>;
    const lead = <BIcon tone={line.tone === 'amber' ? 'amber' : item.state === 'ACTIVE' ? 'teal' : 'grey'}><DeviceTabletIcon weight="bold" /></BIcon>;
    return <li className="b-li" key={item.id}><div className="b-row ck-trow" data-open={removedRow ? undefined : ''} data-act={go ? '' : undefined}>
      {removedRow ? <div className="ck-trow__main">{lead}{text}</div>
        : <button type="button" className="ck-trow__main ck-trow__open" data-clocker-device={item.id} aria-haspopup="dialog" disabled={!hydrated} onClick={event => open({ operation: 'RENAME', device: item }, event)}>{lead}{text}</button>}
      <span className="ck-trow__act">{go}</span>
      {removedRow ? <span className="ck-trow__chev" aria-hidden="true" /> : <CaretRightIcon className="b-chev ck-trow__chev" size={16} weight="bold" aria-hidden="true" />}
    </div></li>;
  };

  const current = devices.filter(item => item.state !== 'REVOKED');
  const removed = devices.filter(item => item.state === 'REVOKED');
  const canAdd = hydrated && activeLocations.length > 0;
  // Phase 2 (Settings part 2): the Direction B page frame. The band is the title alone: what the tablets are for and that one
  // per location works best were lines shown on every visit (density rule 5); the list and its states say the rest.
  return <SettingsPageB lang={lang === 'es' ? 'es' : undefined} className="ck-owner ck-frame ck-tablets" back={{ href: '/app/settings', label: t.settings }} title={t.tabletsTitle} titleId="clocker-tablets-title">
    <div className="ck-stack">
      <p className="b-sr" role="status">{t.tabletsCount(connected, waiting, revoked)}</p>
      {notice ? <p className="ck-notice" role="status">{notice}</p> : null}
      {setup && ticketLocation ? <section className="b-card ck-ticketcard" aria-labelledby="clocker-code-title" ref={setupCard}>
        <ClockerSetupTicket name={setup.device.name} place={place(setup.device.locationId) ?? ticketLocation.name} clockerKey={ticketLocation.clockerKey} code={setup.code} expiresAt={setup.expiresAt} timeZone={timeZone} added={setup.added} onDone={closeTicket} lang={lang} />
      </section> : null}
      {!activeLocations.length ? <BCard label={t.noLocationTitle}><BState kind="paused" title={t.noLocationTitle} line={t.noLocationBody} action={{ label: t.goToLocations, href: '/app/settings/locations' }} /></BCard> : null}
      {current.length ? <BCard id="clocker-tablets" title={t.tabletsCard} count={current.length}>
        {/* Final fixes S2 (G85): adding is the "+ Add …" row every Settings list ends with (Locations, Positions, Breaks). */}
        <BList label={t.tabletsList}>{current.map(row)}
          <li className="b-li"><div className="b-row ck-trow ck-trow--add" data-open="">
            <button type="button" className="ck-trow__main ck-trow__open" data-clocker-add="" disabled={!canAdd} onClick={event => open({ operation: 'REGISTER' }, event)}>
              <BIcon tone="teal"><PlusIcon weight="bold" /></BIcon><span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{t.addTablet}</span></span></span>
            </button>
            <span className="ck-trow__act" /><span className="ck-trow__chev" aria-hidden="true" />
          </div></li>
        </BList>
      </BCard> : activeLocations.length ? <BCard label={t.emptyTitle}>
        <BState kind="empty" icon={<DeviceTabletIcon weight="bold" />} title={t.emptyTitle} line={t.emptyBody}>
          <button type="button" className="b-btn b-btn--teal" data-clocker-add="" disabled={!canAdd} onClick={event => open({ operation: 'REGISTER' }, event)}>{t.addFirstTablet}</button>
        </BState>
      </BCard> : null}
      {removed.length ? <BCard id="clocker-removed" title={t.removedCard} count={removed.length}><BList label={t.removedList}>{removed.map(row)}</BList></BCard> : null}
    </div>
    {/* The sheet keeps the Settings form styles it was built with (fields, the busy label swap), which are scoped to the
      Settings frame's class; the host draws no box of its own. */}
    <div className="wc-page ck-sheethost" style={{ display: 'contents' }}>
    <QuietSheet open={!!selection} onClose={close} labelledBy="clocker-dialog-title">
      {selection ? <form ref={sheetForm} noValidate onSubmit={submit} key={`${selection.operation}-${selection.device?.id ?? 'new'}`} aria-busy={pending} aria-describedby="clocker-dialog-text" className={`c-sheet c-tablet-sheet ck-sheet${selection.operation === 'REVOKE' ? ' ck-confirm' : ''}`} {...handlers}>
        {/* A tablet's options: its name centred, Done on the right (a changed name saves). A confirm (add, new code,
          replace, remove): Cancel on the left, the question centred, its one action below. */}
        <div className="c-sheet__nav">
          {/* Confirmations B (#13, #14): removing a tablet is a dialog (centred from 768px, a bottom sheet on phones) whose
            two answers sit together at its foot, so its header is the question alone. */}
          {options || selection.operation === 'REVOKE' ? <span aria-hidden="true" /> : <button type="button" className="c-sheet-head__l" disabled={pending} onClick={close}
            data-autofocus={selection.operation === 'ROTATE' && rotateKind === 'replace' ? '' : undefined}>{t.cancel}</button>}
          <h2 className="c-sheet__title" id="clocker-dialog-title">{title}</h2>
          {options ? <button type="button" className="c-sheet__done" disabled={pending} onClick={done}>{pending ? t.saving : t.done}</button> : <span aria-hidden="true" />}
        </div>
        {selection.operation === 'REGISTER' ? <p className="ck-step ck-step--sheet">{t.addStep}</p> : null}
        <p className="c-tablet-sheet__text" id="clocker-dialog-text">{body}</p>
        {selection.operation === 'ROTATE' && rotateKind === 'replace' ? <p className="c-tablet-sheet__text ck-sheet__signin">{t.replaceSignIn}</p> : null}
        <fieldset disabled={pending || Boolean(error?.refresh)} className="wc-fieldset c-tablet-sheet__fields">
          <FieldErrors errors={errors}>
            {selection.operation === 'REGISTER' || options ? <div className="wc-fields">
              <Field label={t.nameLabel} id="clocker-device-name" name="name" placeholder={t.namePlaceholder} defaultValue={device?.name ?? ''} required maxLength={80} autoComplete="off" enterKeyHint="done"
                help={t.nameHelp} data-autofocus={selection.operation === 'REGISTER' ? '' : undefined} />
              {selection.operation === 'REGISTER' ? <Field kind="select" label={t.locationLabel} id="clocker-device-location" name="locationId" required defaultValue={activeLocations.length === 1 ? activeLocations[0].id : ''}>
                <option value="" disabled>{t.locationChoose}</option>
                {activeLocations.map(location => <option key={location.id} value={location.id}>{shortNames[location.id] ?? location.name}</option>)}
              </Field> : null}
            </div> : null}
          </FieldErrors>
        </fieldset>
        {options && device && device.state !== 'REVOKED' ? <ClockerSignIn key={device.id} device={device} t={t} lang={lang} action={action}
          eligible={device.state === 'ACTIVE' && locationActive(device)}
          reason={needsSetup(device) ? t.signInNotSetUp : !locationActive(device) ? t.signInLocationOff : undefined}
          onSaved={saved => { setDevices(current => current.map(item => item.id === saved.id ? saved : item)); setSelection(current => current?.device?.id === saved.id ? { ...current, device: saved } : current); }} /> : null}
        {error ? <div ref={errorBox} role="alert" tabIndex={-1} className="ck-alert" data-tone={error.refresh ? 'amber' : 'red'}>
          {error.refresh ? <QuestionIcon size={18} weight="bold" aria-hidden="true" /> : <WarningCircleIcon size={18} weight="bold" aria-hidden="true" />}
          <span><b>{error.refresh ? t.notConfirmedTitle : t.notSavedTitle}</b>{error.refresh ? t.notConfirmedBody : error.message}</span>
        </div> : null}
        <p role="status" className="b-sr">{pending ? t.saving : ''}</p>
        <div className="c-tablet-sheet__actions">
          {error?.refresh ? <CorpButton full onClick={() => window.location.reload()}>{t.refreshTablets}</CorpButton>
            : options ? (device?.state === 'ACTIVE'
              ? <><CorpButton kind="secondary" full disabled={pending || !locationActive(device)} aria-describedby="clocker-replace-help" onClick={rotate}>{t.replaceTablet}</CorpButton><p className="ck-sheet__help" id="clocker-replace-help">{t.replaceHelp}</p></>
              : <CorpButton full disabled={pending || !locationActive(device)} onClick={rotate}>{firstSetup ? t.getCode : t.setUpAgain}</CorpButton>)
              : selection.operation === 'REVOKE' ? <div className="ck-confirm__acts">
                <button type="submit" className="b-btn ck-confirm__go" disabled={pending} aria-busy={pending || undefined}><ButtonLabel pending={pending} idle={submitLabel} busy={t.saving} /></button>
                <button type="button" className="b-btn b-btn--quiet ck-text ck-confirm__keep" data-autofocus="" disabled={pending} onClick={close}>{t.keepTablet}</button>
              </div>
              : <CorpButton type="submit" kind="primary" full disabled={pending}><ButtonLabel pending={pending} idle={submitLabel} busy={t.saving} /></CorpButton>}
          {options && device && device.state !== 'REVOKED' ? <><button type="button" className="c-tablet-sheet__remove" disabled={pending}
            onClick={() => { setError(null); setSelection({ operation: 'REVOKE', device }); }}>{t.removeTablet}</button><p className="ck-sheet__help">{t.pauseNote}</p></> : null}
        </div>
      </form> : null}
      {selection && options && device ? <form id={signInFormId(device.id)} className="ck-signin-form" noValidate onSubmit={event => event.preventDefault()} /> : null}
    </QuietSheet>
    </div>
  </SettingsPageB>;
}

/** The page when the tablets could not be read: the band, one state card, one retry. */
export function ClockerDevicesUnavailable({ lang = 'en' }: { lang?: ClockerOwnerLang }) {
  const t = clockerOwnerCopy[lang];
  return <SettingsPageB lang={lang === 'es' ? 'es' : undefined} className="ck-owner ck-frame ck-tablets" back={{ href: '/app/settings', label: t.settings }} title={t.tabletsTitle} titleId="clocker-tablets-title">
    <div className="ck-stack"><BCard label={t.loadFailedTitle}>
      <BState kind="failed" alert title={t.loadFailedTitle} line={t.loadFailedBody}>
        {/* A retry after a failed server read reloads the whole document so every read runs again, with or without JavaScript. */}
        {/* eslint-disable-next-line next-preserved/no-html-link-for-pages -- see above: a full reload, so every read runs again */}
        <a className="b-btn b-btn--teal" href="/app/settings/clocker">{t.tryAgain}</a>
      </BState>
    </BCard></div>
  </SettingsPageB>;
}
