import {exactPending,journalKey,legacyRecords,samePending,type ClockerJournal,type LegacyStorage,type JournalReference} from './recovery-journal';
import type {PendingPunch} from './punch-client';
const DATABASE='nevora.clocker.recovery',VERSION=1;
type Slot={key:string;location:string;pending:PendingPunch};
type History={key:string;location:string;commandId:string;action:string;resolution:'recorded'|'reviewed-context'};
const failure=()=>Error('Recovery storage is unavailable. No new action was sent.');
function request<T>(r:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(failure());});}
function completed(tx:IDBTransaction):Promise<void>{return new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure());tx.onerror=()=>reject(failure());});}
export async function openClockerJournal(factory:IDBFactory=window.indexedDB,legacy:LegacyStorage=window.sessionStorage):Promise<ClockerJournal>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{
  let settled=false;const opening=factory.open(DATABASE,VERSION);
  const timer=setTimeout(()=>{settled=true;reject(failure());},3000);
  opening.onupgradeneeded=()=>{const db=opening.result;if(!db.objectStoreNames.contains('pending'))db.createObjectStore('pending',{keyPath:'key'});if(!db.objectStoreNames.contains('history'))db.createObjectStore('history',{keyPath:'key'});};
  opening.onblocked=opening.onerror=()=>{settled=true;clearTimeout(timer);reject(failure());};
  opening.onsuccess=()=>{clearTimeout(timer);if(settled){opening.result.close();return;}settled=true;resolve(opening.result);};
 });
 db.onversionchange=()=>db.close();
 async function readRaw(location:string,subject:string){
  const tx=db.transaction('pending','readonly'),done=completed(tx);
  const slot=await request(tx.objectStore('pending').get(journalKey(location,subject))) as Slot|undefined;await done;
  if(!slot)return null;const p=exactPending(slot.pending);if(p.subject!==subject||slot.location!==location)throw failure();return p;
 }
 async function saveRaw(location:string,value:PendingPunch,allowResolved=false){
  const pending=exactPending(value),key=journalKey(location,pending.subject),tx=db.transaction(['pending','history'],'readwrite'),done=completed(tx);
  try{
   const retired=await request(tx.objectStore('history').get(JSON.stringify([location,pending.subject,pending.command.commandId]))) as History|undefined;
   if(retired){await done;if(allowResolved&&retired.action===pending.command.action)return false;throw Error('This recovery reference was already resolved.');}
   const store=tx.objectStore('pending'),previous=await request(store.get(key)) as Slot|undefined;
   if(previous&&(previous.location!==location||!samePending(previous.pending,pending)))throw Error('Your previous action still needs verification.');
   await request(store.put({key,location,pending} satisfies Slot));
   const saved=await request(store.get(key)) as Slot|undefined;if(!saved||!samePending(saved.pending,pending))throw failure();
  }catch(error){try{tx.abort();}catch{/* A completed transaction needs no rollback. */}await done.catch(()=>{});throw error;}
  await done;return true;
 }
 async function migrate(location:string,subject?:string){
  for(const record of legacyRecords(legacy,location)){
   if(!record.pending){if(subject&&record.key===`nevora.clocker.pending.v2:${location}:${subject}`)throw failure();continue;}
   try{
    const copied=await saveRaw(location,record.pending,true);
    if(copied){const saved=await readRaw(location,record.pending.subject);if(!saved||!samePending(saved,record.pending))throw failure();}
    if(legacy.getItem(record.key)===record.raw)legacy.removeItem(record.key);
   }catch(error){if(record.pending.subject===subject)throw error;}
  }
 }
 return {
  async read(location,subject){journalKey(location,subject);await migrate(location,subject);return readRaw(location,subject);},
  async saveExact(location,value){const p=exactPending(value);await migrate(location,p.subject);await saveRaw(location,p);},
  async resolveExact(location,value,resolution){
   if(resolution!=='recorded'&&resolution!=='reviewed-context')throw failure();
   const p=exactPending(value);await migrate(location,p.subject);const key=journalKey(location,p.subject),tx=db.transaction(['pending','history'],'readwrite'),done=completed(tx);
   try{
    const store=tx.objectStore('pending'),slot=await request(store.get(key)) as Slot|undefined;
    if(!slot||slot.location!==location||!samePending(slot.pending,p))throw Error('Recovery intent changed. It was kept.');
    await request(tx.objectStore('history').put({key:JSON.stringify([location,p.subject,p.command.commandId]),location,commandId:p.command.commandId,action:p.command.action,resolution} satisfies History));
    await request(store.delete(key));
   }catch(error){try{tx.abort();}catch{/* A completed transaction needs no rollback. */}await done.catch(()=>{});throw error;}
   await done;
  },
  async references(location){
   await migrate(location);const tx=db.transaction(['pending','history'],'readonly'),done=completed(tx);
   const [slots,history]=await Promise.all([request(tx.objectStore('pending').getAll()) as Promise<Slot[]>,request(tx.objectStore('history').getAll()) as Promise<History[]>]);await done;
   const refs:JournalReference[]=slots.filter(s=>s.location===location).map(s=>{try{const p=exactPending(s.pending);return {commandId:p.command.commandId,action:p.command.action};}catch{return {commandId:null,action:null};}});
   refs.push(...history.filter(h=>h.location===location).map(h=>({commandId:h.commandId,action:h.action})),...legacyRecords(legacy,location).map(r=>({commandId:r.pending?.command.commandId??null,action:r.pending?.command.action??null})));
   return refs.filter((r,i,all)=>r.commandId===null||all.findIndex(x=>x.commandId===r.commandId)===i);
  },close(){db.close();},
 };
}
