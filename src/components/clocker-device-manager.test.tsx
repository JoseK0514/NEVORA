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

// Quiet (v4, approved Oct 23): Active, Needs setup and Removed with their counts; each device is one row that opens
// its sheet (Rename, a new setup code, Replace or Reconnect, Revoke access). Wider search and overview cards are gone.
it('counts each state in its segment for assistive technology', () => {
  const html = render([device('active', 'ACTIVE'), device('pending', 'PENDING'), device('expired', 'EXPIRED'), device('revoked', 'REVOKED')]);
  expect(html).toContain('aria-label="Active, 1"');
  expect(html).toContain('aria-label="Needs setup, 2"');
  expect(html).toContain('aria-label="Removed, 1"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
});

it('shows the selected state as rows that open their device options', () => {
  const html = render([device('active', 'ACTIVE'), device('pending', 'PENDING'), device('expired', 'EXPIRED'), device('revoked', 'REVOKED')]);
  expect(html).toMatch(/<button type="button" class="q-row" data-clocker-device="active" aria-label="active, options"/);
  for (const id of ['pending', 'expired', 'revoked']) expect(html).not.toContain(`data-clocker-device="${id}"`);
  expect(html).not.toContain('type="search"');
});

it('disables registration when no active location exists and points to Locations', () => {
  const html = render([device('inactive', 'ACTIVE', 'old')], [locations[1]]);
  expect(html).toMatch(/<button(?=[^>]*disabled="")[^>]*aria-label="Add device"/);
  expect(html).toContain('data-clocker-device="inactive"');
  expect(html).toContain('href="/app/settings/locations"');
});

it('offers adding the first device and no device rows for an empty inventory', () => {
  const html = render([]);
  expect(html).toContain('Add the shared tablet at each location.');
  expect(html).toMatch(/<button class="q-btn"[^>]*>Add device<\/button>/);
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
  for (const label of ['Add device', 'fictional-tablet, options']) expectDisabled(html, label);
});

it('withholds the empty-list registration action until hydration', () => {
  const html = render([]);
  expectDisabled(html, 'Add device');
});

// Codex review (Oct 23): open each device's options from Active, Needs setup and Removed and check the controls,
// cancellation, keyboard focus, inactive locations and the hydration restriction. Fictional tablets only.
describe('device options, driven through the component’s handlers', () => {
  type Node = { type: unknown; props: Record<string, unknown> };
  const isNode = (value: unknown): value is Node => !!value && typeof value === 'object' && 'type' in value && 'props' in value;
  // Walk children and element-valued props (the band's + button, a notice's action).
  function all(value: unknown): Node[] {
    if (Array.isArray(value)) return value.flatMap(all);
    if (!isNode(value)) return [];
    return [value, ...Object.entries(value.props).filter(([key]) => key === 'children' || key === 'bandAside' || key === 'action').flatMap(([, child]) => all(child))];
  }
  const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join('') : typeof node === 'string' || typeof node === 'number' ? String(node)
    : isNode(node) ? (node.props.idle as string | undefined) ?? text(node.props.children) : '';
  const focused: string[] = [];
  const handle = (node: Node) => ({ node, focus: () => { focused.push((node.props['aria-label'] as string) ?? (node.props.label as string) ?? text(node)); } });
  let dialogOpen = false;
  const fakeDialog = {
    get open() { return dialogOpen; }, showModal: () => { dialogOpen = true; }, close: () => { dialogOpen = false; },
    // The two selectors the component asks for when its sheet opens.
    querySelector: (selector: string) => {
      const nodes = all(tree);
      const match = selector === '[data-autofocus]' ? nodes.find(node => node.props['data-autofocus'] !== undefined)
        : nodes.find(node => node.props.name === 'name' || (node.type === 'button' && node.props.type === 'submit'));
      return match ? handle(match) : null;
    },
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
  const button = (label: string) => {
    const found = draw().find(node => node.type === 'button' && (node.props['aria-label'] === label || text(node) === label));
    if (!found) throw Error(`No button “${label}”`);
    return found.props as { disabled?: boolean; onClick: (event: unknown) => void; className?: string };
  };
  const has = (label: string) => draw().some(node => node.type === 'button' && (node.props['aria-label'] === label || text(node) === label));
  const row = { focus: vi.fn(), isConnected: true };
  const press = (label: string) => { button(label).onClick({ currentTarget: row }); return settle(); };
  const sheet = () => { const nodes = draw(); return { title: text(nodes.find(node => node.props.id === 'clocker-dialog-title')), open: !!nodes.find(node => node.type === 'form') }; };
  const tablets: ClockerDeviceView[] = [
    { ...device('front', 'ACTIVE'), name: 'Fictional front desk tablet' },
    { ...device('new', 'UNREGISTERED'), name: 'Fictional new tablet' },
    { ...device('waiting', 'PENDING'), name: 'Fictional waiting tablet' },
    { ...device('lapsed', 'EXPIRED'), name: 'Fictional lapsed tablet' },
    { ...device('gone', 'REVOKED'), name: 'Fictional removed tablet' },
  ];
  beforeEach(() => {
    hooks.on = true; hooks.server = false; hooks.states = []; hooks.refs = [{ current: fakeDialog }]; dialogOpen = false; focused.length = 0; row.focus.mockClear();
    devices = tablets; available = locations;
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => { callback(); return 0; });
    vi.stubGlobal('window', Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  });
  afterEach(() => { hooks.on = false; vi.unstubAllGlobals(); });

  it('Active: options offer Rename, Replace tablet and Revoke access; the name field takes focus', () => {
    press('Fictional front desk tablet, options');
    expect(sheet()).toEqual({ title: 'Rename device', open: true });
    expect(dialogOpen).toBe(true);
    expect(focused).toEqual(['Device name']);
    for (const label of ['Save name', 'Replace tablet', 'Revoke access', 'Cancel']) expect(button(label).disabled, label).toBeFalsy();
    expect(has('Reconnect tablet')).toBe(false);
    expect(has('New setup code')).toBe(false);
  });

  it('Needs setup: every waiting tablet offers New setup code and Revoke access', () => {
    button('Needs setup, 3').onClick({});
    const shown = draw().filter(node => node.props['data-clocker-device']).map(node => node.props['data-clocker-device']);
    expect(shown).toEqual(['new', 'waiting', 'lapsed']);
    for (const name of ['Fictional new tablet', 'Fictional waiting tablet', 'Fictional lapsed tablet']) {
      press(`${name}, options`);
      expect(has('New setup code'), name).toBe(true);
      expect(has('Revoke access'), name).toBe(true);
      expect(has('Replace tablet') || has('Reconnect tablet'), name).toBe(false);
      button('Cancel').onClick({}); settle();
    }
  });

  it('Removed: options offer Reconnect tablet and no Revoke access', () => {
    button('Removed, 1').onClick({});
    press('Fictional removed tablet, options');
    expect(button('Reconnect tablet').disabled).toBeFalsy();
    expect(has('Revoke access')).toBe(false);
    expect(has('Rename device') || sheet().title === 'Rename device').toBe(true);
  });

  it('Replace and Revoke ask first, start on Cancel, and Cancel returns to the device row', () => {
    press('Fictional front desk tablet, options');
    button('Replace tablet').onClick({}); settle();
    expect(sheet().title).toBe('Create a new setup code?');
    expect(has('Create new code')).toBe(true);
    expect(focused.at(-1)).toBe('Cancel');
    button('Cancel').onClick({}); draw();
    expect(sheet().open).toBe(false); expect(dialogOpen).toBe(false); expect(row.focus).toHaveBeenCalledTimes(1);

    press('Fictional front desk tablet, options');
    button('Revoke access').onClick({}); settle();
    expect(sheet().title).toBe('Revoke this device’s access?');
    expect(button('Revoke access').className).toContain('q-btn--danger');
    expect(focused.at(-1)).toBe('Cancel');
    button('Cancel').onClick({}); draw();
    expect(sheet().open).toBe(false); expect(row.focus).toHaveBeenCalledTimes(2);
  });

  it('Escape closes the options without saving and returns focus to the row', () => {
    press('Fictional front desk tablet, options');
    const dialog = draw().find(node => node.type === 'dialog')!;
    const event = { preventDefault: vi.fn() };
    (dialog.props.onCancel as (event: unknown) => void)(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(sheet().open).toBe(false); expect(row.focus).toHaveBeenCalledTimes(1);
  });

  it('a tablet at an inactive location keeps Rename and Revoke, cannot be replaced, and Add device waits for a location', () => {
    devices = [{ ...device('old-tablet', 'ACTIVE', 'old'), name: 'Fictional old tablet' }]; available = [locations[1]];
    const nodes = draw();
    expect(text(nodes.find(node => node.props['data-clocker-device'] === 'old-tablet'))).toContain('Location inactive');
    expect(button('Add device').disabled).toBe(true);
    press('Fictional old tablet, options');
    expect(button('Replace tablet').disabled).toBe(true);
    expect(button('Save name').disabled).toBeFalsy();
    expect(button('Revoke access').disabled).toBeFalsy();
  });

  it('before hydration no device row or Add device can be pressed, so no options can open', () => {
    hooks.server = true;
    expect(button('Fictional front desk tablet, options').disabled).toBe(true);
    expect(button('Add device').disabled).toBe(true);
    expect(draw().some(node => node.type === 'form')).toBe(false);
  });
});
