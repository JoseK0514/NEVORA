import next from 'next';
import {createServer} from 'node:http';
const origins=JSON.parse(process.env.NEVORA_OWNED_ISOLATED_ORIGINS??'[]') as string[],port=Number(process.argv[2]);
if(process.env.NODE_ENV!=='development'||process.env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||origins.length!==1||!Number.isInteger(port)||port<1024||port>65535)throw Error('Owned isolated Next ingress missing');
const canonical=new URL(origins[0]);if(canonical.protocol!=='https:'||!canonical.hostname.endsWith('.example.invalid')||canonical.origin!==origins[0])throw Error('Owned isolated public identity missing');
// Public hostname/port are the registered company identity. Only the actual
// socket uses the owned ephemeral loopback port; no host-trust bypass is added.
const application=next({dev:true,dir:process.cwd(),hostname:canonical.hostname,port:443});
await application.prepare();const handle=application.getRequestHandler();
const server=createServer((req,res)=>{
 if(req.headers.host!==canonical.host||req.headers['x-forwarded-host']!==canonical.host||req.headers['x-forwarded-proto']!=='https'){res.writeHead(403).end();return;}
 void handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500);res.end();});
});
await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(port,'127.0.0.1',ok);});
