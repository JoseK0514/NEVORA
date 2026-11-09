import {it,expect} from 'vitest';
import {parseSetupCommand} from './steps';
it('rejects client authority, unknown fields and malformed named timezones in business commands',()=>{
 const base={schemaVersion:1,operationId:'12345678-1234-4234-8234-123456789012',expectedVersion:'1',payload:{name:'Fictional Studio',timeZone:'America/Chicago'}};
 expect(parseSetupCommand('BUSINESS',base)).not.toBeNull();expect(parseSetupCommand('BUSINESS',{...base,payload:{...base.payload,role:'OWNER'}})).toBeNull();expect(parseSetupCommand('BUSINESS',{...base,payload:{...base.payload,timeZone:'UTC'}})).toBeNull();
});

it('refuses an unclassified transaction before any SQL and composes explicitly declared mutations',async()=>{
 const {onboardingMutationExecutor}=await import('./setup.server');const {vi}=await import('vitest');
 const f=await import('../workspace-routing/resolver.server');const spy=vi.spyOn(f,'workspaceBindingFacts').mockReturnValue({record:{id:'fictional-company'}} as never);
 const transaction=vi.fn(async(s:readonly {text:string}[])=>s.map(()=>[])),ex={query:vi.fn(),transaction};
 const input={proof:{sessionTokenHash:'a'.repeat(64),employee:{id:'OWNER-1'}} as never,binding:{} as never,operationId:'12345678-1234-4234-8234-123456789012',expectedVersion:'1',kind:'SETUP_BUSINESS',hash:'a'.repeat(64),matches:()=>false};
 try{const composed=onboardingMutationExecutor(input,ex);
  await expect(composed.executor.transaction([{text:'WITH changed AS (UPDATE workspaces SET name=$1 RETURNING id) SELECT * FROM changed',values:['unreviewed']}])).rejects.toThrow('onboarding_unclassified_transaction');expect(transaction).not.toHaveBeenCalled();
  const {mutationTransaction}=await import('../data/transaction-composition');await mutationTransaction(composed.executor,[{text:'WITH changed AS (UPDATE workspaces SET name=$1 RETURNING id) SELECT * FROM changed',values:['reviewed']}]);expect(composed.commits()).toBe(1);expect(transaction).toHaveBeenCalledTimes(1);
 }finally{spy.mockRestore();}
});
