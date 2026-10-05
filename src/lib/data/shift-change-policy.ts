import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { ShiftChangePolicy, PolicyWrite, PolicyWriteResult, OperationalProfileWrite, PolicyField, SessionMutationProof } from '../shift-changes/types';
import { isWorkflowPolicy, resolveOperationalRuleProfile, resolveShiftChangePolicy } from '../shift-changes/policy';
const invalid = (field:PolicyField,message:string):PolicyWriteResult => ({status:'invalid',fieldErrors:[{field,message}]});
const validRevision = (r:number) => Number.isSafeInteger(r) && r >= 0 && r < 2147483647;
const validProof = (p:SessionMutationProof) => p?.employee?.role === 'OWNER' && typeof p.employee.id === 'string' && p.employee.id.length > 0 && p.employee.id.length <= 128 && /^[a-f0-9]{64}$/.test(p.sessionTokenHash);
function ownerGuards(proof:SessionMutationProof, mutationLocks:readonly SqlStatement[]=[]):SqlStatement[] {
 return [
  {text:'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR UPDATE',values:[]},
  {text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},
  {text:'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 FOR SHARE',values:[proof.sessionTokenHash]},
  // Authority is checked after every potentially blocking mutation lock.
  ...mutationLocks,
  {text:`SELECT (CASE WHEN EXISTS (SELECT 1 FROM employees e JOIN employee_sessions s ON s.employee_id=e.id WHERE e.id=$1 AND e.active AND e.role='OWNER' AND s.token_hash=$2 AND s.expires_at>clock_timestamp()) AND EXISTS(SELECT 1 FROM workspaces WHERE singleton AND active) THEN '1' ELSE 'shift_policy_authorization' END)::integer`,values:[proof.employee.id,proof.sessionTokenHash]},
 ];
}
async function write(statements:SqlStatement[],executor:SqlExecutor):Promise<PolicyWriteResult> {
 try {
  const result=await executor.transaction(statements);
  const row=result.at(-1)?.[0] as {revision:number}|undefined;
  return row ? {status:'saved',revision:row.revision} : {status:'conflict'};
 } catch(error) {
  if(error instanceof Error && error.message.includes('shift_policy_authorization')) return invalid('authorization','An active Owner session is required.');
  // Missing schema/outages must remain errors, not an empty policy or false conflict.
  throw error;
 }
}
export async function readShiftChangePolicy(executor:SqlExecutor):Promise<ShiftChangePolicy|null> {
 const rows=await executor.query<{policy:unknown}>({text:'SELECT shift_change_policy AS policy FROM workspaces WHERE singleton=true AND active=true',values:[]});
 if(rows.length !== 1) throw new Error('Workspace policy unavailable.');
 if(rows[0].policy === null) return null;
 const policy=resolveShiftChangePolicy(rows[0].policy);
 if(!policy) throw new Error('Workspace policy needs review.');
 return policy;
}
export async function saveShiftChangePolicy(input:PolicyWrite,executor:SqlExecutor):Promise<PolicyWriteResult> {
 if(!validProof(input.proof)) return invalid('authorization','An active Owner session is required.');
 if(!validRevision(input.expectedRevision)) return invalid('expectedRevision','Reload the current policy.');
 if(!['swap','coverage'].includes(input.scope) || !input.replacement || Object.keys(input.replacement).some(k=>!['mode','submissionAdvanceMinutes','completionAdvanceMinutes'].includes(k)) || !isWorkflowPolicy({...input.replacement,revision:0})) return invalid('mode','Enter a valid approval mode and ordered submission/completion deadlines.');
 const emptyScope={revision:0,mode:null,submissionAdvanceMinutes:null,completionAdvanceMinutes:null};
 const empty={version:1,revision:0,swap:emptyScope,coverage:emptyScope};
 return write([...ownerGuards(input.proof),{
  text:`UPDATE workspaces SET shift_change_policy=jsonb_set(jsonb_set(COALESCE(shift_change_policy,$1::jsonb),ARRAY[$2]::text[],$3::jsonb),'{revision}',to_jsonb(COALESCE((shift_change_policy->>'revision')::integer,0)+1)),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE singleton=true AND active=true AND COALESCE((shift_change_policy->$2->>'revision')::integer,0)=$4 RETURNING (shift_change_policy->$2->>'revision')::integer AS revision`,
  values:[JSON.stringify(empty),input.scope,JSON.stringify({...input.replacement,revision:input.expectedRevision+1}),input.expectedRevision],
 }],executor);
}
export async function saveOperationalRuleProfile(input:OperationalProfileWrite,executor:SqlExecutor):Promise<PolicyWriteResult> {
 if(!validProof(input.proof)) return invalid('authorization','An active Owner session is required.');
 if(!validRevision(input.expectedRevision)) return invalid('expectedRevision','Reload the current profile.');
 if(typeof input.employeeId !== 'string' || input.employeeId.length<1 || input.employeeId.length>128) return invalid('employeeId','Select an employee.');
 const keys=['minimumRest','maximumShift','maximumDaily','breaks','projectedOvertime'] as const;
 if(!input.replacement || Object.keys(input.replacement).length!==keys.length || Object.keys(input.replacement).some(k=>!(keys as readonly string[]).includes(k))) return invalid('profile','Provide each rule setting explicitly.');
 const nextRevision=input.expectedRevision+1;
 // Validate configured values with the shared resolver. Review identity/time are
 // server-owned; SQL stamps the actual database clock below.
 const candidate={version:1 as const,revision:nextRevision,reviewedBy:input.proof.employee.id,reviewedAt:'2000-01-01T00:00:00Z',...input.replacement};
 const normalized=resolveOperationalRuleProfile(candidate);
 for(const key of keys) {
  const setting=input.replacement[key];
  if(!setting || !['UNKNOWN','NOT_APPLICABLE','CONFIGURED'].includes(setting.status) || (setting.status==='CONFIGURED' && normalized[key].status!=='CONFIGURED')) return invalid('profile','A configured rule is invalid.');
 }
 // Do not create a settings row: that would implicitly seed its pre-existing
 // maximum-hours default. Management must explicitly establish settings first.
 const replacements=Object.fromEntries(keys.map(key=>{
  const setting=input.replacement[key];
  return [key,setting.status==='CONFIGURED'?{status:setting.status,revision:nextRevision,value:setting.value}:setting.status==='UNKNOWN'?{status:setting.status}:{status:setting.status,reviewedBy:input.proof.employee.id}];
 }));
 const stampedKeys=keys.map(key=>`'${key}',CASE WHEN profile->'${key}'->>'status'='NOT_APPLICABLE' THEN (profile->'${key}')||jsonb_build_object('reviewedAt',stamp) ELSE profile->'${key}' END`).join(',');
 return write([...ownerGuards(input.proof,[{text:'SELECT employee_id FROM employee_scheduling_settings WHERE employee_id=$1 FOR UPDATE',values:[input.employeeId]}]),{
  text:`WITH prepared AS (SELECT $1::jsonb AS profile,to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS stamp) UPDATE employee_scheduling_settings SET operational_rule_profile=jsonb_build_object('version',1,'revision',$2::integer,'reviewedBy',$3::text,'reviewedAt',stamp,${stampedKeys}),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') FROM prepared WHERE employee_id=$4 AND COALESCE((operational_rule_profile->>'revision')::integer,0)=$5 RETURNING (operational_rule_profile->>'revision')::integer AS revision`,
  values:[JSON.stringify(replacements),nextRevision,input.proof.employee.id,input.employeeId,input.expectedRevision],
 }],executor);
}
