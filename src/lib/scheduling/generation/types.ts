import type {
  Employee,
  Location,
  Position,
  Schedule,
  Shift,
  Workspace,
} from "../../domain";
import type {
  CoverageWindow,
  LocationStaffingSetting,
} from "../../data/schedule-health";
import type { GenerationExclusion } from "../../data/generation-exclusions";
import type {
  ValidateShiftInput,
  ValidationIssueCode,
  ValidationIssue,
} from "../validate-shift";
import type {
  CoverageBlock,
  calculateScheduleHealth,
} from "../schedule-health";
import type { LocationReadiness } from "../location-readiness";
import type { GenerationClaims, GenerationNeed } from "../generation-claims";

export type GenerationEmployee = Employee &
  Pick<
    ValidateShiftInput["employee"],
    "maximumWeeklyHours" | "targetWeeklyHours"
  > & {
    availability: ValidateShiftInput["availability"];
    weeklyAvailability: NonNullable<ValidateShiftInput["weeklyAvailability"]>;
    availabilityExceptions: NonNullable<
      ValidateShiftInput["availabilityExceptions"]
    >;
    approvedTimeOff: ValidateShiftInput["approvedTimeOff"];
  };
export type GenerationAssignment = Shift & {
  endDate?: string;
  isCalloutApproved?: boolean;
  scheduleStatus: Schedule["status"];
  hasExchangeHistory: boolean;
  hasCalloutHistory: boolean;
  hasPublicationHistory: boolean;
};
export type PlannerLimits = {
  maxNodes: number;
  maxEvaluations: number;
  maxPeriods: number;
};
export type GenerationInput = {
  workspace: Workspace;
  weekStart: string;
  scope: { kind: "ALL" } | { kind: "SELECTED"; locationIds: string[] };
  mode: "BUILD_WEEK" | "FILL_GAPS_ONLY";
  locations: Location[];
  positions: Position[];
  staffing: LocationStaffingSetting[];
  coverageWindows: CoverageWindow[];
  employees: GenerationEmployee[];
  /** Complete nonarchived dated cross-location ledger, including adjacent affected workweeks. */
  ledger: GenerationAssignment[];
  schedules: Schedule[];
  exclusions: GenerationExclusion[];
  policy: NonNullable<ValidateShiftInput["policy"]>;
  limits: PlannerLimits;
};
export type ConfiguredNeed = GenerationNeed & {
  locationId: string;
  needKey: string;
};
export type CoverageMeasure = {
  requiredMinutes: number;
  coveredMinutes: number;
  percentage: number | null;
  unavailable: boolean;
};
export type PartialCoverageScore = {
  fulfilledObligationMinutes: number;
  requiredObligationMinutes: number;
  contiguousDurationScore: number;
};
export type GenerationDemand = {
  ready: boolean;
  locationIds: string[];
  excludedLocations: LocationReadiness[];
  readiness: LocationReadiness[];
  issues: GenerationExplanation[];
  blocks: CoverageBlock[];
  needs: ConfiguredNeed[];
  coverage: CoverageMeasure;
  score: PartialCoverageScore;
};
export type GenerationPeriod = {
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  start: number;
  end: number;
};
export type GenerationExplanation = {
  code:
    | ValidationIssueCode
    | "LOCATION_NOT_READY"
    | "TARGET_NOT_DRAFT"
    | "MANAGER_EXCLUDED"
    | "COUPLED_RESERVATION"
    | "NO_AUTOMATIC_CAPACITY"
    | "BUDGET_EXHAUSTED"
    | "UNREPRESENTABLE_PERIOD";
  locationId?: string;
  start?: string;
  end?: string;
  employeeIds?: string[];
  distinctEmployeeCount?: number;
  exclusionIds?: string[];
  message: string;
};
export type GenerationPlan = {
  status: "COMPLETE" | "PARTIAL" | "INVALID" | "BUDGET_EXHAUSTED";
  additions: (GenerationPeriod & {
    id: string;
    employeeId: string;
    positionId?: string;
    isDesignatedLead?: boolean;
    generatedClaims: GenerationClaims;
  })[];
  fixedAssignments: GenerationAssignment[];
  preservedShiftIds: string[];
  replacedShiftIds: string[];
  demand: GenerationDemand;
  explanations: GenerationExplanation[];
  warnings: ValidationIssue[];
  health: ReturnType<typeof calculateScheduleHealth>;
  limits: PlannerLimits;
  exploredNodes: number;
  evaluations: number;
  cacheHits: number;
  periodsEnumerated: number;
};
