import { it, expect, vi } from 'vitest';
vi.mock('@/lib/db', () => import('../db'));
import { getShiftValidationContext } from './schedules';
import { validateShift } from '../scheduling/validate-shift';
import { fictionalProfile, configured } from '../../test/fixtures/shift-changes';
import type { SqlExecutor } from '../notifications/types';
it('A096 manual context loads configured rule and complete dated rest ledger', async () => {
    const profile = fictionalProfile();
    profile.maximumShift = configured({ minutes: 420, timeBasis: 'WALL_CLOCK' });
    const executor: SqlExecutor = { transaction: vi.fn(), query: vi.fn(async ({ text, values }) => {
            if (text.includes('SELECT e.active'))
                return [{ active: true, role: 'EMPLOYEE', position_ids: [], eligible_location_ids: ['loc'], maximum_weekly_hours: 40, operational_rule_profile: profile }];
            if (text.includes('FROM shifts sh')) {
                expect(values).toEqual(['e']);
                return [];
            }
            if (text.includes('FROM availability_windows'))
                return [{ day_of_week: 1, start_time: '00:00', end_time: '24:00' }];
            if (text.includes('FROM locations l'))
                return [{ id: 'loc', workspace_id: 'work', active: true, workspace_active: true, time_zone: 'America/Puerto_Rico' }];
            return [];
        }) as SqlExecutor['query'] };
    const context = await getShiftValidationContext({ employeeId: 'e', locationId: 'loc', date: '2026-10-05', weekStart: '2026-10-05' }, executor);
    expect(context).not.toBeNull();
    expect(validateShift({ ...context!, candidate: { employeeId: 'e', locationId: 'loc', date: '2026-10-05', startTime: '08:00', endTime: '16:00' }, mode: 'MANAGER_SCHEDULE' }).blockers.map(b => b.code)).toContain('MAX_SHIFT_HOURS');
});
