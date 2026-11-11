/** Replays possible HTTP failure classes; does not infer the cause of past live failures. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from '@/test/integration/company-access-fixture';
import {resilienceBusinessSnapshot} from '@/test/integration/owner-advisor-resilience-fixture';
import {advisorService} from './service.server';
let f:Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async()=>{f=await companyAccessFixture();});
afterEach(async()=>{await f?.db.dispose();});
const env={NEVORA_OWNER_ADVISOR_ENABLED:'true',NEVORA_OWNER_ADVISOR_DATA_APPROVED:'true',NEVORA_OWNER_ADVISOR_PROVIDER:'openai',NEVORA_OWNER_ADVISOR_MODEL:'fixture-only',NEVORA_OWNER_ADVISOR_DAILY_LIMIT:'10',OPENAI_API_KEY:'fictional-never-transmitted'};
it.each([[400,'safety_filter'],[401,'authentication'],[429,'rate_limit'],[503,'upstream']] as const)('HTTP %i retains safe diagnosis, fails the receipt and permits deliberate recovery',async(status,hint)=>{
 const before=await resilienceBusinessSnapshot(f),command={op:'ask',requestId:randomUUID(),message:'Fictional adversarial request; no actions.'};
 const transport=vi.fn(async()=>Response.json({error:{code:'content_filter',message:'private-record secret-key'}},{status}));
 const run=(value=command,fetch=transport)=>advisorService(f.owner,f.db.executor,env,new AbortController().signal,value,fetch);
 await expect(run()).rejects.toMatchObject({code:'provider_failed',providerStatus:status,providerHint:hint});
 expect(transport).toHaveBeenCalledTimes(1);
 expect(await f.q('SELECT state FROM owner_advisor_requests WHERE request_id=$1',[command.requestId])).toEqual([{state:'failed'}]);
 expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([]);
 await expect(run()).rejects.toMatchObject({code:'prior_attempt_failed'});
 expect(transport).toHaveBeenCalledTimes(1);
 const recovered=vi.fn(async()=>Response.json({output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Scripted recovery only; no business action performed.'}]}]}));
 expect(await run({...command,requestId:randomUUID(),message:'Deliberate new fictional request.'},recovered)).toMatchObject({state:'answered'});
 expect(recovered).toHaveBeenCalledTimes(1);
 expect(await resilienceBusinessSnapshot(f)).toEqual(before);
 const history=await f.q('SELECT history FROM owner_advisor_profiles');
 expect(JSON.stringify(history)).not.toMatch(/secret-key|private-record|Fictional adversarial request/);
});
