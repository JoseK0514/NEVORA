import { describe, expect, it } from "vitest";
import { buildPublishReadiness } from "./publish-readiness";

describe("buildPublishReadiness", () => {
  it("warns when the selected location has uncovered time segments", () => {
    const result = buildPublishReadiness({
      locationId: "loc-2",
      locationCoverage: [
        {
          locationId: "loc-2",
          locationName: "FUEL - 110",
          totalBlocks: 8,
          coveredBlocks: 6,
          uncoveredBlocks: 2,
          missingLeadBlocks: 1,
          fullyCovered: false,
        },
      ],
      underTargetCount: 0,
      overTargetCount: 0,
      unconfiguredTargetCount: 0,
    });

    expect(result.hasWarnings).toBe(true);
    expect(result.coverageGaps).toBe(2);
    expect(result.missingLeadBlocks).toBe(1);
  });

  it("warns when employee hours still need management review", () => {
    const result = buildPublishReadiness({
      locationId: "loc-1",
      locationCoverage: [
        {
          locationId: "loc-1",
          locationName: "FUEL - 2",
          totalBlocks: 4,
          coveredBlocks: 4,
          uncoveredBlocks: 0,
          missingLeadBlocks: 0,
          fullyCovered: true,
        },
      ],
      underTargetCount: 2,
      overTargetCount: 1,
      unconfiguredTargetCount: 0,
    });

    expect(result.hasWarnings).toBe(true);
    expect(result.hourWarnings).toBe(3);
  });

  it("returns ready when coverage and hours have no warnings", () => {
    const result = buildPublishReadiness({
      locationId: "loc-1",
      locationCoverage: [
        {
          locationId: "loc-1",
          locationName: "FUEL - 2",
          totalBlocks: 4,
          coveredBlocks: 4,
          uncoveredBlocks: 0,
          missingLeadBlocks: 0,
          fullyCovered: true,
        },
      ],
      underTargetCount: 0,
      overTargetCount: 0,
      unconfiguredTargetCount: 0,
    });

    expect(result).toMatchObject({
      hasWarnings: false,
      coverageGaps: 0,
      missingLeadBlocks: 0,
      hourWarnings: 0,
    });
  });
});

it('keeps invalid position setup actionable even with no evaluated dates', () => {
  const result = buildPublishReadiness({locationId:'l',locationCoverage:[{locationId:'l',locationName:'Shop',totalBlocks:0,coveredBlocks:0,uncoveredBlocks:0,missingLeadBlocks:0,fullyCovered:false,positionRequirementsConfigured:false}],underTargetCount:0,overTargetCount:0,unconfiguredTargetCount:0});
  expect(result.hasWarnings).toBe(true);
  expect(result.positionNeedsSetup).toBe(true);
});
