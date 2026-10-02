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
export function rankCoverageCandidates(
  candidates: CoverageCandidateInput[],
): RankedCoverageCandidate[] {
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
        hoursNeeded:
          targetHours === undefined
            ? 0
            : Math.max(
                0,
                Math.round((targetHours - scheduledHours) * 100) / 100,
              ),
      };
    })
    .filter((candidate) => candidate.evaluation.eligible)
    .sort(
      (a, b) =>
        b.hoursNeeded - a.hoursNeeded ||
        b.priorUnderTargetWeeks - a.priorUnderTargetWeeks ||
        a.scheduledHours - b.scheduledHours ||
        a.employeeName.localeCompare(b.employeeName),
    );
}
