import {afterEach,expect,it,vi} from 'vitest';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';

const guard=vi.hoisted(()=>vi.fn());
vi.mock('./operational-scope.server',()=>({withOperationalCompany:guard}));
import {readCompanyResult} from './company-result.server';

const proof={employee:{id:'owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
const executor={} as SqlExecutor;
afterEach(()=>{vi.restoreAllMocks();guard.mockReset();});

it.each([{tail:250,remaining:750},{tail:1000,remaining:0},{tail:1500,remaining:0}])(
 'consumes the source lifetime through the final company guard ($tail ms)',async({tail,remaining})=>{
  let now=100;
  vi.spyOn(performance,'now').mockImplementation(()=>now);
  guard.mockImplementation(async(_proof:unknown,load:()=>Promise<unknown>)=>{
   now+=200; // Initial admission precedes the source observation.
   const data=await load();
   now+=tail; // Final authorization is asynchronous too.
   return {state:'ready',data,validForMs:15000};
  });
  const result=await readCompanyResult(proof,async()=>({state:'ready' as const,validForMs:1000,value:'bounded data'}),executor);
  expect(result).toEqual(remaining>0?{state:'ready',validForMs:remaining,value:'bounded data'}:{state:'unavailable',reason:'access_denied'});
 });

it('still limits a fresh source by the original company authority budget',async()=>{
 let now=100;
 vi.spyOn(performance,'now').mockImplementation(()=>now);
 guard.mockImplementation(async(_proof:unknown,load:()=>Promise<unknown>)=>{
  now+=100;const data=await load();now+=200;
  return {state:'ready',data,validForMs:500};
 });
 expect(await readCompanyResult(proof,async()=>({state:'ready' as const,validForMs:1000}),executor)).toEqual({state:'ready',validForMs:200});
});
