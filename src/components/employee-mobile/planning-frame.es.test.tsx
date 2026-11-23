import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({replace:()=>{}})}));
rs.mock('./use-mobile',()=>({useEmployeeMobile:()=>false,useEmployeeBScreen:()=>false}));
import {PlanningFrame} from './planning-frame';
import {PlanningFeedback} from './planning-feedback';
import {ResponsiveEmployeePlanning} from './planning';
import {PlanningOperation} from './planning-operation';
import {MobileLangProvider} from './mobile-lang';
import type {PlanningResult} from '@/lib/employee-planning';
// Signed-in Spanish: the planning frame's read states, a submission's result and the responsive wrapper's loading line
// in Puerto Rico Spanish. Fictional state only.
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const es=(node:React.ReactNode)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>);
const frame=(title:string,state:{snapshot:null|{state:'unavailable';reason:'access_denied'};paused:boolean;refreshing:boolean},sheet=false)=>plain(es(<PlanningFrame title={title} sub="" back="/app/requests" selection="list" state={state} ready={false} refresh={()=>{}} sheet={sheet}>Private form</PlanningFrame>));
it('frame read states name the page subject in Spanish',()=>{
 const failed=frame('Días libres',{snapshot:null,paused:false,refreshing:false});expect(failed).toContain('No pudimos cargar tus días libres.');expect(failed).toContain('Intentar de nuevo');expect(failed).toContain('Solicitudes');expect(failed).not.toContain('Try again');expect(failed).not.toContain('Private form');
 expect(frame('Disponibilidad',{snapshot:null,paused:false,refreshing:true})).toContain('Cargando tu disponibilidad…');
 expect(frame('Availability',{snapshot:null,paused:true,refreshing:false})).toContain('Tu disponibilidad está en pausa.');
 expect(frame('Días libres',{snapshot:null,paused:true,refreshing:false})).toContain('Tus días libres están en pausa.');
 const denied=frame('Días libres',{snapshot:{state:'unavailable',reason:'access_denied'},paused:false,refreshing:false},true);expect(denied).toContain('Tu acceso cambió.');expect(denied).toContain('Iniciar sesión');expect(denied).toContain('Cancelar');expect(denied).not.toContain('Cancel ');
});
it('a submission result in Spanish',()=>{
 const draw=(result:PlanningResult|null,pending=false)=>{const operation=new PlanningOperation();operation.result=result;operation.pending=pending;return plain(es(<PlanningFeedback operation={operation} onRetry={()=>{}}/>));};
 expect(draw(null,true)).toContain('Verificando y guardando tu envío original…');
 expect(draw({state:'disabled',requestId:null})).toContain('Los días libres están desactivados en tu trabajo.');
 expect(draw({state:'locked',requestId:null})).toContain('Pasó la fecha límite.');
 expect(draw({state:'conflict',requestId:null})).not.toContain('Saved information changed');
});
it('the responsive wrapper says it is loading in Spanish',()=>{
 const html=plain(es(<ResponsiveEmployeePlanning authority="fictional" view="timeoff" selection="list"><span>Desktop</span></ResponsiveEmployeePlanning>));
 expect(html).toContain('Cargando tu planificación…');expect(html).not.toContain('Loading your planning');
});
