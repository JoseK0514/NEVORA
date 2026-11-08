import {Pool} from 'pg';
import {readCommerceConfig} from '../../commerce/config';
import {CommerceStore} from '../../commerce/store';
import {enqueueStripeWebhook} from '../../commerce/stripe-webhook';
import {createWebhookHandler} from './handlers';

const handler={fetch:createWebhookHandler(process.env,async event=>{
 const config=readCommerceConfig(process.env);
 if(!/^nv_commerce_api_[a-f0-9]{24}$/.test(decodeURIComponent(new URL(config.databaseUrl).username)))throw Error('catalog_api_principal_required');
 const pool=new Pool({connectionString:config.databaseUrl,max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:1000});
 pool.on('error',()=>{});
 try{await enqueueStripeWebhook(new CommerceStore(pool,config.key,'onboarding'),event);}finally{await pool.end();}
})};

export default handler;
