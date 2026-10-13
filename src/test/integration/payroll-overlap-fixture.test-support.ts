import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { SqlExecutor } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { registerClockerDevice, redeemClockerEnrollment } from '../../lib/clocker/devices.server';
import { readTimecards, mutateTimecard } from '../../lib/timecards/service';
import { readPeriodClose, savePeriodPopulation } from '../../lib/period-close/service';
import { command, readRun, saveSettings } from '../../lib/payroll/service';
import { saveNativeProfile } from '../../lib/payroll/native/profiles.server';
import { input } from '../../lib/payroll/native/fixtures.test-support';
import { fictionalWorkweekPolicy } from '../../lib/payroll/native/workweek-fixtures.test-support';

export const overlapFirstPeriod = { startDate: '2026-09-21', endDate: '2026-09-27' };
export const overlapSecondPeriod = { startDate: '2026-09-22', endDate: '2026-09-26' };
export const overlapPayday = '2026-09-29';

/** Fictional facts only; caller owns the marked disposable database and teardown. */
export async function seedNativeOverlapFixture(ex: SqlExecutor) {
    const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) => ex.query<T>({ text, values });
    const [identity] = await q<{ name: string; marker: string }>("SELECT current_database() name,shobj_description(oid,'pg_database') marker FROM pg_database WHERE datname=current_database()");
    if (!/^nevora_(exchange|foundation)_test_/.test(identity.name) || !identity.marker?.startsWith('fuel-phase3-disposable:')) throw Error('Owned overlap database required');
    await q(await readFile('db/migrations/0031_native_payroll.sql', 'utf8'));
    const employees = Array.from({ length: 6 }, (_, i) => `NQ2-E${i + 1}`);
    const roles = { owner: 'OWNER', full: 'MANAGER', partial: 'MANAGER', revoked: 'MANAGER', lead: 'LEAD', foreign: 'OWNER', expired: 'OWNER' } as const;
    const actors = {} as Record<keyof typeof roles, { proof: SessionMutationProof; token: string }>;
    for (const [name, role] of Object.entries(roles) as [keyof typeof roles, typeof roles[keyof typeof roles]][]) {
        const id = `NQ2-${name}`, location = 'loc-1';
        await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional',$2,'555-NQ2',$3,$4)", [id, name, role, location]);
        const token = `fictional-nqaf002-${randomUUID()}`, sessionTokenHash = createHash('sha256').update(token).digest('hex');
        // This schema permits one workspace. A foreign session has no local binding.
        if (name !== 'foreign') await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')", [sessionTokenHash, id]);
        actors[name] = { token, proof: { sessionTokenHash, employee: { id, role, firstName: 'Fictional', lastName: name, primaryLocationId: location } } };
    }
    const owner = actors.owner.proof;
    for (const id of employees) await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Overlap worker','555-NQ2','EMPLOYEE','loc-1')", [id]);
    await q("INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT id,'loc-1' FROM employees WHERE primary_location_id='loc-1'");
    await saveSettings(owner, { action: 'SAVE_SETTINGS', operationId: randomUUID(), expectedRevision: 0, effectiveFrom: '2026-01-01', reason: 'Fictional overlap contract', preferences: { companyName: 'Fictional overlap company', language: 'en', currency: 'USD', schedule: { frequency: 'WEEKLY', anchorDate: overlapFirstPeriod.startDate, paydayOffsetDays: 2 }, rules: [], automation: { prepare: true, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null } }, ex);
    for (const name of ['full', 'partial', 'revoked'] as const) {
        await saveNativeProfile(owner, { action: 'SET_MANAGER_SCOPE', operationId: randomUUID(), reason: 'Fictional finite scope', expectedRevision: 0, employeeId: actors[name].proof.employee.id, review: true, approve: true, locationIds: name === 'partial' ? ['loc-1'] : ['loc-1', 'loc-2'] }, ex);
    }
    await saveNativeProfile(owner, { action: 'SET_MANAGER_SCOPE', operationId: randomUUID(), reason: 'Fictional approval revocation', expectedRevision: 1, employeeId: actors.revoked.proof.employee.id, review: true, approve: false, locationIds: ['loc-1', 'loc-2'] }, ex);
    const device = await registerClockerDevice({ employeeId: owner.employee.id, sessionTokenHash: owner.sessionTokenHash }, { name: 'Fictional overlap clock', locationId: 'loc-1' }, ex);
    const enrollment = await redeemClockerEnrollment({ enrollmentToken: device.enrollmentToken, locationKey: '2' }, ex);
    const otherDevice = await registerClockerDevice({ employeeId: owner.employee.id, sessionTokenHash: owner.sessionTokenHash }, { name: 'Fictional context clock', locationId: 'loc-2' }, ex);
    const otherEnrollment = await redeemClockerEnrollment({ enrollmentToken: otherDevice.enrollmentToken, locationKey: '110' }, ex);
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('nq2-retained-context',$1,'loc-2',$2,'2026-09-16T12:00:00Z','2026-09-16T13:00:00Z','CLOCKED_OUT',1)", [employees[0], otherEnrollment.device.id]);
    const context = { startDate: '2026-09-14', endDate: '2026-09-29' };
    for (const id of employees) {
        await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)", [`nq2-time-${id}`, id, enrollment.device.id]);
        const cards = await readTimecards(owner, context, ex);
        if (cards.state !== 'ready') throw Error('Fictional overlap time unavailable');
        const card = cards.cards.find(c => c.source.employeeId === id)!;
        for (const [index, action] of (['APPROVE', 'FINALIZE'] as const).entries()) {
            const result = await mutateTimecard(owner, { operationId: randomUUID(), employeeId: id, ...context, action, expectedRevision: card.revision + index, expectedSourceHash: card.sourceHash }, ex);
            if (result.status !== (action === 'APPROVE' ? 'approved' : 'finalized')) throw Error('Fictional overlap time finalization failed');
        }
        const i = input(); i.wages[0].locationIds = ['loc-1', 'loc-2']; i.wages[0].hourlyRateMinor = '2500'; i.wages[0].workweekPolicy = fictionalWorkweekPolicy(id); i.wages[0].wageCentRounding = 'UNVERIFIED'; i.tax!.prCentRounding = 'UNVERIFIED'; i.tax!.ruleEvidenceReference = null;
        await saveNativeProfile(owner, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), expectedRevision: 0, reason: 'Fictional independently attested facts', configuration: { schema: 'NEVORA_NATIVE_CONFIGURATION_V1', employeeId: id, wages: i.wages, tax: i.tax, deductions: i.deductions } }, ex);
        await saveNativeProfile(owner, { action: 'ATTEST_OPENING_YTD', operationId: randomUUID(), expectedRevision: 0, reason: 'Fictional attested opening zero', employeeId: id, ytd: i.ytd }, ex);
    }
    for (const period of [overlapFirstPeriod, overlapSecondPeriod]) {
        const close = await readPeriodClose(owner, period, ex);
        await savePeriodPopulation(owner, { operationId: randomUUID(), expectedRevision: 0, sourceHash: close.sourceHash, ...period, members: close.members.map(m => ({ employeeId: m.employeeId, disposition: employees.includes(m.employeeId) ? 'INCLUDE' : 'EXCLUDE', reason: 'Fictional reviewed population', employmentFacts: 'Fictional employee facts', employmentBasis: 'MANAGER_ATTESTED' })) }, ex);
    }
    const prepare = async (period: typeof overlapFirstPeriod, actor = owner) => {
        const receipt = await command(actor, { action: 'PREPARE', operationId: randomUUID(), period, payday: overlapPayday }, ex);
        return readRun(actor, receipt.runId!, ex);
    };
    return { q, ex, actors, employees, prepare };
}
