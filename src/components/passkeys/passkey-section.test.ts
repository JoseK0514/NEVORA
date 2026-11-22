import {expect,it} from '@rstest/core';
import {passkeySectionLoad} from './passkey-section';

it('classifies an unsupported passkey endpoint independently from a retryable load failure',()=>{
 expect(passkeySectionLoad({ok:false,error:'not_supported'})).toEqual({state:'unsupported'});
 expect(passkeySectionLoad({ok:false,error:'unavailable'})).toEqual({state:'failed'});
 expect(passkeySectionLoad({ok:true,value:{passkeys:[]}})).toEqual({state:'ready',passkeys:[]});
});
