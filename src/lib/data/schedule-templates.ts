import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { listWeekShifts } from "@/lib/data/schedules";
import { neonNotificationExecutor } from "./notification-transactions";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { isValidWeekStart } from "@/lib/date-utils";
import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";
import { getWorkspace, workspaceReadGuard } from "./workspaces";

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

export async function listScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         t.id,
         t.name,
         t.created_at,
         count(ts.id) AS shift_count
       FROM schedule_templates t
       LEFT JOIN schedule_template_shifts ts
         ON ts.template_id = t.id
       WHERE t.active = true
       GROUP BY t.id, t.name, t.created_at
       ORDER BY lower(t.name)`,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      name: String(item.name),
      createdAt:
        item.created_at instanceof Date
          ? item.created_at.toISOString()
          : String(item.created_at),
      shiftCount: Number(item.shift_count),
    };
  });
}

export async function listTemplateShifts(
  templateId: string,
  executor?: SqlExecutor,
): Promise<TemplateShift[] | null> {
  const sql = executor ? {query:(text:string,values:unknown[])=>executor.query({text,values})} : getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT ts.id, ts.template_id, ts.location_id, ts.day_offset,
         ts.start_time, ts.end_time, ts.position_id, ts.employee_id,
         ts.is_designated_lead, ts.notes
       FROM schedule_templates t
       LEFT JOIN schedule_template_shifts ts ON ts.template_id = t.id
       WHERE t.id = $1 AND t.active = true
       ORDER BY ts.day_offset, ts.start_time, ts.location_id`,
      [templateId],
    ),
  );

  if (rows.length === 0) return null;
  return rows.filter(row => (row as Record<string, unknown>).id !== null).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      templateId: String(item.template_id),
      locationId: String(item.location_id),
      dayOffset: Number(item.day_offset),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
      positionId: item.position_id ? String(item.position_id) : undefined,
      employeeId: item.employee_id ? String(item.employee_id) : undefined,
      isDesignatedLead: Boolean(item.is_designated_lead),
      notes: item.notes ? String(item.notes) : undefined,
    };
  });
}

export async function createTemplateFromWeek(input: {
  name: string;
  weekStart: string;
  createdBy: string;
  proof: SessionMutationProof;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  assertManagementProof(input.proof, input.createdBy);
  if (!isValidWeekStart(input.weekStart)) {
    throw new Error("Invalid week start.");
  }

  const shifts = await listWeekShifts({ weekStart: input.weekStart }, executor);
  const workspace = await getWorkspace(executor);
  const templateId = randomUUID();
  const weekStartTime = new Date(`${input.weekStart}T12:00:00Z`).getTime();

  const statements:SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: "SELECT pg_advisory_xact_lock(hashtextextended('schedule-week:' || $1::text, 0))", values: [input.weekStart] },
    { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [[...new Set([input.createdBy, ...shifts.map(shift => shift.employeeId).filter((id): id is string => Boolean(id))])].sort()] },
    { text: 'SELECT id FROM schedules WHERE week_start=$1 ORDER BY id FOR SHARE', values: [input.weekStart] },
    { text: 'SELECT sh.id FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$1 ORDER BY sh.id FOR SHARE OF sh', values: [input.weekStart] },
    ...managementSessionStatements(input.proof, input.createdBy),
    {text:'INSERT INTO schedule_templates(id,name,created_by) VALUES($1,$2,$3)',values:[templateId,input.name,input.createdBy]},
    ...shifts.map(shift => {
      const shiftTime = new Date(`${shift.date}T12:00:00Z`).getTime();
      const dayOffset = Math.round((shiftTime-weekStartTime)/(24*60*60*1000));
      return {text:`INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,is_designated_lead,notes,position_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,values:[randomUUID(),templateId,shift.locationId,dayOffset,shift.startTime,shift.endTime,shift.employeeId,shift.isDesignatedLead,shift.notes ?? null,shift.positionId || null]};
    }),
  ];
  await executor.transaction([...statements, ...managementSessionStatements(input.proof, input.createdBy)]);
  return templateId;
}

export async function archiveScheduleTemplate(templateId: string, proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()) {
  const actorEmployeeId = proof?.employee?.id;
  assertManagementProof(proof, actorEmployeeId);
  const workspace = await getWorkspace(executor);
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [actorEmployeeId] },
    { text: 'SELECT id FROM schedule_templates WHERE id=$1 ORDER BY id FOR UPDATE', values: [templateId] },
    ...managementSessionStatements(proof, actorEmployeeId),
    { text: `UPDATE schedule_templates
       SET active = false,
           updated_at = now()
       WHERE id = $1
         AND active = true
       RETURNING id`,
      values: [templateId] },
  ];
  const results = await executor.transaction([...statements, ...managementSessionStatements(proof, actorEmployeeId)]);
  const rows = results[statements.length - 1];
  return Boolean(rows[0]);
}
