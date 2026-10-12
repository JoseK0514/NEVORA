import { randomUUID } from "node:crypto";
import { getWorkspace, workspaceReadGuard } from "./workspaces";
import {
  assertManagementProof,
  managementSessionStatements,
} from "./management-session";
import type { SessionMutationProof } from "../shift-changes/types";
import {
  readGenerationSource,
  generationMutationGuards,
} from "./generation-guards";
import { listWeekShifts } from "@/lib/data/schedules";
import { neonNotificationExecutor } from "./notification-transactions";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { isValidWeekStart } from "@/lib/date-utils";

export type ScheduleTemplate = {
  id: string;
  name: string;
  createdAt: string;
  shiftCount: number;
};

export type TemplateShift = {
  positionId?: string;
  id: string;
  templateId: string;
  locationId: string;
  dayOffset: number;
  startTime: string;
  endTime: string;
  employeeId?: string;
  isDesignatedLead: boolean;
  notes?: string;
};

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

async function authorizedRead(
  proof: SessionMutationProof | undefined,
  statement: (workspaceId: string) => SqlStatement,
  executor: SqlExecutor,
) {
  assertManagementProof(proof!, proof?.employee?.id ?? "");
  const workspace = await getWorkspace(executor);
  const guards = [
    ...workspaceReadGuard(workspace),
    {
      text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE",
      values: [proof!.employee.id],
    },
    ...managementSessionStatements(proof!, proof!.employee.id),
  ];
  const result = await executor.transaction([
    ...guards,
    statement(workspace.id),
    ...managementSessionStatements(proof!, proof!.employee.id),
  ]);
  return (result[guards.length] ?? []) as Record<string, unknown>[];
}
export async function listScheduleTemplates(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<ScheduleTemplate[]> {
  const rows = await authorizedRead(
    proof,
    (id) => ({
      text: `SELECT t.id,t.name,t.created_at,count(ts.id) AS shift_count FROM schedule_templates t LEFT JOIN schedule_template_shifts ts ON ts.template_id=t.id AND ts.workspace_id=t.workspace_id WHERE t.workspace_id=$1 AND t.active=true GROUP BY t.id ORDER BY lower(t.name)`,
      values: [id],
    }),
    executor,
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
    shiftCount: Number(row.shift_count),
  }));
}
export async function listTemplateShifts(
  templateId: string,
  executor: SqlExecutor = neonNotificationExecutor(),
  proof?: SessionMutationProof,
): Promise<TemplateShift[] | null> {
  const rows = await authorizedRead(
    proof,
    (id) => ({
      text: `SELECT ts.id,ts.template_id,ts.location_id,ts.day_offset,ts.start_time,ts.end_time,ts.position_id,ts.employee_id,ts.is_designated_lead,ts.notes FROM schedule_templates t LEFT JOIN schedule_template_shifts ts ON ts.template_id=t.id AND ts.workspace_id=t.workspace_id WHERE t.id=$1 AND t.workspace_id=$2 AND t.active = true ORDER BY ts.day_offset,ts.start_time,ts.location_id,ts.id`,
      values: [templateId, id],
    }),
    executor,
  );
  if (!rows.length) return null;
  return rows
    .filter((row) => row.id !== null)
    .map((row) => ({
      id: String(row.id),
      templateId: String(row.template_id),
      locationId: String(row.location_id),
      dayOffset: Number(row.day_offset),
      startTime: timeValue(row.start_time),
      endTime: timeValue(row.end_time),
      positionId: row.position_id ? String(row.position_id) : undefined,
      employeeId: row.employee_id ? String(row.employee_id) : undefined,
      isDesignatedLead: Boolean(row.is_designated_lead),
      notes: row.notes ? String(row.notes) : undefined,
    }));
}

export async function createTemplateFromWeek(
  input: {
    name: string;
    weekStart: string;
    createdBy: string;
    proof: SessionMutationProof;
  },
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  if (!isValidWeekStart(input.weekStart)) {
    throw new Error("Invalid week start.");
  }

  assertManagementProof(input.proof, input.createdBy);
  const workspace = await getWorkspace(executor);
  const { source } = await readGenerationSource(executor);
  const shifts = await listWeekShifts({ weekStart: input.weekStart }, executor);
  const templateId = randomUUID();
  const weekStartTime = new Date(`${input.weekStart}T12:00:00Z`).getTime();

  const statements: SqlStatement[] = [
    {
      text: "INSERT INTO schedule_templates(id,name,created_by,workspace_id) VALUES($1,$2,$3,$4)",
      values: [templateId, input.name, input.createdBy, workspace.id],
    },
    ...shifts.map((shift) => {
      const shiftTime = new Date(`${shift.date}T12:00:00Z`).getTime();
      const dayOffset = Math.round(
        (shiftTime - weekStartTime) / (24 * 60 * 60 * 1000),
      );
      return {
        text: `INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,is_designated_lead,notes,position_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        values: [
          randomUUID(),
          templateId,
          shift.locationId,
          dayOffset,
          shift.startTime,
          shift.endTime,
          shift.employeeId,
          shift.isDesignatedLead,
          shift.notes ?? null,
          shift.positionId || null,
        ],
      };
    }),
  ];
  await executor.transaction([
    ...generationMutationGuards(source, [input.weekStart]),
    ...workspaceReadGuard(workspace),
    ...managementSessionStatements(input.proof, input.createdBy),
    ...statements,
    ...managementSessionStatements(input.proof, input.createdBy),
  ]);
  return templateId;
}

export async function archiveScheduleTemplate(
  templateId: string,
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  assertManagementProof(proof, proof.employee.id);
  const workspace = await getWorkspace(executor);
  const guards = [
    ...workspaceReadGuard(workspace),
    {
      text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE",
      values: [proof.employee.id],
    },
    {
      text: "SELECT id FROM schedule_templates WHERE id=$1 AND workspace_id=$2 FOR UPDATE",
      values: [templateId, workspace.id],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ];
  const result = await executor.transaction([
    ...guards,
    {
      text: "UPDATE schedule_templates SET active=false,updated_at=clock_timestamp() WHERE id=$1 AND workspace_id=$2 AND active RETURNING id",
      values: [templateId, workspace.id],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  return Boolean(result[guards.length]?.[0]);
}
