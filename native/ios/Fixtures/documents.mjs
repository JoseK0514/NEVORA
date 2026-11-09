import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
if(process.argv.slice(2).join(' ')!=='--owned-local')throw Error('Owned local mode required');
const marker=randomUUID();let apiRequests=0,browserRequests=0,nativeRequests=0,browserHadAppCookie=false;
const page=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fictional document QA</title><style>body{font:18px system-ui;padding:24px}a,button{display:block;min-height:48px;margin:24px 0;font:inherit}</style><h1>Fictional exports</h1><a href="/api/payroll-export?fictional=1">Download fictional CSV</a><button id="blob">Download fictional blob</button><p>Local document delegate QA only.</p><script src="/__qa/blob.js"></script>`;
const server=createServer((request,response)=>{
 response.setHeader('Cache-Control','no-store');
 if(request.url==='/__qa/result'){response.setHeader('Content-Type','application/json');response.end(JSON.stringify({apiRequests,browserRequests,nativeRequests,browserHadAppCookie,fictional:true}));return;}
 if(request.url==='/api/mobile/v1/session'){response.writeHead(401,{'Content-Type':'application/json'});response.end(JSON.stringify({protocolVersion:1,state:'unauthenticated'}));return;}
 if(request.url==='/app'){response.writeHead(303,{Location:'/app/payroll-export'});response.end();return;}
 if(request.url.startsWith('/api/payroll-export')){apiRequests++;response.writeHead(200,{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="fictional.csv"'});response.end('fictional,data\n');return;}
 if(request.url==='/__qa/blob.js'){response.setHeader('Content-Type','application/javascript');response.end("document.querySelector('#blob').onclick=()=>{const u=URL.createObjectURL(new Blob(['fictional,data\\n'],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='fictional.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}");return;}
 if(request.url==='/app/payroll-export'){
  if(/NEVORA-Native/.test(request.headers['user-agent']??'')){nativeRequests++;response.setHeader('Set-Cookie',`nevora_document_qa=${marker}; Path=/; HttpOnly; SameSite=Lax`);}
  else{browserRequests++;browserHadAppCookie ||= (request.headers.cookie??'').includes('nevora_document_qa='+marker);}
  response.setHeader('Content-Type','text/html; charset=utf-8');response.end(page);return;
 }
 response.writeHead(404);response.end('Fictional fixture path missing');
});
await new Promise(ready=>server.listen(0,'127.0.0.1',ready));console.log(JSON.stringify({origin:'http://127.0.0.1:'+server.address().port,pid:process.pid,fictional:true}));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
