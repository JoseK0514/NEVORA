// Signed-in Spanish (Nov 23, 2026): the company-access views draw Puerto Rico Spanish when the person's language is
// Spanish (usePortalLang() in client views, `lang` from the page in server views), and no English words.
import {createElement,type ComponentProps,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,rs} from '@rstest/core';

rs.mock('next/link',()=>({default:({href,children,prefetch:_prefetch,scroll:_scroll,...props}:ComponentProps<'a'>&{prefetch?:boolean;scroll?:boolean})=>createElement('a',{href,...props},children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({refresh:rs.fn(),replace:rs.fn()}),usePathname:()=>'/app',useSearchParams:()=>new URLSearchParams()}));
rs.mock('../app-navigation',()=>({useAppNavigation:()=>null}));
rs.mock('@/components/manager-clock-monitor',()=>({ManagerClockMonitor:()=>null}));

import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {OperationalUnavailable} from './operational-unavailable';
import {ScopedReadFrame,frameStateWords} from './scoped-read-frame';
import {EmployeeInvitationPanel} from './employee-invitation-panel';
import {ScheduleRouteFeedback,editorErrorText} from './schedule-route-feedback';
import {ScopedShiftDetails,scopedShiftReason} from './scoped-shift-sheet';
import {ScopedManagementHome} from './scoped-operational-views';
import {OperationalScopeSelectionFields} from './manager-operational-scope-fields';
import {ScopedTeam} from './scoped-team';
import type {InvitationStatusResult} from '@/lib/auth/invitations/model';
import type {OperationalAuthorityView,OperationalShiftEditorData} from '@/lib/company-access/model';

const text=(html:string)=>html.replace(/<!-- -->/g,'').replace(/<[^>]+>/g,' ').replace(/[\s ]+/g,' ').trim();
const inSpanish=(node:ReactNode)=>renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const spanish=(node:ReactNode)=>text(inSpanish(node));
const observation={authority:'fictional-authority',observedAt:new Date().toISOString(),validForMs:15000};

describe('the access frame and its states',()=>{
 it('checks the current view in Spanish, from the person’s language',()=>{
  const es=spanish(createElement(ScopedReadFrame,{observation},'Fictional page'));
  expect(es).toContain('La vista necesita otra verificación');expect(es).toContain('Actualizar vista');
  expect(es).not.toMatch(/Current view|Refresh current view|We’ll show/);
  // Outside the provider (and in the existing English tests) the frame stays English.
  expect(text(renderToStaticMarkup(createElement(ScopedReadFrame,{observation},'Fictional page')))).toContain('Refresh current view');
 });
 it('names its paused, offline, slow and failed states in Spanish',()=>{
  expect(frameStateWords('paused',false,false,'es')).toMatchObject({title:'Vista en pausa'});
  expect(frameStateWords('paused',true,false,'es')).toMatchObject({kind:'offline',title:'Estás sin conexión'});
  expect(frameStateWords('expired',false,true,'es')).toMatchObject({title:'No pudimos verificar tu acceso'});
  expect(frameStateWords('expired',false,false,'es')).toMatchObject({title:'Seguimos verificando tu acceso'});
 });
 it('draws the closed page in Spanish',()=>{
  const es=spanish(createElement(OperationalUnavailable,{title:'Horario no disponible',reason:'access_denied',lang:'es'}));
  expect(es).toContain('Horario');expect(es).not.toContain('no disponible');
  for(const words of ['Necesitas acceso a toda la empresa','Un dueño te lo puede dar.','Volver a Inicio'])expect(es).toContain(words);
  expect(es).not.toMatch(/Company-wide|Owner|Return to Home/);
  const scoped=spanish(createElement(OperationalUnavailable,{reason:'access_denied',scoped:true,lang:'es'}));
  expect(scoped).toContain('Fuera de las localidades que gestionas');expect(scoped).toContain('Abrir tu horario');
 });
 it('draws the failed page in Spanish',()=>{
  const es=spanish(createElement(OperationalUnavailable,{reason:'read_failed',lang:'es'}));
  expect(es).toContain('Página no disponible');expect(es).toContain('No pudimos confirmar la información actual.');
  expect(es).not.toMatch(/Current information|Return to Home|Page unavailable/);
 });
});

describe('the location Manager’s views',()=>{
 it('Home without access, in Spanish',()=>{
  const view={state:'ready',employeeId:'M1',role:'MANAGER',source:'UNASSIGNED',scope:null,scopeRevision:0,authority:'fictional-authority',locations:[],observedAt:observation.observedAt,validForMs:15000} as Extract<OperationalAuthorityView,{state:'ready'}>;
  // The frame keeps the page behind its check; its own words are Spanish too.
  const es=spanish(createElement(ScopedManagementHome,{view}));
  expect(es).toContain('La vista necesita otra verificación');expect(es).not.toMatch(/Refresh|Current view/);
 });
 it('Team, in Spanish',()=>{
  const data={mode:'LOCATIONS',locations:[{id:'L1',name:'Condado',shortName:'Condado'},{id:'L2',name:'Santurce',shortName:'Santurce'}],
   employees:[{id:'E1',firstName:'Ana',lastName:'Rivera',role:'LEAD',locationIds:['L1']},{id:'E2',firstName:'Luis',lastName:'Mora',role:'EMPLOYEE',locationIds:['L1','L2']}]} as unknown as ComponentProps<typeof ScopedTeam>['data'];
  const html=inSpanish(createElement(ScopedTeam,{data,query:'',showAll:false,lang:'es'})),es=text(html);
  for(const words of ['Equipo','2 empleados','Todas tus localidades','Aplicar búsqueda','Buscar empleados','Personas','Líder de turno · Condado'])expect(es).toContain(words);
  expect(html).toContain('placeholder="Buscar por nombre"');expect(html).toContain('aria-label="Localidad: Todas tus localidades"');
  // This file's words only: the phone band (TeamB) and the menu's Done come from owner-b and action-menu, which keep English for now.
  expect(html).not.toMatch(/All your locations|Search by name|\bLead\b|Employees|Location:|"People"/);
  const none=spanish(createElement(ScopedTeam,{data,query:'zz',showAll:false,lang:'es'}));
  expect(none).toContain('No hay empleados que coincidan con “zz”.');expect(none).toContain('Borrar búsqueda');
 });
 it('the shift sheet and its reason, in Spanish',()=>{
  const data={locationId:'L1',saveAvailability:'requires_company',shift:{id:'S1',employeeId:'E1',employeeName:'Fictional Worker',date:'2026-12-07',startTime:'22:00',endTime:'06:00',positionId:'P9',isDesignatedLead:true,notes:null,scheduleStatus:'PUBLISHED'},employeeOptions:[],positionOptions:[]} as unknown as OperationalShiftEditorData;
  const reason=scopedShiftReason(data,'Condado','es');
  expect(reason).toBe('No puedes cambiar un turno publicado. Pide ayuda a un dueño.');
  const es=text(renderToStaticMarkup(createElement(ScopedShiftDetails,{data,title:'Detalles del turno',placeName:'Condado',backHref:'/app/schedule',reason,lang:'es'})));
  for(const words of ['Listo','Persona','Localidad','Puesto que ya no se ofrece','10:00 p. m. – 6:00 a. m.','Termina mar, 8 dic','Líder de turno','Sí'])expect(es).toContain(words);
  expect(es).not.toMatch(/\b(Done|Person|Location|Position|Ends|Shift lead|Yes|AM|PM)\b/);
 });
 it('the schedule’s route notes, in Spanish',()=>{
  const es=text(renderToStaticMarkup(createElement(ScheduleRouteFeedback,{error:'SHIFT_OVERLAP',warning:'WEEKLY_HOURS',scoped:true,dismissHref:'/app/schedule',lang:'es'})));
  expect(es).toContain('Ese empleado ya tiene un turno que se solapa.');expect(es).toContain('Descartar');expect(es).toContain('podrían pasar de 40 horas');
  expect(es).not.toMatch(/employee|Dismiss|Review/);
  // A code only the shared English scheduling messages know gets the Spanish generic line.
  expect(editorErrorText('STAFFING_GAP','es')).toBe('No se pudo actualizar el turno.');
  expect(editorErrorText('STAFFING_GAP')).toBe('This period needs additional employees.');
 });
});

describe('the employee panels and forms',()=>{
 const status:InvitationStatusResult={state:'ready',employeeId:'E1',employeeVersion:'1',eligibility:'INVITABLE',registeredEmailMasked:'a***@example.test',invitationRevision:1,
  invitation:{id:'i1',state:'ISSUED',issuedAt:'2026-11-15T12:00:00Z',expiresAt:'2026-11-22T12:00:00Z',issuerName:'Fictional Owner'},delivery:'PROVIDER_ACCEPTED',deliveryAvailable:true,allowedCommands:['ISSUE','REVOKE'],retryAfterMs:null};
 it('the invitation panel, in Spanish',()=>{
  const es=spanish(createElement(EmployeeInvitationPanel,{employeeId:'E1',actorId:'OWNER',initialStatus:status}));
  for(const words of ['Invitación a la cuenta','Invitación emitida','Correo: a***@example.test','Aceptada para enviarse por correo.','Enviar invitación nueva','Cancelar invitación','Verificar invitación'])expect(es).toContain(words);
  expect(es).not.toMatch(/Account invitation|Invitation issued|Email:|Send|Cancel invitation|Check invitation/);
 });
 it('the management access choice, in Spanish',()=>{
  const es=spanish(createElement(OperationalScopeSelectionFields,{locations:[{id:'L1',name:'Condado'}],value:{mode:'LOCATIONS',locationIds:['L1']},onChange:()=>{},error:null}));
  for(const words of ['Acceso de gerencia','El acceso a nómina se asigna aparte.','Toda la empresa','Localidades elegidas'])expect(es).toContain(words);
  expect(es).not.toMatch(/Management access|Company-wide|Selected locations|Payroll/);
 });
});
