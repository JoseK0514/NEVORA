import { it, expect } from 'vitest';
import { fictionalSnapshot, fictionalTerms, configured } from '../../test/fixtures/shift-changes';
import { automaticAssignment } from '../../test/fixtures/automatic-week';
import { evaluateShiftChange } from './shift-change-evaluation';
const accept = { kind: 'ACCEPT' as const, requestId: 'request', expectedRevision: 1, operationId: 'op' };
it('A009 coverage evaluates final ledger without outgoing owner', () => { expect(evaluateShiftChange(fictionalSnapshot(), accept)).toMatchObject({ decision: 'ELIGIBLE', proposedAssignments: [{ shiftId: 'source', employeeId: 'e2' }], affectedWeeks: ['2026-10-05'] }); });
it('A009 swaps remove both outgoing shifts even when they overlap', () => { const s = fictionalSnapshot(); const target = fictionalTerms('target', 'e2'); s.ledger = [...s.ledger, target]; s.facts.ledger.push(automaticAssignment('target', 'e2', { positionId: 'barista', scheduleStatus: 'PUBLISHED' })); s.request!.kind = 'SWAP'; s.request!.targetEmployeeId = 'e2'; s.request!.requesterConsent!.target = target; expect(evaluateShiftChange(s, accept)).toMatchObject({ decision: 'ELIGIBLE', proposedAssignments: [{ shiftId: 'source', employeeId: 'e2' }, { shiftId: 'target', employeeId: 'e1' }] }); });
it.each(['active', 'location', 'position', 'lead', 'leave', 'overlap', 'sameDay'])('A023–A029 blocks %s', kind => { const s = fictionalSnapshot(); const e = s.facts.employees[1]; if (kind === 'active')
    e.active = false; if (kind === 'location')
    e.eligibleLocationIds = []; if (kind === 'position')
    e.positionIds = []; if (kind === 'lead') {
    s.ledger[0].isDesignatedLead = true;
    s.request!.requesterConsent!.source.isDesignatedLead = true;
} if (kind === 'leave')
    e.approvedTimeOff = [{ startDate: '2026-10-05', endDate: '2026-10-05', status: 'APPROVED' }]; if (kind === 'overlap' || kind === 'sameDay')
    s.facts.ledger.push(automaticAssignment('other', 'e2', { locationId: 'loc-2', startTime: kind === 'overlap' ? '09:00' : '18:00', endTime: kind === 'overlap' ? '12:00' : '20:00' })); expect(evaluateShiftChange(s, accept).decision).toBe('BLOCKED'); });
it('A035/A036 ignores unrelated setup and preexisting staffing gaps', () => { const s = fictionalSnapshot(); s.facts.staffing = s.facts.staffing.slice(0, 1); expect(evaluateShiftChange(s, accept).decision).toBe('ELIGIBLE'); });
it.each([42, 45])('A094 projected %s separates threshold from cap', hours => { const s = fictionalSnapshot(); s.facts.employees[1].maximumWeeklyHours = 44; s.facts.employees[1].targetWeeklyHours = 24; s.profiles[1].profile.projectedOvertime = configured({ weeklyMinutes: 2400, timeBasis: 'WALL_CLOCK', routing: 'MANAGER_REVIEW' }); s.facts.ledger.push(automaticAssignment('hours', 'e2', { date: '2026-10-06', startTime: '00:00', endDate: '2026-10-07', endTime: `${hours - 32}:00` })); expect(evaluateShiftChange(s, accept).decision).toBe(hours === 42 ? 'MANAGER_REVIEW' : 'BLOCKED'); });
it('A093/A095 manager mode cannot override unknown rest', () => { const s = fictionalSnapshot(); s.profiles[1].profile.minimumRest = { status: 'UNKNOWN' }; s.policy!.coverage.mode = 'MANAGER_REVIEW'; expect(evaluateShiftChange(s, accept).decision).toBe('UNVERIFIED'); });
it('A009 evaluates actual EMPLOYEE_PENDING swap lifecycle', () => { const s = fictionalSnapshot(), target = fictionalTerms('target', 'e2'); s.ledger = [...s.ledger, target]; s.facts.ledger.push(automaticAssignment('target', 'e2', { positionId: 'barista', scheduleStatus: 'PUBLISHED' })); Object.assign(s.request!, { kind: 'SWAP', status: 'EMPLOYEE_PENDING', targetEmployeeId: 'e2' }); s.request!.requesterConsent!.target = target; expect(evaluateShiftChange(s, accept).decision).toBe('ELIGIBLE'); });
it.each(['episode', 'time', 'publication'])('A097 stale %s never authorizes a final ledger', change => { const s = fictionalSnapshot(); s.ledger = structuredClone(s.ledger); if (change === 'episode')
    s.ledger[0].assignmentEpisodeId = 'returned-owner-new-episode'; if (change === 'time')
    s.ledger[0].endTime = '17:00'; if (change === 'publication')
    s.publication = [{ scheduleId: 's-loc-1', status: 'DRAFT' }]; expect(evaluateShiftChange(s, accept).decision).toBe('BLOCKED'); });
it('A027 empty submitted weekly snapshot and partial-day exceptions block', () => { const s = fictionalSnapshot(); s.facts.employees[1].weeklyAvailability = [{ weekStart: '2026-10-05', submitted: true, usesNormalAvailability: false, windows: [] }]; expect(evaluateShiftChange(s, accept).decision).toBe('BLOCKED'); s.facts.employees[1].weeklyAvailability = []; s.facts.employees[1].availabilityExceptions = [{ date: '2026-10-05', kind: 'UNAVAILABLE', startTime: '10:00', endTime: '11:00' }]; expect(evaluateShiftChange(s, accept).decision).toBe('BLOCKED'); });
it('A028 pending leave does not block', () => { const s = fictionalSnapshot(); s.facts.employees[1].approvedTimeOff = [{ startDate: '2026-10-05', endDate: '2026-10-05', status: 'PENDING' }]; expect(evaluateShiftChange(s, accept).decision).toBe('ELIGIBLE'); });
it.each([32, 40, 41])('A030 scheduled %s respects target 24 and cap 40', hours => { const s = fictionalSnapshot(); s.facts.employees[1].targetWeeklyHours = 24; s.facts.ledger.push(automaticAssignment('other', 'e2', { date: '2026-10-06', startTime: '00:00', endDate: '2026-10-07', endTime: `${String(hours - 32).padStart(2, '0')}:00` })); expect(evaluateShiftChange(s, accept).decision).toBe(hours === 41 ? 'BLOCKED' : 'ELIGIBLE'); });
it('A031 Sunday carryover evaluates both business weeks independent of owning week', () => { const s = fictionalSnapshot(); s.ledger[0].date = '2026-10-11'; s.ledger[0].startTime = '22:00'; s.ledger[0].endTime = '06:00'; s.facts.ledger[0] = { ...s.facts.ledger[0], date: '2026-10-11', startTime: '22:00', endTime: '06:00' }; expect(evaluateShiftChange(s, accept)).toMatchObject({ decision: 'ELIGIBLE', affectedWeeks: ['2026-10-05', '2026-10-12'], scheduledProjections: [{ weekStart: '2026-10-05', assignmentHours: 2 }, { weekStart: '2026-10-12', assignmentHours: 6 }] }); });
it.each(['02:30', '01:30'])('A034 rejects nonexistent/repeated civil boundary %s', start => { const s = fictionalSnapshot(); s.facts.workspace.timeZone = 'America/New_York'; s.observedAt = '2026-01-01T00:00:00Z'; s.ledger[0].date = start === '02:30' ? '2026-03-08' : '2026-11-01'; s.ledger[0].startTime = start; s.ledger[0].endTime = '08:00'; expect(evaluateShiftChange(s, accept).decision).toBe('BLOCKED'); });
it('A092 checks incoming profile with missing break facts', () => { const s = fictionalSnapshot(); s.profiles[1].profile.breaks = configured({ afterMinutes: 300, minimumMinutes: 30, paid: false, timeBasis: 'WALL_CLOCK' }); expect(evaluateShiftChange(s, accept).decision).toBe('UNVERIFIED'); });
it('A037/A038 suggestions preserve comparator preferences and never expose profiles or mutate assignments', async () => { const { rankShiftChangeCandidates } = await import('./shift-change-evaluation'); const s = fictionalSnapshot(); s.facts.employees[1].targetWeeklyHours = 0; s.facts.employees[2].targetWeeklyHours = 24; s.facts.employees[3].targetWeeklyHours = undefined; const before = structuredClone(s); const candidates = rankShiftChangeCandidates(s); expect(candidates[0].employeeId).toBe('e3'); expect(s).toEqual(before); expect(candidates.every(c => Object.keys(c).sort().join(',') === 'employeeId,employeeName,evaluation')).toBe(true); expect(JSON.stringify(candidates)).not.toContain('reviewedBy'); expect(JSON.stringify(candidates)).not.toContain('operationalProfile'); s.facts.employees.reverse(); expect(rankShiftChangeCandidates(s).map(c => c.employeeId)).toEqual(candidates.map(c => c.employeeId)); });
it('A025 single assigned position cannot supply an unrelated second position quota', () => { const s = fictionalSnapshot(); s.facts.staffing[0].minimumStaffPerShift = 1; s.facts.coverageWindows[0].positionRequirements = [{ positionId: 'barista', quantity: 1 }, { positionId: 'cashier', quantity: 1 }]; expect(evaluateShiftChange(s, accept).decision).toBe('ELIGIBLE'); expect(s.ledger[0].positionId).toBe('barista'); });
it('A031/A037 confirmed preference requires every touched business week', async () => {
 const {rankShiftChangeCandidates}=await import('./shift-change-evaluation');const s=fictionalSnapshot();s.ledger[0].date='2026-10-11';s.ledger[0].startTime='22:00';s.ledger[0].endTime='06:00';s.facts.ledger[0]={...s.facts.ledger[0],date:'2026-10-11',startTime:'22:00',endTime:'06:00'};
 s.facts.employees[1].targetWeeklyHours=40;s.facts.employees[2].targetWeeklyHours=24;
 s.facts.employees[1].weeklyAvailability=[{weekStart:'2026-10-05',submitted:true,usesNormalAvailability:true,windows:[]}];
 s.facts.employees[2].weeklyAvailability=['2026-10-05','2026-10-12'].map(weekStart=>({weekStart,submitted:true,usesNormalAvailability:true,windows:[]}));
 expect(rankShiftChangeCandidates(s)[0].employeeId).toBe('e3');
});
it('A094 valid review-routed candidates remain discoverable while unknown rules stay hidden', async () => {
 const {rankShiftChangeCandidates}=await import('./shift-change-evaluation');const s=fictionalSnapshot();s.policy!.coverage.mode='MANAGER_REVIEW';s.profiles[1].profile.minimumRest={status:'UNKNOWN'};
 const candidates=rankShiftChangeCandidates(s);expect(candidates.map(c=>c.employeeId).sort()).toEqual(['e3','e4']);expect(candidates.every(c=>c.evaluation.decision==='MANAGER_REVIEW')).toBe(true);
});
it('A033/A098 host timezone cannot change workspace facts or nominal scheduled projections', () => {
 const s=fictionalSnapshot();s.facts.workspace.timeZone='America/New_York';s.observedAt='2026-01-01T00:00:00Z';Object.assign(s.ledger[0],{date:'2026-11-01',startTime:'00:00',endTime:'04:00'});Object.assign(s.facts.ledger[0],{date:'2026-11-01',startTime:'00:00',endTime:'04:00'});s.profiles[1].profile.maximumShift=configured({minutes:240,timeBasis:'ELAPSED'});
 const before=process.env.TZ;try{process.env.TZ='Asia/Tokyo';const a=evaluateShiftChange(s,accept);process.env.TZ='America/Los_Angeles';const b=evaluateShiftChange(s,accept);expect(a).toEqual(b);expect(a.decision).toBe('BLOCKED');expect(a.scheduledProjections[0].assignmentHours).toBe(4);}finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;}
});
it('A093/A095 explicit manager approval still cannot override missing mandatory facts', () => {
 const s=fictionalSnapshot();s.facts.employees[0].role='OWNER';s.actor.employee=s.facts.employees[0];s.request!.status='MANAGER_PENDING';s.request!.targetEmployeeId='e2';s.request!.targetConsent={...s.request!.requesterConsent!,employeeId:'e2'};s.profiles[1].profile.minimumRest={status:'UNKNOWN'};
 expect(evaluateShiftChange(s,{...accept,kind:'MANAGER_APPROVE'}).decision).toBe('UNVERIFIED');
});
it('coverage discovery never invents a reciprocal shift for a swap', async () => {
 const {rankShiftChangeCandidates}=await import('./shift-change-evaluation');const s=fictionalSnapshot();s.request!.kind='SWAP';expect(rankShiftChangeCandidates(s)).toEqual([]);
});

it('I1 final coverage remains eligible with reviewed non-applicability and unrelated ambiguous history', () => {
    const snapshot = fictionalSnapshot();
    snapshot.facts.workspace.timeZone = 'America/New_York';
    snapshot.facts.ledger.push(automaticAssignment('unrelated-history', 'e2', {
        date: '2025-11-02', startTime: '01:30', endTime: '04:00', scheduleStatus: 'PUBLISHED',
    }));
    expect(evaluateShiftChange(snapshot, accept).decision).toBe('ELIGIBLE');
});

it('I2 second-week elapsed uncertainty takes precedence over first-week overtime review', () => {
    const snapshot = fictionalSnapshot();
    snapshot.facts.workspace.timeZone = 'America/New_York';
    Object.assign(snapshot.ledger[0], {
        weekStart: '2026-10-19', date: '2026-10-25', startTime: '20:00', endTime: '04:00',
    });
    Object.assign(snapshot.facts.ledger[0], {
        date: '2026-10-25', startTime: '20:00', endTime: '04:00',
    });
    snapshot.facts.schedules[0].weekStart = '2026-10-19';
    snapshot.facts.ledger.push(automaticAssignment('second-week-ambiguous', 'e2', {
        date: '2026-11-01', startTime: '01:30', endTime: '04:00', scheduleStatus: 'PUBLISHED',
    }));
    snapshot.profiles[1].profile.projectedOvertime = configured({
        weeklyMinutes: 60, routing: 'MANAGER_REVIEW', timeBasis: 'ELAPSED',
    });

    const result = evaluateShiftChange(snapshot, accept);
    expect(result.affectedWeeks).toEqual(['2026-10-19', '2026-10-26']);
    expect(result.decision).toBe('UNVERIFIED');
    expect(result.issues.map(issue => issue.code)).toContain('RULE_UNVERIFIABLE');
});
