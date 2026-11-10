import {it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readActiveOwnerNames} from './owner-names.server';
it('rejects forged identity before reading owner names',async()=>{
 const executor={query:vi.fn(),transaction:vi.fn()};
 expect(await readActiveOwnerNames({employee:{id:'e',role:'EMPLOYEE'},sessionTokenHash:'bad'} as never,executor)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(executor.transaction).not.toHaveBeenCalled();
});
