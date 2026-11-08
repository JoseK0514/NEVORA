import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createRuntime} from './runtime';
import {dropTestDatabase} from './test-database';
import {runCommerceTask} from '../hosted/neon/tasks';
import {randomBytes} from 'node:crypto';
describe.skipIf(!process.env.NEVORA_COMMERCE_TEST_URL)('Neon bounded worker catalog lifecycle',()=>{
 let admin:Pool,fixture:Pool,name:string,url:URL;let opened:ReturnType<typeof createRuntime>[]=[];
 beforeEach(async()=>{
  url=new URL(process.env.NEVORA_COMMERCE_TEST_URL!);if(url.hostname!=='127.0.0.1'||url.search||process.env.DATABASE_URL)throw Error('owned cluster required');
  admin=new Pool({connectionString:url.href});name='commerce_test_'+randomUUID().replaceAll('-','');await admin.query('CREATE DATABASE "'+name+'"');url.pathname='/'+name;
  fixture=new Pool({connectionString:url.href,max:2});await fixture.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 });
 afterEach(async()=>{for(const r of opened)if(!r.pool.ended)await r.pool.end();opened=[];await fixture?.end();if(admin){if(name)await dropTestDatabase(admin,name);await admin.end();}});
 function runtime(){const r=createRuntime({NODE_ENV:'test',NEVORA_COMMERCE_ENVIRONMENT:'development',NEVORA_COMMERCE_DATABASE_URL:url.href,NEVORA_COMMERCE_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),NEVORA_COMMERCE_ORIGIN:'http://127.0.0.1:3100'});opened.push(r);return r;}
 it('returns an idle result and releases the real connection pool',async()=>{const r=runtime();expect(await runCommerceTask('queue',()=>r)).toEqual({state:'idle'});await expect(r.pool.query('SELECT 1')).rejects.toThrow('Cannot use a pool after calling end');});
 it('closes its pool when reconciliation has no Stripe configuration',async()=>{const r=runtime();await expect(runCommerceTask('reconcile',()=>r)).rejects.toThrow('billing_not_configured');await expect(r.pool.query('SELECT 1')).rejects.toThrow('Cannot use a pool after calling end');});
 it('preserves a durable retry when a billing job cannot run',async()=>{const r=runtime();await r.store.transaction(c=>r.store.enqueue(c,'stripe','neon-worker-fixture',{sessionId:'cs_test_fixture'}));expect((await runCommerceTask('queue',()=>r)).state).toBe('retry_scheduled');const rows=await fixture.query('SELECT attempts,last_error,state FROM commerce.jobs');expect(rows.rows).toEqual([{attempts:1,last_error:'retry_required',state:'pending'}]);await expect(r.pool.query('SELECT 1')).rejects.toThrow('Cannot use a pool after calling end');});
 it.each([['support@thevelani.com',1,'processed'],['unapproved@example.invalid',0,'retry_scheduled']] as const)('restricts queued staging mail to the approved inbox: %s',async(email,count,state)=>{const r=runtime(),delivered:string[]=[];r.sendMail=async m=>{delivered.push(m.email);};await r.store.signup(email,randomBytes(32).toString('base64url'),'https://fictional.invalid/verify',Date.now());expect((await runCommerceTask('queue',()=>r)).state).toBe(state);expect(delivered).toHaveLength(count);});
});
