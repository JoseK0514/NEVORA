import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
const fixture=rs.hoisted(()=>({commit:null as null|{id:string}}));
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('./message-session',()=>({todayMessageDraft:()=>null,useMessageSession:()=>({draft:null,state:{pending:false,hasUnknown:false,notice:null},commit:fixture.commit,operationHref:fixture.commit?'/app/updates/compose':null,setDraft:()=>{},clear:()=>{},send:()=>{},core:'core'})}));
import {MessageCompose} from './messages-compose';
import {MobileLangProvider} from './mobile-lang';
const context={state:'ready' as const,authority:'a',observedAt:'2026-10-27T13:00:00Z',validForMs:45000,management:false,businessDate:'2026-10-27',timeZone:'America/Puerto_Rico',locations:[{id:'loc-1',label:'Tienda Centro',todayTeam:true}],shifts:[]};
const es=(locations=context.locations)=>renderToStaticMarkup(<MobileLangProvider value="es"><MessageCompose context={{...context,locations}} allowed={()=>true}/></MobileLangProvider>);
it('draws Write an update in Spanish',()=>{
 fixture.commit=null;const html=es();
 for(const word of ['Envía un aviso al equipo de hoy','Localidad del equipo de hoy','Elige una localidad','Título','0 de 120 caracteres','Mensaje','0 de 2,000 caracteres · Texto simple','Vencimiento · opcional','Fecha y hora en hora de Puerto Rico.','Revisar audiencia'])expect(html).toContain(word);
 for(const word of ['Title<','Review audience','Puerto Rico time','Choose a location'])expect(html).not.toContain(word);
});
it('says the not-scheduled and published notices in Spanish',()=>{
 fixture.commit=null;const none=es([]);expect(none).toContain('No tienes turno hoy');expect(none).toContain('Volver a Avisos');expect(none).not.toContain('Back to Updates');
 fixture.commit={id:'u-1'};const done=es();expect(done).toContain('Aviso publicado');expect(done).toContain('Ver aviso publicado');expect(done).toContain('Escribir otro aviso');expect(done).not.toContain('Update published');
});
