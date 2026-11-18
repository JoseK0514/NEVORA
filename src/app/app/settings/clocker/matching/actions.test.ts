import * as setupActual from "@/lib/clocker/setup.server" with { rstest: "importActual" };
import { beforeEach, expect, it, rs } from '@rstest/core';
const m = rs.hoisted(() => ({ proof: rs.fn(), headers: rs.fn(), save: rs.fn(), read: rs.fn() }));
rs.mock('server-only', () => ({}));
rs.mock('next/headers', () => ({ headers: m.headers }));
rs.mock('@/lib/auth/session', () => ({ requireSessionMutationProof: m.proof }));
rs.mock('@/lib/clocker/setup.server', () => {
  const actual = setupActual;
  return { ...actual, clockerSecurity: async () => ({ production: false, origin: undefined }) };
});
rs.mock('@/lib/clocker/schedule-grace.server', () => ({
  saveClockerScheduleGrace: m.save, readClockerScheduleGrace: m.read,
  ClockerScheduleGraceError: class extends Error { constructor(public code: string) { super(code === 'STALE' ? 'Shift matching changed. Reload before saving.' : 'Safe grace error'); } },
}));
import { readClockerGraceAction, saveClockerGraceAction } from './actions';
import { ClockerScheduleGraceError } from '@/lib/clocker/schedule-grace.server';

const form = (extra: Record<string, string | undefined> = {}) => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ earlyClockInGraceMinutes: '10', expectedVersion: '0', ...extra })) if (value !== undefined) data.set(key, value);
  return data;
};
beforeEach(() => {
  rs.clearAllMocks();
  m.proof.mockResolvedValue({ employee: { id: 'owner', role: 'OWNER' }, sessionTokenHash: 'a'.repeat(64) });
  m.headers.mockResolvedValue(new Headers({ host: 'localhost:3000', origin: 'http://localhost:3000' }));
  m.save.mockResolvedValue({ earlyClockInGraceMinutes: 10, version: 1 });
  m.read.mockResolvedValue({ earlyClockInGraceMinutes: 0, version: 0 });
});

it('saves with the server-derived Owner proof and the reviewed version', async () => {
  expect(await saveClockerGraceAction(form())).toEqual({ state: 'available', setting: { earlyClockInGraceMinutes: 10, version: 1 } });
  expect(m.save).toHaveBeenCalledWith({ employeeId: 'owner', sessionTokenHash: 'a'.repeat(64) }, { earlyClockInGraceMinutes: 10, expectedVersion: 0 });
});
it.each(['0', '30'])('accepts the boundary value %s', async minutes => {
  m.save.mockResolvedValue({ earlyClockInGraceMinutes: Number(minutes), version: 3 });
  expect(await saveClockerGraceAction(form({ earlyClockInGraceMinutes: minutes, expectedVersion: '2' }))).toMatchObject({ state: 'available' });
  expect(m.save).toHaveBeenCalledWith(expect.anything(), { earlyClockInGraceMinutes: Number(minutes), expectedVersion: 2 });
});
it.each(['MANAGER', 'LEAD', 'EMPLOYEE'])('only an Owner can save or read: %s is refused', async role => {
  m.proof.mockResolvedValue({ employee: { id: 'other', role }, sessionTokenHash: 'a'.repeat(64) });
  expect(await saveClockerGraceAction(form())).toMatchObject({ state: 'rejected', code: 'FORBIDDEN' });
  expect(await readClockerGraceAction()).toMatchObject({ state: 'rejected', code: 'FORBIDDEN' });
  expect(m.save).not.toHaveBeenCalled(); expect(m.read).not.toHaveBeenCalled();
});
it.each([
  { earlyClockInGraceMinutes: '-1' }, { earlyClockInGraceMinutes: '31' }, { earlyClockInGraceMinutes: '1.5' }, { earlyClockInGraceMinutes: '1e1' },
  { earlyClockInGraceMinutes: '010' }, { earlyClockInGraceMinutes: '' }, { earlyClockInGraceMinutes: ' 10' }, { earlyClockInGraceMinutes: undefined },
  { expectedVersion: '-1' }, { expectedVersion: '1.5' }, { expectedVersion: undefined }, { actorEmployeeId: 'forged' },
])('rejects malformed or forged input %o before saving', async extra => {
  expect(await saveClockerGraceAction(form(extra))).toMatchObject({ state: 'rejected', code: 'INVALID' });
  expect(m.save).not.toHaveBeenCalled();
});
it('rejects duplicate fields and cross-origin requests', async () => {
  const data = form(); data.append('earlyClockInGraceMinutes', '5');
  expect(await saveClockerGraceAction(data)).toMatchObject({ state: 'rejected', code: 'INVALID' });
  m.headers.mockResolvedValue(new Headers({ host: 'localhost:3000', origin: 'https://evil.invalid' }));
  expect(await saveClockerGraceAction(form())).toMatchObject({ state: 'rejected', code: 'ORIGIN_REJECTED' });
  expect(m.save).not.toHaveBeenCalled();
});
it('passes a stale or forbidden save through as its own refusal', async () => {
  m.save.mockRejectedValue(new (ClockerScheduleGraceError as unknown as new (code: string) => Error)('STALE'));
  expect(await saveClockerGraceAction(form())).toEqual({ state: 'rejected', code: 'STALE', message: 'Shift matching changed. Reload before saving.' });
});
it('an uncertain save asks for a reload and never exposes database text', async () => {
  m.save.mockRejectedValue(Error('SQL credential secret'));
  const result = await saveClockerGraceAction(form());
  expect(result).toMatchObject({ state: 'unavailable' }); expect(JSON.stringify(result)).not.toMatch(/SQL|credential|secret/);
  m.read.mockRejectedValue(Error('SQL credential secret'));
  expect(JSON.stringify(await readClockerGraceAction())).not.toMatch(/SQL|credential|secret/);
});
it('reads the setting for an Owner', async () => {
  expect(await readClockerGraceAction()).toEqual({ state: 'available', setting: { earlyClockInGraceMinutes: 0, version: 0 } });
  expect(m.read).toHaveBeenCalledWith({ employeeId: 'owner', sessionTokenHash: 'a'.repeat(64) });
});
