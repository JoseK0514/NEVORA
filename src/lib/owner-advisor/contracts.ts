/** Public contracts contain no session proof or provider secrets. */
export type AdvisorMessage={role:'user'|'assistant';content:string};
export type AdvisorSource={label:string;href:string;observedAt:string};
export type AdvisorProfile={priorities:string;revision:number};
export type AdvisorAnswer={text:string;sources:AdvisorSource[]};
export type AdvisorSnapshot={state:'ready';connection:'available'|'unavailable';profile:AdvisorProfile;history:AdvisorMessage[];briefing:BriefingResult;authority:string;observedAt:string;validForMs:number};
export type AdvisorCommand={op:'ask';requestId:string;message:string}|{op:'save_priorities';requestId:string;expectedRevision:number;priorities:string};
export type AdvisorErrorCode='disabled'|'unavailable'|'invalid'|'forbidden'|'conflict'|'busy'|'daily_limit'|'prior_attempt_failed'|'cancelled'|'limit'|'provider_failed';
export class AdvisorError extends Error{constructor(readonly code:AdvisorErrorCode){super(code);}}
export const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function parseCommand(v:unknown):AdvisorCommand{
 if(!record(v)||typeof v.requestId!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v.requestId))throw new AdvisorError('invalid');
 if(v.op==='ask'&&Object.keys(v).sort().join(',')==='message,op,requestId'&&typeof v.message==='string'&&v.message.trim().length>0&&v.message.length<=2000)return {op:v.op,requestId:v.requestId.toLowerCase(),message:v.message};
 if(v.op==='save_priorities'&&Object.keys(v).sort().join(',')==='expectedRevision,op,priorities,requestId'&&typeof v.priorities==='string'&&v.priorities.length<=2000&&Number.isSafeInteger(v.expectedRevision)&&Number(v.expectedRevision)>=0&&Number(v.expectedRevision)<2147483647)return {op:v.op,requestId:v.requestId.toLowerCase(),priorities:v.priorities,expectedRevision:Number(v.expectedRevision)};
 throw new AdvisorError('invalid');
}
export type ToolCall={name:'company_briefing';args:Record<string,never>}|{name:'published_staffing'|'coverage_investigation';args:{date:string}};
export type ToolResult={observedAt:string;sources:AdvisorSource[];partial:boolean;data:unknown};
export function parseTool(name:unknown,args:unknown):ToolCall{
 if(typeof args!=='string'||args.length>1024)throw new AdvisorError('invalid');
 let v:unknown;try{v=JSON.parse(args);}catch{throw new AdvisorError('invalid');}
 if(!record(v))throw new AdvisorError('invalid');
 if(name==='company_briefing'&&Object.keys(v).length===0)return {name,args:{}};
 if((name==='published_staffing'||name==='coverage_investigation')&&Object.keys(v).join(',')==='date'&&typeof v.date==='string'&&/^20\d\d-\d\d-\d\d$/.test(v.date)&&Number.isFinite(Date.parse(v.date))&&new Date(v.date).toISOString().slice(0,10)===v.date)return {name,args:{date:v.date}};
 throw new AdvisorError('invalid');
}

export type BriefingData={companyName:string;timeZone:string;date:string;publication:'PUBLISHED';counts:{scheduled:number;clockedIn:number;late:number;notClockedIn:number};shifts:{employeeName:string;locationName:string;positionName:string|null;startAt:string;endAt:string;status:string}[]};
export type BriefingResult=Omit<ToolResult,'data'>&{data:BriefingData|null};
