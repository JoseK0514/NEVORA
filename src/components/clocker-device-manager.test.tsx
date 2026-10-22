import { expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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

it('keeps overview explanations inside their definition descriptions', () => {
  const summary = render([]).split('aria-label="Device overview">')[1].split('</dl>')[0];
  for (const label of ['Registered', 'Needs setup', 'Revoked']) expect(summary).toContain(`<dt class="nv-stat__label">${label}</dt><dd class="nv-stat__value">0</dd>`);
  expect(summary).not.toMatch(/<\/dd><p>/);
});

it('retains device identity, search and every management operation across states', () => {
  const html = render([device('active', 'ACTIVE'), device('pending', 'PENDING'), device('expired', 'EXPIRED'), device('revoked', 'REVOKED')]);
  for (const id of ['active', 'pending', 'expired', 'revoked']) expect(html).toContain(`data-clocker-device="${id}"`);
  expect(html).toContain('type="search"');
  expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(html.match(/>Rename<\/button>/g)).toHaveLength(4);
  expect(html.match(/>Revoke access<\/button>/g)).toHaveLength(3);
  expect(html).toContain('Replace tablet');
  expect(html).toContain('Reconnect tablet');
  expect(html.match(/>New setup code<\/button>/g)).toHaveLength(2);
});

it('disables registration when no active location exists while retaining existing management', () => {
  const html = render([device('inactive', 'ACTIVE', 'old')], [locations[1]]);
  expect(html).toMatch(/<button(?=[^>]*disabled="")[^>]*>[\s\S]*?Add device<\/button>/);
  expect(html).toMatch(/<button(?=[^>]*disabled="")[^>]*>Replace tablet<\/button>/);
  expect(html).toContain('>Rename</button>');
  expect(html).toContain('>Revoke access</button>');
  expect(html).toContain('href="/app/settings/locations"');
});

it('exposes a first-device action and no management or search controls for an empty inventory', () => {
  const html = render([]);
  expect(html).toContain('Add your first device');
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
    .find(button => button.replace(/<[^>]*>/g, '') === label);
  expect(tag, label).toBeDefined();
  expect(tag, label).toMatch(/^<button\b[^>]*\bdisabled=""/);
}

it('withholds device dialog actions until their handlers are hydrated', () => {
  const html = render([device('fictional-tablet', 'UNREGISTERED')]);
  for (const label of ['Add device', 'Rename', 'New setup code', 'Revoke access']) {
    expectDisabled(html, label);
  }
});

it('withholds the empty-list registration action until hydration', () => {
  const html = render([]);
  expectDisabled(html, 'Add your first device');
});
