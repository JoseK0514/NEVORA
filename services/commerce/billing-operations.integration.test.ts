import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {CommerceStore} from './store';
import {CommerceError} from './model';
import {dropTestDatabase} from './test-database';
import {commercePrincipalGrants} from './principals';
import {openBillingOperation} from './billing-operations';
import {createCommerce} from './service';
const enabled=Boolean(process.env.NEVORA_COMMERCE_TEST_URL),businessId='11111111-1111-4111-8111-111111111111';
describe.skipIf(!enabled)('durable billing request and issued-stage custody',()=>{
 let admin:Pool,pool:Pool,observer:Pool,store:CommerceStore,name:string,url:URL;
 beforeEach(async()=>{
  url=new URL(process.env.NEVORA_COMMERCE_TEST_URL!);if(url.hostname!=='127.0.0.1'||url.search||process.env.DATABASE_URL)throw Error('Owned loopback cluster required');
  admin=new Pool({connectionString:url.href});name='commerce_test_'+randomUUID().replaceAll('-','');await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
  pool=new Pool({connectionString:url.href,max:2,statement_timeout:2000});observer=new Pool({connectionString:url.href,max:1,statement_timeout:2000});
  await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));store=new CommerceStore(pool,Buffer.alloc(32,47));
  await seed(businessId);
 });
 afterEach(async()=>{vi.restoreAllMocks();await pool?.end();await observer?.end();if(admin){if(name)await dropTestDatabase(admin,name);await admin.end();}});
 async function seed(id:string){await pool.query("INSERT INTO commerce.accounts(id,email,profile,verified_at) VALUES($1,$2,$3,clock_timestamp());",[id,id+'@example.invalid',{email:id+'@example.invalid'}]);await pool.query("INSERT INTO commerce.businesses(id,state,employee_count) VALUES($1,'ready',1)",[id]);}
 async function open(operation=randomUUID(),overrides:Partial<Parameters<typeof openBillingOperation>[1]>={}){
  return openBillingOperation(store,{business:await store.business(businessId),operation,action:'checkout',request:{lang:'en'},context:{actor:'a'.repeat(64),assertCurrent:async(client)=>{if(client)await client.query('SELECT 1');}},...overrides});
 }
 it('commits immutable prepared parameters and issued custody before a mutation callback, then replays the known result',async()=>{
  const operation=randomUUID(),op=await open(operation);expect(await op.replay()).toBeNull();
  await op.prepareStage('checkout',async()=>({customer:'cus_fictional',locale:'en',returnUrl:'https://accounts.example.invalid/return#fictional'}));
  const prepared=(await observer.query('SELECT issued_at,params_secret FROM commerce.billing_operation_stages')).rows[0];expect(prepared.issued_at).toBeNull();expect(prepared.params_secret).not.toContain('cus_fictional');
  let creates=0;
  const result=await op.executeStage<{customer:string;locale:string},{url:string}>('checkout',async(_client,_business,params)=>{
   const row=(await observer.query('SELECT issued_at,result_secret FROM commerce.billing_operation_stages')).rows[0];expect(row.issued_at).not.toBeNull();expect(row.result_secret).toBeNull();expect(params).toMatchObject({customer:'cus_fictional',locale:'en'});creates++;return {url:'https://checkout.stripe.com/fictional-only'};
  });
  expect(await op.finish(result)).toEqual({url:'https://checkout.stripe.com/fictional-only'});
  const replay=await open(operation);expect(await replay.replay()).toEqual({url:'https://checkout.stripe.com/fictional-only'});
  expect(await replay.executeStage('checkout',async()=>{throw Error('A known stage must not create again');})).toEqual({url:'https://checkout.stripe.com/fictional-only'});expect(creates).toBe(1);
  expect((await pool.query('SELECT count(*)::int n FROM commerce.billing_operations')).rows).toEqual([{n:1}]);
 });
 it.each(['actor','language','action'])('rejects changed %s for the same company/key without replacing its receipt',async change=>{
  const operation=randomUUID();await open(operation);
  const overrides=change==='actor'?{context:{actor:'b'.repeat(64),assertCurrent:async()=>{}}}:change==='language'?{request:{lang:'es' as const}}:{action:'portal' as const};
  await expect(open(operation,overrides)).rejects.toMatchObject({code:'idempotency_conflict',status:409});
  expect((await pool.query('SELECT count(*)::int n FROM commerce.billing_operations')).rows).toEqual([{n:1}]);
 });
 it('serializes identical contenders and blocks a replacement key while any issued outcome is unknown',async()=>{
  const operation=randomUUID(),one=await open(operation),two=await open(operation);let prepares=0,creates=0;
  await Promise.all([one,two].map(op=>op.prepareStage('portal',async()=>{prepares++;return {customer:'cus_fictional',locale:'en'};})));expect(prepares).toBe(1);
  await expect(open(randomUUID())).rejects.toMatchObject({code:'billing_operation_pending',status:409});
  const values=await Promise.all([one,two].map(op=>op.executeStage('portal',async()=>{creates++;return {url:'https://billing.stripe.com/fictional-only'};})));
  expect(values).toEqual([{url:'https://billing.stripe.com/fictional-only'},{url:'https://billing.stripe.com/fictional-only'}]);expect(creates).toBe(1);
  await one.finish(values[0]);expect(await open(randomUUID())).toBeDefined();
 });
 it('retains an accepted-but-unacknowledged stage and recovers the original prepared operation',async()=>{
  const operation=randomUUID(),op=await open(operation);await op.prepareStage('customer',async()=>({email:'fictional@example.invalid',metadata:{nevora_business_id:businessId}}));
  await expect(op.executeStage('customer',async()=>{throw Error('Owned provider accepted but reply was lost');})).rejects.toThrow('Owned provider accepted');
  const row=(await observer.query('SELECT issued_at,result_secret FROM commerce.billing_operation_stages')).rows[0];expect(row.issued_at).not.toBeNull();expect(row.result_secret).toBeNull();
  await expect(open(randomUUID())).rejects.toMatchObject({code:'billing_operation_pending'});
  await expect(op.refusePreflight(new CommerceError('checkout_expired',409))).resolves.toBe(false);
  const again=await open(operation);expect(await again.prepareStage('customer',async()=>{throw Error('Must reuse exact prepared parameters');})).toMatchObject({email:'fictional@example.invalid'});
  expect(await again.executeStage('customer',async()=>({id:'cus_original_fictional'}))).toEqual({id:'cus_original_fictional'});
  expect(await again.finish({url:'https://checkout.stripe.com/original'})).toEqual({url:'https://checkout.stripe.com/original'});
 });
 it('recovers a stage whose result committed even when the caller lost the local commit reply',async()=>{
  const operation=randomUUID(),op=await open(operation);await op.prepareStage('portal',async()=>({customer:'cus_fictional'}));
  const actual=store.transaction.bind(store);let lose=true,creates=0;
  vi.spyOn(store,'transaction').mockImplementation(async fn=>{
   const value=await actual(fn);if(lose&&value&&typeof value==='object'&&'url' in value){lose=false;throw Error('Owned local commit reply lost');}return value;
  });
  await expect(op.executeStage('portal',async()=>{creates++;return {url:'https://billing.stripe.com/original'};})).rejects.toThrow('Owned local commit reply lost');
  const again=await open(operation);expect(await again.executeStage('portal',async()=>{creates++;throw Error('Duplicate create');})).toEqual({url:'https://billing.stripe.com/original'});expect(creates).toBe(1);
 });
 it('stores a completed outcome before a later authority check denies its private projection',async()=>{
  const operation=randomUUID();let revoked=false;
  const context={actor:'a'.repeat(64),assertCurrent:async()=>{if(revoked)throw new CommerceError('unauthorized',401);}};
  const op=await open(operation,{context});await op.prepareStage('portal',async()=>({customer:'cus_fictional'}));
  const result=await op.executeStage('portal',async()=>{revoked=true;return {url:'https://billing.stripe.com/private-fictional'};});
  await expect(op.finish(result)).rejects.toMatchObject({code:'unauthorized',status:401});
  expect((await observer.query('SELECT result_secret IS NOT NULL known FROM commerce.billing_operation_stages')).rows).toEqual([{known:true}]);
  expect((await observer.query('SELECT result_secret IS NOT NULL known FROM commerce.billing_operations')).rows).toEqual([{known:true}]);
 });
 it('never renews an expired issued operation or allows another key to bypass its unresolved effect',async()=>{
  const operation=randomUUID(),op=await open(operation);await op.prepareStage('portal',async()=>({customer:'cus_fictional'}));
  await expect(op.executeStage('portal',async()=>{throw Error('Owned uncertain effect');})).rejects.toThrow('Owned uncertain effect');
  const expires=(await pool.query('SELECT expires_at FROM commerce.billing_operations')).rows[0].expires_at;
  vi.spyOn(Date,'now').mockReturnValue(expires.getTime()+1);
  await expect(op.executeStage('portal',async()=>{throw Error('A late create must never run');})).rejects.toMatchObject({code:'billing_operation_reconciliation_required',status:409});
  await expect(open(randomUUID())).rejects.toMatchObject({code:'billing_operation_pending'});
  expect((await pool.query('SELECT expires_at FROM commerce.billing_operations')).rows[0].expires_at).toEqual(expires);
 });
 it('records a known preflight refusal only when no issued stage remains unresolved',async()=>{
  const operation=randomUUID(),op=await open(operation);await op.prepareStage('portal',async()=>({customer:'cus_fictional'}));
  expect(await op.refusePreflight(new CommerceError('plan_employee_limit',409))).toBe(true);
  await expect((await open(operation)).replay()).rejects.toMatchObject({code:'plan_employee_limit',status:409});expect(await open(randomUUID())).toBeDefined();
 });
 it('keeps the same key independent for two fictional companies',async()=>{
  const other='22222222-2222-4222-8222-222222222222';await seed(other);const operation=randomUUID();const one=await open(operation),two=await open(operation,{business:await store.business(other)});
  await one.prepareStage('portal',async()=>({customer:'cus_a'}));await two.prepareStage('portal',async()=>({customer:'cus_b'}));
  expect((await pool.query('SELECT count(*)::int n FROM commerce.billing_operations')).rows).toEqual([{n:2}]);
 });
 it('reapplies the additive migration without changing existing request and stage receipts',async()=>{
  const op=await open();await op.prepareStage('customer',async()=>({email:'fictional@example.invalid'}));
  const snapshot=async()=>JSON.stringify((await pool.query("SELECT row_to_json(o) row FROM commerce.billing_operations o UNION ALL SELECT row_to_json(s) FROM commerce.billing_operation_stages s")).rows);
  const before=await snapshot(),migration=await readFile(new URL('./migrations/0005_billing_operations.sql',import.meta.url),'utf8');await pool.query(migration);await pool.query(migration);expect(await snapshot()).toBe(before);
 });
 it('fails readiness on the previous catalog and explicitly migrates it without changing existing company data',async()=>{
  const handle=createCommerce({store,origin:'https://accounts.example.invalid',allowedOrigins:[]});
  const ready=()=>handle(new Request('https://accounts.example.invalid/ready'),'127.0.0.1');
  const before=(await pool.query('SELECT row_to_json(b) company FROM commerce.businesses b')).rows;
  await pool.query('DROP TABLE commerce.billing_operation_stages;DROP TABLE commerce.billing_operations;DROP FUNCTION commerce.billing_operation_immutable()');
  const closed=await ready();expect(closed.status).toBe(503);expect(await closed.json()).toEqual({error:{code:'catalog_not_ready'}});
  await pool.query(await readFile(new URL('./migrations/0005_billing_operations.sql',import.meta.url),'utf8'));
  expect((await ready()).status).toBe(200);expect((await pool.query('SELECT row_to_json(b) company FROM commerce.businesses b')).rows).toEqual(before);
  expect((await pool.query('SELECT count(*)::int n FROM commerce.billing_operations')).rows).toEqual([{n:0}]);
 });
 it('denies enrollment-principal receipts and API mutation of original actor, parameters or deadline',async()=>{
  const api='nv_commerce_api_'+randomUUID().replaceAll('-','').slice(0,24),enroll='nv_commerce_enroll_'+randomUUID().replaceAll('-','').slice(0,24);
  await pool.query(`CREATE ROLE ${api} NOLOGIN;CREATE ROLE ${enroll} NOLOGIN`);for(const sql of commercePrincipalGrants(api,enroll))await pool.query(sql);
  const op=await open();await op.prepareStage('portal',async()=>({customer:'cus_fictional'}));const client=await pool.connect();
  try{
   await client.query('SET ROLE '+enroll);await expect(client.query('SELECT * FROM commerce.billing_operations')).rejects.toMatchObject({code:'42501'});await client.query('RESET ROLE');
   await client.query('SET ROLE '+api);expect((await client.query('SELECT count(*)::int n FROM commerce.billing_operations')).rows).toEqual([{n:1}]);
   for(const sql of ["UPDATE commerce.billing_operations SET actor_hash=repeat('b',64)","UPDATE commerce.billing_operations SET expires_at=clock_timestamp()+interval '1 day'","UPDATE commerce.billing_operation_stages SET params_secret='replacement'"]){await expect(client.query(sql)).rejects.toMatchObject({code:'42501'});}
  }finally{await client.query('RESET ROLE');client.release();}
 });
 it('keeps a contender retryable when another operation temporarily owns the business',async()=>{
  const first=await open(),nextKey=randomUUID(),next=await open(nextKey);
  await first.prepareStage('portal',async()=>({customer:'cus_fictional'}));
  await expect(next.prepareStage('portal',async()=>({customer:'cus_fictional'}))).rejects.toMatchObject({code:'billing_operation_pending'});
  expect(await next.refusePreflight(new CommerceError('billing_operation_pending',409))).toBe(false);
  const result=await first.executeStage('portal',async()=>({url:'https://billing.stripe.com/first'}));await first.finish(result);
  const retried=await open(nextKey);expect(await retried.replay()).toBeNull();expect(await retried.prepareStage('portal',async()=>({customer:'cus_fictional'}))).toEqual({customer:'cus_fictional'});
 });

});
