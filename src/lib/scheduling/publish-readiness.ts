export type PublishLocationCoverage = {
  locationId: string;
  locationName: string;
  totalBlocks: number;
  coveredBlocks: number;
  uncoveredBlocks: number;
  missingLeadBlocks: number;
  fullyCovered: boolean;
  positionRequirementsConfigured?: boolean;
  staffingConfigured?: boolean;
  coverageConfigured?: boolean;
};

export function buildPublishReadiness(input: {
  locationId: string;
  locationCoverage: PublishLocationCoverage[];
  underTargetCount: number;
  overTargetCount: number;
  unconfiguredTargetCount: number;
}) {
  const location = input.locationCoverage.find(
    (item) => item.locationId === input.locationId,
  );

  const coverageGaps = location?.uncoveredBlocks ?? 0;
  const missingLeadBlocks = location?.missingLeadBlocks ?? 0;
  const hourWarnings = input.underTargetCount + input.overTargetCount;

  return {
    locationName: location?.locationName ?? input.locationId,
    coverageGaps,
    positionNeedsSetup: location?.positionRequirementsConfigured === false,
    staffingNeedsSetup: location?.staffingConfigured === false,
    missingLeadBlocks,
    underTargetCount: input.underTargetCount,
    overTargetCount: input.overTargetCount,
    unconfiguredTargetCount: input.unconfiguredTargetCount,
    hourWarnings,
    hasWarnings:
      location?.positionRequirementsConfigured === false ||
      location?.staffingConfigured === false ||
      location?.coverageConfigured === false ||
      coverageGaps > 0 ||
      hourWarnings > 0 ||
      input.unconfiguredTargetCount > 0,
  };
}
