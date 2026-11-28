import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import { randomUUID } from "node:crypto";
import { workspaceReadGuard } from "./workspaces";
import {
  assertManagementProof,
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

async function authorizedQuery(
  proof: SessionMutationProof | undefined,
  statement: (workspaceId: string) => SqlStatement,
  executor: SqlExecutor,
  lockTemplateId?: string,
) {
  assertManagementProof(proof!, proof?.employee?.id ?? "");
  const {workspace}=await assertOperationalAccess(proof!,{kind:'COMPANY'},executor);
  const guards = [
    ...workspaceReadGuard(workspace),
    {
      text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE",
      values: [proof!.employee.id],
    },
    ...(lockTemplateId === undefined ? [] : [{
      text: "SELECT id FROM schedule_templates WHERE workspace_id=$1 AND id=$2 FOR UPDATE",
      values: [workspace.id, lockTemplateId],
    }]),
    ...operationalScopeStatements(proof!,workspace,{kind:'COMPANY'}),
  ];
  const result = await executor.transaction([
    ...guards,
    statement(workspace.id),
    ...operationalScopeStatements(proof!,workspace,{kind:'COMPANY'}),
  ]);
  return (result[guards.length] ?? []) as Record<string, unknown>[];
}
export async function listScheduleTemplates(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<ScheduleTemplate[]> {
  const rows = await authorizedQuery(
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
  const rows = await authorizedQuery(
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

/**
 * Capture assignment references and weekday offsets from a guarded source week.
 * Templates retain intended assignments, not approval or eligibility guarantees;
 * applying a template revalidates each row against current destination facts.
 */
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
  const {workspace}=await assertOperationalAccess(input.proof,{kind:'COMPANY'},executor);
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
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
    ...statements,
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
  ]);
  return templateId;
}

/** Retire future template selection while retaining its captured rows and historical copy receipts. */
export async function archiveScheduleTemplate(
  templateId: string,
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  assertManagementProof(proof, proof.employee.id);
  const {workspace}=await assertOperationalAccess(proof,{kind:'COMPANY'},executor);
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
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
  ];
  const result = await executor.transaction([
    ...guards,
    {
      text: "UPDATE schedule_templates SET active=false,updated_at=clock_timestamp() WHERE id=$1 AND workspace_id=$2 AND active RETURNING id",
      values: [templateId, workspace.id],
    },
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
  ]);
  return Boolean(result[guards.length]?.[0]);
}

type TemplateChoice = { id: string; name: string; active: boolean };
export type SavedShift = {
  id: string; day: number; start: string; end: string; location: string;
  employee: string | null; position: string | null; lead: boolean; notes: string | null;
};
export type TemplateDetail = {
  id: string; name: string; revision: string; shifts: SavedShift[];
  locations: TemplateChoice[]; employees: (TemplateChoice & { canLead: boolean })[]; positions: TemplateChoice[];
};

/** Load the saved rows, including their inactive references, from the same snapshot as the edit revision. */
export async function readTemplateDetail(id: string, proof: SessionMutationProof, executor = neonNotificationExecutor()) {
  const rows = await authorizedQuery(proof, workspace => ({
    text: `WITH shifts AS (
      SELECT s.* FROM schedule_template_shifts s WHERE s.template_id=$1 AND s.workspace_id=$2
    )
    SELECT t.id,t.name,t.updated_at::text AS revision,
      to_jsonb(ARRAY(SELECT jsonb_build_object('id',id,'day',day_offset,'start',left(start_time::text,5),'end',left(end_time::text,5),
        'location',location_id,'employee',employee_id,'position',position_id,'lead',is_designated_lead,'notes',notes)
        FROM shifts ORDER BY day_offset,start_time,location_id,id)) AS shifts,
      to_jsonb(ARRAY(SELECT jsonb_build_object('id',id,'name',name,'active',active) FROM locations
        WHERE workspace_id=$2 AND (active OR id IN (SELECT location_id FROM shifts)) ORDER BY name,id)) AS locations,
      to_jsonb(ARRAY(SELECT jsonb_build_object('id',e.id,'name',concat_ws(' ',e.first_name,e.last_name),'active',e.active,'canLead',e.role IN ('OWNER','MANAGER','LEAD'))
        FROM employees e JOIN locations home ON home.id=e.primary_location_id
        WHERE home.workspace_id=$2 AND (e.active OR e.id IN (SELECT employee_id FROM shifts)) ORDER BY e.first_name,e.last_name,e.id)) AS employees,
      to_jsonb(ARRAY(SELECT jsonb_build_object('id',id,'name',name,'active',active) FROM positions
        WHERE workspace_id=$2 AND (active OR id IN (SELECT position_id FROM shifts)) ORDER BY name,id)) AS positions
    FROM schedule_templates t WHERE t.id=$1 AND t.workspace_id=$2 AND t.active`,
    values: [id, workspace],
  }), executor);
  return rows[0] ? rows[0] as TemplateDetail : null;
}

export type TemplateEditResult = 'saved' | 'invalid' | 'stale' | 'duplicate' | 'failed';
type TemplateChange = { kind: 'rename'; name: string } | { kind: 'remove'; id: string }
  | { kind: 'add' | 'edit'; shift: SavedShift };

function parseTemplateChange(form: FormData): TemplateChange | null {
  const value = (field: string) => String(form.get(field) ?? '');
  const kind = value('kind'), id = value('shiftId');
  if (kind === 'rename') {
    const name = value('name').trim();
    return name.length >= 3 && name.length <= 50 ? { kind, name } : null;
  }
  if (kind === 'remove') return id ? { kind, id } : null;
  if (kind !== 'add' && (kind !== 'edit' || !id)) return null;
  const start = value('start'), end = value('end'), location = value('location');
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (!/^[0-6]$/.test(value('day')) || !location || !clock.test(start) ||
      (!clock.test(end) && end !== '24:00') || start === end) return null;
  return { kind, shift: { id: kind === 'add' ? randomUUID() : id, day: Number(value('day')), start, end, location,
    employee: value('employee') || null, position: value('position') || null, lead: value('lead') === 'on', notes: value('notes').trim() || null } };
}

function templateChangeStatement(workspace: string, id: string, revision: string, change: TemplateChange): SqlStatement {
  const values: unknown[] = [workspace, id, revision];
  const parent = 'SELECT id FROM schedule_templates WHERE workspace_id=$1 AND id=$2 AND active AND updated_at::text=$3';
  const touch = "updated_at=greatest(clock_timestamp(),updated_at+interval '1 microsecond')";
  if (change.kind === 'rename') return {
    text: `UPDATE schedule_templates SET name=$4,${touch} WHERE id IN (${parent}) RETURNING id`,
    values: [...values, change.name],
  };
  let write: string;
  let source = '';
  if (change.kind === 'remove') {
    values.push(change.id);
    write = 'DELETE FROM schedule_template_shifts WHERE workspace_id=$1 AND template_id IN (SELECT id FROM parent) AND id=$4';
  } else {
    const { shift } = change;
    values.push(shift.id, shift.day, shift.start, shift.end, shift.location, shift.employee, shift.position, shift.lead, shift.notes);
    // Keep existing inactive assignments inspectable and editable. New references must belong to this workspace.
    // employees has no workspace_id: a person belongs to the workspace of their primary location (QA on 342af7eb found
    // the unqualified column bound to the outer row, so every assigned add read as stale).
    source = `, eligible AS (SELECT p.id FROM parent p
      LEFT JOIN schedule_template_shifts old ON old.workspace_id=$1 AND old.template_id=p.id AND old.id=$4
      WHERE EXISTS (SELECT 1 FROM locations WHERE workspace_id=$1 AND id=$8 AND (active OR id=old.location_id))
        AND ($9::text IS NULL OR EXISTS (SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id
          WHERE home.workspace_id=$1 AND e.id=$9 AND (e.active OR e.id=old.employee_id)))
        AND ($10::text IS NULL OR EXISTS (SELECT 1 FROM positions WHERE workspace_id=$1 AND id=$10 AND (active OR id=old.position_id)))
        AND (NOT $11::boolean OR EXISTS (SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id
          WHERE home.workspace_id=$1 AND e.id=$9 AND e.role IN ('OWNER','MANAGER','LEAD'))
          OR (old.is_designated_lead AND old.employee_id IS NOT DISTINCT FROM $9)))`;
    write = change.kind === 'add'
      ? `INSERT INTO schedule_template_shifts(workspace_id,template_id,id,day_offset,start_time,end_time,location_id,employee_id,position_id,is_designated_lead,notes)
         SELECT $1,id,$4,$5,$6::time,$7::time,$8,$9,$10,$11,$12 FROM eligible`
      : `UPDATE schedule_template_shifts SET day_offset=$5,start_time=$6::time,end_time=$7::time,location_id=$8,
         employee_id=$9,position_id=$10,is_designated_lead=$11,notes=$12 WHERE workspace_id=$1 AND template_id IN (SELECT id FROM eligible) AND id=$4`;
  }
  return { text: `WITH parent AS (${parent})${source}, changed AS (${write} RETURNING template_id)
    UPDATE schedule_templates SET ${touch} WHERE id IN (SELECT template_id FROM changed) RETURNING id`, values };
}

export async function editSavedTemplate(id: string, revision: string, form: FormData, proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor()): Promise<TemplateEditResult> {
  const change = parseTemplateChange(form);
  if (!id || !revision || !change) return 'invalid';
  try {
    const rows = await authorizedQuery(proof, workspace => templateChangeStatement(workspace, id, revision, change), executor, id);
    if (rows.length) return 'saved';
    return 'stale';
  } catch (error) {
    if (change.kind === 'rename' && (error as { code?: string })?.code === '23505') return 'duplicate';
    throw error;
  }
}
