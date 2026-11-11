import {Server} from 'node:net';
import {fileURLToPath} from 'node:url';
export type ManagedStartupObservation={version:1;kind:'listening'}|{version:1;kind:'server_error';code:'EADDRINUSE'|'EACCES'|'EPERM'|'EADDRNOTAVAIL'|'OTHER'};
const codes=['EADDRINUSE','EACCES','EPERM','EADDRNOTAVAIL','OTHER'] as const;
export function readManagedStartupObservation(value:unknown):ManagedStartupObservation|null{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const v=value as Record<string,unknown>,keys=Object.keys(v).sort().join(',');
  if(v.version!==1)return null;
  if(v.kind==='listening'&&keys==='kind,version')return {version:1,kind:'listening'};
  if(v.kind==='server_error'&&keys==='code,kind,version'&&codes.includes(v.code as typeof codes[number]))return {version:1,kind:'server_error',code:v.code as typeof codes[number]};
 }catch{/* Untrusted IPC never widens the diagnostic schema. */}
 return null;
}
// Only an explicit --import in the owned IPC child installs this observer.
// Normal imports (including the acceptance parent) leave Server untouched.
const path=fileURLToPath(import.meta.url);
if(typeof process.send==='function'&&process.execArgv.some((arg,i)=>process.execArgv[i-1]==='--import'&&(arg===path||arg===import.meta.url))){
 const emit=Server.prototype.emit;let listening=false,failed=false;
 Server.prototype.emit=function(this:Server,event:string|symbol,...args:unknown[]):boolean{
  try{
   let observation:ManagedStartupObservation|undefined;
   if(event==='listening'&&!listening){listening=true;observation={version:1,kind:'listening'};}
   if(event==='error'&&!failed){
    failed=true;const raw=args[0]&&typeof args[0]==='object'?Object.getOwnPropertyDescriptor(args[0],'code')?.value:undefined;
    observation={version:1,kind:'server_error',code:codes.includes(raw)&&raw!=='OTHER'?raw:'OTHER'};
   }
   if(observation)process.send!(observation,()=>{});
  }catch{/* Closed IPC cannot alter the server's original outcome. */}
  return Reflect.apply(emit,this,[event,...args]);
 };
}
