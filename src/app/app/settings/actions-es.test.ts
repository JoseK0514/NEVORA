// Signed-in Spanish, second release (es-rest R2): Settings' server actions answer in the person's language. Same result
// shapes and codes; only the sentence changes. English is covered by each action's own test (readPageLang falls back).
import * as locationsActual from '@/lib/data/locations' with { rstest: 'importActual' };
import * as setupActual from '@/lib/clocker/setup.server' with { rstest: 'importActual' };
import { beforeEach, expect, it, rs } from '@rstest/core';
const m = rs.hoisted(() => ({ lang: 'es' as 'en' | 'es', workspace: rs.fn(), location: rs.fn(), grace: rs.fn(), headers: rs.fn() }));
rs.mock('server-only', () => ({}));
rs.mock('@/lib/i18n/page-lang.server', () => ({ readPageLang: async () => m.lang }));
rs.mock('next/cache', () => ({ revalidatePath: rs.fn() }));
rs.mock('next/headers', () => ({ headers: m.headers }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => ({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) }) }));
rs.mock('@/lib/auth/permissions', () => ({ requireRoles: async () => ({ id: 'owner', role: 'OWNER' }) }));
rs.mock('@/lib/data/workspaces', () => ({ getWorkspace: async () => ({ timeZone: 'America/Puerto_Rico' }), saveWorkspaceProfile: m.workspace }));
rs.mock('@/lib/data/locations', () => ({ ...locationsActual, createLocation: m.location, updateLocation: m.location }));
rs.mock('@/lib/clocker/setup.server', () => ({ ...setupActual, clockerSecurity: async () => ({ production: false, origin: undefined }) }));
rs.mock('@/lib/clocker/schedule-grace.server', () => ({
  saveClockerScheduleGrace: m.grace, readClockerScheduleGrace: m.grace,
  ClockerScheduleGraceError: class extends Error { constructor(public code: string) { super('Shift matching changed. Reload before saving.'); } },
}));
import { SETTINGS_ACTIONS_COPY } from './actions-copy';
import { SERVER_MESSAGES_ES, serverMessage } from '@/lib/i18n/server-messages';
import { createLocationAction, saveWorkspaceProfileAction, updateLocationAction } from './actions';
import { saveClockerGraceAction } from './clocker/matching/actions';
import { ClockerScheduleGraceError } from '@/lib/clocker/schedule-grace.server';
import { LocationConcurrencyError } from '@/lib/data/locations';

const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
beforeEach(() => { rs.clearAllMocks(); m.lang = 'es'; m.headers.mockResolvedValue(new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' })); });

it('holds the same keys in English and Spanish, and passes unknown lib sentences through unchanged', () => {
  expect(Object.keys(SETTINGS_ACTIONS_COPY.es).sort()).toEqual(Object.keys(SETTINGS_ACTIONS_COPY.en).sort());
  for (const [english, spanish] of Object.entries(SERVER_MESSAGES_ES)) { expect(spanish).not.toBe(english); expect(spanish).not.toMatch(/[¡!]/); }
  expect(serverMessage('es', 'Location not found.')).toBe('No encontramos la localidad.');
  expect(serverMessage('en', 'Location not found.')).toBe('Location not found.');
  expect(serverMessage('es', 'Something new from lib.')).toBe('Something new from lib.');
});

it('answers saves and failures in Spanish with the same result shape', async () => {
  m.workspace.mockResolvedValue(undefined);
  expect(await saveWorkspaceProfileAction(form({ name: 'Café Fictional' }))).toEqual({ success: 'Perfil de la empresa guardado.' });
  m.location.mockResolvedValueOnce({ id: 'l1' });
  expect(await createLocationAction(form({ name: 'Condado', shortName: 'Condado' }))).toEqual({ success: SETTINGS_ACTIONS_COPY.es.locationAdded });
  m.location.mockRejectedValueOnce(new LocationConcurrencyError());
  expect(await updateLocationAction(form({ id: 'l1', name: 'Condado', shortName: 'Condado', expectedUpdatedAt: 'x' })))
    .toEqual({ error: 'La localidad cambió mientras la editabas. Tus datos siguen aquí; recarga y revisa los detalles más recientes antes de guardar.' });
  m.location.mockRejectedValueOnce(new Error('duplicate key value'));
  expect(await createLocationAction(form({ name: 'Condado', shortName: 'Condado' }))).toEqual({ error: SETTINGS_ACTIONS_COPY.es.saveFailed });
});

it('answers Shift matching in Spanish, codes unchanged', async () => {
  expect(await saveClockerGraceAction(form({ earlyClockInGraceMinutes: '45', expectedVersion: '0' })))
    .toEqual({ state: 'rejected', code: 'INVALID', message: 'Escribe un número entero de minutos, de 0 a 30.' });
  m.grace.mockRejectedValueOnce(new ClockerScheduleGraceError('STALE'));
  expect(await saveClockerGraceAction(form({ earlyClockInGraceMinutes: '10', expectedVersion: '0' })))
    .toEqual({ state: 'rejected', code: 'STALE', message: 'La coincidencia de turnos cambió. Recarga antes de guardar.' });
  m.grace.mockRejectedValueOnce(new Error('network'));
  expect(await saveClockerGraceAction(form({ earlyClockInGraceMinutes: '10', expectedVersion: '0' })))
    .toEqual({ state: 'unavailable', message: SETTINGS_ACTIONS_COPY.es.matchingUnconfirmed });
  m.lang = 'en';
  expect((await saveClockerGraceAction(form({ earlyClockInGraceMinutes: '45', expectedVersion: '0' }))) as { message: string })
    .toMatchObject({ message: 'Enter a whole number of minutes from 0 to 30.' });
});
