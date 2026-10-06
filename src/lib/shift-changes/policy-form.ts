import type {OperationalProfileWrite,OperationalRuleProfile,PolicyWrite,RuleSetting} from './types';
const keys=['minimumRest','maximumShift','maximumDaily','breaks','projectedOvertime'] as const;
const fields=['status','minutes','timeBasis','window','afterMinutes','minimumMinutes','paid','weeklyMinutes','routing'];
function scalars(data:FormData,allowed:string[]){const result:Record<string,string>={};for(const [key,value] of data){if(key.startsWith('$ACTION_'))continue;if(!allowed.includes(key)||key in result||typeof value!=='string'||value.length>200)return null;result[key]=value;}return result;}
const number=(s:string|undefined)=>s!==undefined&&/^\d+$/.test(s)&&Number.isSafeInteger(Number(s))?Number(s):null;
const minutes=(s:string|undefined)=>{const n=number(s);return n!==null&&n<=525600?n:null;};
export function parseWorkflowPolicyForm(data:FormData):Omit<PolicyWrite,'proof'>|null{
 const r=scalars(data,['scope','expectedRevision','mode','submissionAdvanceMinutes','completionAdvanceMinutes']);if(!r||!['swap','coverage'].includes(r.scope))return null;
 const revision=number(r.expectedRevision);if(revision===null||!['','AUTOMATIC_WHEN_VALID','MANAGER_REVIEW'].includes(r.mode))return null;
 const submission=r.submissionAdvanceMinutes===''?null:minutes(r.submissionAdvanceMinutes),completion=r.completionAdvanceMinutes===''?null:minutes(r.completionAdvanceMinutes);
 if((r.submissionAdvanceMinutes!==''&&submission===null)||(r.completionAdvanceMinutes!==''&&completion===null)||(submission!==null&&completion!==null&&submission<completion))return null;
 return {scope:r.scope as PolicyWrite['scope'],expectedRevision:revision,replacement:{mode:r.mode===''?null:r.mode as 'MANAGER_REVIEW'|'AUTOMATIC_WHEN_VALID',submissionAdvanceMinutes:submission,completionAdvanceMinutes:completion}};
}
export function parseOperationalProfileForm(data:FormData):Omit<OperationalProfileWrite,'proof'>|null{
 const r=scalars(data,['employeeId','expectedRevision',...keys.flatMap(k=>fields.map(f=>`${k}.${f}`))]);if(!r||!r.employeeId||r.employeeId.length>128)return null;
 const revision=number(r.expectedRevision);if(revision===null)return null;
 const replacement={} as OperationalProfileWrite['replacement'];
 for(const key of keys){const status=r[key+'.status'];let setting:RuleSetting<unknown>;
  if(status==='UNKNOWN')setting={status};
  else if(status==='NOT_APPLICABLE')setting={status,reviewedBy:'server',reviewedAt:'2000-01-01T00:00:00Z'};
  else if(status==='CONFIGURED'){
   const basis=r[key+'.timeBasis'];if(!['ELAPSED','WALL_CLOCK'].includes(basis))return null;
   let value:Record<string,unknown>={timeBasis:basis};
   if(['minimumRest','maximumShift','maximumDaily'].includes(key)){const n=minutes(r[key+'.minutes']);if(n===null)return null;value.minutes=n;if(key==='maximumDaily'){if(!['BUSINESS_CALENDAR_DAY','ROLLING_24_HOURS'].includes(r[key+'.window']))return null;value.window=r[key+'.window'];}}
   if(key==='breaks'){const after=minutes(r[key+'.afterMinutes']),minimum=minutes(r[key+'.minimumMinutes']);if(after===null||minimum===null||!['true','false'].includes(r[key+'.paid']))return null;value={...value,afterMinutes:after,minimumMinutes:minimum,paid:r[key+'.paid']==='true'};}
   if(key==='projectedOvertime'){const weekly=minutes(r[key+'.weeklyMinutes']);if(weekly===null||!['ALLOW','MANAGER_REVIEW'].includes(r[key+'.routing']))return null;value={...value,weeklyMinutes:weekly,routing:r[key+'.routing']};}
   setting={status,revision:revision+1,value};
  }else return null;
  (replacement as Record<string,unknown>)[key]=setting;
 }
 return {employeeId:r.employeeId,expectedRevision:revision,replacement:replacement as Pick<OperationalRuleProfile,typeof keys[number]>};
}
