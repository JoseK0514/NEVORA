import {afterEach,expect,it,vi} from 'vitest';
import {failed,logBoundaryError,errorCode,errorSentinel,ERROR_ID_HEADER} from './log.server';

afterEach(()=>vi.restoreAllMocks());
const lines=()=>{const spy=vi.spyOn(console,'error').mockImplementation(()=>{});return ()=>spy.mock.calls.map(call=>JSON.parse(String(call[0])));};

it('logs the classification of a failure and never its message, SQL or values',()=>{
 const read=lines();
 const error=Object.assign(new Error('canceling statement due to statement timeout: SELECT * FROM employees WHERE phone=$1 [7875550100]'),{code:'57014'});
 const id=logBoundaryError('/api/fictional',error,503);
 const [entry]=read();
 expect(entry).toEqual({level:'error',event:'nevora.boundary_error',route:'/api/fictional',errorId:id,code:'57014',sentinel:null,name:'Error',status:503});
 expect(JSON.stringify(entry)).not.toMatch(/7875550100|SELECT|employees|statement timeout/);
});
it('keeps the guard sentinel so a refusal and an outage are told apart',()=>{
 const denial=Object.assign(new Error('invalid input syntax for type integer: "operational_authorization"'),{code:'22P02'});
 expect(errorSentinel(denial)).toBe('operational_authorization');expect(errorCode(denial)).toBe('22P02');
 expect(errorSentinel(new Error('invalid input syntax for type integer: "Robert\'); DROP"'))).toBeNull();
 expect(errorCode({code:'not a code; drop'})).toBeNull();
});
it('attaches the reference to the response without touching its body',async()=>{
 const read=lines();
 const response=failed('/api/fictional',new Error('x'),Response.json({state:'unavailable'},{status:503}));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable'});
 expect(response.headers.get(ERROR_ID_HEADER)).toBe(read()[0].errorId);
});
