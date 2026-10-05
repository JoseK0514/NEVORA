import { compareEmployeeFairness } from './generation/fairness';
import { weekStartFor } from '../date-utils';
import type { GenerationEmployee, GenerationAssignment } from './generation/types';
import { affectedWorkweeks, shiftPeriod } from './periods';
import { validateShift, type ValidateShiftInput } from "./validate-shift";
export type CoverageCandidateInput = {
    employeeName: string;
    role?: string;
    primaryLocationId?: string;
    priorUnderTargetWeeks: number;
    rules: ValidateShiftInput;
};
export type RankedCoverageCandidate = CoverageCandidateInput & {
    employeeId: string;
    scheduledHours: number;
    targetHours?: number;
    hoursNeeded: number;
    evaluation: ReturnType<typeof validateShift>;
};
// Preference ordering only. Eligibility always comes from the shared rules.
// No offers, assignments or approvals are performed here.
export function rankCoverageCandidates(candidates: CoverageCandidateInput[]): RankedCoverageCandidate[] {
    return candidates
        .map((candidate) => {
        const evaluation = validateShift({
            ...candidate.rules,
            mode: "AUTOMATIC",
        });
        const scheduledHours = evaluation.projectedHours[0]?.existingHours ?? 0;
        const targetHours = candidate.rules.employee.targetWeeklyHours;
        return {
            ...candidate,
            employeeId: candidate.rules.candidate.employeeId,
            evaluation,
            scheduledHours,
            targetHours,
            hoursNeeded: targetHours === undefined
                ? 0
                : Math.max(0, Math.round((targetHours - scheduledHours) * 100) / 100),
        };
    })
        .filter((candidate) => candidate.evaluation.eligible)
        .sort((a, b) => {
        const employee = (c: RankedCoverageCandidate): GenerationEmployee => ({ id: c.employeeId, firstName: c.employeeName, lastName: '', phone: '', primaryLocationId: c.primaryLocationId ?? '', ...c.rules.employee, positionIds: [...c.rules.employee.positionIds], eligibleLocationIds: [...c.rules.employee.eligibleLocationIds], availability: c.rules.availability, weeklyAvailability: c.rules.weeklyAvailability ?? [], availabilityExceptions: c.rules.availabilityExceptions ?? [], approvedTimeOff: c.rules.approvedTimeOff });
        const ledger: GenerationAssignment[] = candidates.flatMap((c, i) => c.rules.existingShifts.map((s, j) => ({ ...s, id: s.id ?? `candidate-${i}-${j}`, scheduleId: '', scheduleStatus: 'PUBLISHED' as const, hasExchangeHistory: false, hasCalloutHistory: false, hasPublicationHistory: false })));
        const confirmedEmployeeIds = new Set(candidates.filter(c => affectedWorkweeks(shiftPeriod(c.rules.candidate)).every(week => c.rules.weeklyAvailability?.some(w => w.weekStart === week && w.submitted))).map(c => c.rules.candidate.employeeId));
        return compareEmployeeFairness(employee(a), employee(b), { weekStart: weekStartFor(a.rules.candidate.date), ledger, confirmedEmployeeIds, employeeIds: candidates.map(c => c.rules.candidate.employeeId) });
    });
}
