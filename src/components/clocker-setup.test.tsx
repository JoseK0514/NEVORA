import * as clockerCopyActual from "./clocker-copy" with { rstest: "importActual" };
import * as rstestImportedActual0 from "react" with { rstest: 'importActual' };
import * as rstestImportedActual1 from "./clocker-language" with { rstest: 'importActual' };
// The kiosk's setup screen (Phase 6, JR-26): the first-time screen in both languages, the code that arrives in the
// Owner's link, and each answer. The interaction tests drive the component's own handlers with hooks held here (the
// project has no DOM test environment); the enrolment calls are the ones the screen has always made.
import {afterEach, beforeEach, describe, expect, it, rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';

const hooks = rs.hoisted(() => ({on: false, locale: 'en' as 'en' | 'es', states: [] as unknown[], refs: [] as {current: unknown}[], effects: [] as (() => void | (() => void))[], s: 0, r: 0}));
rs.mock('react', () => {
  const react = rstestImportedActual0;
  return {...react,
    useState: (initial: unknown) => {
      if (!hooks.on) return react.useState(initial);
      const index = hooks.s++;
      if (!(index in hooks.states)) hooks.states[index] = typeof initial === 'function' ? (initial as () => unknown)() : initial;
      return [hooks.states[index], (next: unknown) => {hooks.states[index] = typeof next === 'function' ? (next as (old: unknown) => unknown)(hooks.states[index]) : next;}];
    },
    useRef: (initial: unknown) => {if (!hooks.on) return react.useRef(initial); const index = hooks.r++; return hooks.refs[index] ??= {current: initial};},
    useEffect: (effect: () => void | (() => void), deps?: unknown[]) => {if (!hooks.on) return react.useEffect(effect, deps); hooks.effects.push(effect);},
    useCallback: (fn: unknown, deps: unknown[]) => hooks.on ? fn : react.useCallback(fn as () => void, deps),
  };
});
rs.mock('./clocker-language', () => {
  const real = rstestImportedActual1;
  const {CLOCKER_BUTTON_NAMES,clockerKeepNames,clockerText} = clockerCopyActual;
  return {...real, useClockerPresentation: () => hooks.on ? { locale: hooks.locale } : real.useClockerPresentation(), useClockerCopy: () => hooks.on ? (key: string, params?: Record<string, string | number>) => clockerText(hooks.locale, key, params) : real.useClockerCopy(),useClockerKeepNames:()=>hooks.on?(sentence:string)=>clockerKeepNames(sentence,CLOCKER_BUTTON_NAMES.map(name=>clockerText(hooks.locale,name))):real.useClockerKeepNames()};
});
import {ClockerSetup, SETUP_WELCOME_MS} from './clocker-setup';
import {ClockerPinGate} from './clocker-pin-gate';
import {ClockerShell} from './clocker-shell';
import {ClockerText} from './clocker-language';
import {CLOCKER_COPY, clockerText} from './clocker-copy';

const code = `nev_enr_${'ab'.repeat(32)}`;
type Node = {type: unknown; props: Record<string, unknown>};
const isNode = (value: unknown): value is Node => !!value && typeof value === 'object' && 'type' in value && 'props' in value;
function all(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(all);
  if (!isNode(value)) return [];
  return [value, ...all(value.props.children)];
}
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node)
  : isNode(node) ? node.type === ClockerText ? clockerText(hooks.locale, String(node.props.text)) : text(node.props.children) : '';

describe('first paint (no hooks driven)', () => {
  const props = {locationKey: 'calle-loiza', locationLabel: 'Calle Loíza', timeZone: 'America/Puerto_Rico'};
  it('English: what this tablet will be, the three steps, the code field and one filled button', () => {
    const html = renderToStaticMarkup(<ClockerSetup {...props} />);
    expect(html).toContain('Set up this tablet');
    // Phase 8 (#20): the location reads as one name, its words kept on one line.
    expect(html).toContain('This tablet becomes this location’s time clock.');
    expect(html.match(/<li>/g)).toHaveLength(3);
    expect(html).toContain('Point this tablet’s camera at the code, or type the code below.');
    expect(html).toMatch(/<textarea[^>]*name="enrollmentToken"/);
    expect(html.match(/data-kind="primary"/g)).toHaveLength(1);
    // The field is a plain text area with no autofill, capitals or spelling help, and its help line is tied to it.
    expect(html).toMatch(/<textarea[^>]*autoComplete="off"[^>]*autoCapitalize="none"[^>]*spellCheck="false"[^>]*aria-describedby="clocker-setup-help"/);
    expect(html).toContain('id="clocker-setup-help"');
  });
  it('Spanish: the same screen with no English sentence left in it', () => {
    const html = renderToStaticMarkup(<ClockerSetup {...props} initialLocale="es" />);
    for (const line of ['Configura esta tableta', 'Tu equipo usará esta tableta para marcar en esta localidad.', 'El dueño añade esta tableta y obtiene su código de configuración.', 'Código de configuración', 'Revisando configuración…'])
      expect(html).toContain(line);
    for (const english of ['Set up this tablet', 'Setup code', 'time clock for', 'Connect tablet', 'How to set it up', 'One-time setup']) expect(html).not.toContain(english);
    expect(html).toContain('lang="es"');
  });
  it('every sentence the screen can say has its Spanish line', () => {
    for (const key of ['Setup code received', 'Type a code instead', 'Connecting…', 'Setup not confirmed', 'No connection', 'This tablet is connected to {location}', 'Open the time clock',
      'This tablet is offline. Connect it to Wi-Fi, then try again.', 'That link doesn’t have a complete setup code. Type the code from Owner Settings.', 'Enter the whole setup code the Owner sees in Settings\u00a0→ Clocker\u00a0tablets.',
      'This setup code is expired, already used, or for another location. Ask the Owner for a new code.', 'New tablet setup is paused. Use an already registered tablet to finish an existing shift.', 'Allow cookies, then start tablet setup again.']) {
      expect(CLOCKER_COPY[key], key).toBeTruthy(); expect(CLOCKER_COPY[key]).not.toBe(key);
    }
    expect(clockerText('es', 'This tablet is connected to {location}', {location: 'Calle Loíza'})).toBe('Esta tableta quedó conectada a Calle Loíza');
    // Phase 8 (#14): one verb for the tablet in each language, on the button, the band and the answers.
    expect(clockerText('es', 'Connect tablet')).toBe('Conectar tableta'); expect(clockerText('es', 'Tablet connected')).toBe('Tableta conectada');
    expect(Object.values(CLOCKER_COPY).join(' ')).not.toMatch(/Registrar tableta|Tableta registrada|registrarla/);
  });
});

describe('the setup code from the Owner’s link, and each answer', () => {
  const sent: {step: string; enrollmentToken?: string}[] = [];
  const urls: string[] = [];
  let answers: Record<string, {status: number; body: unknown} | 'abort'>;
  let location: {hash: string; pathname: string; search: string};
  const replaced: string[] = [];
  let listeners: Record<string, (() => void)[]>;
  let online = true;
  const input = {value: '', focus: rs.fn()};
  let tree: unknown;
  function draw() {
    hooks.s = 0; hooks.r = 0; hooks.effects = [];
    const shell = (ClockerSetup({locationKey: 'calle-loiza', locationLabel: 'Calle Loíza', timeZone: 'America/Puerto_Rico', pinEnabled: true, punchEnabled: true}) as unknown as Node).props.children as Node;
    // ClockerSetup wraps the body in the language provider; call the body it renders.
    tree = (shell.type as (props: unknown) => unknown)(shell.props);
    return all(tree);
  }
  const view = () => all(tree).find(node => node.props['data-clocker-setup'])?.props['data-clocker-setup'];
  const shellStatus = () => (tree as Node).props.status;
  const words = () => text(tree);
  const form = () => all(tree).find(node => node.type === 'form');
  const flush = async () => {for (let i = 0; i < 12; i++) await Promise.resolve();};
  async function mount() {draw(); for (const effect of hooks.effects.slice(0, 2)) effect(); await flush(); draw();}
  async function connect() {await (form()!.props.onSubmit as (event: {preventDefault(): void}) => Promise<void>)({preventDefault() {}}); await flush(); draw();}
  const button = (label: string) => all(tree).find(node => node.type === 'button' && text(node) === label);
  const held = () => JSON.stringify(hooks.states).includes(code);

  beforeEach(() => {
    hooks.on = true; hooks.locale = 'en'; hooks.states = []; hooks.refs = []; sent.length = 0; urls.length = 0; replaced.length = 0; listeners = {}; online = true; input.value = ''; input.focus.mockClear();
    answers = {status: {status: 200, body: {state: 'unregistered'}}, prepare: {status: 200, body: {state: 'prepared'}}, redeem: {status: 200, body: {state: 'connected', deviceName: 'Front counter tablet'}}};
    location = {hash: `#setup=${code}`, pathname: '/clocker/calle-loiza', search: ''};
    rs.stubGlobal('window', {location, history: {state: null, replaceState: (_state: unknown, _title: string, url: string) => {replaced.push(url); location.hash = '';}},
      addEventListener: (name: string, fn: () => void) => {(listeners[name] ??= []).push(fn);}, removeEventListener: () => {}, setTimeout, clearTimeout});
    rs.stubGlobal('navigator', {get onLine() {return online;}});
    rs.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)); sent.push(body); urls.push(url);
      const answer = answers[body.step];
      if (answer === 'abort') throw new TypeError('Failed to fetch');
      // After a redeem the status read answers what the redeem answered.
      const reply = body.step === 'status' && sent.some(item => item.step === 'redeem') && answers.redeem !== 'abort' && (answers.redeem as {status: number}).status === 200 ? answers.redeem as {status: number; body: unknown} : answer;
      return {ok: reply.status < 400, status: reply.status, json: async () => reply.body};
    });
  });
  afterEach(() => {hooks.on = false; rs.unstubAllGlobals();});

  it('reads the code once, removes it from the address bar, keeps it out of state, and waits for a tap', async () => {
    await mount();
    expect(view()).toBe('received');
    expect(words()).toContain('Setup code received'); expect(words()).toContain('Type a code instead');
    // The fragment is gone from the address bar and from this history entry; no query string was ever involved.
    expect(replaced).toEqual(['/clocker/calle-loiza']); expect(location.hash).toBe('');
    // In memory only: a ref, never React state, and never in what the screen renders.
    expect(held()).toBe(false); expect(words()).not.toContain(code); expect(JSON.stringify(all(tree).map(node => node.props.value ?? node.props.defaultValue ?? ''))).not.toContain(code);
    expect(hooks.refs.some(ref => ref.current === code)).toBe(true);
    // Nothing connects by itself: only the status check has gone out.
    expect(sent.map(item => item.step)).toEqual(['status']);
    expect(all(tree).some(node => node.type === 'textarea')).toBe(false);
  });

  it('connects with the existing calls, then says where the tablet is connected and opens the clock', async () => {
    await mount(); await connect();
    expect(sent.map(item => item.step)).toEqual(['status', 'prepare', 'redeem', 'status']);
    expect(sent[2]).toEqual({step: 'redeem', enrollmentToken: code});
    // The code travels only in a request body to this location's setup endpoint.
    expect(new Set(urls)).toEqual(new Set(['/api/clocker/calle-loiza/setup'])); expect(urls.join(' ')).not.toContain(code);
    expect(view()).toBe('welcome'); expect(shellStatus()).toBe('connected');
    expect(words()).toContain('This tablet is connected to Calle Loíza'); expect(words()).toContain('Front counter tablet is ready. Your team can clock in now.');
    expect(words()).toContain('Owner access has been signed out on this tablet.');
    // Used: the code is gone from memory.
    expect(hooks.refs.some(ref => ref.current === code)).toBe(false); expect(held()).toBe(false);
    // The clock follows: by the button, or by itself after a few seconds.
    expect(SETUP_WELCOME_MS).toBeGreaterThanOrEqual(4000);
    (button('Open the time clock')!.props.onClick as () => void)(); draw();
    expect(all(tree).some(node => node.type === ClockerPinGate)).toBe(true);
  });

  it('a refused code leaves memory and the field asks for another, with the next step in words', async () => {
    answers.redeem = {status: 409, body: {code: 'ENROLLMENT_INVALID', error: 'This setup code is expired, already used, or for another location. Ask the Owner for a new code.'}};
    await mount(); await connect();
    expect(view()).toBe('type');
    expect(words()).toContain('This setup code is expired, already used, or for another location. Ask the Owner for a new code.');
    expect(hooks.refs.some(ref => ref.current === code)).toBe(false);
    const field = all(tree).find(node => node.type === 'textarea')!;
    expect(field.props['aria-invalid']).toBe(true); expect(field.props['aria-describedby']).toBe('clocker-setup-error clocker-setup-help');
    expect(all(tree).find(node => node.props.id === 'clocker-setup-error')?.props.role).toBe('alert');
  });

  it('a tablet that is already connected never uses the code', async () => {
    answers.prepare = {status: 200, body: {state: 'connected', deviceName: 'Front counter tablet'}};
    answers.status = {status: 200, body: {state: 'unregistered'}};
    await mount();
    answers.status = {status: 200, body: {state: 'connected', deviceName: 'Front counter tablet'}};
    await connect();
    expect(sent.map(item => item.step)).toEqual(['status', 'prepare', 'status']);
    expect(view()).toBe('welcome');
  });

  it('offline: nothing is sent and the code stays for the next try', async () => {
    await mount(); online = false; await connect();
    expect(sent.map(item => item.step)).toEqual(['status']);
    expect(view()).toBe('received');
    expect(words()).toContain('This tablet is offline. Connect it to Wi-Fi, then try again.');
    expect(hooks.refs.some(ref => ref.current === code)).toBe(true);
  });

  it('an answer that never arrives is "not confirmed": amber, one check, and never a second code', async () => {
    answers.redeem = 'abort';
    await mount(); await connect();
    expect(view()).toBe('uncertain'); expect(shellStatus()).toBe('unconfirmed');
    expect(words()).toContain('Setup not confirmed'); expect(words()).toContain('Check setup');
    expect(words()).not.toMatch(/failed|connected to/i);
    expect(all(tree).find(node => (node.props as {'data-tone'?: string})['data-tone'] === 'amber')).toBeTruthy();
    expect(all(tree).some(node => node.type === 'textarea' || node.type === 'form')).toBe(false);
    // The check looks the tablet up; it sends no code.
    const before = sent.length;
    await (button('Check setup')!.props.onClick as () => Promise<void>)(); await flush(); draw();
    expect(sent.slice(before)).toEqual([{step: 'status'}]);
  });

  it('new setup paused and blocked cookies each say what to do next', async () => {
    answers.prepare = {status: 402, body: {code: 'NEW_TABLET_SETUP_PAUSED', error: 'New tablet setup is paused. Use an already registered tablet to finish an existing shift.'}};
    await mount(); await connect();
    expect(words()).toContain('New tablet setup is paused. Use a registered tablet to finish an existing shift.');
    answers.prepare = {status: 428, body: {code: 'SETUP_COOKIE_REQUIRED', error: 'Allow cookies, then start tablet setup again.'}};
    hooks.states = []; hooks.refs = []; location.hash = `#setup=${code}`; sent.length = 0;
    await mount(); await connect();
    expect(words()).toContain('Allow cookies, then start tablet setup again.');
    expect(sent.some(item => item.step === 'redeem')).toBe(false);
  });

  it('"Type a code instead" drops the linked code and shows the field; a link with a broken code says so', async () => {
    await mount();
    (button('Type a code instead')!.props.onClick as () => void)(); draw();
    expect(view()).toBe('type'); expect(hooks.refs.some(ref => ref.current === code)).toBe(false);
    hooks.states = []; hooks.refs = []; location.hash = '#setup=nev_enr_cut-short';
    await mount();
    expect(view()).toBe('type'); expect(location.hash).toBe('');
    expect(words()).toContain('That link doesn’t have a complete setup code. Type the code from Owner Settings.');
  });

  it('with punches off the confirmation says so and does not send anyone to record time', async () => {
    const drawOff = () => {hooks.s = 0; hooks.r = 0; hooks.effects = [];
      const shell = (ClockerSetup({locationKey: 'calle-loiza', locationLabel: 'Calle Loíza', timeZone: 'America/Puerto_Rico', pinEnabled: false, punchEnabled: false}) as unknown as Node).props.children as Node;
      tree = (shell.type as (props: unknown) => unknown)(shell.props); return all(tree);};
    drawOff(); for (const effect of hooks.effects.slice(0, 2)) effect(); await flush(); drawOff();
    await (form()!.props.onSubmit as (event: {preventDefault(): void}) => Promise<void>)({preventDefault() {}}); await flush(); drawOff();
    expect(view()).toBe('connected');
    expect(words()).toContain('This tablet is connected to Calle Loíza');
    expect(words()).toContain('Timekeeping is not available yet.'); expect(words()).toContain('Ask your Owner to contact NEVORA support.');
    expect(all(tree).some(node => node.type === ClockerPinGate)).toBe(false);
  });

  it('Spanish: received, connected, refused and not confirmed carry no English sentence', async () => {
    hooks.locale = 'es';
    await mount(); expect(words()).toContain('Código de configuración recibido'); expect(words()).toContain('Escribir el código');
    await connect(); expect(words()).toContain('Esta tableta quedó conectada a Calle Loíza'); expect(words()).toContain('Abrir el registro de tiempo');
    expect(words()).not.toMatch(/Setup|Connect|is ready|time clock|signed out/i);
    hooks.states = []; hooks.refs = []; location.hash = `#setup=${code}`; sent.length = 0;
    answers.redeem = {status: 409, body: {code: 'ENROLLMENT_INVALID', error: 'x'}};
    await mount(); await connect(); expect(words()).toContain('Este código venció, ya se usó o es de otra ubicación. Pide al dueño un código nuevo.');
    hooks.states = []; hooks.refs = []; location.hash = `#setup=${code}`; sent.length = 0; answers.redeem = 'abort';
    await mount(); await connect(); expect(words()).toContain('Configuración sin confirmar'); expect(words()).toContain('Revisar configuración');
    expect(words()).not.toMatch(/Setup|Check |connection/);
  });

  it('keeps the shell it had: the band says what the card says', async () => {
    await mount();
    expect((tree as Node).type).toBe(ClockerShell); expect(shellStatus()).toBe('setup');
  });
});

it('keeps the complete Spanish navigation path on first render', () => {
  const html = renderToStaticMarkup(<ClockerSetup locationKey="qa-cafe" locationLabel="Calle Loíza"
    timeZone="America/Puerto_Rico" initialLocale="es" />);
  expect(html).toContain('Configuración\u00a0→ Tabletas de Clocker.');
});
