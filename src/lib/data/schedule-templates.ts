import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "../db";
import { listWeekShifts } from "./schedules";
import { isValidWeekStart } from "../date-utils";

export type ScheduleTemplate = {
  id: string;
  name: string;
  createdAt: string;
  shiftCount: number;
};

export type TemplateShift = {
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
): Promise<TemplateShift[] | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         ts.id,
         ts.template_id,
         ts.location_id,
         ts.day_offset,
         ts.start_time,
         ts.end_time,
         ts.employee_id,
         ts.is_designated_lead,
         ts.notes
       FROM schedule_templates t
       LEFT JOIN schedule_template_shifts ts ON ts.template_id = t.id
       WHERE t.id = $1 AND t.active = true
       ORDER BY ts.day_offset, ts.start_time, ts.location_id`,
      [templateId],
    ),
  );

  if (!rows.length) return null;

  return rows
    .filter((row) => (row as Record<string, unknown>).id !== null)
    .map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id),
        templateId: String(item.template_id),
        locationId: String(item.location_id),
        dayOffset: Number(item.day_offset),
        startTime: timeValue(item.start_time),
        endTime: timeValue(item.end_time),
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
}) {
  if (!isValidWeekStart(input.weekStart)) {
    throw new Error("Invalid week start.");
  }

  const shifts = await listWeekShifts({ weekStart: input.weekStart });
  const templateId = randomUUID();
  const sql = getDb();
  const weekStartTime = new Date(`${input.weekStart}T12:00:00Z`).getTime();

  const queries = [
    sql`INSERT INTO schedule_templates (
      id,
      name,
      created_by
    ) VALUES (
      ${templateId},
      ${input.name},
      ${input.createdBy}
    )`,
    ...shifts.map((shift) => {
      const shiftTime = new Date(`${shift.date}T12:00:00Z`).getTime();
      const dayOffset = Math.round(
        (shiftTime - weekStartTime) / (24 * 60 * 60 * 1000),
      );

      return sql`INSERT INTO schedule_template_shifts (
        id,
        template_id,
        location_id,
        day_offset,
        start_time,
        end_time,
        employee_id,
        is_designated_lead,
        notes
      ) VALUES (
        ${randomUUID()},
        ${templateId},
        ${shift.locationId},
        ${dayOffset},
        ${shift.startTime},
        ${shift.endTime},
        ${shift.employeeId},
        ${shift.isDesignatedLead},
        ${shift.notes ?? null}
      )`;
    }),
  ];

  await sql.transaction(queries);
  return templateId;
}

export async function archiveScheduleTemplate(templateId: string) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `UPDATE schedule_templates
       SET active = false,
           updated_at = now()
       WHERE id = $1
         AND active = true
       RETURNING id`,
      [templateId],
    ),
  );
  return Boolean(rows[0]);
}
