import 'server-only';
import {createHash} from 'node:crypto';
import type {SqlStatement} from '../notifications/types';
import type {CommunicationDraft,CommunicationCommand} from '../communications/types';
import {validateCommunicationDraft} from '../communications/validation';

function normalized(input:CommunicationDraft):CommunicationDraft{
 const result=validateCommunicationDraft(input);if(!result.ok)throw Error(`communication_${result.reason}`);
 return {...result.value,expiresAt:result.value.expiresAt===null?null:new Date(result.value.expiresAt).toISOString()};
}
function contentParts(d:CommunicationDraft):(string|null)[]{
 return [d.type,d.scope.kind,d.scope.locationId,d.scope.kind==='TODAYS_TEAM'?d.scope.businessDate:null,
 d.scope.kind==='SHIFT'?d.scope.sourceShiftId:null,d.scope.kind==='SHIFT'?d.scope.assignmentEpisodeId:null,
 d.scope.kind==='SHIFT'?d.scope.termsFingerprint:null,d.title,d.body,d.acknowledgement,d.expiresAt];
}
export function communicationContentHash(draft:CommunicationDraft):string{
 const content=contentParts(normalized(draft)).map(v=>v===null?'-1:':`${Buffer.byteLength(v,'utf8')}:${v}`).join('');
 return createHash('sha256').update(content).digest('hex');
}
/** Stable operation identity includes exact command, authority/session binding,
 * expected source and reviewed audience. Key order is canonical; no raw session
 * token or draft is stored in the operation ledger. */
export function communicationPayloadHash(command:CommunicationCommand):string{
 const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
 return createHash('sha256').update(JSON.stringify(canonical(command))).digest('hex');
}
export type CommunicationRevisionInsert={workspaceId:string;communicationId:string;revisionId:string;version:number;actorId:string;draft:CommunicationDraft;audienceFingerprint:string;observedAt:string;publishedAt:string|null};
/** Internal persistence statements only. These do not authorize or execute an
 * application command. Protected callers own session/source locks, publication,
 * current audience derivation, notifications and atomic transaction/recovery. */
export function communicationRootInsert(workspaceId:string,communicationId:string,authorId:string):SqlStatement{
 return {text:'INSERT INTO communications(id,workspace_id,author_employee_id) VALUES($1,$2,$3)',values:[communicationId,workspaceId,authorId]};
}
export function communicationRevisionInsert(input:CommunicationRevisionInsert):SqlStatement{
 const d=normalized(input.draft),p=contentParts(d);
 return {text:`INSERT INTO communication_revisions(id,workspace_id,communication_id,version,created_by,type,scope_kind,location_id,business_date,source_shift_id,assignment_episode_id,terms_fingerprint,title,body,acknowledgement,expires_at,content_hash,audience_fingerprint,audience_observed_at,published_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11,$12,$13,$14,$15,$16::timestamptz,$17,$18,$19::timestamptz,$20::timestamptz)`,
 values:[input.revisionId,input.workspaceId,input.communicationId,input.version,input.actorId,...p,communicationContentHash(d),input.audienceFingerprint,input.observedAt,input.publishedAt]};
}
export type CommunicationGrantInsert={workspaceId:string;communicationId:string;revisionId:string;employeeId:string;contentHash:string;locationId:string;observedAt:string;provenance:Record<string,unknown>} &
 ({kind:'LOCATION'}|{kind:'ASSIGNMENT';sourceShiftId:string;assignmentEpisodeId:string;termsFingerprint:string});
export function communicationGrantInsert(g:CommunicationGrantInsert):SqlStatement{
 return {text:`INSERT INTO communication_recipients(workspace_id,communication_id,revision_id,employee_id,content_hash,location_id,grant_kind,source_shift_id,assignment_episode_id,terms_fingerprint,observed_at,provenance)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::timestamptz,$12::jsonb)`,values:[g.workspaceId,g.communicationId,g.revisionId,g.employeeId,g.contentHash,g.locationId,g.kind,g.kind==='ASSIGNMENT'?g.sourceShiftId:null,g.kind==='ASSIGNMENT'?g.assignmentEpisodeId:null,g.kind==='ASSIGNMENT'?g.termsFingerprint:null,g.observedAt,JSON.stringify(g.provenance)]};
}
