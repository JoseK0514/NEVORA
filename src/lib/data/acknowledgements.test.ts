vi.mock('server-only',()=>({}));
import { expect, it, vi } from "vitest";
import { acknowledgeScheduleWeek, getAcknowledgementSummary, listUnacknowledgedEmployeeIds } from "./acknowledgements";
vi.mock("./publication-revisions", () => ({ getLatestPublicationRevision: vi.fn(async () => ({ id: "revision-1" })), listRevisionShifts: vi.fn(async () => [{ employeeId: "employee-1" }, { employeeId: "owner-1" }]) }));
vi.mock("../db", async importOriginal => ({ ...await importOriginal<typeof import("../db")>(), getDb: () => ({ query: async (sql: string) => sql.includes("FROM employees") ? [{ id: "employee-1" }] : [] }) }));
it("requires acknowledgement only from scheduled self-service roles", async () => {
  expect(await getAcknowledgementSummary("2030-10-07")).toEqual({ scheduledEmployees: 1, acknowledgedEmployees: 0 });
  expect(await listUnacknowledgedEmployeeIds("2030-10-07")).toEqual(["employee-1"]);
});


import {attentionIntent} from './employee-attention-receipts.server';
const proof={employee:{id:'employee-1',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE' as const,primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const workspace={id:'workspace',name:'Fictional',timeZone:'America/Puerto_Rico',active:true,createdAt:'2030-01-01',updatedAt:'2030-01-01'};
const ref={kind:'SCHEDULE' as const,id:'2030-10-07',version:'revision-1'};
const intent=attentionIntent(proof,workspace.id,'CONFIRM_WEEK',ref);
const input={proof,weekStart:ref.id,expectedRevisionId:ref.version,...intent};
function executor(){
 const transaction=vi.fn(async(statements:readonly import('../notifications/types').SqlStatement[])=>statements.map(s=>
  s.text.includes('FROM workspaces WHERE singleton=true')&&s.text.includes('created_at')?[workspace]:
  s.text.startsWith('SELECT result FROM employee_attention_operations')?[{result:{status:'committed',operationId:intent.operationId,id:ref.id,version:ref.version}}]:
  s.text.startsWith('SELECT jsonb_build_object')?[{detail:{id:ref.id,version:ref.version,required:true}}]:[]));
 return {query:vi.fn(),transaction};
}
it('acknowledgement commits under the week lock and cancels outstanding reminders including claimed deliveries',async()=>{
 const db=executor();expect(await acknowledgeScheduleWeek(input,db)).toMatchObject({status:'committed'});
 const batch=db.transaction.mock.calls.at(-1)![0];
 expect(batch.findIndex(s=>s.text.includes('pg_advisory_xact_lock'))).toBeLessThan(batch.findIndex(s=>s.text.includes('INSERT INTO schedule_acknowledgements')));
 expect(batch.some(s=>s.text.includes("purpose = 'REMINDER'")&&s.text.includes('UPDATE notifications'))).toBe(true);
 expect(batch.some(s=>s.text.includes('UPDATE push_deliveries')&&s.text.includes('processing'))).toBe(true);
 expect(batch.at(-2)!.text).toContain('clock_timestamp()');
});
it('types the cancellation week parameter as a text source ID and binds exact revision',async()=>{
 const db=executor();await acknowledgeScheduleWeek(input,db);const batch=db.transaction.mock.calls.at(-1)![0];
 expect(batch.find(s=>s.text.includes('UPDATE notifications'))!.text).toMatch(/source_id=\$4::text/);
 expect(batch.find(s=>s.text.includes('INSERT INTO schedule_acknowledgements'))!.values).toContain(ref.version);
});
it('unseen_republish_conflicts and never invokes mutation with forged intent',async()=>{
 const db=executor();expect(await acknowledgeScheduleWeek({...input,expectedRevisionId:'unseen'},db)).toEqual({status:'blocked',reason:'review_authority'});
 expect(db.transaction.mock.calls.flatMap(c=>c[0]).some(s=>s.text.includes('INSERT INTO schedule_acknowledgements'))).toBe(false);
});
it('ID-only caller cannot bypass proof',async()=>{
 expect(await acknowledgeScheduleWeek({weekStart:ref.id,employeeId:proof.employee.id} as never,executor())).toMatchObject({status:'blocked'});
});
