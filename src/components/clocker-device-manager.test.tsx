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
