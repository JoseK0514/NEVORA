import {it,expect} from 'vitest';
import {parseEmployeeMessages} from './employee-messages';
const envelope=()=>({state:'ready',kind:'communications',view:'notifications',selection:'first',authority:'a'.repeat(64),communicationAuthority:'b'.repeat(64),observedAt:'2026-10-27T17:00:00Z',validForMs:40000,timeZone:'America/Puerto_Rico',updates:'on',data:{value:{state:'ready',kind:'notifications',observedAt:'2026-10-27T17:00:00Z',validForMs:45000,coverage:'complete',items:[]},nextCursor:null}});
it('retains confirmed empty, partial, unavailable and module-off as distinct current states',()=>{
 expect(parseEmployeeMessages(envelope()).state).toBe('ready');const partial=envelope();partial.data.value.coverage='partial';expect(parseEmployeeMessages(partial).state).toBe('ready');
 expect(parseEmployeeMessages({...envelope(),view:'updates',updates:'off',data:null}).state).toBe('ready');
 expect(parseEmployeeMessages({...envelope(),data:{value:{state:'unavailable',reason:'read_failed'},nextCursor:null}}).state).toBe('ready');
});
it('refuses malformed selections, a profile in the notification feed and an extended child lease',()=>{
 const e=envelope();for(const value of [{...e,selection:'bad-page'},{...e,authority:'forged'},{...e,data:{...e.data,value:{...e.data.value,kind:'profile'}}},{...e,data:{...e.data,value:{...e.data.value,validForMs:100}}}])expect(parseEmployeeMessages(value)).toEqual({state:'unavailable',reason:'read_failed'});
});
it('refuses management roster or coworker shifts on an Employee compose context',()=>{
 const e={...envelope(),view:'compose',selection:'new',data:{state:'ready',authority:'b'.repeat(64),observedAt:'2026-10-27T17:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',management:false,businessDate:'2026-10-27',locations:[{id:'loc-1',label:'Main Office',todayTeam:true}],shifts:[]}};
 expect(parseEmployeeMessages(e).state).toBe('ready');expect(parseEmployeeMessages({...e,data:{...e.data,management:true}}).state).toBe('unavailable');expect(parseEmployeeMessages({...e,data:{...e.data,shifts:[{id:'peer-shift'}]}}).state).toBe('unavailable');
});
