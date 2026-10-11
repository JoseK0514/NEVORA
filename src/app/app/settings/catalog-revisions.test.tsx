import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('@/lib/auth/permissions', () => ({ requireRoles: async () => ({ id: 'fictional-owner', role: 'OWNER' }) }));
vi.mock('@/lib/data/locations', () => ({ listLocations: async () => [{ id: 'fictional-location', workspaceId: 'fictional-workspace', name: 'Fictional location', shortName: 'Fictional', clockerKey: 'fictional-location', active: true, updatedAt: '2030-10-10 12:00:00.123456+00' }] }));
vi.mock('@/lib/data/positions', () => ({ listPositions: async () => [{ id: 'fictional-position', workspaceId: 'fictional-workspace', name: 'Fictional position', active: true, createdAt: '2030-10-01 12:00:00+00', updatedAt: '2030-10-10 12:00:00.654321+00' }] }));
vi.mock('./actions', () => ({ updateLocationAction: vi.fn(), createPositionAction: vi.fn(), updatePositionAction: vi.fn() }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: ComponentProps<'a'>) => createElement('a', props, children) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('not found'); } }));
import LocationPage from './locations/[locationId]/page';
import PositionsPage from './positions/page';
it('Location editable draft carries its exact mounted reviewed database revision', async () => {
  const html = renderToStaticMarkup(await LocationPage({ params: Promise.resolve({ locationId: 'fictional-location' }) }));
  expect(html).toContain('name="expectedUpdatedAt" value="2030-10-10 12:00:00.123456+00"');
  expect(html).toContain('name="name"');
});
it('Position editable draft carries its own exact mounted reviewed database revision', async () => {
  const html = renderToStaticMarkup(await PositionsPage());
  expect(html).toContain('name="expectedUpdatedAt" value="2030-10-10 12:00:00.654321+00"');
  expect(html).toContain('name="name"');
});
