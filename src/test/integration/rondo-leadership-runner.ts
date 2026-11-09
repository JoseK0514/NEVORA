import type {AdvisorCommand,AdvisorAnswer} from '../../lib/owner-advisor/contracts';
import {AdvisorError} from '../../lib/owner-advisor/contracts';
import {AdvisorProviderFailure} from '../../lib/owner-advisor/provider-failure.server';
import {AdvisorStore} from '../../lib/owner-advisor/store.server';
import {AdvisorTools} from '../../lib/owner-advisor/tools.server';
import {admitOwner} from '../../lib/owner-advisor/authority.server';
import {resilienceBusinessSnapshot,type ResilienceDatabase} from './owner-advisor-resilience-fixture';
import {partnerFactSnapshot} from './owner-advisor-partner-fixture';
import type {LeadershipSetup} from './rondo-leadership-fixture';

function safeFailure(error:unknown){
 if(error instanceof AdvisorProviderFailure){
  const safe=new AdvisorProviderFailure(error.providerStatus,error.providerHint);
  return {code:safe.code,providerStatus:safe.providerStatus,providerHint:safe.providerHint};
 }
 const known=['disabled','unavailable','invalid','forbidden','conflict','busy','daily_limit','prior_attempt_failed','cancelled','limit','provider_failed'];
 return {code:error instanceof AdvisorError&&known.includes(error.code)?error.code:'evaluation_failed'};
}

/** No default fetch, credentials, ledger, model choice, or automatic network access.
 * A future live caller must supply its own newly admitted/budget-guarded invoker.
 * Scripted invocation verifies the runner only, never model quality. */
export async function runLeadershipConversation(f:ResilienceDatabase,setup:LeadershipSetup,
 invoke:(command:AdvisorCommand)=>Promise<{state:string;answer?:AdvisorAnswer}>,
 capture?:(turn:unknown)=>void){
 if(setup.mode!=='conversation')throw Error('This scenario requires its explicit server-invariant driver');
 const store=new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor);
 const tools=new AdvisorTools(store);
 const results=[];
 for(let index=0;index<setup.turns.length;index++){
  const turn=setup.turns[index];await turn.before?.();
  const before=await resilienceBusinessSnapshot(f);
  const source=await tools.run(setup.tool),facts=await partnerFactSnapshot(f);
  try{
   const result=await invoke(setup.command(turn.question));
   if(result.state!=='answered'||!result.answer)throw Error('Rondo conversation did not produce an answer');
   if(JSON.stringify(await resilienceBusinessSnapshot(f))!==JSON.stringify(before))throw Error('Investigation changed business records');
   const row={index,question:turn.question,source,facts,result,businessUnchanged:true,semanticAssessment:'not-assessed'};
   results.push(row);capture?.(row);
  }catch(error){
   capture?.({index,question:turn.question,source,facts,failure:safeFailure(error),
    businessUnchanged:JSON.stringify(await resilienceBusinessSnapshot(f))===JSON.stringify(before),semanticAssessment:'not-assessed'});
   throw error;
  }
 }
 return results;
}
