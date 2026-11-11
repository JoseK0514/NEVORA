import {expect,it,vi} from 'vitest';
import {sessionTransaction} from './sql-session-contract';
const statement={text:'SELECT 1 AS value',values:[]};
function driver(result:unknown){const query=vi.fn(()=>({lazy:true})),transaction=vi.fn().mockResolvedValue(result);return {query,transaction,sql:{query,transaction} as unknown as Parameters<typeof sessionTransaction>[0]};}
it('rejects malformed or unconfirmed provider batches instead of returning their business rows',async()=>{
 for(const result of [null,[],[[],[],[{value:1}],[]],[[],[],[{value:1}],[{sql_session_contract:0}]],[[],[],[{value:1}],{sql_session_contract:1}]]){
  const {sql}=driver(result);await expect(sessionTransaction(sql,[statement])).rejects.toThrow('SQL session contract result unavailable');
 }
});
it('keeps business result indexing and does not expose its setup or final guard rows',async()=>{
 const {sql,transaction}=driver([[],[],[{value:1}],[{sql_session_contract:1}]]);expect(await sessionTransaction(sql,[statement])).toEqual([[{value:1}]]);expect(transaction).toHaveBeenCalledWith(expect.any(Array),expect.objectContaining({isolationLevel:'ReadCommitted',arrayMode:false,fullResults:false}));
});
it('refuses pre-aborted execution before constructing or consuming any provider query',async()=>{
 const {sql,query,transaction}=driver([]),signal=AbortSignal.abort();await expect(sessionTransaction(sql,[statement],signal)).rejects.toThrow();expect(query).not.toHaveBeenCalled();expect(transaction).not.toHaveBeenCalled();
});
