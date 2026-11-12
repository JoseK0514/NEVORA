import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateOnboardingInventory} from './onboarding-inventory.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
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
test('the billing status route and plan-confirmation catalog helper have explicit isolated dispositions',()=>{
 const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean),inventory=JSON.parse(readFileSync('docs/handoffs/onboarding-entrypoint-inventory.json','utf8'));
 const read=path=>/\.[cm]?[jt]sx?$/.test(path)?readFileSync(path,'utf8'):'';
 for(const [path,behavior] of [['src/app/api/commerce/status/route.ts','BOUND_APPLICATION'],['services/commerce/plan-change.ts','SEPARATE_CATALOG']]){
  const entry=inventory.entries.find(entry=>entry.path===path);assert(entry,path);assert.equal(entry.status,'CONVERTED');assert.equal(entry.isolatedBehavior,behavior);
  assert.throws(()=>validateOnboardingInventory(files,{...inventory,entries:inventory.entries.filter(entry=>entry.path!==path)},read),/Unclassified runtime entrypoint/,path);
 }
});
test('the private workforce command and every tracked transport boundary have an explicit reviewed disposition',()=>{
 assert.throws(()=>validateOnboardingInventory(['scripts/workforce-operations.mts'],{entries:[]},()=>''),/Unclassified runtime entrypoint/);
 assert.throws(()=>validateOnboardingInventory(['scripts/managed-workforce-host.mts'],{entries:[]},()=>''),/Unclassified runtime entrypoint/);
 const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean),inventory=JSON.parse(readFileSync('docs/handoffs/onboarding-entrypoint-inventory.json','utf8'));
 assert.doesNotThrow(()=>validateOnboardingInventory(files,inventory,path=>/\.[cm]?[jt]sx?$/.test(path)?readFileSync(path,'utf8'):''));
});
test('every actual staff task route has a company-bound disposition and removing any entry fails closed',()=>{
 const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean);
 const paths=files.filter(path=>path.startsWith('src/app/api/staff-tasks/')&&path.endsWith('/route.ts')).sort();
 assert.deepEqual(paths,['src/app/api/staff-tasks/[taskId]/route.ts','src/app/api/staff-tasks/commands/route.ts','src/app/api/staff-tasks/context/route.ts','src/app/api/staff-tasks/history/route.ts','src/app/api/staff-tasks/operations/[operationId]/route.ts','src/app/api/staff-tasks/query/route.ts']);
 const inventory=JSON.parse(readFileSync('docs/handoffs/onboarding-entrypoint-inventory.json','utf8'));
 const sources=new Map(files.map(path=>[path,/\.[cm]?[jt]sx?$/.test(path)?readFileSync(path,'utf8'):'']));
 const read=path=>sources.get(path)??'';
 assert.doesNotThrow(()=>validateOnboardingInventory(files,inventory,read));
 for(const path of paths){
  const entry=inventory.entries.find(entry=>entry.path===path);
  assert(entry,path);assert.equal(entry.status,'CONVERTED');assert.equal(entry.isolatedBehavior,'BOUND_APPLICATION');
  assert.throws(()=>validateOnboardingInventory(files,{...inventory,entries:inventory.entries.filter(entry=>entry.path!==path)},read),/Unclassified runtime entrypoint/,path);
 }
});
test('every actual conversation route has a company-bound disposition and removing any entry fails closed',()=>{
 const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8',maxBuffer:32*1024*1024}).split('\0').filter(Boolean);
 const paths=files.filter(path=>path.startsWith('src/app/api/conversations/')&&path.endsWith('/route.ts')).sort();
 assert.deepEqual(paths,['src/app/api/conversations/[conversationId]/route.ts','src/app/api/conversations/commands/route.ts','src/app/api/conversations/context/route.ts','src/app/api/conversations/history/route.ts','src/app/api/conversations/operations/[operationId]/route.ts','src/app/api/conversations/query/route.ts']);
 const inventory=JSON.parse(readFileSync('docs/handoffs/onboarding-entrypoint-inventory.json','utf8'));
 const sources=new Map(files.map(path=>[path,/\.[cm]?[jt]sx?$/.test(path)?readFileSync(path,'utf8'):'']));
 const read=path=>sources.get(path)??'';
 assert.doesNotThrow(()=>validateOnboardingInventory(files,inventory,read));
 for(const path of paths){
  const entry=inventory.entries.find(entry=>entry.path===path);
  assert(entry,path);assert.equal(entry.status,'CONVERTED');assert.equal(entry.isolatedBehavior,'BOUND_APPLICATION');
  assert.throws(()=>validateOnboardingInventory(files,{...inventory,entries:inventory.entries.filter(entry=>entry.path!==path)},read),/Unclassified runtime entrypoint/,path);
 }
});
