import {mappedPayrollCsv,parseExportProfile} from './model';
import {stableExportJson} from './json';
import type {ExportCommand,PayrollExportPayload} from './service';
export async function verifyExportReply(value:unknown,command:ExportCommand):Promise<PayrollExportPayload>{
 const v=value as {state?:unknown;export?:PayrollExportPayload};const e=v?.export;
 if(v?.state!=='generated'||!e||e.operationId!==command.operationId||e.profileId!==command.profileId||e.profileRevision!==command.profileRevision||e.model?.version!==1||e.model.timeBasis!=='RECORDED_ELAPSED_INCLUDING_BREAKS'||e.model.period.startDate!==command.startDate||e.model.period.endDate!==command.endDate||!Array.isArray(e.model.rows)||e.model.rows.length!==command.cards.length||new Set(e.model.rows.map(r=>r.employeeId)).size!==e.model.rows.length||e.model.rows.some(r=>{const c=command.cards.find(c=>c.employeeId===r.employeeId);return !c||r.revision!==c.revision||r.sourceHash!==c.sourceHash||r.finalizationOperationId!==c.finalizationOperationId||!/^\d+$/.test(r.recordedNanoseconds)||!/^\d+$/.test(r.breakNanoseconds);}))throw new Error('Unverified export receipt');
 parseExportProfile(e.profile);if(mappedPayrollCsv(e.model,e.profile)!==e.csv)throw new Error('Unverified export file');
 const sha=async(text:string)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 if(await sha(e.csv)!==e.csvSha256||await sha(stableExportJson(e.model))!==e.canonicalSha256)throw new Error('Unverified export fingerprint');return e;
}
