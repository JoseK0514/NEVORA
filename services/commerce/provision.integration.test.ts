import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { CommerceStore } from './store';
import { provisionBusiness, registerSlot } from './provision';
import { hashPassword, verifyPassword } from '../../src/lib/auth/password';
const enabled=Boolean(process.env.NEVORA_COMMERCE_TEST_URL);
describe.skipIf(!enabled)('isolated company provisioning',()=>{
 let admin:Pool,catalog:Pool,target:Pool,store:CommerceStore;let catalogUrl:string,targetUrl:string;
 const suffix=randomUUID().replaceAll('-',''),catalogName=`commerce_test_${suffix}`,targetName=`company_test_${suffix}`;
 let businessId:string;const key=Buffer.alloc(32,7),secret='a'.repeat(43);
 beforeAll(async()=>{
  const url=new URL(process.env.NEVORA_COMMERCE_TEST_URL!);if(url.hostname!=='127.0.0.1'||process.env.DATABASE_URL)throw Error('owned cluster required');admin=new Pool({connectionString:url.href});
  for(const name of [catalogName,targetName])await admin.query(`CREATE DATABASE "${name}"`);
  url.pathname=`/${catalogName}`;catalogUrl=url.href;catalog=new Pool({connectionString:catalogUrl});
  url.pathname=`/${targetName}`;targetUrl=url.href;target=new Pool({connectionString:targetUrl});
  await catalog.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));store=new CommerceStore(catalog,key);
  await store.signup({email:'owner@example.test',password:'fictional-owner-pass123',firstName:'Taylor',lastName:'Example',phone:'7875550101',businessName:'Example Shop',timeZone:'America/Puerto_Rico',locationName:'Main',employeeCount:10},await hashPassword('fictional-owner-pass123'),'v'.repeat(43),'https://accounts.example.test',Date.now());
  await store.exchange('v'.repeat(43),'s'.repeat(43),Date.now());businessId=(await catalog.query('SELECT id FROM commerce.businesses')).rows[0].id;
 });
 afterAll(async()=>{await catalog?.end();await target?.end();if(admin){for(const name of [catalogName,targetName])await admin.query(`DROP DATABASE "${name}" WITH(FORCE)`);await admin.end();}});
 it('keeps a verified signup pending when approved capacity is unavailable',async()=>{
  await expect(provisionBusiness(store,businessId)).rejects.toThrow('capacity_unavailable');
  expect((await store.business(businessId)).trialEnd).toBeNull();
 });
 it('installs one isolated company and starts exactly one 30-day trial under concurrent retries',async()=>{
  await registerSlot(store,{id:'slot-a',origin:'https://company-a.example.test',databaseUrl:targetUrl,instanceSecret:secret},'development');
  await expect(provisionBusiness(store,businessId,{probe:async()=>{throw Error('installation_not_ready');}})).rejects.toThrow('installation_not_ready');
  expect((await store.business(businessId)).trialEnd).toBeNull();
  const probe=async()=>{expect((await target.query('SELECT business_id FROM nevora_commerce_installation')).rows[0].business_id).toBe(businessId);};
  await Promise.all([provisionBusiness(store,businessId,{probe}),provisionBusiness(store,businessId,{probe})]);
  const b=await store.business(businessId);expect(b.state).toBe('ready');expect(b.trialEnd!-b.trialStart!).toBe(30*86400000);
  const accounts=await target.query("SELECT e.id,e.role,c.password_hash FROM employees e JOIN employee_credentials c ON c.employee_id=e.id");
  expect(accounts.rows).toHaveLength(1);expect(accounts.rows[0].role).toBe('OWNER');expect(await verifyPassword('fictional-owner-pass123',accounts.rows[0].password_hash)).toBe(true);
  expect((await target.query('SELECT count(*)::int n FROM workspaces')).rows[0].n).toBe(1);
  expect((await catalog.query('SELECT password_hash FROM commerce.accounts')).rows[0].password_hash).toBeNull();
  await provisionBusiness(store,businessId,{probe});expect((await store.business(businessId)).trialEnd).toBe(b.trialEnd);
  await expect(store.installation('slot-a','wrong-secret')).rejects.toThrow('unauthorized');
 },120000);
 it('refuses to enroll a nonempty or already enrolled database for another slot',async()=>{
  await expect(registerSlot(store,{id:'slot-b',origin:'https://company-b.example.test',databaseUrl:targetUrl,instanceSecret:'b'.repeat(43)},'development')).rejects.toThrow();
 });
});
