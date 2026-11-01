import assert from 'node:assert/strict';
import { createInterface } from 'node:readline';
import { createServer } from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';
const evidence=dirname(fileURLToPath(import.meta.url));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(sha,'83397510a83d82420a3b6526c787f43a3092a839');
assert(!process.env.DATABASE_URL);
console.log('Awaiting isolated rehearsal credential via stdin (never echoed).');
const rl=createInterface({input:process.stdin,terminal:false});
const secret=await new Promise(resolve=>rl.once('line',resolve));rl.close();process.stdin.pause();
const url=new URL(secret.trim());assert.equal(url.pathname,'/nevora_release1_rehearsal');assert.equal(url.username,'rehearsal_owner');
const port=await new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const a=s.address();s.close(()=>resolve(a.port));});});
const env=Object.fromEntries(['PATH','HOME','TMPDIR','LANG'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
Object.assign(env,{DATABASE_URL:secret.trim(),NEXT_TELEMETRY_DISABLED:'1',NEVORA_PAYROLL_ENABLED:'true',NEVORA_CLOCKER_UI_V2:'true'});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe']});
let log='';const capture=d=>{log+=d.toString();};child.stdout.on('data',capture);child.stderr.on('data',capture);
const report={sha,startedAt:new Date().toISOString(),database:'isolated Phase 2 rehearsal',mode:'Next development server, actual Neon HTTP reads, no login or mutation',checks:[],status:'RUNNING'};
try {
 const deadline=Date.now()+90000;
 while(!/Ready in/.test(log)){assert(Date.now()<deadline,'Next readiness deadline exceeded');assert(child.exitCode===null,'Next exited before ready');await new Promise(r=>setTimeout(r,200));}
 for(const [path,marker] of [['/login','login-employee-id'],['/clocker/rehearsal','Rehearsal location']]){
  const start=Date.now();const response=await fetch(`http://127.0.0.1:${port}${path}`,{redirect:'manual',signal:AbortSignal.timeout(60000)});
  const body=await response.text();assert.equal(response.status,200,path);assert(body.includes(marker),`${path} missing expected marker`);
  assert(body.includes('NEVORA Release 1 Rehearsal')||path.startsWith('/clocker/'));
  writeFileSync(join(evidence,path==='/login'?'login-smoke.html':'clocker-smoke.html'),body);
  report.checks.push({path,status:response.status,marker,passed:true,elapsedMs:Date.now()-start});
 }
 report.status='PASS';report.completedAt=new Date().toISOString();console.log('PASS: /login and /clocker/rehearsal rendered against hosted rehearsal, including real Next brand resolution.');
} catch(error){report.status='FAILED';report.error={name:error.name,message:error instanceof assert.AssertionError?error.message:'See retained local Next log'};process.exitCode=1;console.error('Page smoke failed; see redacted report.');}
finally {
 child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),new Promise(r=>setTimeout(r,5000))]);if(child.exitCode===null)child.kill('SIGKILL');
 writeFileSync(join(evidence,'page-smoke.json'),JSON.stringify(report,null,2)+'\n');writeFileSync(join(evidence,'next-smoke.log'),log);
}
