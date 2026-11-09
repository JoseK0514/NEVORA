import { describe, expect, it } from 'vitest';
import type { SqlExecutor } from '../notifications/types';
import { readActivePresentation, updatesActivationHeld } from './service';

/* Release 1: Updates counts as off wherever its live activation (D04) is held; the Owner's switch applies once it opens. */
const executor = (row: Record<string, unknown> | null, fail = false): SqlExecutor => ({
  query: async <T,>() => { if (fail) throw Error('down'); return (row ? [row] : []) as T[]; },
  transaction: async () => [],
});
const stored = { revision: 3, settings: { version: 1, brand: { tokens: null, logoAssetId: null }, modules: { disabled: ['timeOff'] } } };

describe('Updates while its activation is held', () => {
  it('turns Updates off and keeps every other module setting', async () => {
    const read = await readActivePresentation('w', executor({ ...stored, updatesLive: false }));
    expect(read.modules.updates).toBe(false);
    expect(read.modules.timeOff).toBe(false);
    expect(read.modules.marketplace).toBe(true);
    expect(read.revision).toBe(3);
  });
  it('turns Updates off for a company that never saved settings', async () => {
    const read = await readActivePresentation('w', executor({ revision: null, settings: null, updatesLive: false }));
    expect(read.revision).toBe(0);
    expect(read.modules).toMatchObject({ updates: false, timeOff: true, marketplace: true, payStatements: true, breaks: true });
  });
  it('leaves the Owner’s switch in charge once activation opens', async () => {
    expect((await readActivePresentation('w', executor({ ...stored, updatesLive: true }))).modules.updates).toBe(true);
    const off = { ...stored, settings: { ...stored.settings, modules: { disabled: ['updates'] } }, updatesLive: true };
    expect((await readActivePresentation('w', executor(off))).modules.updates).toBe(false);
  });
  it('reports held unless the database proves activation is open', async () => {
    expect(await updatesActivationHeld(executor({ live: false }))).toBe(true);
    expect(await updatesActivationHeld(executor(null))).toBe(true);
    expect(await updatesActivationHeld(executor(null, true))).toBe(true);
    expect(await updatesActivationHeld(executor({ live: true }))).toBe(false);
  });
});
