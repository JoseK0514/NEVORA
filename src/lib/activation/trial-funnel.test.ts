import { describe, expect, it, vi } from 'vitest';
import { readTrialFunnel } from './trial-funnel.server';

const cohortStart = '2025-01-06';
const workspace = (index: number) => '00000000-0000-0000-0000-' + String(index).padStart(12, '0');
const data = () => {
  const control = { query: vi.fn(async () => ({
    rows: Array.from({ length: 40 }, (_, i) => ({
      verified: i < 30, workspaceId: i < 20 ? workspace(i) : null, ownerActivated: i < 10,
    })),
  })) };
  const commerce = { query: vi.fn(async () => ({
    rows: Array.from({ length: 20 }, (_, i) => ({
      workspaceId: workspace(i), checkoutCreated: i < 10, paid: i < 10,
    })),
  })) };
  return { control, commerce };
};

describe('read-only trial cohorts', () => {
  it('aggregates the existing records and returns both paid rates without join identifiers', async () => {
    const { control, commerce } = data();
    const result = await readTrialFunnel(control, commerce, 'test', cohortStart);
    expect(result).toEqual({
      state: 'ready', cohortStart, cohortEndExclusive: '2025-01-13', observedOn: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      counts: { requested: 40, verified: 30, workspaceReserved: 20, trialStarted: 20, ownerActivated: 10, checkoutCreated: 10, paid: 10 },
      requestToPaidRate: 0.25, trialToPaidRate: 0.5,
    });
    expect(control.query).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^[\s\n]*SELECT/), [
      'test', new Date('2025-01-06T00:00:00Z'), new Date('2025-01-13T00:00:00Z'),
    ]);
    expect(commerce.query).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^[\s\n]*SELECT/), [
      'test', Array.from({ length: 20 }, (_, i) => workspace(i)),
    ]);
  });

  it('suppresses small cohorts without reading Commerce and suppresses small stage differences', async () => {
    const { control, commerce } = data();
    control.query.mockResolvedValueOnce({ rows: [{ verified: true, workspaceId: workspace(0), ownerActivated: true }] });
    const suppressed = { state: 'suppressed', cohortStart, cohortEndExclusive: '2025-01-13' };
    expect(await readTrialFunnel(control, commerce, 'test', cohortStart)).toEqual(suppressed);
    expect(commerce.query).not.toHaveBeenCalled();

    const { rows } = await commerce.query();
    rows[9].paid = false;
    commerce.query.mockResolvedValueOnce({ rows });
    expect(await readTrialFunnel(control, commerce, 'test', cohortStart)).toEqual(suppressed);
  });

  it('distinguishes a valid zero from an unavailable source and rejects an invalid cohort', async () => {
    const { control, commerce } = data();
    commerce.query.mockResolvedValueOnce({ rows: [] });
    expect(await readTrialFunnel(control, commerce, 'test', cohortStart)).toMatchObject({
      state: 'ready', counts: { trialStarted: 0, paid: 0 }, requestToPaidRate: 0, trialToPaidRate: null,
    });
    commerce.query.mockRejectedValueOnce(Error('private diagnostic'));
    expect(await readTrialFunnel(control, commerce, 'test', cohortStart)).toEqual({ state: 'unavailable' });
    await expect(readTrialFunnel(control, commerce, 'test', '2025-01-07')).rejects.toThrow('Invalid UTC cohort week');
  });
});
