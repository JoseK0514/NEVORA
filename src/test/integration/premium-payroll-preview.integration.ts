import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {seedPayrollPreviewFixture} from './payroll-preview-fixture';
import {statements,document} from '../../lib/payroll/access';
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
afterEach(async()=>{await db?.dispose();delete process.env.NEVORA_PAYROLL_ENABLED;});
it('fictional lead can read and download at least two distinct published statements',async()=>{
 process.env.NEVORA_PAYROLL_ENABLED='true';
 db=await createDisposableExchangeDatabase({mode:'current-runtime'});await seedOwnedApp(db.executor);
 const fixture=await seedPayrollPreviewFixture(db.executor);
 await db.executor.query({text:"INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day')",values:[fixture.lead.sessionTokenHash,fixture.lead.employee.id]});
 const result=await statements(fixture.lead,db.executor);
 expect(result.statements.length).toBeGreaterThanOrEqual(2);
 expect(new Set(result.statements.map(s=>s.period.startDate)).size).toBeGreaterThanOrEqual(2);
 for(const s of result.statements){expect(s.published).toBe(true);expect((await document(fixture.lead,s.id,db.executor)).bytes.subarray(0,4).toString()).toBe('%PDF');}
});
