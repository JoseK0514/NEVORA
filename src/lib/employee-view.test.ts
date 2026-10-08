import {expect,it} from 'vitest';
import {parseEmployeeView} from './employee-view';
const base={state:'ready',kind:'profile',observedAt:'2026-10-08T12:00:00Z',validForMs:45000,profile:{name:'Avery QA',role:'Employee',workspace:'Fictional',timeZone:'America/Puerto_Rico',locations:['Main']}};
it('accepts only minimized profile/current-source DTOs and honest bounded coverage',()=>{
 expect(parseEmployeeView(base,'profile')).toEqual(base);
 const inbox={state:'ready',kind:'notifications',observedAt:base.observedAt,validForMs:45000,coverage:'partial',items:[]};
 expect(parseEmployeeView(inbox,'notifications')).toEqual(inbox);
 expect(()=>parseEmployeeView({...base,kind:'notifications'},'profile')).toThrow();
 expect(()=>parseEmployeeView({...base,validForMs:Infinity},'profile')).toThrow();
 expect(()=>parseEmployeeView({...inbox,items:[{id:'n',label:'Update',at:base.observedAt,href:'https://evil.invalid'}]},'notifications')).toThrow();
});
it('unavailable never contains a retained profile or list',()=>{
 expect(parseEmployeeView({state:'unavailable',reason:'read_failed',profile:base.profile},'profile')).toEqual({state:'unavailable',reason:'read_failed'});
});
