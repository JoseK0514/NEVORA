import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateOnboardingInventory} from './onboarding-inventory.mjs';
const classified=path=>({path,status:'CONVERTED',reason:'Reviewed actual guarded boundary'});
test('new download, auth action, worker and direct database paths cannot evade the entrypoint inventory',()=>{
 for(const [path,source] of [['src/app/api/export/new/route.ts','export function GET() {}'],['src/app/auth/new.ts',"'use server'; export async function login() {}"],['scripts/new-worker.mts','export async function work() {}'],['functions/new-job.ts','export default function job() {}'],['src/lib/new-store.ts',"import {neon} from '@neondatabase/serverless';"]]){
  assert.throws(()=>validateOnboardingInventory([path],{entries:[]},()=>source),/Unclassified runtime entrypoint/);
  assert.doesNotThrow(()=>validateOnboardingInventory([path],{entries:[classified(path)]},()=>source));
 }
});
test('test-only suffixes are bounded exemptions, invalid inventory dispositions are rejected',()=>{
 assert.doesNotThrow(()=>validateOnboardingInventory(['src/lib/new-store.test.ts'],{entries:[]},()=>"import {neon} from '@neondatabase/serverless'"));
 assert.throws(()=>validateOnboardingInventory(['src/app/api/auth/route.ts'],{entries:[{path:'src/app/api/auth/route.ts',status:'TODO',reason:'later'}]},()=>''),/Incomplete/);
});
test('server actions after comments, without semicolons, or inline in a page still require classification',()=>{
 for(const source of ['/* owner action */\n"use server"\nexport async function save() {}','export function Page(){ async function save(){ "use server"; } }']){
  assert.throws(()=>validateOnboardingInventory(['src/app/new/page.tsx'],{entries:[]},()=>source),/Unclassified runtime entrypoint/);
 }
});
test('commerce server/catalog/worker boundaries cannot evade the runtime inventory',()=>{
 for(const [path,source] of [['services/commerce/server.ts','export function serve(){}'],['services/commerce/enrollment-runtime.ts',"import {Pool} from 'pg'"],['services/commerce/worker.ts','export function once(){}']])assert.throws(()=>validateOnboardingInventory([path],{entries:[]},()=>source),/Unclassified runtime entrypoint/);
});
