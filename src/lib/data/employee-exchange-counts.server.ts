import 'server-only';
import type {SqlExecutor} from '../notifications/types';
import type {Workspace} from '../domain';
import type {SessionMutationProof} from '../shift-changes/types';
import {businessDate} from '../business-time';
import {projectExchangeCounts,type ExchangeCounts} from '../exchange-counts';
import {listIncomingSwaps,listOpenCoverage} from './exchanges';
import {sqlNotificationStateRepository} from './notification-state';
/** Caller supplies its protected executor; current recipient scope is checked again after both sources. */
export async function readEmployeeExchangeCounts(proof:SessionMutationProof,workspace:Workspace,executor:SqlExecutor,enabled:boolean):Promise<ExchangeCounts>{
 if(!enabled)return {open:0,forYou:0};
 const repository=sqlNotificationStateRepository(executor,workspace),own=proof.employee.id;
 const access=await repository.recipientAccess(own);
 if(!access?.active||access.role!==proof.employee.role||access.employeeId!==own)throw Error('management_authorization');
 const locations=[...access.allowedLocationIds].sort();
 const [coverage,incoming]=await Promise.all([listOpenCoverage(own,businessDate(new Date(),workspace.timeZone),executor).catch(()=>null),listIncomingSwaps(own,executor).catch(()=>null)]);
 const current=await repository.recipientAccess(own);
 if(!current?.active||current.role!==proof.employee.role||current.employeeId!==own||JSON.stringify([...current.allowedLocationIds].sort())!==JSON.stringify(locations))throw Error('management_authorization');
 return projectExchangeCounts(coverage,incoming,own,locations);
}
