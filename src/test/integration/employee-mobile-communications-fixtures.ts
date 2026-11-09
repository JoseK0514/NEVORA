import type {SqlExecutor} from '../../lib/notifications/types';
/** The combined runner owns one cluster, while the unchanged factories require
 * distinct disposable namespaces. Never turn a remote or unmarked input into a
 * local-looking target; each factory still checks absence, OID and its own marker. */
export function communicationFixtureUrl(value:string,prefix:string):string{
 const target=new URL(value),name=decodeURIComponent(target.pathname.slice(1));
 if(!['postgres:','postgresql:'].includes(target.protocol)||!['127.0.0.1','localhost','[::1]'].includes(target.hostname)||!target.port||target.search||target.hash||!/^nevora_exchange_test_c1_[a-f0-9]{12}$/.test(name)||!['nevora_exchange_test_','nevora_foundation_test_','fuel_phase3_test_'].includes(prefix))throw Error('Refusing an unmarked or non-loopback combined fixture');
 target.pathname='/'+prefix+name.slice('nevora_exchange_test_'.length);
 return target.href;
}


/** UI journeys need already-due notices at any wall-clock hour. Quiet-hour
 * scheduling is verified by the canonical notification suite, not bypassed in
 * application code. Only these owned publications and actors may be adjusted. */
export async function makeOwnedCommunicationNoticesDue(executor:SqlExecutor,sourceIds:readonly string[],employeeIds:readonly string[],expected:number){
 if(!sourceIds.length||!employeeIds.length||!Number.isInteger(expected)||expected<1)throw Error('Explicit owned notice scope required');
 const scope="environment='test' AND source_kind='COMMUNICATION' AND source_id=ANY($1::text[]) AND employee_id=ANY($2::text[])";
 const inventory={text:`SELECT id,md5((to_jsonb(n)-'due_at')::text) AS fixed,(${scope}) IS TRUE AS targeted,created_at::text AS "createdAt",due_at::text AS "dueAt",due_at<=clock_timestamp() AS due FROM notifications n ORDER BY id`,values:[sourceIds,employeeIds]};
 type Row={id:string;fixed:string;targeted:boolean;createdAt:string;dueAt:string|null;due:boolean|null};
 const result=await executor.transaction([inventory,{text:`UPDATE notifications SET due_at=created_at WHERE ${scope} RETURNING id`,values:[sourceIds,employeeIds]},inventory]);
 const before=result[0] as Row[],updated=result[1] as {id:string}[],after=result[2] as Row[];
 const targets=before.filter(row=>row.targeted).map(row=>row.id).sort();
 if(targets.length!==expected||JSON.stringify(updated.map(row=>row.id).sort())!==JSON.stringify(targets)||before.length!==after.length)throw Error('Owned notice fixture cardinality changed');
 for(let i=0;i<before.length;i++){
  const a=before[i],b=after[i];
  if(a.id!==b.id||a.fixed!==b.fixed||a.createdAt!==b.createdAt||a.targeted!==b.targeted||(!a.targeted&&a.dueAt!==b.dueAt)||(a.targeted&&(!b.due||b.dueAt!==b.createdAt)))throw Error('Owned notice fixture changed unrelated facts');
 }
 return {environment:'test',sourceKind:'COMMUNICATION',sourceIds,employeeIds,expected,before,updated,after};
}
