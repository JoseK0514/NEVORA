import {expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:rs.fn(),reconcileShiftChangeAction:rs.fn()}));
import {EmployeeExchangeView,requestKind,requestStatus} from './exchange-view';
import {ResponsiveEmployeeExchange} from './exchange';
import {EmployeeRequestOperation} from './request-operation';
import {MobileLangProvider} from './mobile-lang';
import type {EmployeeExchangeSnapshot,EmployeeRequestDetail,RequestSummary} from '@/lib/employee-exchange';
import {onlyB,withoutB} from '../owner-b/test-support';

// Signed-in Spanish (Nov 23, 2026): Pick up and swap in Puerto Rico Spanish, with fictional teammates and shifts only.
const authority='a'.repeat(64);
const detail:EmployeeRequestDetail={summary:{id:'own-request',kind:'swap',viewer:'recipient',status:'EMPLOYEE_PENDING',date:'2026-11-03',createdAt:'2026-10-27T12:00:00Z',counterparty:'Blair C.',revision:1,releaseApplies:null},offered:{date:'2026-11-03',startTime:'22:00',endTime:'06:00',location:'West',position:'Support',lead:false},requested:{date:'2026-11-04',startTime:'09:00',endTime:'17:00',location:'Main',position:'Support',lead:false},history:null,checks:[{kind:'ACCEPT',allowed:false,notice:'The reviewed shift changed.',outcome:null},{kind:'DECLINE',allowed:true,notice:null,outcome:null}],notice:null,reason:null};
const snapshot=(patch:Partial<Extract<EmployeeExchangeSnapshot,{state:'ready'}>>={}):EmployeeExchangeSnapshot=>({state:'ready',kind:'exchange',authority,observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,selection:'own-request',incoming:null,activity:null,detail,...patch});
const view=(read:EmployeeExchangeSnapshot,selection:string|null='own-request',mode:'incoming'|'mine'='incoming',operation=new EmployeeRequestOperation('own-request',1))=>
 <EmployeeExchangeView state={{snapshot:read,refreshing:false,paused:false}} authority={authority} mode={mode} selection={selection} operation={operation} onRefresh={()=>{}} onRespond={()=>{}} onRetry={()=>{}}/>;
const render=(...args:Parameters<typeof view>)=>renderToStaticMarkup(<MobileLangProvider value="es">{view(...args)}</MobileLangProvider>);
const own=(patch:Partial<RequestSummary>={}):RequestSummary=>({...detail.summary,viewer:'requester',status:'MANAGER_PENDING',...patch});

it('keeps the exported helpers English by default and writes Spanish when asked',()=>{
 expect(requestKind(own())).toBe('Swap request');expect(requestKind(own(),'es')).toBe('Solicitud de intercambio');
 expect(requestKind(own({kind:'callout'}),'es')).toBe('No puedo trabajar');
 expect(requestStatus(own())).toBe('Waiting for manager review');expect(requestStatus(own(),'es')).toBe('Esperando revisión del gerente');
});
it('draws a swap waiting for an answer in Spanish on both layouts',()=>{
 const html=withoutB(render(snapshot()));
 for(const words of ['Tu turno actual','Trabajarías','mar, 3 nov','Termina el mié, 4 nov','Rechazar intercambio','Aceptar intercambio','no disponible','No pudimos verificar el historial de la solicitud',
  'Necesita tu respuesta','De','Blair C.','Enviada el','Intercambios para ti'])expect(html).toContain(words);
 expect(html).toContain('aria-label="Tu respuesta"');
 const plain=html.replace(/[\u00a0\u202f]/g,' ');expect(plain).toContain('10:00 p. m. – 6:00 a. m.<');expect(plain).toContain('a las 6:00 a. m.</p>');
 for(const words of ['Your current shift','You would work','Decline swap','Ends Wed','Needs your answer','Submitted','Request history'])expect(html).not.toContain(words);
 const b=onlyB(render(snapshot()));
 expect(b).toContain('>Solicitud de intercambio</h1>');expect(b).toMatch(/class="b-btn b-btn--quiet b-btn--full"[^>]*>Rechazar intercambio</);
 expect(b).not.toContain('>Decline swap<');
});
it('confirms a settled response in Spanish',()=>{
 const operation=new EmployeeRequestOperation('own-request',2);operation.receipt={kind:'DECLINE',result:{status:'closed'} as never};
 expect(render(snapshot(),'own-request','incoming',operation)).toMatch(/role="status"[^>]*>Rechazaste este intercambio\./);
 const withdrawn=new EmployeeRequestOperation('own-request',2);withdrawn.receipt={kind:'WITHDRAW',result:{status:'closed'} as never};
 expect(render(snapshot(),'own-request','incoming',withdrawn)).toContain('Retiraste tu respuesta. Revisa tu horario actual.');
});
it('says lists, empty lists and failed reads in Spanish',()=>{
 const empty=withoutB(render(snapshot({selection:null,detail:null,incoming:[],activity:[]}),null));
 expect(empty).toContain('Ningún intercambio necesita tu respuesta ahora.');expect(empty).not.toContain('No swaps need your answer');
 expect(render(snapshot({selection:null,detail:null,incoming:null,activity:[]}),null)).toContain('No pudimos verificar los intercambios recibidos');
 const mine=render(snapshot({selection:null,detail:null,incoming:[],activity:[own({counterparty:'Blair C.'})]}),null,'mine');
 expect(withoutB(mine)).toContain('Actividad reciente');expect(withoutB(mine)).toContain('Esperando revisión del gerente');expect(withoutB(mine)).toContain('Mis solicitudes de turno');
 expect(onlyB(mine)).toContain('Con Blair C. · mar, 3 nov');expect(onlyB(mine)).toContain('En espera');expect(onlyB(mine)).not.toContain('With Blair C.');
 const failed=renderToStaticMarkup(<MobileLangProvider value="es"><EmployeeExchangeView state={{snapshot:null,refreshing:false,paused:false}} authority={authority} mode="incoming" selection={null} operation={null} onRefresh={()=>{}} onRespond={()=>{}} onRetry={()=>{}}/></MobileLangProvider>);
 expect(failed).toContain('No pudimos verificar tus solicitudes. Inténtalo de nuevo.');expect(failed).toContain('Intentar de nuevo');expect(withoutB(failed)).not.toContain('Try again');
 const shell=renderToStaticMarkup(<MobileLangProvider value="es"><ResponsiveEmployeeExchange authority={authority} mode="mine"><div className="q-page q-shiftreq">Existing desktop</div></ResponsiveEmployeeExchange></MobileLangProvider>);
 expect(shell).toContain('Cargando solicitudes…');expect(shell).not.toContain('Loading requests…');
});
