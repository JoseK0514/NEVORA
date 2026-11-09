import {fixtureProof} from './shift-change-api';
import {readEmployeeWeeklyReview} from '../../lib/data/employee-weekly-review.server';
import type {SqlExecutor} from '../../lib/notifications/types';
export async function reviewedAttentionInput(executor:SqlExecutor,employeeId:string,weekStart:string){
 const proof=await fixtureProof(executor,employeeId),review=await readEmployeeWeeklyReview(proof,weekStart,executor);
 if(review.state==='unavailable'||!review.displayedRevisionId)throw Error('Fictional protected weekly review unavailable');
 // Historical callers sometimes deliberately confirm equivalent content again.
 // Re-read current source and issue the same required reviewed intent explicitly.
 const {attentionIntent}=await import('../../lib/data/employee-attention-receipts.server');
 const [workspace]=await executor.query<{id:string}>({text:'SELECT id FROM workspaces WHERE singleton=true',values:[]});
 const intent=review.intent??attentionIntent(proof,workspace.id,'CONFIRM_WEEK',{kind:'SCHEDULE',id:weekStart,version:review.displayedRevisionId});
 return {proof,weekStart,expectedRevisionId:review.displayedRevisionId,...intent};
}
