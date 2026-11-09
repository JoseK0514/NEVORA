import type { SessionMutationProof,ShiftChangeCommand,ShiftChangeResult } from '../shift-changes/types';
import type { SqlExecutor } from '../notifications/types';
import { executeShiftChange } from './shift-changes';
export type ShiftChangeAdapterInput={proof?:SessionMutationProof;command?:ShiftChangeCommand};
export async function executeShiftChangeAdapter(input:ShiftChangeAdapterInput & {employeeId?:string;managerId?:string;requestedByEmployeeId?:string;exchangeId?:string;calloutId?:string;sourceShiftId?:string;shiftId?:string},kind:ShiftChangeCommand['kind'],executor:SqlExecutor):Promise<ShiftChangeResult> {
 const {proof,command}=input;
 if(!proof||!command||command.kind!==kind||[input.employeeId,input.managerId,input.requestedByEmployeeId].some(id=>id!==undefined&&id!==proof.employee.id))return {status:'unavailable'};
 if('requestId' in command&&command.requestId!==(input.exchangeId??input.calloutId))return {status:'unavailable'};
 if('sourceShiftId' in command&&command.sourceShiftId!==(input.sourceShiftId??input.shiftId))return {status:'unavailable'};
 return executeShiftChange(proof,command,executor);
}
