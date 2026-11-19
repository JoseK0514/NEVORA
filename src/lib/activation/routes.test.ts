import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  proof: vi.fn(),
  fallback: vi.fn(),
  languageTransaction: vi.fn(),
  readChecklist: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ readSessionMutationProof: mocks.proof }));
vi.mock('@/lib/auth-lang.server', () => ({ readAuthLang: mocks.fallback }));
vi.mock('@/lib/data/sql-executor', () => ({ neonNotificationExecutor: () => ({ transaction: mocks.languageTransaction }) }));
vi.mock('@/lib/activation/first-week.server', () => ({ readFirstWeek: mocks.readChecklist }));

import { GET as language, PUT as saveLanguage } from '@/app/api/account/language/route';
import { GET as checklist } from '@/app/api/setup/first-week/route';

const origin = 'https://fictional.example.invalid';
const employee = { sessionTokenHash: 'a'.repeat(64), employee: { id: 'same-account', role: 'EMPLOYEE' } };
const languageRow = (value: string | null) => [[], [], [], [], [{ language: value }]];
const owner = { employee: { id: 'owner', role: 'OWNER' } };
const read = (path: string, intent: string, site = 'same-origin') => new Request(origin + path, {
  headers: { [intent]: '1', 'sec-fetch-site': site },
});
const put = (body: string, suppliedOrigin = origin) => new Request(origin + '/api/account/language', {
  method: 'PUT',
  headers: {
    'x-nevora-language-preference': '1',
    'sec-fetch-site': 'same-origin',
    origin: suppliedOrigin,
    'content-type': 'application/json',
  },
  body,
});

beforeEach(() => {
  vi.stubEnv('NEVORA_WORKSPACE_MODE', 'single_company');
  vi.stubEnv('FUEL_PORTAL_ORIGIN', origin);
  vi.resetAllMocks();
});
afterEach(() => vi.unstubAllEnvs());

describe('language endpoint', () => {
  it('reads the saved language before any browser fallback', async () => {
    mocks.proof.mockResolvedValue(employee);
    mocks.languageTransaction.mockResolvedValue(languageRow('es'));
    const response = await language(read('/api/account/language', 'x-nevora-language-preference'));
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ state: 'ready', savedLanguage: 'es', language: 'es' });
    expect(mocks.fallback).not.toHaveBeenCalled();
  });

  it('preserves an unset preference and renders using the device fallback', async () => {
    mocks.proof.mockResolvedValue(employee);
    mocks.languageTransaction.mockResolvedValue(languageRow(null));
    mocks.fallback.mockResolvedValue('es');
    const response = await language(read('/api/account/language', 'x-nevora-language-preference'));
    expect(await response.json()).toEqual({ state: 'ready', savedLanguage: null, language: 'es' });
    expect(mocks.languageTransaction.mock.calls[0][0][4].text).toMatch(/^SELECT p.language/);
  });

  it.each([
    ['{"language":"fr"}'],
    ['{"language":"es-PR"}'],
    ['{"language":"es","employeeId":"another"}'],
    ['{"language":null}'],
    ['{'],
    [' '.repeat(130) + '{"language":"es"}'],
  ])('replies 400 for an unsupported or malformed preference', async body => {
    mocks.proof.mockResolvedValue(employee);
    expect((await saveLanguage(put(body))).status).toBe(400);
    expect(mocks.languageTransaction).not.toHaveBeenCalled();
  });

  it('requires a session and allows an explicit same-origin choice', async () => {
    const command = '{"language":"es"}';
    mocks.proof.mockResolvedValue(null);
    expect((await saveLanguage(put(command))).status).toBe(401);
    mocks.proof.mockResolvedValue(employee);
    expect((await saveLanguage(put(command, 'https://other.example.invalid'))).status).toBe(403);
    mocks.languageTransaction.mockResolvedValue(languageRow('es'));
    const response = await saveLanguage(put(command));
    expect(await response.json()).toEqual({ state: 'ready', savedLanguage: 'es', language: 'es' });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(mocks.languageTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.languageTransaction.mock.calls[0][0][4].values).toEqual([employee.employee.id, 'es']);
  });

  it('returns unavailable on a storage failure without trying another language', async () => {
    mocks.proof.mockResolvedValue(employee);
    mocks.languageTransaction.mockRejectedValue(Error('private database diagnostic'));
    const response = await language(read('/api/account/language', 'x-nevora-language-preference'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ state: 'unavailable' });
    expect(mocks.fallback).not.toHaveBeenCalled();
  });
});

describe('first-week setup endpoint', () => {
  it('admits only same-origin Owners', async () => {
    const request = () => read('/api/setup/first-week', 'x-nevora-first-week');
    mocks.proof.mockResolvedValue(null);
    expect((await checklist(request())).status).toBe(401);
    mocks.proof.mockResolvedValue({ employee: { role: 'MANAGER' } });
    expect((await checklist(request())).status).toBe(403);
    mocks.proof.mockResolvedValue(owner);
    expect((await checklist(read('/api/setup/first-week', 'x-nevora-first-week', 'cross-site'))).status).toBe(403);
    expect(mocks.readChecklist).not.toHaveBeenCalled();
    mocks.readChecklist.mockResolvedValue({ state: 'ready', steps: [], completedCount: 0, nextStep: 'ROSTER' });
    const response = await checklist(request());
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.readChecklist).toHaveBeenCalledExactlyOnceWith(owner);
  });
});
