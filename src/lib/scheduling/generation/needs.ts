import type { CoverageBlock } from "../schedule-health";
import {
  canonicalCivilMinute,
  generationNeedKey,
  type GenerationNeed,
} from "../generation-claims";
import type { ConfiguredNeed, GenerationInput } from "./types";

/** Identity comes only from configured health, never real assignment segmentation. */
export function deriveConfiguredNeeds(
  input: GenerationInput,
  blocks: CoverageBlock[],
): ConfiguredNeed[] {
  const families = new Map<
    string,
    (GenerationNeed & { locationId: string })[]
  >();
  for (const block of blocks) {
    if (block.requiredStaff === null || block.requiresLead === null) continue;
    const positions = block.positionCoverage
      .map((p) => ({ positionId: p.positionId, quantity: p.required }))
      .sort((a, b) => a.positionId.localeCompare(b.positionId));
    const residual = Math.max(
      0,
      block.requiredStaff - positions.reduce((sum, p) => sum + p.quantity, 0),
    );
    const facts: Omit<GenerationNeed, "needStart" | "needEnd">[] = [
      ...positions.map((p) => ({
        kind: "POSITION" as const,
        positionId: p.positionId,
        configuredCapacity: p.quantity,
      })),
      ...(residual
        ? [
            {
              kind: "STAFFING" as const,
              configuredCapacity: residual,
              staffingBasis: { requiredStaff: block.requiredStaff, positions },
            },
          ]
        : []),
      ...(block.requiresLead
        ? [{ kind: "LEAD" as const, configuredCapacity: 1 }]
        : []),
    ];
    for (const fact of facts) {
      const signature = JSON.stringify([block.locationId, fact]);
      const runs = families.get(signature) ?? [];
      runs.push({
        ...fact,
        locationId: block.locationId,
        needStart: canonicalCivilMinute(`${block.date}T${block.startTime}`),
        needEnd: canonicalCivilMinute(`${block.date}T${block.endTime}`),
      });
      families.set(signature, runs);
    }
  }
  return [...families.values()]
    .flatMap((runs) => {
      const merged: typeof runs = [];
      for (const run of runs.sort((a, b) =>
        a.needStart.localeCompare(b.needStart),
      )) {
        const last = merged.at(-1);
        if (last && last.needEnd === run.needStart) last.needEnd = run.needEnd;
        else merged.push({ ...run });
      }
      return merged.map((run) => ({
        ...run,
        needKey: generationNeedKey(
          {
            workspaceId: input.workspace.id,
            timeZone: input.workspace.timeZone,
            weekStart: input.weekStart,
            locationId: run.locationId,
          },
          run,
        ),
      }));
    })
    .sort(
      (a, b) =>
        a.locationId.localeCompare(b.locationId) ||
        a.needStart.localeCompare(b.needStart) ||
        a.kind.localeCompare(b.kind) ||
        (a.positionId ?? "").localeCompare(b.positionId ?? ""),
    );
}
