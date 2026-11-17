import 'server-only';
import { createHash } from 'node:crypto';
import { AdvisorError, ADVISOR_MAX_TOOL_CALLS } from '../contracts';
import { uuid } from './parse';
import type { BusinessToolName } from './model-contracts';
export function businessInspectionId(value:{workspaceId:string;ownerId:string;requestId:string;occurrence:number;tool:BusinessToolName}):string{
 if(!value.workspaceId||!value.ownerId||!Number.isInteger(value.occurrence)||value.occurrence<0||value.occurrence>=ADVISOR_MAX_TOOL_CALLS||!['business_finance','business_sales'].includes(value.tool))throw new AdvisorError('invalid');
 const hex=createHash('sha256').update(JSON.stringify(['rondo-business-tool-v1',value.workspaceId,value.ownerId,uuid(value.requestId),value.occurrence,value.tool])).digest('hex').slice(0,32).split('');hex[12]='4';hex[16]=((parseInt(hex[16],16)&3)|8).toString(16);const h=hex.join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
