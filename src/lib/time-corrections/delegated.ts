import {parseEmployeeTimeCorrections,type EmployeeTimeCorrections} from './read-model';
export type DelegatedTimeCorrections=Extract<EmployeeTimeCorrections,{state:'unavailable'}>|(Extract<EmployeeTimeCorrections,{state:'ready'}>&{employeeId:string;employeeName:string;validForMs:number;recoveryScope:string});
export function parseDelegatedTimeCorrections(value:unknown,employeeId:string,recoveryScope?:string):DelegatedTimeCorrections{
 const snapshot=parseEmployeeTimeCorrections(value);if(snapshot.state==='unavailable')return snapshot;
 const v=value as Record<string,unknown>;
 if(v.employeeId!==employeeId||typeof v.employeeName!=='string'||!v.employeeName.trim()||v.employeeName.length>300||typeof v.validForMs!=='number'||!Number.isSafeInteger(v.validForMs)||v.validForMs<1||v.validForMs>15000||!snapshot.authority||typeof v.recoveryScope!=='string'||!/^[a-f0-9]{64}$/.test(v.recoveryScope)||(recoveryScope!==undefined&&v.recoveryScope!==recoveryScope))throw Error('Current delegated correction context unavailable');
 return {...snapshot,employeeId,employeeName:v.employeeName,validForMs:v.validForMs,recoveryScope:v.recoveryScope};
}
