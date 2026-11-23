// G98 (Phase 2): with the signed-in person's language set to Spanish (PortalLangProvider), Updates' compose form and the
// update page with its Confirmed list render Puerto Rico Spanish and no English.
import {createElement,type ComponentProps,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import type {CommunicationContext} from '../lib/communications/types';
import {PortalLangProvider} from '../lib/i18n/portal-lang';
import {ComposeForm} from './communication-compose';
import {CommunicationDetailView} from './communication-detail';

rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({push:rs.fn()}),useSearchParams:()=>new URLSearchParams()}));
const hasWord=(s:string,w:string)=>new RegExp(`(^|[^\\p{L}])${w}(?![\\p{L}])`,"u").test(s);
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s ]+/g,' ').trim();
const es=(node:ReactNode)=>renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const context:Extract<CommunicationContext,{state:'ready'}>={state:'ready',authority:'a'.repeat(64),observedAt:'2026-10-12T12:00:00Z',validForMs:45000,management:true,businessDate:'2026-10-12',timeZone:'America/Puerto_Rico',locations:[{id:'main',label:'Condado',todayTeam:true}],shifts:[]};
const action={pending:false,notice:null,hasUnknown:false,canRetry:false,setNotice:rs.fn(),send:rs.fn(async()=>{}),lookup:rs.fn(async()=>{}),retry:rs.fn(async()=>{}),clear:rs.fn(),pause:rs.fn()};
const compose=(extra:Partial<ComponentProps<typeof ComposeForm>>={})=>createElement(ComposeForm,{context,mode:'manager',authority:context.authority,retained:{current:null},retain:rs.fn(),action,...extra});
const read={state:'ready' as const,id:'12345678-1234-4234-8234-123456789abc',revisionId:'22345678-1234-4234-8234-123456789abc',contentHash:'b'.repeat(64),title:'Horario del feriado',body:'Abrimos a las 9.',type:'LOCATION_ANNOUNCEMENT' as const,publishedAt:'2026-10-08T12:00:00Z',editedAt:null,acknowledgement:'REQUIRED' as const,ownAcknowledgedAt:null,ownReadAt:null,authority:'a'.repeat(64),observedAt:'2026-10-08T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',expiresAt:null,authorContext:'Gerencia',canWithdraw:false};
const detail=(extra:Record<string,unknown>={})=>createElement(CommunicationDetailView,{read,paused:false,pending:false,notice:null,onAction:()=>{},onRefresh:()=>{},...extra} as ComponentProps<typeof CommunicationDetailView>);

it('renders the Owner and Manager compose form in Spanish',()=>{
 const html=es(compose());const words=text(html);
 expect(html).toContain('lang="es"');
 for(const w of ['Título','Mensaje','Tipo','Anuncio','Aviso importante','Equipo de hoy','Enviar a','Pedir que confirmen','Vence','Opcional','Cancelar','Siguiente','Usa la hora de Puerto Rico. Si lo dejas vacío, no vence.'])expect(words).toContain(w);
 for(const w of ['Title','Message','Announcement','Send to','Expires','Cancel','Next','Puerto Rico time'])expect(hasWord(words,w)).toBe(false);
});
it('renders a Lead’s message to today’s team and the refused states in Spanish',()=>{
 const lead=text(es(compose({context:{...context,management:false},mode:'employee'})));
 for(const w of ['Equipo de hoy · Condado','Personas que trabajan el lun, 12 oct','Ver destinatarios','Poner fecha de vencimiento'])expect(lead).toContain(w);
 for(const w of ['Preview audience','Today’s team','People working'])expect(hasWord(lead,w)).toBe(false);
 const blocked=text(es(compose({action:{...action,notice:'blocked'}})));expect(blocked).toContain('Tu permiso actual no te deja publicar.');expect(blocked).toContain('Volver a avisos');
 const unknown=text(es(compose({action:{...action,notice:'unknown',hasUnknown:true,canRetry:true}})));expect(unknown).toContain('Verifica el estado de la publicación');expect(unknown).toContain('Reintentar la publicación original');expect(unknown).not.toContain('Check status');
});
it('renders an update to confirm in Spanish',()=>{
 const words=text(es(detail()));
 for(const w of ['Debe confirmarse','Revisé este aviso','Confirmar que lo leí','8 oct'])expect(words).toContain(w);
 for(const w of ['Must be confirmed','I have reviewed','Confirm I read it','Updates','Oct'])expect(hasWord(words,w)).toBe(false);
 const done=text(es(detail({read:{...read,ownAcknowledgedAt:'2026-10-08T12:01:00Z'}})));expect(done).toContain('Confirmado');expect(done).not.toContain('Confirmed');
});
it('renders the manager’s Confirmed list and publish result in Spanish',()=>{
 const managed={...read,canWithdraw:true,sentCount:2,management:{draft:{},recipients:[{employeeId:'e1',name:'Ana Rivera',acknowledgedAt:'2026-10-08T12:01:00Z'},{employeeId:'e2',name:'Luis Ortiz',acknowledgedAt:null}]}};
 const words=text(es(detail({read:managed,justPublished:true})));
 for(const w of ['Publicado para 2 personas','Confirmado por 1 de 2 hasta ahora','Confirmado','1 de 2','Aún no','Editar','Retirar'])expect(words).toContain(w);
 for(const w of ['Published to','Confirmed','Not yet','Edit','Withdraw','Remind'])expect(hasWord(words,w)).toBe(false);
 const failed=text(es(detail({read:{state:'withdrawn',reason:'read_failed'}})));expect(failed).toContain('Aviso retirado');expect(failed).toContain('Todos los avisos');expect(failed).not.toContain('Update withdrawn');
});
