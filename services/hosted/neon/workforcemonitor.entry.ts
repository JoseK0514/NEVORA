import {Pool} from 'pg';
import {createScheduledHandler,observedFetch} from './handlers';
import {compiledHostedSourceSha} from './source';
import {parseMonitorConfig,observeManagedHost,sendMonitorNotice} from '../../../src/lib/operations/monitor';
import {processMonitorObservation} from '../../../src/lib/operations/monitor-store';
import {validatedMailTransport} from '../../../src/lib/auth/mail-transport.server';
async function run(){
 const config=parseMonitorConfig(process.env,compiledHostedSourceSha()??'');if(!config.enabled)return {state:'idle'};
 const mail=config.mailEnabled?validatedMailTransport({...process.env,NODE_ENV:'production'}):null;
 if(config.mailEnabled&&!mail)throw Error('monitor_configuration_invalid');
 const pool=new Pool({connectionString:config.databaseUrl,max:1,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:12000,idle_in_transaction_session_timeout:10000});
 pool.on('error',()=>console.error('monitor_database_unavailable'));
 try{return await processMonitorObservation(pool,config.role,()=>observeManagedHost(config),config.mailEnabled,kind=>mail?sendMonitorNotice(config,kind,mail):Promise.resolve('disabled'));}
 finally{await pool.end();}
}
export {compiledHostedSourceSha} from './source';
export default {fetch:observedFetch('workforcemonitor',createScheduledHandler('workforcemonitor',process.env,run))};
