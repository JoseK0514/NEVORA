import {parsePendingPunch,type PendingPunch} from './punch-client';
export type JournalReference={commandId:string|null;action:string|null};
export interface ClockerJournal{
 read(location:string,subject:string):Promise<PendingPunch|null>;
 saveExact(location:string,pending:PendingPunch):Promise<void>;
 resolveExact(location:string,pending:PendingPunch,resolution:'recorded'|'reviewed-context'):Promise<void>;
 references(location:string):Promise<JournalReference[]>;
 close():void;
}
export function journalKey(location:string,subject:string):string{
 if(!location||location.length>128||!/^[a-f0-9]{64}$/.test(subject))throw Error('Invalid recovery context.');
 return JSON.stringify([location,subject]);
}
export function exactPending(value:unknown):PendingPunch{return parsePendingPunch(value);}
export function samePending(a:PendingPunch,b:PendingPunch):boolean{return JSON.stringify(exactPending(a))===JSON.stringify(exactPending(b));}
export type LegacyStorage=Pick<Storage,'getItem'|'key'|'length'|'removeItem'>;
export function legacyRecords(storage:Pick<LegacyStorage,'getItem'|'key'|'length'>,location:string){
 const v1=`nevora.clocker.pending.v1:${location}`,prefix=`nevora.clocker.pending.v2:${location}:`;
 return Array.from({length:storage.length},(_,i)=>storage.key(i)).filter((key):key is string=>key===v1||!!key?.startsWith(prefix)).map(key=>{
  const raw=storage.getItem(key);let pending:PendingPunch|null=null;
  try{if(!raw||raw.length>2048)throw Error();pending=exactPending(JSON.parse(raw));if(key!==v1&&key!==prefix+pending.subject)pending=null;}catch{/* Preserve unreadable bytes for assistance. */}
  return {key,raw,pending};
 });
}
