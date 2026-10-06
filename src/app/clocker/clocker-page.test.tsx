import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import ClockerPage from './[location]/page';
import type { Location } from '../../lib/domain';

const state = vi.hoisted(() => ({ failed: false, locations: [] as Location[] }));
vi.mock('@/lib/clocker/pin-crypto.server', () => ({ readPinKey: () => { throw Error('PIN not configured'); } }));
vi.mock('@/lib/data/locations', () => ({
  findActiveLocationByClockerKey: async (key: string) => {
    if (state.failed) throw Error('Location configuration is unavailable.');
    return state.locations.find(location => location.active && location.clockerKey === key) ?? null;
  },
}));
vi.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({id:'north',name:'Northside Services',timeZone:'Asia/Tokyo',active:true,createdAt:'2030-10-07T00:00:00Z',updatedAt:'2030-10-07T00:00:00Z'}) }));
vi.mock('@/components/clocker-setup', () => import('../../components/clocker-setup'));
vi.mock('next/navigation', () => ({ notFound: () => { throw Error('NOT_FOUND'); } }));
beforeEach(() => {
  state.failed = false;
  state.locations = [{id:'main',workspaceId:'north',name:'Main Office',shortName:'Main',clockerKey:'main-office',active:true},
    {id:'fuel2',workspaceId:'north',name:'FUEL – 2',shortName:'FUEL – 2',clockerKey:'2',active:true},
    {id:'fuel110',workspaceId:'north',name:'FUEL – 110',shortName:'FUEL – 110',clockerKey:'110',active:true}];
});
const render = (location: string) => ClockerPage({ params: Promise.resolve({location}) });
it('resolves configured active Clocker keys and passes required business timezone', async () => {
  const page = await render('main-office');
  expect(page.props).toMatchObject({locationLabel:'Main Office',timeZone:'Asia/Tokyo'});
  const html = renderToStaticMarkup(page);
  expect(html).toContain('Main Office');
  expect(html).toContain('Setup code');
  expect(html).not.toContain('Number 1');
  expect(html).not.toContain('Ready to clock in');
  expect(html).not.toMatch(/manifest|portal-device-settings|install|notification/i);
});
it('uses current configured identity on subsequent requests without changing the key', async () => {
  expect(renderToStaticMarkup(await render('main-office'))).toContain('Main Office');
  state.locations[0].name = 'Renamed Office';
  expect(renderToStaticMarkup(await render('main-office'))).toContain('Renamed Office');
});
it.each(['2','110'])('preserves Fuel compatibility key %s and its configured label', async key => {
  expect(renderToStaticMarkup(await render(key))).toContain(`FUEL – ${key}`);
});
it('returns not-found for inactive and unknown keys', async () => {
  state.locations[0].active = false;
  await expect(render('main-office')).rejects.toThrow('NOT_FOUND');
  await expect(render('not-configured')).rejects.toThrow('NOT_FOUND');
});
it('keeps a database failure unavailable instead of treating it as not-found', async () => {
  state.failed = true;
  await expect(render('main-office')).rejects.toThrow('Location configuration is unavailable.');
});
