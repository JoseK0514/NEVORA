import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// The interaction tests below drive the component's own handlers with hooks held here (the project has no DOM test
// environment). While `hooks.on` is false every hook is React's own, so the markup tests render normally.
const hooks = vi.hoisted(() => ({ on: false, server: false, states: [] as unknown[], refs: [] as { current: unknown }[], effects: [] as (() => void | (() => void))[], s: 0, r: 0 }));
vi.mock('react', async original => {
  const react = await original<typeof import('react')>();
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
vi.mock('./toaster', () => ({ toast: vi.fn() }));
vi.mock('../app/app/settings/wave-c-form', async original => ({ ...await original<Record<string, unknown>>(), lockPageScroll: () => () => {} }));
import { ClockerDeviceManager } from './clocker-device-manager';
import { CorpButton } from './corp/corp';
import { QuietSheet } from './quiet/quiet-sheet';
import type { ClockerDeviceView, ClockerLocationView } from '../lib/clocker/views';

const locations: ClockerLocationView[] = [
  { id: 'main', name: 'Main Office', clockerKey: 'main', active: true },
  { id: 'old', name: 'Old Office', clockerKey: 'old', active: false },
];
const device = (id: string, state: ClockerDeviceView['state'], locationId = 'main'): ClockerDeviceView => ({
  id, name: id, locationId, state, version: 7, lastSeenAt: null, enrollmentExpiresAt: null,
});
const render = (devices: ClockerDeviceView[], available = locations) => renderToStaticMarkup(createElement(ClockerDeviceManager, {
  initialDevices: devices, locations: available, timeZone: 'America/Puerto_Rico', action: vi.fn(),
}));

// Release 1 (board O-ClockerDevices); Owner premium R3/R8 (round 2): one Tablets card (every tablet that isn't removed; its
// state in words, no pill or icon), the setup steps, then Removed when there are any; each tablet is one row that opens the
// kit's sheet. No segments, search or "+".
it('counts each state for assistive technology', () => {
  const html = render([device('active', 'ACTIVE'), device('pending', 'PENDING'), device('expired', 'EXPIRED'), device('revoked', 'REVOKED')]);
  expect(html).toContain('1 registered, 2 waiting for setup, 1 removed');
  expect(html).not.toContain('aria-pressed');
  expect(html).toContain('Tablets (3)');
  expect(html).toContain('Removed (1)');
});

it('shows the selected state as rows that open their device options', () => {
  const html = render([device('active', 'ACTIVE'), device('pending', 'PENDING'), device('expired', 'EXPIRED'), device('revoked', 'REVOKED')]);
  expect(html).toMatch(/<button type="button" class="c-row c-tablets__row" data-clocker-device="active" aria-label="active, options"/);
  for (const id of ['pending', 'expired', 'revoked']) expect(html).toContain(`data-clocker-device="${id}"`);
  expect(html).not.toContain('type="search"');
});

it('disables registration when no active location exists and points to Locations', () => {
  const html = render([device('inactive', 'ACTIVE', 'old')], [locations[1]]);
  expect(html).toMatch(/<button type="button" disabled="" class="c-btn c-btn--md">Add tablet<\/button>/);
  expect(html).toContain('data-clocker-device="inactive"');
  expect(html).toContain('href="/app/settings/locations"');
});

it('offers adding the first device and no device rows for an empty inventory', () => {
  const html = render([]);
  // Release 1 (board O-ClockerDevices): the three setup steps and one primary "Add tablet" (one tablet per location).
  expect(html).toContain('Set up a tablet');
  expect(html).toContain('Tap Add tablet to get a code.');
  expect(html).toContain('One tablet per location works best.');
  expect(html).toMatch(/<button type="button"[^>]*class="c-btn c-btn--md">Add tablet<\/button>/);
  expect(html).not.toContain('data-clocker-device=');
  expect(html).not.toContain('type="search"');
  expect(html).not.toContain('nevora-action-menu-item');
});

it('escapes device and location values rather than inserting markup', () => {
  const html = render([{ ...device('unsafe', 'ACTIVE'), name: '<script>device</script>' }], [{ ...locations[0], name: '<img src=x>' }]);
  expect(html).not.toContain('<script>device');
  expect(html).not.toContain('<img src=x>');
  expect(html).toContain('&lt;script&gt;device&lt;/script&gt;');
});

function expectDisabled(html: string, label: string) {
  const tag = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(match => match[0])
    .find(button => button.replace(/<[^>]*>/g, '') === label || button.includes(`aria-label="${label}"`));
  expect(tag, label).toBeDefined();
  expect(tag, label).toMatch(/^<button\b[^>]*\bdisabled=""/);
}

it('withholds device actions until their handlers are hydrated', () => {
  const html = render([device('fictional-tablet', 'ACTIVE')]);
  for (const label of ['Add tablet', 'fictional-tablet, options']) expectDisabled(html, label);
});

it('withholds the empty-list registration action until hydration', () => {
  const html = render([]);
  expectDisabled(html, 'Add tablet');
});

// Codex review (Oct 23); Owner premium R8 (round 2): open each tablet's sheet from Active, Not set up and Removed and check
// the controls, Done, cancellation, keyboard focus, inactive locations and the hydration restriction. Fictional tablets only.
describe('tablet sheet, driven through the component’s handlers', () => {
  type Node = { type: unknown; props: Record<string, unknown> };
  const isNode = (value: unknown): value is Node => !!value && typeof value === 'object' && 'type' in value && 'props' in value;
  // Walk children and element-valued props (a notice's action).
  function all(value: unknown): Node[] {
    if (Array.isArray(value)) return value.flatMap(all);
    if (!isNode(value)) return [];
    return [value, ...Object.entries(value.props).filter(([key]) => key === 'children' || key === 'bandAside' || key === 'action').flatMap(([, child]) => all(child))];
  }
  const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node)
    : isNode(node) ? (node.props.idle as string | undefined) ?? text(node.props.children) : '';
  const isButton = (node: Node) => node.type === 'button' || node.type === CorpButton;
  const focused: string[] = [];
  const handle = (node: Node) => ({ node, focus: () => { focused.push((node.props['aria-label'] as string) ?? (node.props.label as string) ?? text(node)); } });
  class FakeInput { constructor(public value: string) {} }
  let nameValue = '';
  const requestSubmit = vi.fn();
  // The sheet's form: the selector the component asks for when the sheet opens, and its one field.
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
  function draw() {
    hooks.s = 0; hooks.r = 0; hooks.effects = [];
    tree = ClockerDeviceManager({ initialDevices: devices, locations: available, timeZone: 'America/Puerto_Rico', action: vi.fn() });
    return all(tree);
  }
  const settle = () => { draw(); hooks.effects[0]?.(); return draw(); };
  const find = (label: string) => draw().find(node => isButton(node) && (node.props['aria-label'] === label || text(node) === label));
  const button = (label: string) => {
    const found = find(label);
    if (!found) throw Error(`No button “${label}”`);
    return found.props as { disabled?: boolean; onClick: (event: unknown) => void; className?: string; kind?: string };
  };
  const has = (label: string) => !!find(label);
  const row = { focus: vi.fn(), isConnected: true };
  const press = (label: string) => { button(label).onClick({ currentTarget: row }); return settle(); };
  const sheet = () => { const nodes = draw(); return { title: text(nodes.find(node => node.props.id === 'clocker-dialog-title')), open: !!nodes.find(node => node.type === 'form'),
    sheetOpen: nodes.find(node => node.type === QuietSheet)?.props.open }; };
  const tablets: ClockerDeviceView[] = [
    { ...device('front', 'ACTIVE'), name: 'Fictional front desk tablet' },
    { ...device('new', 'UNREGISTERED'), name: 'Fictional new tablet' },
    { ...device('waiting', 'PENDING'), name: 'Fictional waiting tablet' },
    { ...device('lapsed', 'EXPIRED'), name: 'Fictional lapsed tablet' },
    { ...device('gone', 'REVOKED'), name: 'Fictional removed tablet' },
  ];
  beforeEach(() => {
    hooks.on = true; hooks.server = false; hooks.states = []; hooks.refs = [{ current: fakeForm }]; focused.length = 0; row.focus.mockClear(); requestSubmit.mockClear();
    devices = tablets; available = locations; nameValue = '';
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => { callback(); return 0; });
    vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
    vi.stubGlobal('HTMLInputElement', FakeInput);
  });
  afterEach(() => { hooks.on = false; vi.unstubAllGlobals(); });

  it('Active: the sheet is titled with the tablet, Done on the right; Replace tablet is secondary and Remove tablet quiet', () => {
    press('Fictional front desk tablet, options');
    expect(sheet()).toEqual({ title: 'Fictional front desk tablet', open: true, sheetOpen: true });
    // No field takes focus, so no keyboard rises over the sheet.
    expect(focused).toEqual([]);
    for (const label of ['Done', 'Replace tablet', 'Remove tablet']) expect(button(label).disabled, label).toBeFalsy();
    expect(button('Replace tablet').kind).toBe('secondary');
    expect(button('Remove tablet').className).toBe('c-tablet-sheet__remove');
    for (const label of ['Save name', 'Cancel', 'Revoke access', 'Reconnect tablet', 'Get setup code']) expect(has(label), label).toBe(false);
  });

  it('Not set up: every waiting tablet leads with Get setup code (the one primary), then Remove tablet', () => {
    const shown = draw().filter(node => node.props['data-clocker-device']).map(node => node.props['data-clocker-device']);
    expect(shown).toEqual(['front', 'new', 'waiting', 'lapsed', 'gone']);
    for (const name of ['Fictional new tablet', 'Fictional waiting tablet', 'Fictional lapsed tablet']) {
      press(`${name}, options`);
      expect(sheet().title, name).toBe(name);
      expect(button('Get setup code').kind, name).toBeUndefined();
      expect(has('Remove tablet'), name).toBe(true);
      expect(has('Save name') || has('Replace tablet') || has('Reconnect tablet'), name).toBe(false);
      nameValue = name; button('Done').onClick({}); settle();
      expect(sheet().open, name).toBe(false);
    }
    // Getting the first code confirms once, with the action named the same.
    press('Fictional new tablet, options');
    button('Get setup code').onClick({}); settle();
    expect(sheet().title).toBe('Get a setup code?');
    expect(has('Get setup code')).toBe(true);
    expect(has('Create new code')).toBe(false);
  });

  it('Done saves a changed name through the same form, and only closes when the name is unchanged', () => {
    press('Fictional front desk tablet, options');
    nameValue = 'Fictional front desk tablet';
    button('Done').onClick({}); draw();
    expect(requestSubmit).not.toHaveBeenCalled(); expect(sheet().open).toBe(false); expect(row.focus).toHaveBeenCalledTimes(1);
    press('Fictional front desk tablet, options');
    nameValue = 'Fictional counter tablet';
    button('Done').onClick({}); draw();
    expect(requestSubmit).toHaveBeenCalledTimes(1); expect(sheet().open).toBe(true);
  });

  it('says a waiting tablet once: in words on its row, no pill, and the card leads with setting up the first one', () => {
    const html = draw();
    expect(html.some(node => typeof node.props.className === 'string' && /(wc|c)-pill/.test(node.props.className as string))).toBe(false);
    expect(text(html.find(node => node.props['data-clocker-device'] === 'new'))).toContain('Not set up');
    expect(text(html.find(node => node.props['data-clocker-device'] === 'front'))).not.toContain('Active');
    expect(button('Set up Fictional new tablet').kind).toBeUndefined();
    expect(button('Add tablet').kind).toBe('secondary');
  });

  it('Removed: options offer Reconnect tablet and no Remove tablet', () => {
    press('Fictional removed tablet, options');
    expect(button('Reconnect tablet').disabled).toBeFalsy();
    expect(has('Remove tablet')).toBe(false);
    expect(sheet().title).toBe('Fictional removed tablet');
  });

  it('Replace and Remove ask first, start on Cancel, and Cancel returns to the tablet row', () => {
    press('Fictional front desk tablet, options');
    button('Replace tablet').onClick({}); settle();
    expect(sheet().title).toBe('Create a new setup code?');
    expect(has('Create new code')).toBe(true);
    expect(focused.at(-1)).toBe('Cancel');
    button('Cancel').onClick({}); draw();
    expect(sheet()).toMatchObject({ open: false, sheetOpen: false }); expect(row.focus).toHaveBeenCalledTimes(1);

    press('Fictional front desk tablet, options');
    button('Remove tablet').onClick({}); settle();
    expect(sheet().title).toBe('Remove this tablet?');
    expect(button('Remove tablet').kind).toBe('danger');
    expect(focused.at(-1)).toBe('Cancel');
    button('Cancel').onClick({}); draw();
    expect(sheet().open).toBe(false); expect(row.focus).toHaveBeenCalledTimes(2);
  });

  it('Escape (the sheet’s own close) closes the options without saving and returns focus to the row', () => {
    press('Fictional front desk tablet, options');
    const panel = draw().find(node => node.type === QuietSheet)!;
    (panel.props.onClose as () => void)();
    expect(sheet().open).toBe(false); expect(requestSubmit).not.toHaveBeenCalled(); expect(row.focus).toHaveBeenCalledTimes(1);
  });

  it('a tablet at an inactive location keeps Done and Remove, cannot be replaced, and Add tablet waits for a location', () => {
    devices = [{ ...device('old-tablet', 'ACTIVE', 'old'), name: 'Fictional old tablet' }]; available = [locations[1]];
    const nodes = draw();
    expect(text(nodes.find(node => node.props['data-clocker-device'] === 'old-tablet'))).toContain('Location inactive');
    expect(button('Add tablet').disabled).toBe(true);
    press('Fictional old tablet, options');
    expect(button('Replace tablet').disabled).toBe(true);
    expect(button('Done').disabled).toBeFalsy();
    expect(button('Remove tablet').disabled).toBeFalsy();
  });

  it('before hydration no tablet row or setup button can be pressed, so no sheet can open', () => {
    hooks.server = true;
    expect(button('Fictional front desk tablet, options').disabled).toBe(true);
    expect(button('Set up Fictional new tablet').disabled).toBe(true);
    expect(button('Add tablet').disabled).toBe(true);
    expect(draw().some(node => node.type === 'form')).toBe(false);
  });
});
