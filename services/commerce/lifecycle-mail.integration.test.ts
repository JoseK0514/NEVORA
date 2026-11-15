import {beforeEach,afterEach,describe,it,expect} from 'vitest';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {CommerceStore} from './store';
import {dropTestDatabase} from './test-database';
import {scheduleLifecycleMail,enqueueWorkplaceReady} from './lifecycle-mail';
import {workerOnce} from './worker';
describe.skipIf(!process.env.NEVORA_COMMERCE_TEST_URL)('owned lifecycle mail outbox',()=>{
 let admin:Pool,pool:Pool,store:CommerceStore,name:string;const id='11111111-1111-4111-8111-111111111111';
 beforeEach(async()=>{
  const url=new URL(process.env.NEVORA_COMMERCE_TEST_URL!);admin=new Pool({connectionString:url.href});name='commerce_test_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;pool=new Pool({connectionString:url.href,max:4});await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));store=new CommerceStore(pool,Buffer.alloc(32,45));
  await pool.query("INSERT INTO commerce.accounts(id,email,profile,verified_at) VALUES($1,'owner@example.invalid','{}',clock_timestamp())",[id]);
  await pool.query("INSERT INTO commerce.businesses(id,state,employee_count,trial_started_at,trial_ends_at) VALUES($1,'ready',1,clock_timestamp()-interval '23 days',clock_timestamp()+interval '6 days')",[id]);
  await pool.query("INSERT INTO commerce.slots(id,origin,database_fingerprint,database_secret,instance_secret_hash,instance_secret,business_id) VALUES('owned-slot','https://company.example.invalid','owned-database','owned-secret',repeat('a',64),'owned-instance',$1)",[id]);
 });
 afterEach(async()=>{await pool?.end();if(admin){await dropTestDatabase(admin,name);await admin.end();}});
 it('deduplicates concurrent scheduling and sends one claimed notice using the current verified billing contact',async()=>{
  await Promise.all([scheduleLifecycleMail(store),scheduleLifecycleMail(store)]);expect((await pool.query('SELECT count(*)::int n FROM commerce.jobs')).rows).toEqual([{n:1}]);
  const sent:unknown[]=[];expect((await workerOnce(store,undefined,async m=>{sent.push(m);})).state).toBe('processed');expect(sent).toHaveLength(1);expect(sent[0]).toMatchObject({email:'owner@example.invalid',template:'trial_7d',url:'https://company.example.invalid/app/billing'});
  await scheduleLifecycleMail(store);expect((await pool.query('SELECT count(*)::int n FROM commerce.jobs')).rows).toEqual([{n:1}]);
 });
 it('does not send to a contact whose verification is unavailable',async()=>{await pool.query('UPDATE commerce.accounts SET verified_at=NULL WHERE id=$1',[id]);let sent=0;expect(await workerOnce(store,undefined,async()=>{sent++;})).toMatchObject({state:'retry_scheduled',kind:'mail'});expect(sent).toBe(0);});
 it('retires queued trial mail after payment and preserves the completed outbox record',async()=>{
  await scheduleLifecycleMail(store);await pool.query("UPDATE commerce.businesses SET paid_through=clock_timestamp()+interval '30 days' WHERE id=$1",[id]);let sent=0;await workerOnce(store,undefined,async()=>{sent++;});expect(sent).toBe(0);expect((await pool.query('SELECT state FROM commerce.jobs')).rows).toEqual([{state:'done'}]);
 });
 it('creates distinct one-day and renewal-failed receipts and retries transport failure without leaking provider details',async()=>{
  await pool.query("UPDATE commerce.businesses SET trial_ends_at=clock_timestamp()+interval '12 hours' WHERE id=$1",[id]);await scheduleLifecycleMail(store);const failed=await workerOnce(store,undefined,async()=>{throw Error('private provider response and address');});expect(failed).toMatchObject({state:'retry_scheduled',kind:'mail',code:'retry_required'});expect(JSON.stringify((await pool.query('SELECT last_error FROM commerce.jobs')).rows)).not.toContain('private');
  await pool.query("UPDATE commerce.businesses SET trial_ends_at=clock_timestamp()-interval '10 days',paid_through=clock_timestamp()-interval '1 day',past_due_since=clock_timestamp()-interval '1 day',subscription_status='past_due' WHERE id=$1",[id]);await scheduleLifecycleMail(store);const templates=(await pool.query('SELECT id,payload FROM commerce.jobs')).rows.map(row=>store.openJob(row).template);expect(templates.sort()).toEqual(['renewal_failed','trial_1d']);
 });
 it('enqueues workplace-ready once at the transition and resolves the contact again before sending',async()=>{
  await pool.query("UPDATE commerce.businesses SET trial_ends_at=clock_timestamp()+interval '30 days' WHERE id=$1",[id]);const b=await store.business(id);await store.transaction(async c=>{await enqueueWorkplaceReady(store,c,id,b.trialStart!);await enqueueWorkplaceReady(store,c,id,b.trialStart!);});await pool.query("UPDATE commerce.accounts SET email='current-owner@example.invalid',verified_at=clock_timestamp() WHERE id=$1",[id]);const sent:unknown[]=[];await workerOnce(store,undefined,async m=>{sent.push(m);});expect(sent).toHaveLength(1);expect(sent[0]).toMatchObject({email:'current-owner@example.invalid',template:'workplace_ready',url:'https://company.example.invalid/login'});
 });
});
