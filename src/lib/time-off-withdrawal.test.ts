import {expect,it} from 'vitest';
import {parseWithdrawalCommand} from './time-off-withdrawal';
const id='dc6b44c9-6e3f-4f0e-890c-328067ebfe9e';
it('binds withdrawal to exactly one immutable request and rejects mutable payload or changed identity',()=>{
 expect(parseWithdrawalCommand({requestId:id,operationId:`TIME_OFF_WITHDRAW:${id}`})).toEqual({requestId:id,operationId:`TIME_OFF_WITHDRAW:${id}`});
 for(const input of [{requestId:id,operationId:`TIME_OFF_WITHDRAW:other`},{requestId:id,operationId:`TIME_OFF_REVIEW:${id}`},{requestId:id,operationId:`TIME_OFF_WITHDRAW:${id}`,employeeId:'foreign'},{requestId:'bad',operationId:'TIME_OFF_WITHDRAW:bad'}])expect(()=>parseWithdrawalCommand(input)).toThrow('invalid_withdrawal');
});
