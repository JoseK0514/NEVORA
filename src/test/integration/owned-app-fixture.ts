import { publishScheduleWithRevision } from './management-api';
import { hashPassword } from '../../lib/auth/password';
import { businessDate } from '../../lib/business-time';
import { addDays, weekStartFor } from '../../lib/date-utils';
import { fictionalProfile } from '../fixtures/shift-changes';
import {installFixtureCompanyAccess} from './fixture-company-access';
import {fixtureProof} from './shift-change-api';
import {readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {randomUUID} from 'node:crypto';

import type { SqlExecutor } from '../../lib/notifications/types';

// Explicit fictional credentials used only in ownership-marked disposable data.
export const TEST_PASSWORD = 'Fictional-Phase-A-only!';
const scopes = () => ({ revision: 1, mode: 'AUTOMATIC_WHEN_VALID', submissionAdvanceMinutes: 0, completionAdvanceMinutes: 0 });
export async function seedOwnedApp(executor: SqlExecutor, options: {adoptCompanyAccess?: boolean} = {}) {
  const q = (text: string, values: readonly unknown[] = []) => executor.query({ text, values });
  await q("UPDATE workspaces SET name='Northside QA Workforce'; UPDATE locations SET name=CASE id WHEN 'loc-1' THEN 'Northside Main Office' ELSE 'Northside West Office' END,short_name=CASE id WHEN 'loc-1' THEN 'Main Office' ELSE 'West Office' END");
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QAOWNER','Fictional','Owner','555-0100','OWNER','loc-1')");
  await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', ['QAOWNER', await hashPassword(TEST_PASSWORD)]);
  await q("INSERT INTO employee_location_eligibility VALUES('QAOWNER','loc-1'),('QAOWNER','loc-2')");
  await q('UPDATE workspaces SET shift_change_policy=$1', [JSON.stringify({ version: 1, revision: 1, swap: scopes(), coverage: scopes() })]);
  await q("UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false");
  for (const location of ['loc-1', 'loc-2']) {
    for (let day = 0; day < 7; day++) await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,'00:00','24:00')", [`qa-${location}-${day}`, location, day]);
  }
  await q("INSERT INTO positions(id,workspace_id,name) VALUES('qa-pos','workspace-fuel','Customer Support'),('qa-pos2','workspace-fuel','Operations')");
  if (options.adoptCompanyAccess !== false) await installFixtureCompanyAccess(executor);
}

export async function assignOwnedManagerCompanyAccess(executor:SqlExecutor,employeeId:string,ownerId='QAOWNER') {
  const owner=await fixtureProof(executor,ownerId);
  const view=await readOwnerOperationalScope(owner,employeeId,executor);
  if(view.state!=='ready')throw Error('Owned Manager scope context unavailable.');
  const current=view.data.current;
  const result=await assignOperationalScope(owner,employeeId,{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:current.employeeUpdatedAt,expectedRoleGeneration:current.roleGeneration,expectedScopeRevision:current.scopeRevision,scope:{mode:'COMPANY',locationIds:[]}},executor);
  if(result.state!=='saved')throw Error('Owned Manager Company scope assignment failed.');
  return result.receipt;
}

export async function seedOwnedScenarioOwner(executor: SqlExecutor, label: string) {
  if (!/^[A-Z0-9]+$/.test(label)) throw new Error('Use an explicit fictional scenario name');
  const employeeId = `QA-${label}-OWNER`;
  await executor.transaction([
    {text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional',$2,'555-0100','OWNER','loc-1')", values: [employeeId, `${label} Owner`]},
    {text: 'INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) SELECT $1,password_hash,false FROM employee_credentials WHERE employee_id=$2', values: [employeeId, 'QAOWNER']},
    {text: "INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,'loc-1'),($1,'loc-2')", values: [employeeId]},
  ]);
  return employeeId;
}

export async function seedOwnedScenario(executor: SqlExecutor, label: string, offset: number) {
  if (!/^[A-Z0-9]+$/.test(label)) throw new Error('Use an explicit fictional scenario name');
  const q = (text: string, values: readonly unknown[] = []) => executor.query({ text, values });
  const week = weekStartFor(addDays(businessDate(new Date(), 'America/Puerto_Rico'), 14 + offset * 7));
  const actors = [`QA-${label}-A`, `QA-${label}-B`, `QA-${label}-C`];
  const passwordHash = await hashPassword(TEST_PASSWORD);
  for (const [index, id] of actors.entries()) {
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,$3,'555-0199','LEAD','loc-1')", [id, `QA ${label}`, ['Avery', 'Blair', 'Casey'][index]]);
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', [id, passwordHash]);
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1'),($1,'loc-2');", [id]);
    await q("INSERT INTO employee_positions VALUES($1,'qa-pos'),($1,'qa-pos2')", [id]);
    await q('INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES($1,40,80,$2)', [id, JSON.stringify(fictionalProfile())]);
    for (let day = 0; day < 7; day++) await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,'00:00','24:00')", [`${id}-${day}`, id, day]);
  }
  const sourceId = `qa-${label}-source`, targetId = `qa-${label}-target`;
  for (const [index, id] of [sourceId, targetId].entries()) {
    const locationId = ['loc-1', 'loc-2'][index], scheduleId = `qa-${label}-schedule-${index}`;
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')", [scheduleId, locationId, week]);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,$2,$3,$4,'08:00','16:00',$5,true)", [id, scheduleId, actors[index], addDays(week, index + 1), ['qa-pos', 'qa-pos2'][index]]);
    await publishScheduleWithRevision({ locationId, weekStart: week, managerId: 'QAOWNER' }, executor);
  }
  return { label, actors, week, sourceId, targetId, sourceDate: addDays(week, 1), targetDate: addDays(week, 2) };
}
