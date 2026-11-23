// Signed-in Spanish, second release (es-rest R2): Team's server actions answer in the person's language. Same result
// shapes; only the sentence changes. English is covered by each action's own test (readPageLang falls back).
import * as setupActual from '@/lib/clocker/setup.server' with { rstest: 'importActual' };
import { beforeEach, expect, it, rs } from '@rstest/core';
const m = rs.hoisted(() => ({ lang: 'es' as 'en' | 'es', headers: rs.fn(), save: rs.fn() }));
rs.mock('server-only', () => ({}));
rs.mock('@/lib/i18n/page-lang.server', () => ({ readPageLang: async () => m.lang }));
rs.mock('next/cache', () => ({ revalidatePath: rs.fn() }));
rs.mock('next/headers', () => ({ headers: m.headers }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: async () => ({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) }) }));
rs.mock('@/lib/auth/permissions', () => ({ MANAGER_ROLES: ['OWNER', 'MANAGER'], requireRoles: async () => ({ id: 'owner', role: 'OWNER' }) }));
rs.mock('@/lib/clocker/setup.server', () => ({ ...setupActual, clockerSecurity: async () => ({ production: false, origin: undefined }) }));
rs.mock('@/lib/company-access/operational-scope.server', () => ({ assertOperationalAccess: async () => {}, isOperationalAuthorizationError: () => false }));
rs.mock('@/lib/data/employees', () => ({ saveEmployeeSchedulingProfile: m.save }));
rs.mock('@/lib/clocker/pin-crypto.server', () => ({ readPinKey: () => 'key' }));
rs.mock('@/lib/clocker/pins.server', () => ({ setEmployeeClockerPin: rs.fn(), ClockerPinError: class extends Error {} }));
rs.mock('@/lib/clocker/pin-operations.server', () => ({ readClockerPinOperation: rs.fn() }));
import { EMPLOYEES_ACTIONS_COPY } from './actions-copy';
import { createEmployeeFormAction, saveEmployeeSchedulingProfileAction } from './actions';
import { saveClockerPinAction } from './[employeeId]/clocker-pin/actions';

const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
beforeEach(() => { rs.clearAllMocks(); m.lang = 'es'; m.headers.mockResolvedValue(new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' })); });

it('holds the same keys in English and Spanish', () => {
  expect(Object.keys(EMPLOYEES_ACTIONS_COPY.es).sort()).toEqual(Object.keys(EMPLOYEES_ACTIONS_COPY.en).sort());
});

it('answers Team saves in Spanish with the same result shape', async () => {
  expect(await createEmployeeFormAction(form({ nope: 'x' }))).toEqual({ state: 'invalid', fieldErrors: [{ field: 'command', message: EMPLOYEES_ACTIONS_COPY.es.submitCommand }] });
  m.save.mockResolvedValueOnce({ updatedAt: 'v2' });
  expect(await saveEmployeeSchedulingProfileAction(form({ employeeId: 'e1', expectedUpdatedAt: 'v1' }))).toEqual({ success: 'Perfil de horario actualizado.', updatedAt: 'v2' });
  m.save.mockRejectedValueOnce(new Error('profile_stale'));
  expect(await saveEmployeeSchedulingProfileAction(form({ employeeId: 'e1', expectedUpdatedAt: 'v1' }))).toEqual({ error: EMPLOYEES_ACTIONS_COPY.es.profileStale });
});

it('answers the Clocker PIN form in Spanish', async () => {
  const pin = form({ employeeId: 'e1', pin: '1234', confirmPin: '4321', expectedVersion: '0', operationId: '00000000-0000-4000-8000-000000000000' });
  expect(await saveClockerPinAction(pin)).toEqual({ ok: false, error: 'Escribe el mismo PIN de cuatro dígitos dos veces.' });
  m.lang = 'en';
  expect(await saveClockerPinAction(pin)).toEqual({ ok: false, error: 'Enter the same four-digit PIN twice.' });
});
