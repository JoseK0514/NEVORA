export type CoverageCandidateInput = {
  employeeId: string;
  employeeName: string;
  eligible: boolean;
  active: boolean;
  available: boolean;
  conflictFree: boolean;
  scheduledHours: number;
  targetHours?: number;
  priorUnderTargetWeeks: number;
  role?: string;
  primaryLocationId?: string;
};

export type RankedCoverageCandidate = CoverageCandidateInput & {
  hoursNeeded: number;
};

export function rankCoverageCandidates(
  candidates: CoverageCandidateInput[],
): RankedCoverageCandidate[] {
  return candidates
    .filter(
      (candidate) =>
        candidate.active &&
        candidate.eligible &&
        candidate.available &&
        candidate.conflictFree,
    )
    .map((candidate) => ({
      ...candidate,
      hoursNeeded:
        typeof candidate.targetHours === "number"
          ? Math.max(
              0,
              Math.round((candidate.targetHours - candidate.scheduledHours) * 100) /
                100,
            )
          : 0,
    }))
    .sort((a, b) => {
      if (b.hoursNeeded !== a.hoursNeeded) {
        return b.hoursNeeded - a.hoursNeeded;
      }

      if (b.priorUnderTargetWeeks !== a.priorUnderTargetWeeks) {
        return b.priorUnderTargetWeeks - a.priorUnderTargetWeeks;
      }

      if (a.scheduledHours !== b.scheduledHours) {
        return a.scheduledHours - b.scheduledHours;
      }

      return a.employeeName.localeCompare(b.employeeName);
    });
}
