import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { createDisposableExchangeDatabase } from './local-postgres';
import { seedOwnedApp, seedOwnedScenario } from './owned-app-fixture';
import { readEmployeeHome } from '../../lib/data/employee-home.server';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
let db: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
let proof: SessionMutationProof;
beforeEach(async () => {
 db=await createDisposableExchangeDatabase({mode:'current-runtime'});
 await seedOwnedApp(db.executor);
 const scenario=await seedOwnedScenario(db.executor,'COPY20',0);
 proof={employee:{id:scenario.actors[0],firstName:'Fictional',lastName:'Lead',role:'LEAD',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
 await db.executor.query({text:"INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day')",values:[proof.sessionTokenHash,proof.employee.id]});
});
afterEach(async()=>{await db?.dispose();});
it.each([['PENDING','waiting'],['APPROVED','approved'],['DENIED','declined'],['CANCELLED','withdrawn']])('Home writes time-off %s as %s at the server',async(status,label)=>{
 await db.executor.query({text:"INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('copy-leave',$1,current_date+7,current_date+8,$2)",values:[proof.employee.id,status]});
 const result=await readEmployeeHome(proof,db.executor);
 expect(result).toHaveProperty('snapshot');
 if('snapshot' in result)expect(result.snapshot.attention.find(i=>i.ref.id==='copy-leave')?.label).toMatch(new RegExp(`^Time off ${label} · `));
});
