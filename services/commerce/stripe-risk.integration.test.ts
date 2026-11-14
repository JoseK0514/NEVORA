import Stripe from 'stripe';
import {Pool} from 'pg';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {CommerceStore} from './store';
import {StripeBilling} from './stripe';
import {workerOnce} from './worker';
import {dropTestDatabase} from './test-database';

const id='11111111-1111-4111-8111-111111111111',secret='whsec_fictional_risk_only';
describe.skipIf(!process.env.NEVORA_COMMERCE_TEST_URL)('Stripe risk operator review with real catalog and SDK',()=>{
  let admin:Pool,pool:Pool,store:CommerceStore,billing:StripeBilling,name:string;
  let failProvider:boolean,legacyWithoutIntent:boolean,foreignCustomer:boolean,paginated:boolean,unassignedSubscription:boolean;
  const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
  beforeEach(async()=>{
    const url=new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if(url.hostname!=='127.0.0.1'||url.search||process.env.DATABASE_URL)throw Error('owned cluster required');
    admin=new Pool({connectionString:url.href});name=`commerce_test_${randomUUID().replaceAll('-','')}`;
    await admin.query(`CREATE DATABASE "${name}"`);url.pathname='/'+name;
    pool=new Pool({connectionString:url.href,max:2,statement_timeout:2000});
    await pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
    store=new CommerceStore(pool,Buffer.alloc(32,8));
    await pool.query('INSERT INTO commerce.accounts(id,email,profile) VALUES($1,$2,$3)',[id,'fictional@example.invalid',{}]);
    await pool.query("INSERT INTO commerce.businesses(id,state,employee_count,stripe_customer_id,stripe_subscription_id,paid_through) VALUES($1,'ready',8,'cus_owned','sub_owned','2026-12-01T00:00:00Z')",[id]);
    failProvider=false;legacyWithoutIntent=false;foreignCustomer=false;paginated=false;unassignedSubscription=false;
    const client=new Stripe('rk_test_fictional_risk_only',{
      maxNetworkRetries:0,
      httpClient:Stripe.createFetchHttpClient(async(input,init)=>{
        if(init?.method!=='GET')throw Error('Risk handling must not change provider money or subscriptions');
        const url=new URL(String(input));
        if(url.pathname==='/v1/account')return response({id:'acct_fictional',object:'account'});
        if(failProvider)return response({error:{type:'api_error',message:'Synthetic provider outage'}},503);
        if(url.pathname==='/v1/charges/ch_owned')return response({id:'ch_owned',object:'charge',livemode:false,payment_intent:legacyWithoutIntent?null:'pi_owned'});
        if(url.pathname==='/v1/invoice_payments'){
          if(url.searchParams.get('payment[type]')!=='payment_intent'||url.searchParams.get('payment[payment_intent]')!=='pi_owned'||url.searchParams.get('status')!=='paid')throw Error('Wrong invoice-payment resolution');
          const first=paginated&&!url.searchParams.has('starting_after');
          return response({object:'list',url:'/v1/invoice_payments',has_more:first,data:[{
            id:first?'inpay_first':'inpay_owned',object:'invoice_payment',livemode:false,status:'paid',
            invoice:first?'in_unrelated':'in_owned',payment:{type:'payment_intent',payment_intent:'pi_owned'},
          }]});
        }
        if(url.pathname==='/v1/invoices/in_unrelated')return response({id:'in_unrelated',object:'invoice',livemode:false,customer:'cus_owned',parent:null});
        if(url.pathname==='/v1/invoices/in_owned')return response({id:'in_owned',object:'invoice',livemode:false,customer:'cus_owned',parent:{type:'subscription_details',subscription_details:{subscription:'sub_owned'}}});
        if(url.pathname==='/v1/subscriptions/sub_owned')return response({id:'sub_owned',object:'subscription',livemode:false,customer:foreignCustomer?'cus_foreign':'cus_owned',metadata:unassignedSubscription?{}:{nevora_business_id:id}});
        throw Error('Unexpected risk provider read: '+url.pathname);
      }),
    });
    billing=new StripeBilling(store,client,{origin:'https://billing.example.test',prices:{small:'price_small',team:'price_team'},webhookSecret:secret,live:false,expectedAccountId:'acct_fictional'});
  });
  afterEach(async()=>{await pool?.end();if(admin){if(name)await dropTestDatabase(admin,name);await admin.end();}});
  async function notify(type:string,withoutIntent=false){
    const object=type==='charge.refunded'
      ?{id:'ch_owned',object:'charge',payment_intent:withoutIntent?null:'pi_owned'}
      :{id:type==='charge.dispute.created'?'dp_owned':'issfr_owned',object:type==='charge.dispute.created'?'dispute':'radar.early_fraud_warning',charge:'ch_owned',payment_intent:withoutIntent?null:'pi_owned'};
    const raw=JSON.stringify({id:'evt_risk_owned',object:'event',type,livemode:false,data:{object}});
    await billing.webhook(raw,Stripe.webhooks.generateTestHeaderString({payload:raw,secret}));
  }
  const work=()=>workerOnce(store,billing,async()=>{throw Error('No email is authorized by risk processing');});
  it.each(['charge.refunded','charge.dispute.created','radar.early_fraud_warning.created'])(
    'durably routes %s once to the correct business without changing paid coverage',async type=>{
      await notify(type);await notify(type);
      expect((await pool.query('SELECT count(*) FROM commerce.jobs')).rows[0].count).toBe('1');
      expect(await work()).toMatchObject({state:'processed',kind:'stripe'});
      const audit=(await pool.query('SELECT business_id,event FROM commerce.audit')).rows;
      expect(audit).toEqual([{business_id:id,event:`stripe_risk_review:${type}:evt_risk_owned:ch_owned`}]);
      expect((await pool.query('SELECT paid_through FROM commerce.businesses WHERE id=$1',[id])).rows[0].paid_through.toISOString()).toBe('2026-12-01T00:00:00.000Z');
      expect((await pool.query("SELECT count(*) FROM commerce.jobs WHERE state='done'")).rows[0].count).toBe('1');
    });
  it('resolves every invoice-payment page instead of dropping a later subscription invoice',async()=>{
    paginated=true;await notify('charge.refunded');expect(await work()).toMatchObject({state:'processed'});
    expect((await pool.query('SELECT business_id FROM commerce.audit')).rows).toEqual([{business_id:id}]);
  });
  it('uses a Charge lookup when a dispute omits its PaymentIntent',async()=>{
    await notify('charge.dispute.created',true);expect(await work()).toMatchObject({state:'processed'});
    expect((await pool.query('SELECT business_id FROM commerce.audit')).rows).toEqual([{business_id:id}]);
  });
  it('retains an unresolved legacy charge for operator review without assigning it to a workplace',async()=>{
    legacyWithoutIntent=true;await notify('charge.dispute.created',true);expect(await work()).toMatchObject({state:'processed'});
    expect((await pool.query('SELECT business_id,event FROM commerce.audit')).rows).toEqual([{business_id:null,event:'stripe_risk_unresolved:charge.dispute.created:evt_risk_owned:ch_owned'}]);
  });
  it('retains a same-merchant subscription without NEVORA metadata as an unresolved review',async()=>{
    unassignedSubscription=true;await notify('charge.refunded');
    expect(await work()).toMatchObject({state:'processed'});
    expect((await pool.query('SELECT business_id,event FROM commerce.audit')).rows).toEqual([{business_id:null,event:'stripe_risk_unresolved:charge.refunded:evt_risk_owned:ch_owned'}]);
    expect((await pool.query('SELECT stripe_customer_id,stripe_subscription_id FROM commerce.businesses')).rows).toEqual([{stripe_customer_id:'cus_owned',stripe_subscription_id:'sub_owned'}]);
  });
  it('retries provider failure without losing the event or duplicating its eventual audit',async()=>{
    failProvider=true;await notify('charge.refunded');expect(await work()).toMatchObject({state:'retry_scheduled'});
    expect((await pool.query('SELECT count(*) FROM commerce.audit')).rows[0].count).toBe('0');
    failProvider=false;await pool.query("UPDATE commerce.jobs SET available_at=clock_timestamp()-interval '1 second'");
    expect(await work()).toMatchObject({state:'processed'});await notify('charge.refunded');
    expect((await pool.query('SELECT count(*) FROM commerce.audit')).rows[0].count).toBe('1');
    expect((await pool.query('SELECT count(*) FROM commerce.jobs')).rows[0].count).toBe('1');
  });
  it('does not attribute a foreign subscription customer to this workplace',async()=>{
    foreignCustomer=true;await notify('charge.refunded');expect(await work()).toMatchObject({state:'retry_scheduled'});
    expect((await pool.query('SELECT count(*) FROM commerce.audit')).rows[0].count).toBe('0');
    expect((await pool.query('SELECT stripe_customer_id FROM commerce.businesses')).rows[0].stripe_customer_id).toBe('cus_owned');
  });
  it('rolls back the review receipt with a failed audit write so recovery can record it once',async()=>{
    await pool.query("CREATE FUNCTION public.reject_risk_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic risk audit failure'; END $$");
    await pool.query('CREATE TRIGGER reject_risk_audit BEFORE INSERT ON commerce.audit FOR EACH ROW EXECUTE FUNCTION public.reject_risk_audit()');
    await notify('charge.refunded');expect(await work()).toMatchObject({state:'retry_scheduled'});
    expect((await pool.query("SELECT count(*) FROM commerce.webhooks WHERE id LIKE 'risk-review:%'")).rows[0].count).toBe('0');
    await pool.query('DROP TRIGGER reject_risk_audit ON commerce.audit');
    await pool.query('DROP FUNCTION public.reject_risk_audit()');
    await pool.query("UPDATE commerce.jobs SET available_at=clock_timestamp()-interval '1 second'");
    expect(await work()).toMatchObject({state:'processed'});
    expect((await pool.query('SELECT count(*) FROM commerce.audit')).rows[0].count).toBe('1');
  });
});
