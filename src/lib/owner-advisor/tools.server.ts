import "server-only";
import { readToday } from "@/lib/data/today.server";
import {
  generationSourceSql,
  type GenerationSource,
} from "@/lib/data/generation-guards";
import { mapSchedulingSourceFacts } from "@/lib/data/scheduling-source-facts";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { deriveCoverageRepair } from "@/lib/data/coverage-repair.server";
import { reportedCoverageState } from "@/lib/scheduling/coverage-repair";
import { addDays, weekStartFor, durationMinutes } from "@/lib/date-utils";
import { AdvisorStore } from "./store.server";
import { checkOwner } from "./authority.server";
import {
  AdvisorError,
  type ToolCall,
  type ToolResult,
  type BriefingResult,
} from "./contracts";
const short = (v: string) => v.slice(0, 200);
export class AdvisorTools {
  constructor(readonly store: AdvisorStore) {}
  async briefing(): Promise<BriefingResult> {
    const { proof, original, ex } = this.store;
    await checkOwner(proof, original, ex);
    const today = await readToday(proof, ex);
    await checkOwner(proof, original, ex);
    if (today.state !== "ready")
      return {
        observedAt: new Date().toISOString(),
        sources: [],
        partial: true,
        data: null,
      };
    return {
      observedAt: today.observedAt,
      sources: [
        {
          label: "Today on the floor",
          href: "/app",
          observedAt: today.observedAt,
        },
      ],
      partial: today.shifts.length > 100,
      data: {
        companyName: short(original.workspace.name),
        timeZone: original.workspace.timeZone,
        date: today.today,
        publication: "PUBLISHED",
        counts: today.counts,
        shifts: today.shifts
          .slice(0, 100)
          .map((s) => ({
            employeeName: short(s.employeeName),
            locationName: short(s.locationName),
            positionName:
              s.positionName === null ? null : short(s.positionName),
            startAt: s.startAt,
            endAt: s.endAt,
            status: s.status,
          })),
      },
    };
  }
  async run(call: ToolCall): Promise<ToolResult> {
    const { proof, original, ex } = this.store;
    await checkOwner(proof, original, ex);
    if (call.name === "company_briefing") return this.briefing();
    const date = call.args.date,
      week = weekStartFor(date),
      href = `/app/schedule?week=${week}`;
    if (call.name === "published_staffing") {
      const rows = await this.store.transaction<{
        employeeName: string | null;
        locationName: string;
        positionName: string | null;
        date: string;
        startTime: string;
        endTime: string;
        observedAt: string;
        revision: number;
      }>({
        text: `WITH latest AS (SELECT id,revision_number FROM schedule_publication_revisions WHERE week_start=$2::date ORDER BY revision_number DESC,id DESC LIMIT 1)
    SELECT e.first_name||' '||e.last_name AS "employeeName",l.name AS "locationName",s.position_name AS "positionName",s.date::text,s.start_time::text AS "startTime",s.end_time::text AS "endTime",clock_timestamp()::text AS "observedAt",r.revision_number AS revision
    FROM schedule_publication_revision_shifts s JOIN latest r ON r.id=s.revision_id JOIN locations l ON l.id=s.location_id LEFT JOIN employees e ON e.id=s.employee_id WHERE l.workspace_id=$1 AND s.date=$3::date AND NOT s.is_callout_approved ORDER BY s.start_time,s.id LIMIT 101`,
        values: [original.workspace.id, week, date],
      });
      await checkOwner(proof, original, ex);
      const observedAt = rows[0]?.observedAt ?? new Date().toISOString();
      return {
        observedAt,
        sources: [{ label: "Published schedule", href, observedAt }],
        partial: rows.length > 100,
        data: {
          date,
          publication: "PUBLISHED",
          shifts: rows
            .slice(0, 100)
            .map((s) => ({
              employeeName: s.employeeName ? short(s.employeeName) : null,
              locationName: short(s.locationName),
              positionName: s.positionName ? short(s.positionName) : null,
              date: s.date,
              startTime: s.startTime.slice(0, 5),
              endTime: s.endTime.slice(0, 5),
              minutes: durationMinutes(s.startTime, s.endTime),
              revision: s.revision,
            })),
        },
      };
    }
    const [row] = await this.store.transaction<{
      source: GenerationSource;
      observedAt: string;
    }>({
      text: `SELECT ${generationSourceSql} AS source,clock_timestamp()::text AS "observedAt"`,
      values: [],
    });
    if (!row || Object.values(row.source).some((rows) => rows.length > 10000))
      throw new AdvisorError("limit");
    const facts = mapSchedulingSourceFacts(row.source, {
      workspaceId: original.workspace.id,
      startDate: week,
      endDate: addDays(week, 7),
      retainAdjacentCommitments: true,
    });
    const health = calculateScheduleHealth({
      workspace: facts.workspace,
      positions: facts.positions,
      shifts: facts.ledger,
      locations: facts.locations
        .filter((l) => l.active)
        .map((l) => ({
          id: l.id,
          name: l.shortName,
          minimumStaffPerShift:
            facts.staffing.find((s) => s.locationId === l.id)
              ?.minimumStaffPerShift ?? null,
          requiresDesignatedLead:
            facts.staffing.find((s) => s.locationId === l.id)
              ?.requiresDesignatedLead ?? null,
        })),
      employees: facts.employees.map((e) => ({
        ...e,
        name: `${e.firstName} ${e.lastName}`,
      })),
      coverageWindows: facts.coverageWindows,
      weekDates: [date],
    });
    const blocks = health.coverageBlocks.filter(
      (b) => b.date === date && !b.covered,
    );
    let partial = blocks.length > 10;
    const gaps = blocks.slice(0, 10).map((b) => {
      const locator = {
        version: 1 as const,
        weekStart: week,
        gapKey: b.key,
        locationId: b.locationId,
        date,
        startTime: b.startTime,
        endTime: b.endTime,
        target: "CHOOSE" as const,
        reported: reportedCoverageState({
          ...b,
          requiresLead: b.requiresLead && !b.leadCovered,
        }),
      };
      const initial = deriveCoverageRepair(row.source, locator);
      if (initial.targets.length > 5) partial = true;
      return {
        locationName: short(b.locationName),
        startTime: b.startTime,
        endTime: b.endTime,
        missingStaff: b.gap,
        requiresLead:
          b.requiresLead === null ? null : b.requiresLead && !b.leadCovered,
        options: initial.targets.slice(0, 5).map((target) => {
          const result = deriveCoverageRepair(row.source, {
            ...locator,
            target: target.target,
            ...("positionId" in target
              ? { positionId: target.positionId }
              : {}),
          });
          if (result.candidates.length > 10) partial = true;
          return {
            target: target.target,
            ...("positionId" in target
              ? {
                  positionId: target.positionId,
                  positionName: short(target.positionName),
                }
              : {}),
            needed: target.count,
            status: result.status,
            candidates: result.candidates
              .slice(0, 10)
              .map((c) => ({
                employeeName: short(c.employeeName),
                scheduledHours: c.scheduledHours,
                targetHours: c.targetHours ?? null,
                eligible: c.evaluation.eligible,
                ruleCodes: c.evaluation.issues.map((i) => i.code),
              })),
          };
        }),
      };
    });
    await checkOwner(proof, original, ex);
    return {
      observedAt: row.observedAt,
      sources: [
        {
          label: "Schedule coverage and eligibility",
          href,
          observedAt: row.observedAt,
        },
      ],
      partial,
      data: {
        date,
        basis: "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS",
        gaps,
      },
    };
  }
}
