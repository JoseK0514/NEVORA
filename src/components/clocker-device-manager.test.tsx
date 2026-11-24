import * as rstestImportedActual0 from "react" with { rstest: 'importActual' };
import * as rstestImportedActual1 from "../app/app/settings/wave-c-form" with { rstest: 'importActual' };
// Clocker tablets (Phase 6): the list with honest states, the setup code as a QR code, adding a tablet in two steps, and
// the sheet that renames, replaces or removes one. The interaction tests drive the component's own handlers with hooks
// held here (the project has no DOM test environment). Fictional tablets only.
import { afterEach, beforeEach, describe, expect, it, rs } from '@rstest/core';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const hooks = rs.hoisted(() => ({ on: false, server: false, states: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => void | (() => void))[], s: 0, r: 0 }));
rs.mock('react', () => {
  const react = rstestImportedActual0;
  return { ...react,
    useState: (initial: unknown) => {
      if (!hooks.on) return react.useState(initial);
      const index = hooks.s++;
      if (!(index in hooks.states)) hooks.states[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [hooks.states[index], (next: unknown) => { hooks.states[index] = typeof next === 'function' ? (next as (old: unknown) => unknown)(hooks.states[index]) : next; }];
    },
    useRef: (initial: unknown) => { if (!hooks.on) return react.useRef(initial); const index = hooks.r++; return hooks.refs[index] ??= { current: initial }; },
    useEffect: (effect: () => void | (() => void), deps?: unknown[]) => { if (!hooks.on) return react.useEffect(effect, deps); hooks.effects.push(effect); },
    useSyncExternalStore: (subscribe: () => () => void, snapshot: () => unknown, server?: () => unknown) => {
      if (!hooks.on) return react.useSyncExternalStore(subscribe, snapshot, server);
      return hooks.server && server ? server() : snapshot();
    },
  };
});
const toast = rs.hoisted(() => rs.fn());
rs.mock('./toaster', () => ({ toast }));
rs.mock('../app/app/settings/wave-c-form', () => ({ ...rstestImportedActual1, lockPageScroll: () => () => {} }));
import { ClockerDeviceManager, ClockerDevicesUnavailable, ClockerSetupTicket, tabletLine } from './clocker-device-manager';
import { CorpButton } from './corp/corp';
import { QuietSheet } from './quiet/quiet-sheet';
import { BRow } from './owner-b/b-kit';
import { clockerOwnerCopy } from './clocker-owner-copy';
import { englishIn, wordsOf } from './clocker-owner-copy.testkit';
import type { ClockerDeviceView, ClockerLocationView, ClockerOwnerResult } from '../lib/clocker/views';

const locations: ClockerLocationView[] = [
  { id: 'main', name: 'Northside Café — Calle Loíza', clockerKey: 'calle-loiza', active: true },
  { id: 'old', name: 'Old Office', clockerKey: 'old', active: false },
];
const shortNames = { main: 'Calle Loíza' };
const device = (id: string, state: ClockerDeviceView['state'], locationId = 'main', extra: Partial<ClockerDeviceView> = {}): ClockerDeviceView => ({
  id, name: id, locationId, state, signInMode: 'EMPLOYEE_ID', version: 7, lastSeenAt: null, enrollmentExpiresAt: null, ...extra,
});
const render = (devices: ClockerDeviceView[], available = locations, lang: 'en' | 'es' = 'en') => renderToStaticMarkup(createElement(ClockerDeviceManager, {
  initialDevices: devices, locations: available, shortNames, timeZone: 'America/Puerto_Rico', action: rs.fn(), lang,
}));
const code = `nev_enr_${'ab'.repeat(32)}`;
const tablets: ClockerDeviceView[] = [
  { ...device('front', 'ACTIVE', 'main', { lastSeenAt: '2026-11-16T19:20:00.000Z' }), name: 'Front counter tablet' },
  { ...device('new', 'UNREGISTERED'), name: 'Patio tablet' },
  { ...device('waiting', 'PENDING', 'main', { enrollmentExpiresAt: '2026-11-17T20:05:00.000Z' }), name: 'Bar tablet' },
  { ...device('lapsed', 'EXPIRED', 'main', { enrollmentExpiresAt: '2026-11-16T20:05:00.000Z' }), name: 'Kitchen tablet' },
  { ...device('gone', 'REVOKED'), name: 'Back room tablet' },
];

describe('what each tablet’s row says', () => {
  const line = (item: ClockerDeviceView, locationActive = true) => tabletLine(item, { place: 'Calle Loíza', locationActive, timeZone: 'America/Puerto_Rico' });
  it('connected is the normal state: plain grey words, no chip, with when it was last used', () => {
    expect(line(tablets[0])).toEqual({ tone: 'grey', chip: null, sub: 'Calle Loíza · Connected · Last used Nov 16, 3:20 PM' });
    expect(line(device('x', 'ACTIVE')).sub).toBe('Calle Loíza · Connected · Not used yet');
  });
  it('not set up yet is the exception: an amber chip, and the code’s expiry when a code is out', () => {
    expect(line(tablets[1])).toEqual({ tone: 'amber', chip: 'Not set up', sub: 'Calle Loíza · No setup code yet' });
    expect(line(tablets[2])).toEqual({ tone: 'amber', chip: 'Not set up', sub: 'Calle Loíza · Setup code good until Nov 17, 4:05 PM' });
    expect(line(tablets[3])).toEqual({ tone: 'amber', chip: 'Code expired', sub: 'Calle Loíza · Setup code expired Nov 16, 4:05 PM' });
  });
  it('removed is grey, and a tablet whose location is inactive says it can’t be used', () => {
    expect(line(tablets[4])).toEqual({ tone: 'grey', chip: null, sub: 'Calle Loíza · Removed' });
    expect(line(tablets[0], false)).toEqual({ tone: 'amber', chip: 'Location inactive', sub: 'Calle Loíza · Can’t be used while its location is inactive' });
    expect(tabletLine(tablets[0], { locationActive: true, timeZone: 'UTC' }).sub).toContain('Location unavailable');
  });
  it('never shows a state name from the server', () => {
    for (const item of tablets) expect(JSON.stringify(line(item))).not.toMatch(/UNREGISTERED|PENDING|EXPIRED|ACTIVE|REVOKED/);
  });
});

describe('the page', () => {
  it('lists every tablet: current ones in one card with its count, removed ones in their own', () => {
    const html = render(tablets);
    expect(html).toContain('4 connected, 3 not set up, 1 removed'.replace('4 connected', '1 connected'));
    expect(html).toMatch(/Tablets<span class="b-pill">4<\/span>/);
    expect(html).toMatch(/Removed<span class="b-pill">1<\/span>/);
    for (const id of ['front', 'new', 'waiting', 'lapsed', 'gone']) expect(html).toContain(`data-clocker-device="${id}"`);
    // The exception is a chip; the normal state is not.
    expect(html.match(/b-chip b-chip--amber/g)).toHaveLength(3);
    expect(html).not.toContain('b-chip--green');
  });
  it('gives each row at most one tinted action and one quiet one, each naming its tablet', () => {
    const html = render(tablets);
    expect(html).toContain('aria-label="Get a setup code for Patio tablet"');
    expect(html).toContain('aria-label="Get a new setup code for Bar tablet"');
    expect(html).toContain('aria-label="Manage Front counter tablet"');
    expect(html).toContain('aria-label="Set up Back room tablet again"');
    // A connected tablet has no tinted action; one filled button on the page.
    expect(html.match(/data-clocker-code=/g)).toHaveLength(3);
    expect(html.match(/b-btn b-btn--teal/g)).toHaveLength(1);
    expect(html).toMatch(/<button type="button" class="b-btn b-btn--teal" data-clocker-add="" disabled="">Add tablet<\/button>/);
  });
  it('empty: says what a time clock tablet is and leads to adding one', () => {
    const html = render([]);
    expect(html).toContain('No time clock tablet yet');
    expect(html).toContain('A time clock tablet is a shared tablet at a location. Your team clocks in and out on it with their Employee ID and PIN.');
    expect(html).toMatch(/data-kind="empty"/);
    expect(html).toMatch(/data-clocker-add=""[^>]*>Add a tablet<\/button>/);
    expect(html).not.toContain('data-clocker-device=');
  });
  it('without an active location Add tablet waits and the page points to Locations', () => {
    const html = render([device('inactive', 'ACTIVE', 'old')], [locations[1]]);
    expect(html).toContain('No active location'); expect(html).toContain('href="/app/settings/locations"');
    expect(html).toContain('Location inactive');
    expect(html).toMatch(/data-clocker-add="" disabled=""/);
    // A tablet at an inactive location can be managed but not given a code.
    expect(html).not.toContain('data-clocker-code=');
  });
  it('withholds every action until its handler is hydrated', () => {
    const html = render(tablets);
    for (const tag of html.match(/<button\b[^>]*>/g) ?? []) expect(tag, tag).toContain('disabled=""');
  });
  it('escapes device and location values rather than inserting markup', () => {
    const html = render([{ ...device('unsafe', 'ACTIVE'), name: '<script>device</script>' }], [{ ...locations[0], id: 'x', name: '<img src=x>' }, locations[0]]);
    expect(html).not.toContain('<script>device'); expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;script&gt;device&lt;/script&gt;');
  });
  it('a failed read is one state card with one retry, never an empty list', () => {
    const html = renderToStaticMarkup(createElement(ClockerDevicesUnavailable));
    expect(html).toContain('Couldn’t load Clocker tablets'); expect(html).toContain('No tablets were changed.');
    expect(html).toMatch(/role="alert"/); expect(html.match(/href="\/app\/settings\/clocker"/g)).toHaveLength(1);
    expect(html).not.toContain('No time clock tablet yet');
  });
  it('Spanish: the list, the empty page and the failed page leak no English sentence', () => {
    for (const html of [render(tablets, locations, 'es'), render([], locations, 'es'), render([device('inactive', 'ACTIVE', 'old')], [locations[1]], 'es'), renderToStaticMarkup(createElement(ClockerDevicesUnavailable, { lang: 'es' }))])
      expect(englishIn(html)).toEqual([]);
    expect(render(tablets, locations, 'es')).toContain('Sin configurar');
    expect(render([], locations, 'es')).toContain('Añadir una tableta');
  });
});

describe('the issued setup code', () => {
  const ticket = (lang: 'en' | 'es' = 'en', added = true) => renderToStaticMarkup(createElement(ClockerSetupTicket, { name: 'Patio tablet', place: 'Calle Loíza', clockerKey: 'calle-loiza', code,
    expiresAt: '2026-11-17T20:05:00.000Z', timeZone: 'America/Puerto_Rico', added, onDone: rs.fn(), lang, origin: 'https://work.example.test' }));
  it('draws the kiosk link as a QR code, with the three steps and how long it is good', () => {
    const html = ticket();
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Setup code for Patio tablet, as a QR code"/);
    expect(html).toMatch(/<path d="M[0-9 Mhvz-]+" fill="#111517"/);
    expect(html).toContain('Step 2 of 2 · On the tablet'); expect(html).toContain('Connect Patio tablet');
    expect(html).toContain('Good until Nov 17, 4:05 PM. It works one time.');
    for (const step of clockerOwnerCopy.en.ticketSteps) expect(html).toContain(step);
    expect(html.match(/<li>/g)).toHaveLength(3);
  });
  it('carries the code only in the link’s fragment, and shows it in words only behind Show code', () => {
    const html = ticket();
    expect(html).toContain(`href="https://work.example.test/clocker/calle-loiza#setup=${code}"`);
    expect(html).not.toMatch(/\?[^"#]*setup=/); expect(html).not.toContain('?code=');
    // The readable code is not in the page until Show code is pressed: the one place it appears is that fragment.
    expect(html.split(code)).toHaveLength(2);
    expect(html).not.toContain('<textarea');
    expect(html).toMatch(/aria-expanded="false"[^>]*>Show code</);
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it('a later code for the same tablet is not "step 2"', () => {
    expect(ticket('en', false)).not.toContain('Step 2 of 2');
  });
  it('Spanish leaks no English sentence', () => {
    const html = ticket('es');
    expect(englishIn(html)).toEqual([]); expect(html).toContain('Conectar Patio tablet'); expect(wordsOf(html)).toContain('Sirve una sola vez.');
  });
});

describe('the sheet and the code, driven through the component’s handlers', () => {
  type Node = { type: unknown; props: Record<string, unknown> };
  const isNode = (value: unknown): value is Node => !!value && typeof value === 'object' && 'type' in value && 'props' in value;
  // Walk every element-valued prop (a row's actions live in its `trail`).
  function all(value: unknown): Node[] {
    if (Array.isArray(value)) return value.flatMap(all);
    if (!isNode(value)) return [];
    return [value, ...Object.values(value.props).flatMap(child => all(child))];
  }
  const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node)
    : isNode(node) ? (node.props.idle as string | undefined) ?? text(node.props.children) : '';
  const isButton = (node: Node) => node.type === 'button' || node.type === CorpButton;
  const focused: string[] = [];
  const handle = (node: Node) => ({ node, focus: () => { focused.push((node.props['aria-label'] as string) ?? text(node)); } });
  class FakeInput { constructor(public value: string) {} }
  class FakeFormData { private values = new Map<string, string>(); constructor(form?: { fields?: Record<string, string> }) { for (const [key, value] of Object.entries(form?.fields ?? {})) this.values.set(key, value); }
    set(key: string, value: string) { this.values.set(key, value); } get(key: string) { return this.values.get(key) ?? null; } keys() { return this.values.keys(); } }
  let nameValue = '';
  const requestSubmit = rs.fn();
  const fakeForm = {
    querySelector: (selector: string) => {
      const match = selector === '[data-autofocus]' ? all(tree).find(node => node.props['data-autofocus'] !== undefined) : undefined;
      return match ? handle(match) : null;
    },
    elements: { namedItem: (name: string) => name === 'name' ? new FakeInput(nameValue) : null },
    requestSubmit,
  };
  let tree: unknown;
  let devices: ClockerDeviceView[] = [];
  let available = locations;
  let action: ReturnType<typeof rs.fn<(form: FormData) => Promise<ClockerOwnerResult>>>;
  function draw() {
    hooks.s = 0; hooks.r = 0; hooks.effects = [];
    tree = ClockerDeviceManager({ initialDevices: devices, locations: available, shortNames, timeZone: 'America/Puerto_Rico', action });
    return all(tree);
  }
  const settle = () => { draw(); hooks.effects[0]?.(); return draw(); };
  const find = (label: string) => draw().find(node => isButton(node) && (node.props['aria-label'] === label || text(node) === label));
  const button = (label: string) => {
    const found = find(label);
    if (!found) throw Error(`No button “${label}”`);
    return found.props as { disabled?: boolean; onClick: (event: unknown) => void; className?: string; kind?: string; type?: string };
  };
  const has = (label: string) => !!find(label);
  /** The sheet's own submit (a row can carry a button with the same words). */
  const sheetSubmit = () => all(draw().find(node => node.type === 'form')).find(node => isButton(node) && node.props.type === 'submit')!;
  const row = { focus: rs.fn(), isConnected: true };
  const press = (label: string) => { button(label).onClick({ currentTarget: row }); return settle(); };
  const sheet = () => { const nodes = draw(); return { title: text(nodes.find(node => node.props.id === 'clocker-dialog-title')), body: text(nodes.find(node => node.props.id === 'clocker-dialog-text')),
    open: !!nodes.find(node => node.type === 'form'), sheetOpen: nodes.find(node => node.type === QuietSheet)?.props.open }; };
  const submit = async (fields: Record<string, string> = {}) => {
    const form = draw().find(node => node.type === 'form')!;
    await (form.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {}, currentTarget: { checkValidity: () => true, elements: { namedItem: (name: string) => name === 'name' && 'name' in fields ? new FakeInput(fields.name) : null }, fields } });
    return draw();
  };
  const ticket = () => draw().find(node => node.type === ClockerSetupTicket);
  const inState = (value: string) => JSON.stringify(hooks.states).includes(value);
  beforeEach(() => {
    hooks.on = true; hooks.server = false; hooks.states = []; hooks.refs = [{ current: fakeForm }]; focused.length = 0; row.focus.mockClear(); requestSubmit.mockClear(); toast.mockClear();
    devices = tablets; available = locations; nameValue = ''; action = rs.fn();
    rs.stubGlobal('requestAnimationFrame', (callback: () => void) => { callback(); return 0; });
    rs.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
    rs.stubGlobal('HTMLInputElement', FakeInput);
    rs.stubGlobal('FormData', FakeFormData);
  });
  afterEach(() => { hooks.on = false; rs.unstubAllGlobals(); });

  it('Add a tablet is step 1 of 2: a name and a location, then the code for the tablet as step 2', async () => {
    press('Add tablet');
    expect(sheet()).toMatchObject({ title: 'Add a tablet', open: true, sheetOpen: true });
    expect(text(draw().find(node => node.props.className === 'ck-step ck-step--sheet'))).toBe('Step 1 of 2 · Name and location');
    expect(sheet().body).toBe('Name the tablet and choose where it will be. A tablet can’t change location later.');
    // The name takes focus; the submit is the sheet's one filled action.
    expect(focused).toEqual(['']);
    expect(text(sheetSubmit())).toBe('Get setup code'); expect(sheetSubmit().props.kind).toBe('primary');
    const added = { ...device('added', 'PENDING', 'main', { enrollmentExpiresAt: '2026-11-17T20:05:00.000Z' }), name: 'Deck tablet' };
    action.mockResolvedValue({ ok: true, device: added, setup: { code, expiresAt: '2030-01-01T00:00:00.000Z' } });
    await submit({ name: 'Deck tablet', locationId: 'main' });
    const sent = action.mock.calls[0][0] as unknown as FakeFormData;
    expect([...sent.keys()].sort()).toEqual(['locationId', 'name', 'operation']); expect(sent.get('operation')).toBe('REGISTER');
    expect(sheet().open).toBe(false);
    expect(ticket()?.props).toMatchObject({ name: 'Deck tablet', place: 'Calle Loíza', clockerKey: 'calle-loiza', code, added: true });
    // The code is its own card and takes focus: no toast repeats it (Phase 8).
    expect(toast).not.toHaveBeenCalled();
    expect(draw().some(node => node.props['data-clocker-device'] === 'added')).toBe(true);
  });

  it('the code leaves the page when the Owner taps Done, and when the tablet is removed', async () => {
    action.mockResolvedValue({ ok: true, device: { ...tablets[1], state: 'PENDING', enrollmentExpiresAt: '2030-01-01T00:00:00.000Z' }, setup: { code, expiresAt: '2030-01-01T00:00:00.000Z' } });
    press('Get a setup code for Patio tablet');
    expect(sheet().title).toBe('Get a setup code for Patio tablet?'); expect(sheet().body).toBe('Any earlier setup code for this tablet stops working.');
    await submit();
    expect(ticket()?.props).toMatchObject({ code, added: false }); expect(inState(code)).toBe(true);
    (ticket()!.props.onDone as () => void)(); draw();
    expect(ticket()).toBeUndefined(); expect(inState(code)).toBe(false);
    expect(text(draw().find(node => node.props.className === 'ck-notice'))).toBe('Setup code closed.');
    // Issue again, then remove the tablet: the code goes with it.
    press('Get a new setup code for Patio tablet'); await submit(); expect(inState(code)).toBe(true);
    action.mockResolvedValue({ ok: true, device: { ...tablets[1], state: 'REVOKED' } });
    press('Manage Patio tablet'); button('Remove tablet').onClick({}); settle(); await submit();
    expect(ticket()).toBeUndefined(); expect(inState(code)).toBe(false);
    // Confirmations B (#30): the row in Removed is the result, so no toast says it a second time.
    expect(toast).not.toHaveBeenCalledWith('Tablet removed. Its time records are kept.');
  });

  it('the code leaves the page the moment it expires', async () => {
    const timers: (() => void)[] = [];
    rs.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout: (fn: () => void) => { timers.push(fn); return 1; }, clearTimeout() {} }));
    action.mockResolvedValue({ ok: true, device: { ...tablets[1], state: 'PENDING' }, setup: { code, expiresAt: '2030-01-01T00:00:00.000Z' } });
    press('Get a setup code for Patio tablet'); await submit();
    hooks.effects[1]?.(); expect(timers).toHaveLength(1);
    timers[0](); draw();
    expect(ticket()).toBeUndefined(); expect(inState(code)).toBe(false);
    expect(text(draw().find(node => node.props.className === 'ck-notice'))).toBe('The setup code expired. Get a new one from the tablet’s row.');
  });

  it('Manage: the tablet’s name, Done on the right, Replace as the secondary action and Remove as quiet red text', () => {
    press('Manage Front counter tablet');
    expect(sheet()).toMatchObject({ title: 'Front counter tablet', body: 'At Calle Loíza.', open: true });
    // No field takes focus, so no keyboard rises over the sheet.
    expect(focused).toEqual([]);
    for (const label of ['Done', 'Replace tablet', 'Remove tablet']) expect(button(label).disabled, label).toBeFalsy();
    expect(button('Replace tablet').kind).toBe('secondary');
    expect(button('Remove tablet').className).toBe('c-tablet-sheet__remove');
    // Pausing has no switch: the sheet says how to stop a tablet for a while.
    expect(text(tree)).toContain('To stop a tablet for a while, remove it. You can set it up again with a new code.');
  });

  it('Done saves a changed name through the same form, and only closes when the name is unchanged', () => {
    press('Manage Front counter tablet');
    nameValue = 'Front counter tablet';
    button('Done').onClick({}); draw();
    expect(requestSubmit).not.toHaveBeenCalled(); expect(sheet().open).toBe(false); expect(row.focus).toHaveBeenCalledTimes(1);
    press('Manage Front counter tablet');
    nameValue = 'Counter tablet';
    button('Done').onClick({}); draw();
    expect(requestSubmit).toHaveBeenCalledTimes(1); expect(sheet().open).toBe(true);
  });

  it('Replace and Remove say what stops working, start on Cancel, and Cancel returns to the row', () => {
    press('Manage Front counter tablet');
    button('Replace tablet').onClick({}); settle();
    expect(sheet().title).toBe('Replace Front counter tablet?');
    expect(sheet().body).toContain('stops working right away'); expect(sheet().body).toContain('Time already recorded stays.');
    expect(has('Replace and get code')).toBe(true);
    expect(focused.at(-1)).toBe('Cancel');
    button('Cancel').onClick({}); draw();
    expect(sheet()).toMatchObject({ open: false, sheetOpen: false }); expect(row.focus).toHaveBeenCalledTimes(1);

    press('Manage Front counter tablet');
    button('Remove tablet').onClick({}); settle();
    expect(sheet().title).toBe('Remove Front counter tablet?');
    expect(sheet().body).toBe('Clocking in and out on this tablet stops right away, and any setup code for it stops working. Time already recorded stays. You can set it up again later.');
    // Confirmations B (#13, #14): the confirm's two answers sit together at its foot: the red-edged commit and the
    // quiet way out, which is where it starts.
    expect(button('Remove tablet').className).toContain('ck-confirm__go'); expect(button('Remove tablet').type).toBe('submit');
    expect(has('Cancel')).toBe(false);
    expect(focused.at(-1)).toBe('Keep tablet');
    button('Keep tablet').onClick({}); draw();
    expect(sheet().open).toBe(false); expect(row.focus).toHaveBeenCalledTimes(2);
  });

  it('a removed tablet offers Set up again and nothing else', () => {
    press('Set up Back room tablet again');
    expect(sheet().title).toBe('Set up Back room tablet again?'); expect(sheet().body).toBe('You get a new setup code for the same location.');
    expect(has('Remove tablet')).toBe(false); expect(text(sheetSubmit())).toBe('Get setup code');
  });

  it('an answer that can’t be confirmed is amber "Not confirmed" with one refresh: never saved, never failed', async () => {
    action.mockResolvedValue({ ok: false, error: 'We could not confirm the update. Refresh Devices before trying again.', refresh: true });
    press('Manage Front counter tablet'); await submit({ name: 'Counter tablet' });
    const alert = draw().find(node => node.props.role === 'alert')!;
    expect(alert.props['data-tone']).toBe('amber');
    expect(text(alert)).toBe('Not confirmedWe don’t know if this was saved. Refresh the list to see what the tablet looks like now, then try again if you need to.');
    expect(text(alert)).not.toMatch(/failed|Refresh Devices/);
    expect(has('Refresh the list')).toBe(true); expect(has('Replace tablet')).toBe(false);
    expect(toast).not.toHaveBeenCalled();
    // The list still shows the old name: nothing is presented as saved.
    expect(draw().some(node => node.type === BRow && node.props.title === 'Counter tablet')).toBe(false);
    // A thrown request is the same state.
    hooks.states = []; hooks.refs = [{ current: fakeForm }]; action.mockRejectedValue(new Error('network'));
    press('Manage Front counter tablet'); await submit({ name: 'Counter tablet' });
    expect(draw().find(node => node.props.role === 'alert')!.props['data-tone']).toBe('amber');
  });

  it('a definite refusal is red "Not saved" with the server’s reason, and the sheet stays for another try', async () => {
    action.mockResolvedValue({ ok: false, error: 'Device name must contain 1–80 printable characters.', refresh: false });
    press('Manage Front counter tablet'); await submit({ name: 'Counter tablet' });
    const alert = draw().find(node => node.props.role === 'alert')!;
    expect(alert.props['data-tone']).toBe('red'); expect(text(alert)).toBe('Not savedDevice name must contain 1–80 printable characters.');
    expect(sheet().open).toBe(true); expect(has('Refresh the list')).toBe(false);
  });

  it('Escape (the sheet’s own close) closes without saving and returns focus to the row', () => {
    press('Manage Front counter tablet');
    const panel = draw().find(node => node.type === QuietSheet)!;
    (panel.props.onClose as () => void)();
    expect(sheet().open).toBe(false); expect(requestSubmit).not.toHaveBeenCalled(); expect(row.focus).toHaveBeenCalledTimes(1);
  });

  it('a tablet at an inactive location keeps Done and Remove, cannot be replaced, and Add tablet waits for a location', () => {
    devices = [{ ...device('old-tablet', 'ACTIVE', 'old'), name: 'Old tablet' }]; available = [locations[1]];
    expect(button('Add tablet').disabled).toBe(true);
    press('Manage Old tablet');
    expect(button('Replace tablet').disabled).toBe(true);
    expect(button('Done').disabled).toBeFalsy();
    expect(button('Remove tablet').disabled).toBeFalsy();
  });

  it('before hydration no button can be pressed, so no sheet can open', () => {
    hooks.server = true;
    for (const label of ['Manage Front counter tablet', 'Get a setup code for Patio tablet', 'Set up Back room tablet again', 'Add tablet']) expect(button(label).disabled, label).toBe(true);
    expect(draw().some(node => node.type === 'form')).toBe(false);
  });
});
