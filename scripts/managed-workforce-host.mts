import {createServer} from 'node:http';
import {parseManagedHostConfig,type ManagedObservation} from '../src/lib/operations/managed-host';
import {acquireManagedState,runManagedCycle,managedHttpResponse} from '../src/lib/operations/managed-runtime';
import {compiledHostedSourceSha} from '../services/hosted/neon/source';
import {managedDestinations} from '../src/lib/operations/managed-destinations';

async function main(){
 const source=compiledHostedSourceSha();if(!source||process.env.RENDER_GIT_COMMIT!==source)throw Error('managed_source_invalid');
 if(process.argv.length>3||process.argv[2]!==undefined&&process.argv[2]!=='--validate-config')throw Error('managed_configuration_invalid');
 const config=parseManagedHostConfig({...process.env,NEVORA_WORKFORCE_SOURCE_SHA:process.env.NEVORA_WORKFORCE_SOURCE_SHA??source},source,managedDestinations),port=Number(process.env.PORT??10000);
 if(process.argv[2]==='--validate-config'){process.stdout.write(JSON.stringify({state:'valid',enabled:config.enabled,profiles:config.profiles.length})+'\n');return;}
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error('managed_configuration_invalid');
 const controller=new AbortController();let ready=false,confirmed=true,observations:ManagedObservation[]=[];
 const lease=config.enabled?await acquireManagedState(config):null;
 const server=createServer({maxHeaderSize:8192,requestTimeout:5000,headersTimeout:5000},(req,res)=>{
  // Neither Host nor forwarded headers choose an origin, company or command.
  let response:Response;
  try{
   if(!req.url?.startsWith('/')||req.url.startsWith('//')||req.url.length>512)throw Error();
   const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
   response=managedHttpResponse(new Request('http://localhost'+req.url,{method:req.method,headers}),config,observations,Date.now(),ready);
  }
  catch{response=Response.json({error:'invalid_request'},{status:400});}
  req.resume();res.writeHead(response.status,Object.fromEntries(response.headers));void response.text().then(text=>res.end(text));
 });
 server.maxConnections=32;server.keepAliveTimeout=2000;
 const stop=()=>{ready=false;controller.abort();server.close();server.closeIdleConnections();};
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
 try{
  await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(port,'0.0.0.0',()=>{server.removeListener('error',bad);ok();});});ready=true;
  if(!config.enabled){await new Promise<void>(ok=>{controller.signal.addEventListener('abort',()=>ok(),{once:true});if(controller.signal.aborted)ok();});return;}
  while(!controller.signal.aborted){
   const cycle=await runManagedCycle(config,controller.signal);observations=cycle.observations;confirmed=cycle.cleanupConfirmed;
   if(!confirmed){ready=false;console.error(JSON.stringify({event:'managed_custody_unconfirmed',...cycle.failure}));throw Error('managed_cleanup_unconfirmed');}
   if(!controller.signal.aborted)await new Promise<void>(ok=>{const done=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',done);ok();};const timer=setTimeout(done,60000);controller.signal.addEventListener('abort',done,{once:true});if(controller.signal.aborted)done();});
  }
 }finally{
  stop();server.closeAllConnections();
  try{await lease?.release(confirmed);}catch{console.error(JSON.stringify({event:'managed_state_release_failed',sourceSha:config.sourceSha,cleanupConfirmed:confirmed}));throw Error('managed_state_unavailable');}
  finally{process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);}
 }
}
main().catch(()=>{console.error('managed_workforce_unavailable');process.exitCode=1;});
