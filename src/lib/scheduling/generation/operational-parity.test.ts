import { it, expect } from 'vitest';
import { automaticWeek, automaticAssignment } from '../../../test/fixtures/automatic-week';
import { fictionalProfile, configured } from '../../../test/fixtures/shift-changes';
import { planWeek } from './planner';
it('A096 generation applies configured operational rule without activating unknown profiles globally', () => { const i = automaticWeek(); expect(planWeek(i).additions.length).toBeGreaterThan(0); for (const e of i.employees) {
    e.operationalProfile = fictionalProfile();
    e.operationalProfile.maximumShift = configured({ minutes: 0, timeBasis: 'WALL_CLOCK' });
} expect(planWeek(i).additions).toEqual([]); });
it('A090 generator respects rest against distant retained commitments', () => { const i = automaticWeek(); for (const e of i.employees) {
    e.operationalProfile = fictionalProfile();
    e.operationalProfile.minimumRest = configured({ minutes: 60 * 24 * 40, timeBasis: 'ELAPSED' });
    i.ledger.push(automaticAssignment(`past-${e.id}`, e.id, { date: '2026-09-05', locationId: 'loc-1' }));
} expect(planWeek(i).additions).toEqual([]); });
