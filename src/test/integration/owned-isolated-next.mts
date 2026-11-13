import next from 'next';
import {createServer} from 'node:http';
import {installOwnedFinancialFetch,createOwnedFinancialClock,type OwnedFinanceBridge} from './owned-isolated-finance';
const origins=JSON.parse(process.env.NEVORA_OWNED_ISOLATED_ORIGINS??'[]') as string[],port=Number(process.argv[2]);
if(process.env.NODE_ENV!=='development'||process.env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||origins.length!==1||!Number.isInteger(port)||port<1024||port>65535)throw Error('Owned isolated Next ingress missing');
const canonical=new URL(origins[0]);if(canonical.protocol!=='https:'||!canonical.hostname.endsWith('.example.invalid')||canonical.origin!==origins[0])throw Error('Owned isolated public identity missing');
const finance=process.env.NEVORA_OWNED_FINANCE_BRIDGE?JSON.parse(process.env.NEVORA_OWNED_FINANCE_BRIDGE) as OwnedFinanceBridge:null;
const clock=finance?createOwnedFinancialClock(finance,canonical.origin):null;
if(finance&&clock){installOwnedFinancialFetch(finance);await clock.refresh();Date.now=clock.now;}
// Public hostname/port are the registered company identity. Only the actual
// socket uses the owned ephemeral loopback port; no host-trust bypass is added.
// Match Next 16.4.2 start-server's internal origin when using this custom
// ingress. Redirect self-fetches use the actual owned socket; forwarded public
// Host/protocol, cookies, real RSC responses and all application guards remain.
process.env.__NEXT_PRIVATE_ORIGIN=`http://127.0.0.1:${port}`;
const application=next({dev:true,dir:process.cwd(),hostname:canonical.hostname,port:443});
process.stdout.write('Owned isolated ingress: prepare-start\n');
await application.prepare();process.stdout.write('Owned isolated ingress: prepare-complete\n');const handle=application.getRequestHandler();
const refused=new Set<string>();
const server=createServer((req,res)=>{
 const reasons=[req.headers.host!==canonical.host?'host':null,req.headers['x-forwarded-host']!==canonical.host?'forwarded-host':null,req.headers['x-forwarded-proto']!=='https'?'protocol':null].filter(Boolean).join(',');
 if(reasons){if(!refused.has(reasons)&&refused.size<4){refused.add(reasons);process.stdout.write('Owned isolated ingress: refused-'+reasons+'\n');}res.writeHead(403).end();return;}
 void (async()=>{if(clock)await clock.refresh();await handle(req,res);})().catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});
});
await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',ok);});
process.stdout.write('Owned isolated ingress: listening\n');
