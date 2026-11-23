import * as rstestImportedActual0 from "react" with { rstest: 'importActual' };
// One person's Clocker PIN (Phase 6): the form, the one error style, the result, and a save that can't be confirmed.
// The interaction tests drive the component's own handlers with hooks held here (the project has no DOM environment).
import {afterEach, beforeEach, describe, expect, it, rs} from '@rstest/core';
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const hooks = rs.hoisted(() => ({on: false, states: [] as unknown[], refs: [] as {current: unknown}[], s: 0, r: 0}));
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
    useEffect: (effect: () => void, deps?: unknown[]) => {if (!hooks.on) return react.useEffect(effect, deps);},
  };
});
rs.mock('next/link', () => ({default: ({href, children, ...props}: ComponentProps<'a'>) => createElement('a', {href, ...props}, children)}));
import {ClockerPinForm} from './clocker-pin-form';
import {ClockerPinClosed, ClockerPinEditor} from './clocker-pin-editor';
import {englishIn} from './clocker-owner-copy.testkit';
import type {PinActionResult, PinSaveStatus} from '@/app/app/employees/[employeeId]/clocker-pin/actions';

type Node = {type: unknown; props: Record<string, unknown>};
const isNode = (value: unknown): value is Node => !!value && typeof value === 'object' && 'type' in value && 'props' in value;
/** Expand the plain function components (the kit's cards and the PIN boxes) so the test reads what is drawn. */
function expand(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(expand);
  if (!isNode(value)) return value;
  if (typeof value.type === 'function' && !('$$typeof' in (value.type as object))) { try { return expand((value.type as (props: unknown) => unknown)(value.props)); } catch { return value; } }
  return {...value, props: {...value.props, children: expand(value.props.children)}};
}
function all(value: unknown): Node[] { if (Array.isArray(value)) return value.flatMap(all); if (!isNode(value)) return []; return [value, ...all(value.props.children)]; }
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node) : isNode(node) ? text(node.props.children) : '';

describe('first paint', () => {
  const editor = (version: number, lang: 'en' | 'es' = 'en', origin: 'person' | 'pins' = 'person') => renderToStaticMarkup(createElement(ClockerPinEditor, {employeeId: 'QA-1', name: 'Maria Rivera', initialVersion: version, action: rs.fn(), checkStatus: rs.fn(), lang, origin}));
  it('set: who it is for, two masked four-digit fields that are never password fields, and one filled Save', () => {
    const html = editor(0);
    expect(html).toContain('Set a PIN for Maria Rivera'); expect(html).toContain('Each person needs their own.'); expect(html).not.toContain('4 digits. Each');
    // Phase 2 gate: the name is said by the heading (and the back link), not again under the title.
    expect(html).not.toMatch(/<div class="q-hd"><h1[^>]*>Clocker PIN<\/h1><p>/);
    expect(html).not.toContain('type="password"'); expect(html.match(/type="text" inputMode="numeric" autoComplete="off"/g)).toHaveLength(2);
    expect(html.match(/<label class="ck-field__l" for="(new|confirm)-clocker-pin">/g)).toHaveLength(2);
    expect(html.match(/b-btn b-btn--teal/g)).toHaveLength(1); expect(html).toMatch(/disabled="">Save PIN</);
  });
  it('reset says the old PIN stops working, and never shows it', () => {
    const html = editor(4);
    expect(html).toContain('Reset the PIN for Maria Rivera'); expect(html).toContain('The old PIN stops working when you save.');
    expect(html).toContain('name="expectedVersion" value="4"'); expect(html).not.toMatch(/value="\d{4}"/);
  });
  it('a page that can’t set a PIN says whose it is, why, and one way on', () => {
    const closed = (reason: 'owner' | 'inactive' | 'unavailable', lang: 'en' | 'es' = 'en') => renderToStaticMarkup(createElement(ClockerPinClosed, {employeeId: 'QA-1', name: 'Maria Rivera', reason, lang}));
    expect(closed('owner')).toContain('Only an Owner can set another Owner’s Clocker PIN.');
    expect(closed('inactive')).toContain('Maria Rivera is inactive'); expect(closed('inactive')).toContain('data-kind="locked"');
    expect(closed('unavailable')).toContain('data-kind="failed"'); expect(closed('unavailable')).toContain('href="/app/employees/QA-1/clocker-pin"');
    for (const reason of ['owner', 'inactive', 'unavailable'] as const) { expect(closed(reason)).not.toContain('<form'); expect(englishIn(closed(reason, 'es'))).toEqual([]); }
  });
  it('Spanish leaks no English sentence', () => {
    expect(englishIn(editor(0, 'es'))).toEqual([]); expect(englishIn(editor(4, 'es', 'pins'))).toEqual([]);
    expect(editor(0, 'es')).toContain('Crear un PIN para Maria Rivera');
  });
});

describe('saving, driven through the form’s handlers', () => {
  class FakeFormData { values = new Map<string, string>(); constructor(form?: {fields?: Record<string, string>}) { for (const [key, value] of Object.entries(form?.fields ?? {})) this.values.set(key, value); }
    set(key: string, value: string) { this.values.set(key, value); } get(key: string) { return this.values.get(key) ?? null; } delete(key: string) { this.values.delete(key); } }
  let action: ReturnType<typeof rs.fn<(data: FormData) => Promise<PinActionResult>>>;
  let checkStatus: ReturnType<typeof rs.fn<(data: FormData) => Promise<PinSaveStatus>>>;
  let lang: 'en' | 'es' = 'en';
  let tree: unknown;
  const confirmField = {value: '', focus: rs.fn()};
  function draw() { hooks.s = 0; hooks.r = 0; tree = expand(ClockerPinForm({employeeId: 'QA-1', name: 'Maria Rivera', initialVersion: 0, action, checkStatus, origin: 'pins', lang})); return all(tree); }
  const reset = rs.fn();
  async function submit(pin: string, confirmPin: string) {
    const form = draw().find(node => node.type === 'form')!;
    const sent: FakeFormData[] = []; action.mockImplementation(async data => { sent.push(Object.assign(new FakeFormData(), {values: new Map((data as unknown as FakeFormData).values)})); return (action as unknown as {result: PinActionResult}).result; });
    (form.props.onSubmit as (event: unknown) => void)({preventDefault() {}, currentTarget: {fields: {employeeId: 'QA-1', expectedVersion: '0', pin, confirmPin}, reset}});
    for (let i = 0; i < 8; i++) await Promise.resolve();
    draw(); return sent;
  }
  const words = () => text(tree);
  const button = (label: string) => all(tree).find(node => (node.type === 'button' || node.type === 'a' || typeof node.type === 'object') && text(node) === label);
  beforeEach(() => {
    hooks.on = true; hooks.states = []; hooks.refs = []; lang = 'en'; reset.mockClear(); confirmField.value = '1234'; confirmField.focus.mockClear();
    action = rs.fn(); checkStatus = rs.fn();
    rs.stubGlobal('FormData', FakeFormData); rs.stubGlobal('crypto', {randomUUID: () => '4a9c7ed1-9b42-4dc0-8847-324d7ade7832'});
  });
  afterEach(() => { hooks.on = false; rs.unstubAllGlobals(); });

  it('two different PINs send nothing: the one error style under the second field, which is cleared', async () => {
    draw(); hooks.refs[2] = {current: confirmField};
    const sent = await submit('2468', '2469');
    expect(sent).toEqual([]); expect(action).not.toHaveBeenCalled(); expect(reset).not.toHaveBeenCalled();
    const error = all(tree).find(node => node.props.id === 'confirm-clocker-pin-error')!;
    expect(text(error)).toBe('The two PINs don’t match'); expect(error.props.role).toBe('alert'); expect(error.props.className).toBe('ck-field__e');
    // No closing period, and the glyph is drawn so the error never rests on red alone.
    expect(all(error).some(node => typeof node.type === 'object' || typeof node.type === 'function')).toBe(true);
    const field = all(tree).find(node => node.props.id === 'confirm-clocker-pin')!;
    expect(field.props['aria-invalid']).toBe(true); expect(field.props['aria-describedby']).toBe('confirm-clocker-pin-error pin-help');
    expect(confirmField.value).toBe('');
  });

  it('a save clears the fields before the request leaves, then the form is gone and the card says whose PIN was set', async () => {
    (action as unknown as {result: PinActionResult}).result = {ok: true, version: 1};
    const sent = await submit('2468', '2468');
    expect(reset).toHaveBeenCalledTimes(1);
    expect(sent[0].get('pin')).toBe('2468'); expect(sent[0].get('operationId')).toBe('4a9c7ed1-9b42-4dc0-8847-324d7ade7832'); expect(sent[0].get('expectedVersion')).toBe('0');
    expect(words()).toContain('PIN set for Maria Rivera. Tell them in person.'); expect(words()).toContain('The PIN is not shown again. If they forget it, set a new one.');
    // Nothing a passer-by could read stays: no field, no digits, no PIN in state.
    expect(all(tree).some(node => node.type === 'form' || node.type === 'input')).toBe(false);
    expect(words()).not.toContain('2468'); expect(JSON.stringify(hooks.states)).not.toContain('2468');
    expect(all(tree).find(node => node.props.role === 'status')).toBeTruthy();
    expect(button('Back to Clocker PINs')?.props.href).toBe('/app/settings/clocker/pins'); expect(button('Set another PIN')).toBeTruthy();
  });

  it('a save that can’t be confirmed is amber "PIN not confirmed" with its reference and one check; nothing is sent twice', async () => {
    (action as unknown as {result: PinActionResult}).result = {ok: false, error: 'PIN changes could not be confirmed. Reload the current settings before trying again.', refresh: true};
    await submit('2468', '2468');
    expect(words()).toContain('PIN not confirmed'); expect(words()).toContain('We don’t know if the new PIN was saved. Check before you set it again. The old PIN may still work.');
    expect(words()).toContain('Save reference 4a9c7ed1-9b42-4dc0-8847-324d7ade7832');
    expect(words()).not.toMatch(/failed|PIN set for/); expect(all(tree).some(node => node.type === 'form')).toBe(false);
    expect(all(tree).find(node => node.props['data-kind'] === 'paused')).toBeTruthy();
    checkStatus.mockResolvedValue({state: 'unknown'} as PinSaveStatus);
    (button('Check if it saved')!.props.onClick as () => void)(); for (let i = 0; i < 6; i++) await Promise.resolve(); draw();
    expect(action).toHaveBeenCalledTimes(1); expect(words()).toContain('Still not confirmed. Nothing was sent again.');
    const asked = checkStatus.mock.calls[0][0] as unknown as FakeFormData; expect(asked.get('operationId')).toBe('4a9c7ed1-9b42-4dc0-8847-324d7ade7832'); expect(asked.get('pin')).toBeNull();
    // The check finds the original save: now it is the saved card.
    checkStatus.mockResolvedValue({state: 'recorded', version: 1, currentVersion: 1} as PinSaveStatus);
    (button('Check if it saved')!.props.onClick as () => void)(); for (let i = 0; i < 6; i++) await Promise.resolve(); draw();
    expect(words()).toContain('PIN set for Maria Rivera. Tell them in person.'); expect(action).toHaveBeenCalledTimes(1);
  });

  it('a thrown request is not confirmed too, and a definite refusal keeps the form with the server’s reason', async () => {
    action.mockRejectedValue(new Error('network'));
    const form = draw().find(node => node.type === 'form')!;
    (form.props.onSubmit as (event: unknown) => void)({preventDefault() {}, currentTarget: {fields: {employeeId: 'QA-1', expectedVersion: '0', pin: '2468', confirmPin: '2468'}, reset}});
    for (let i = 0; i < 8; i++) await Promise.resolve(); draw();
    expect(words()).toContain('PIN not confirmed');
    hooks.states = []; hooks.refs = [];
    (action as unknown as {result: PinActionResult}).result = {ok: false, error: 'Only an Owner may set a Clocker PIN.'};
    await submit('2468', '2468');
    const alert = all(tree).find(node => node.props.role === 'alert' && node.props.className === 'ck-alert')!;
    expect(text(alert)).toBe('The PIN wasn’t savedOnly an Owner may set a Clocker PIN.'); expect(alert.props['data-tone']).toBe('red');
    expect(all(tree).some(node => node.type === 'form')).toBe(true);
  });

  it('Spanish: the error, the saved card and the unconfirmed card leak no English sentence', async () => {
    lang = 'es'; draw(); hooks.refs[2] = {current: confirmField};
    await submit('2468', '2469'); expect(words()).toContain('Los dos PIN no coinciden');
    hooks.states = []; hooks.refs = []; (action as unknown as {result: PinActionResult}).result = {ok: true, version: 1};
    await submit('2468', '2468'); expect(words()).toContain('PIN creado para Maria Rivera. Dígaselo en persona.'); expect(englishIn(`<p>${words()}</p>`)).toEqual([]);
    hooks.states = []; hooks.refs = []; (action as unknown as {result: PinActionResult}).result = {ok: false, error: 'x', refresh: true};
    await submit('2468', '2468'); expect(words()).toContain('PIN sin confirmar'); expect(words()).toContain('Verificar si se guardó');
  });
});
