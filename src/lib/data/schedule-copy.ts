import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import { createHash, randomUUID } from "node:crypto";
import type { SessionMutationProof } from "../shift-changes/types";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import {
  assertManagementProof,
} from "./management-session";
import { workspaceReadGuard } from "./workspaces";
import {
  neonNotificationExecutor,
  notificationStateSql,
  preparePublishedWeekChange,
  type GuardedWeekState,
  type GuardedShift,
} from "./notification-transactions";
import {
  generationSourceSql,
  generationMutationGuards,
  type GenerationSource,
} from "./generation-guards";
import { loadWorkspaceNotificationConfig } from "../notifications/config";
import { mapSchedulingSourceFacts } from "./scheduling-source-facts";
import { validateShift } from "../scheduling/validate-shift";
import { addDays, isValidWeekStart } from "../date-utils";
import { shiftBoundaryInstants } from "../business-time";
import { stableExportJson } from "../payroll-export/json";
const digest = (v: unknown) =>
  createHash("sha256").update(stableExportJson(v)).digest("hex");
export type CopyCommand = {
  operationId: string;
  weekStart: string;
  kind: "PREVIOUS_WEEK" | "TEMPLATE";
  templateId?: string;
};
export type CopyOutcome = {
  sourceId: string;
  status: "COMMITTED" | "SKIPPED";
  reason: string | null;
  warnings: { code: string; message: string }[];
  shiftId: string | null;
};
export type CopyReceipt = {
  operationId: string;
  command: CopyCommand;
  rows: CopyOutcome[];
  reason?: "TEMPLATE_UNAVAILABLE" | "SOURCE_CHANGED" | null;
};
type SourceRow = {
  id: string;
  locationId: string;
  employeeId: string | null;
  positionId: string | null;
  dayOffset: number;
  startTime: string;
  endTime: string;
  notes: string | null;
  isDesignatedLead: boolean;
};
type CopySource = { version: unknown; rows: SourceRow[] };
type Operation = {
  command_hash: string;
  command: CopyCommand;
  source: CopySource;
};
export function parseCopyCommand(value: unknown): CopyCommand {
  if (!value || typeof value !== "object") throw Error("Invalid copy command");
  const v = value as Record<string, unknown>;
  if (
    typeof v.operationId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v.operationId,
    ) ||
    typeof v.weekStart !== "string" ||
    !isValidWeekStart(v.weekStart) ||
    !["PREVIOUS_WEEK", "TEMPLATE"].includes(String(v.kind)) ||
    Object.keys(v).some(
      (k) => !["operationId", "weekStart", "kind", "templateId"].includes(k),
    )
  )
    throw Error("Invalid copy command");
  if (
    (v.kind === "TEMPLATE" &&
      (typeof v.templateId !== "string" ||
        !v.templateId ||
        v.templateId.length > 200)) ||
    (v.kind === "PREVIOUS_WEEK" && v.templateId !== undefined)
  )
    throw Error("Invalid template");
  return {
    operationId: v.operationId.toLowerCase(),
    weekStart: v.weekStart,
    kind: v.kind as CopyCommand["kind"],
    ...(v.kind === "TEMPLATE" ? { templateId: String(v.templateId) } : {}),
  };
}
const templateSql = `jsonb_build_object('parent',(SELECT to_jsonb(t) FROM schedule_templates t WHERE id=$1 AND workspace_id=$2),'children',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY id COLLATE "C") FROM schedule_template_shifts s WHERE template_id=$1 AND workspace_id=$2),'[]'::jsonb))`;
async function capture(
  command: CopyCommand,
  workspaceId: string,
  source: GenerationSource,
  executor: SqlExecutor,
): Promise<CopySource> {
  let rows: Record<string, unknown>[], version: unknown;
  if (command.kind === "TEMPLATE") {
    const [read] = await executor.query<{
      snapshot: {
        parent: Record<string, unknown> | null;
        children: Record<string, unknown>[];
      };
    }>({
      text: `SELECT ${templateSql} AS snapshot`,
      values: [command.templateId, workspaceId],
    });
    version = read.snapshot;
    rows = read.snapshot.children;
  } else {
    const schedules = source.schedules.filter(
      (s) => String(s.week_start) === addDays(command.weekStart, -7),
    );
    rows = source.shifts
      .filter((s) => schedules.some((sc) => sc.id === s.schedule_id))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
      .map((s) => ({
        ...s,
        location_id: schedules.find((sc) => sc.id === s.schedule_id)!
          .location_id,
        day_offset: Math.round(
          (Date.parse(String(s.date)) -
            Date.parse(addDays(command.weekStart, -7))) /
            86400000,
        ),
      }));
    version = { schedules, rows };
  }
  return {
    version,
    rows: rows.map((s) => ({
      id: String(s.id),
      locationId: String(s.location_id),
      employeeId: s.employee_id ? String(s.employee_id) : null,
      positionId: s.position_id ? String(s.position_id) : null,
      dayOffset: Number(s.day_offset),
      startTime: String(s.start_time).slice(0, 5),
      endTime: String(s.end_time).slice(0, 5),
      notes: s.notes ? String(s.notes) : null,
      isDesignatedLead: Boolean(s.is_designated_lead),
    })),
  };
}
function templateGuards(
  command: CopyCommand,
  workspaceId: string,
  snapshot: CopySource,
): SqlStatement[] {
  return command.kind === "TEMPLATE"
    ? [
        {
          text: "LOCK TABLE schedule_templates IN SHARE ROW EXCLUSIVE MODE",
          values: [],
        },
        {
          text: "LOCK TABLE schedule_template_shifts IN SHARE ROW EXCLUSIVE MODE",
          values: [],
        },
        {
          text: `SELECT (CASE WHEN ${templateSql}=$3::jsonb THEN '1' ELSE 'copy_source_conflict' END)::integer`,
          values: [
            command.templateId,
            workspaceId,
            JSON.stringify(snapshot.version),
          ],
        },
      ]
    : [];
}
async function authorizedOperation(
  proof: SessionMutationProof,
  id: string,
  executor: SqlExecutor,
) {
  assertManagementProof(proof, proof.employee.id);
  const {workspace}=await assertOperationalAccess(proof,{kind:'COMPANY'},executor);
  const guards = [
    ...workspaceReadGuard(workspace),
    {
      text: "SELECT id FROM employees WHERE id=$1 FOR SHARE",
      values: [proof.employee.id],
    },
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
  ];
  const results = await executor.transaction([
    ...guards,
    {
      text: "SELECT o.command_hash,o.command,o.source,r.payload FROM schedule_copy_operations o LEFT JOIN schedule_copy_receipts r USING(workspace_id,actor_employee_id,operation_id) WHERE o.workspace_id=$1 AND o.actor_employee_id=$2 AND o.operation_id=$3::uuid",
      values: [workspace.id, proof.employee.id, id],
    },
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
  ]);
  return {
    workspace,
    operation: results[guards.length]?.[0] as
      | (Operation & { payload: CopyReceipt | null })
      | undefined,
  };
}
export async function readScheduleCopyCommand(
  proof: SessionMutationProof,
  id: string,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<CopyCommand | null> {
  return (
    (await authorizedOperation(proof, id, executor)).operation?.command ?? null
  );
}
export async function readScheduleCopyReceipt(
  proof: SessionMutationProof,
  id: string,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<CopyReceipt | null> {
  return (
    (await authorizedOperation(proof, id, executor)).operation?.payload ?? null
  );
}
export async function executeScheduleCopy(
  proof: SessionMutationProof,
  input: unknown,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<CopyReceipt> {
  const command = parseCopyCommand(input),
    commandHash = digest(command),
    actor = proof.employee.id;
  let { workspace, operation } = await authorizedOperation(
    proof,
    command.operationId,
    executor,
  );
  if (operation && operation.command_hash !== commandHash)
    throw Error("COPY_COMMAND_CONFLICT");
  if (operation?.payload) return operation.payload;
  const weeks = [
    ...new Set([
      command.weekStart,
      ...(command.kind === "PREVIOUS_WEEK"
        ? [addDays(command.weekStart, -7)]
        : []),
    ]),
  ].sort();
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const config = await loadWorkspaceNotificationConfig(
        process.env,
        executor,
      );
      const [read] = await executor.query<{
        state: GuardedWeekState;
        source: GenerationSource;
        observed: string;
      }>({
        text: `SELECT ${notificationStateSql} AS state,${generationSourceSql} AS source,clock_timestamp()::text AS observed`,
        values: [weeks],
      });
      const current = await capture(
        command,
        workspace.id,
        read.source,
        executor,
      );
      const common = [
        ...generationMutationGuards(read.source, weeks),
        ...workspaceReadGuard(workspace),
        ...templateGuards(command, workspace.id, current),
        ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
      ];
      if (!operation) {
        await executor.transaction([
          ...common,
          {
            text: "INSERT INTO schedule_copy_operations(workspace_id,actor_employee_id,operation_id,command_hash,command,source) VALUES($1,$2,$3::uuid,$4,$5::jsonb,$6::jsonb)",
            values: [
              workspace.id,
              actor,
              command.operationId,
              commandHash,
              JSON.stringify(command),
              JSON.stringify(current),
            ],
          },
          ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
        ]);
        operation = {
          command_hash: commandHash,
          command,
          source: current,
          payload: null,
        };
        // Re-read after durable command capture. Later source drift is an original outcome.
        continue;
      }
      const drift = digest(operation.source) !== digest(current),
        unavailable = command.kind === "TEMPLATE" &&
          !(operation.source.version as { parent?: { active: boolean } }).parent?.active,
        afterSchedules = [...read.state.schedules],
        afterShifts = [...read.state.shifts],
        writes: SqlStatement[] = [],
        outcomes: CopyOutcome[] = [];
      const facts = mapSchedulingSourceFacts(read.source, {
        workspaceId: workspace.id,
        startDate: command.weekStart,
        endDate: addDays(command.weekStart, 7),
        retainAdjacentCommitments: true,
      });
      for (const row of operation.source.rows) {
        const outcome: CopyOutcome = {
          sourceId: row.id,
          status: "SKIPPED",
          reason: null,
          warnings: [],
          shiftId: null,
        };
        outcomes.push(outcome);
        if (unavailable) {
          outcome.reason = "TEMPLATE_UNAVAILABLE";
          continue;
        }
        if (drift) {
          outcome.reason = "SOURCE_CHANGED";
          continue;
        }
        if (!row.employeeId) {
          outcome.reason = "EMPLOYEE_UNAVAILABLE";
          continue;
        }
        const date = addDays(command.weekStart, row.dayOffset),
          employee = facts.employees.find((e) => e.id === row.employeeId),
          location = facts.locations.find((l) => l.id === row.locationId);
        if (!employee || !location) {
          outcome.reason = "ASSIGNMENT_UNAVAILABLE";
          continue;
        }
        try {
          shiftBoundaryInstants({ ...row, date }, workspace.timeZone);
        } catch {
          outcome.reason = "INVALID_LOCAL_TIME";
          continue;
        }
        const candidate = {
          ...row,
          employeeId: row.employeeId,
          positionId: row.positionId || undefined,
          date,
        };
        const validation = validateShift({
          candidate,
          workspace: facts.workspace,
          location,
          position: facts.positions.find((p) => p.id === row.positionId),
          employee,
          existingShifts: [
            ...facts.ledger,
            ...afterShifts
              .filter(
                (s) =>
                  !read.state.shifts.some(
                    (old) => old.sourceShiftId === s.sourceShiftId,
                  ),
              )
              .map((s) => ({ ...s, positionId: s.positionId || undefined })),
          ],
          availability: employee.availability,
          weeklyAvailability: employee.weeklyAvailability,
          availabilityExceptions: employee.availabilityExceptions,
          approvedTimeOff: employee.approvedTimeOff,
          operationalProfile: employee.operationalProfile,
          mode: "MANAGER_SCHEDULE",
          policy: facts.policy,
        });
        outcome.warnings = validation.issues
          .filter((i) => i.severity === "warning")
          .map((i) => ({ code: i.code, message: i.message }));
        if (validation.blockers.length) {
          outcome.reason = validation.blockers[0].code;
          continue;
        }
        let schedule = afterSchedules.find(
          (s) =>
            s.weekStart === command.weekStart &&
            s.locationId === row.locationId,
        );
        if (!schedule) {
          schedule = {
            id: randomUUID(),
            locationId: row.locationId,
            weekStart: command.weekStart,
            status: "DRAFT",
            updatedAt: "",
          };
          afterSchedules.push(schedule);
          writes.push({
            text: "INSERT INTO schedules(id,location_id,week_start,created_by) VALUES($1,$2,$3,$4)",
            values: [schedule.id, row.locationId, command.weekStart, actor],
          });
        }
        const shift: GuardedShift = {
          sourceShiftId: randomUUID(),
          scheduleId: schedule.id,
          weekStart: command.weekStart,
          locationId: row.locationId,
          employeeId: row.employeeId,
          date,
          startTime: row.startTime,
          endTime: row.endTime,
          positionId: row.positionId || undefined,
          notes: row.notes || undefined,
          isDesignatedLead: row.isDesignatedLead,
          isCalloutApproved: false,
          hasExchangeHistory: false,
        };
        afterShifts.push(shift);
        writes.push({
          text: "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,notes,is_designated_lead) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
          values: [
            shift.sourceShiftId,
            schedule.id,
            row.employeeId,
            date,
            row.startTime,
            row.endTime,
            row.positionId,
            row.notes,
            row.isDesignatedLead,
          ],
        });
        Object.assign(outcome, {
          status: "COMMITTED",
          reason: null,
          shiftId: shift.sourceShiftId,
        });
      }
      const receipt: CopyReceipt = {
        operationId: command.operationId,
        command,
        rows: outcomes,
        reason: unavailable ? "TEMPLATE_UNAVAILABLE" : drift ? "SOURCE_CHANGED" : null,
      };
      writes.push({
        text: "INSERT INTO schedule_copy_receipts(workspace_id,actor_employee_id,operation_id,payload) VALUES($1,$2,$3::uuid,$4::jsonb)",
        values: [
          workspace.id,
          actor,
          command.operationId,
          JSON.stringify(receipt),
        ],
      });
      outcomes.forEach((r, i) =>
        writes.push({
          text: "INSERT INTO schedule_copy_row_receipts(workspace_id,actor_employee_id,operation_id,row_number,source_id,status,reason,warnings,inserted_shift_id) VALUES($1,$2,$3::uuid,$4,$5,$6,$7,$8::jsonb,$9)",
          values: [
            workspace.id,
            actor,
            command.operationId,
            i,
            r.sourceId,
            r.status,
            r.reason,
            JSON.stringify(r.warnings),
            r.shiftId,
          ],
        }),
      );
      const plan = preparePublishedWeekChange({
        weekStarts: weeks,
        revisionWeekStarts: [command.weekStart],
        actorEmployeeId: actor,
        sourceId: command.operationId,
        sourceType: "MANAGER_MUTATION",
        proof,
        state: read.state,
        config,
        schedulingSource: read.source,
        observedAt: read.observed,
        batch: { statements: writes, afterSchedules, afterShifts },
      });
      await executor.transaction([
        ...common,
        ...plan.guards,
        ...plan.statements,
        ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
      ]);
      return receipt;
    } catch (error) {
      // Includes ambiguous post-commit transport errors and duplicate transactions:
      // only a freshly authorized persisted receipt establishes success.
      const recovered = await authorizedOperation(
        proof,
        command.operationId,
        executor,
      );
      workspace = recovered.workspace;
      operation = recovered.operation;
      if (operation && operation.command_hash !== commandHash)
        throw Error("COPY_COMMAND_CONFLICT");
      if (operation?.payload) return operation.payload;
      const code = (error as { code?: string })?.code;
      if (
        attempt === 3 ||
        !(
          ["23505", "40001", "40P01"].includes(code ?? "") ||
          (code === "22P02" &&
            /source_conflict|version_conflict/.test(String(error)))
        )
      )
        throw error;
    }
  }
  throw Error("Copy pending; retry the original operation.");
}
