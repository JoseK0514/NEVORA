import {expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:rs.fn(),reconcileShiftChangeAction:rs.fn()}));
import {Pickup,ResponsiveEmployeeRequests,IncomingRequestSection} from './requests';
import {PickupOperation} from './pickup-operation';
import {MobileLangProvider} from './mobile-lang';
import {timeOffDetailEs} from './copy/requests';
const spaces=(text:string)=>text.replace(/\s/g,' ');
// Signed-in Spanish: Requests and Open shifts in Puerto Rico Spanish, with the fictional states requests.test.tsx uses.
const es=(node:React.ReactNode)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>);
it('swaps for you in Spanish',()=>{
 const failed=es(<IncomingRequestSection count={null} onRetry={()=>{}}/>);
 expect(failed).toContain('No pudimos verificar los intercambios para ti.');expect(failed).toContain('Intentar de nuevo');expect(failed).not.toContain('Try again');
 const many=es(<IncomingRequestSection count={2} onRetry={()=>{}}/>);expect(many).toContain('2 intercambios necesitan tu respuesta');expect(many).not.toContain('swaps need');
});
it('a pickup in Spanish',()=>{
 expect(es(<Pickup operation={new PickupOperation('current',2)} onRefresh={()=>{}} canSubmit/>)).toContain('>Tomar<');
 const operation=new PickupOperation('old-request',1);operation.state.result={status:'conflict'};
 const stale=es(<Pickup operation={operation} onRefresh={()=>{}} canSubmit={false}/>);expect(stale).toContain('Actualizar opciones de turno');expect(stale).not.toContain('Refresh shift options');
});
it('the first frame in Spanish',()=>{
 const hub=es(<ResponsiveEmployeeRequests authority={'a'.repeat(64)} mode="hub"><div>Desktop</div></ResponsiveEmployeeRequests>);
 expect(hub).toContain('Cargando solicitudes…');expect(hub).toContain('Verificando tus solicitudes…');expect(hub).not.toContain('Loading requests');
});
it('a time-off request’s dates in Spanish',()=>{
 expect(timeOffDetailEs({startDate:'2026-11-13',endDate:'2026-11-13'})).toBe('vie, 13 nov · Todo el día');
 expect(timeOffDetailEs({startDate:'2026-11-11',endDate:'2026-11-12'})).toMatch(/^11.12 nov · 2 días$/);
 expect(spaces(timeOffDetailEs({startDate:'2026-11-13',endDate:'2026-11-13',startTime:'09:00',endTime:'13:00'}))).toBe('vie, 13 nov · 9:00 a. m. – 1:00 p. m.');
});
