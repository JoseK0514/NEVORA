import {randomUUID} from "node:crypto";
import {readFile} from "node:fs/promises";
import {beforeEach,afterEach,it,expect} from "vitest";
import {createPunchFixture} from "./clocker-punch-fixture";
import {nativeProfiles,saveNativeProfile} from "../../lib/payroll/native/profiles.server";
import {input} from "../../lib/payroll/native/fixtures.test-support";
import type {SessionMutationProof} from "../../lib/shift-changes/types";
const proof:SessionMutationProof={employee:{id:"c34-owner",role:"OWNER",firstName:"QA",lastName:"Owner",primaryLocationId:"loc-1"},sessionTokenHash:"a".repeat(64)};
let f:Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async()=>{process.env.NEVORA_PAYROLL_ENABLED="true";f=await createPunchFixture();await f.q(await readFile("db/migrations/0031_native_payroll.sql","utf8"));});
afterEach(async()=>{await f?.db.dispose();delete process.env.NEVORA_PAYROLL_ENABLED;});
function configuration(){const i=input();i.wages[0].locationIds=["loc-1"];return{schema:"NEVORA_NATIVE_CONFIGURATION_V1" as const,employeeId:"c34-a",wages:i.wages,tax:i.tax,deductions:i.deductions};}
it("upgrades payroll additively and preserves append-only profile revisions/exact retries",async()=>{const c={action:"SAVE_NATIVE_PROFILE",operationId:randomUUID(),reason:"Actual wage facts reviewed",expectedRevision:0,configuration:configuration()};const r=await saveNativeProfile(proof,c,f.db.executor);expect(r.revision).toBe(1);expect(await saveNativeProfile(proof,c,f.db.executor)).toEqual(r);expect((await nativeProfiles(proof,f.db.executor)).configurations[0].wages[0].hourlyRateMinor).toBe("2000");await expect(saveNativeProfile(proof,{...c,reason:"Changed retry"},f.db.executor)).rejects.toThrow("CONFLICT");await expect(f.q("DELETE FROM native_payroll_profile_revisions")).rejects.toThrow("immutable");await expect(f.q("TRUNCATE native_payroll_profile_revisions")).rejects.toThrow("immutable");});
it("serializes competing revisions with one winner",async()=>{const c={action:"SAVE_NATIVE_PROFILE",operationId:randomUUID(),reason:"First facts",expectedRevision:0,configuration:configuration()};const results=await Promise.allSettled([saveNativeProfile(proof,c,f.db.executor),saveNativeProfile(proof,{...c,operationId:randomUUID(),reason:"Competing facts"},f.db.executor)]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await f.q("SELECT count(*)::int n FROM native_payroll_profile_revisions")).toEqual([{n:1}]);});
it("denies non-Owner and missing/cross-workspace employee/location facts",async()=>{const c={action:"SAVE_NATIVE_PROFILE",operationId:randomUUID(),reason:"Reviewed facts",expectedRevision:0,configuration:configuration()};await expect(saveNativeProfile(proof,{...c,configuration:{...c.configuration,employeeId:"missing"}},f.db.executor)).rejects.toThrow("CONFLICT");c.configuration.wages[0].locationIds=["unknown-location"];await expect(saveNativeProfile(proof,c,f.db.executor)).rejects.toThrow("CONFLICT");await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-owner'");await expect(saveNativeProfile(proof,c,f.db.executor)).rejects.toThrow("payroll_authorization");});
it("retains explicit opening zero and finite Owner-issued scope separately from scheduling eligibility",async()=>{const i=input();const c={action:"ATTEST_OPENING_YTD",operationId:randomUUID(),reason:"Opening zero attested",expectedRevision:0,employeeId:"c34-a",ytd:i.ytd};await saveNativeProfile(proof,c,f.db.executor);await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-b'");await saveNativeProfile(proof,{action:"SET_MANAGER_SCOPE",operationId:randomUUID(),reason:"Only location one",expectedRevision:0,employeeId:"c34-b",review:true,approve:false,locationIds:["loc-1"]},f.db.executor);const r=await nativeProfiles(proof,f.db.executor);expect(r.openingYtd[0].ytd.grossMinor).toBe("0");expect(r.managerScopes[0].locationIds).toEqual(["loc-1"]);expect(r.managerScopes[0].subjectEmployeeVersion).toBeTruthy();await expect(f.q("UPDATE native_payroll_opening_ytd_revisions SET payload='{}'::jsonb")).rejects.toThrow("immutable");});

import {calculateNativePayroll} from "../../lib/payroll/native/calculate";
async function seedApprovedNative(runId:string,start="2026-10-05",end="2026-10-11",payday="2026-10-16",correctionOf:string|null=null){
 const [w]=await f.q<{id:string}>("SELECT id FROM workspaces WHERE singleton");
 await f.q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES($1,$2::uuid,$3::date,$4::date,$5::uuid)",[w.id,runId,start,end,correctionOf]);
 await f.q("INSERT INTO payroll_run_revisions VALUES($1,$2::uuid,1,$3::jsonb,NULL)",[w.id,runId,JSON.stringify({id:runId,sourceAuthority:"NATIVE_RECORDED_TIME",status:"APPROVED",period:{startDate:start,endDate:end},payday})]);return w.id;
}
async function insertLedger(runId:string,start="2026-10-05",end="2026-10-11",payday="2026-10-16",correctionOf:string|null=null){
 const i=input();i.employeeId="c34-a";i.timecards[0].employeeId="c34-a";const result=calculateNativePayroll(i);if(result.state!=="ready")throw Error(JSON.stringify(result));
 return f.q("INSERT INTO native_payroll_ledger(workspace_id,employee_id,tax_year,run_id,correction_of,opening_revision,start_date,end_date,payday,payload) SELECT id,'c34-a',2026,$1::uuid,$2::uuid,1,$3::date,$4::date,$5::date,$6::jsonb FROM workspaces WHERE singleton",[runId,correctionOf,start,end,payday,JSON.stringify({result})]);
}
async function openingBalance(){await saveNativeProfile(proof,{action:"ATTEST_OPENING_YTD",operationId:randomUUID(),reason:"Opening balance verified",expectedRevision:0,employeeId:"c34-a",ytd:input().ytd},f.db.executor);}
it("freezes approved opening balances and rejects duplicate or overlapping ordinary payroll",async()=>{
 await openingBalance();const id=randomUUID();await seedApprovedNative(id);await insertLedger(id);
 await expect(saveNativeProfile(proof,{action:"ATTEST_OPENING_YTD",operationId:randomUUID(),reason:"Attempted replacement",expectedRevision:1,employeeId:"c34-a",ytd:{...input().ytd,revision:2}},f.db.executor)).rejects.toThrow("APPROVED_YTD_OPENING_FROZEN");
 await expect(insertLedger(id)).rejects.toThrow();const overlap=randomUUID();await seedApprovedNative(overlap,"2026-10-10","2026-10-16");await expect(insertLedger(overlap,"2026-10-10","2026-10-16")).rejects.toThrow("OVERLAPPING_NATIVE_PAYROLL");
 await expect(f.q("DELETE FROM native_payroll_ledger")).rejects.toThrow("immutable");
});
it("retains one replacement head and rejects changed year/period/payday lineage",async()=>{
 await openingBalance();const original=randomUUID(),replacement=randomUUID();await seedApprovedNative(original);await insertLedger(original);await seedApprovedNative(replacement,"2026-10-05","2026-10-11","2026-10-16",original);await insertLedger(replacement,"2026-10-05","2026-10-11","2026-10-16",original);
 expect(await f.q("SELECT count(*)::int n FROM native_payroll_ledger")).toEqual([{n:2}]);expect(await f.q("SELECT run_id::text id FROM native_payroll_ledger_heads")).toEqual([{id:replacement}]);const changed=randomUUID();await seedApprovedNative(changed,"2026-10-05","2026-10-11","2026-10-17",replacement);await expect(insertLedger(changed,"2026-10-05","2026-10-11","2026-10-17",replacement)).rejects.toThrow("CORRECTION_LINEAGE_CONFLICT");
});
it("serializes simultaneous overlapping ledger approvals in the owned database",async()=>{
 await openingBalance();const a=randomUUID(),b=randomUUID();await seedApprovedNative(a);await seedApprovedNative(b,"2026-10-10","2026-10-16");const results=await Promise.allSettled([insertLedger(a),insertLedger(b,"2026-10-10","2026-10-16")]);expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);expect(await f.q("SELECT count(*)::int n FROM native_payroll_ledger")).toEqual([{n:1}]);
});
