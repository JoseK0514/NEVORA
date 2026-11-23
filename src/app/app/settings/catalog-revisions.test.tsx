import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, rs } from '@rstest/core';
rs.mock('@/lib/auth/permissions', () => ({ requireRoles: async () => ({ id: 'fictional-owner', role: 'OWNER' }) }));
rs.mock('@/lib/data/locations', () => ({ listLocations: async () => [{ id: 'fictional-location', workspaceId: 'fictional-workspace', name: 'Fictional location', shortName: 'Fictional', clockerKey: 'fictional-location', active: true, updatedAt: '2030-10-10 12:00:00.123456+00' }] }));
rs.mock('@/lib/data/positions', () => ({ listPositions: async () => [{ id: 'fictional-position', workspaceId: 'fictional-workspace', name: 'Fictional position', active: true, createdAt: '2030-10-01 12:00:00+00', updatedAt: '2030-10-10 12:00:00.654321+00' }] }));
rs.mock('./actions', () => ({ updateLocationAction: rs.fn(), createPositionAction: rs.fn(), updatePositionAction: rs.fn() }));
rs.mock('next/link', () => ({ default: ({ children, ...props }: ComponentProps<'a'>) => createElement('a', props, children) }));
rs.mock('next/navigation', () => ({ notFound: () => { throw new Error('not found'); } }));
import LocationPage from './locations/[locationId]/page';
import PositionsPage from './positions/page';
import { PositionDialog } from './positions/position-catalog';
it('Location editable draft carries its exact mounted reviewed database revision', async () => {
  const html = renderToStaticMarkup(await LocationPage({ params: Promise.resolve({ locationId: 'fictional-location' }) }));
  expect(html).toContain('name="expectedUpdatedAt" value="2030-10-10 12:00:00.123456+00"');
  expect(html).toContain('name="name"');
});
it('Position editable draft carries its own exact mounted reviewed database revision', async () => {
  // J8 in Direction B: the page lists the read position; its editor (a dialog opened from the row) carries that exact revision.
  const page = renderToStaticMarkup(await PositionsPage());
  expect(page).toContain('Fictional position');
  const position = { id: 'fictional-position', workspaceId: 'fictional-workspace', name: 'Fictional position', active: true, createdAt: '2030-10-01 12:00:00+00', updatedAt: '2030-10-10 12:00:00.654321+00' };
  const html = renderToStaticMarkup(createElement(PositionDialog, { editing: { kind: 'edit', position }, createAction: rs.fn(), updateAction: rs.fn(), onClose: () => {} }));
  expect(html).toContain('name="expectedUpdatedAt" value="2030-10-10 12:00:00.654321+00"');
  expect(html).toContain('name="name"');
});
