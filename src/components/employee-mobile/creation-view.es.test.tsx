import {expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:rs.fn(),reconcileShiftChangeAction:rs.fn()}));
import {CreationView,CreationSheetSkeleton} from './creation-view';
import {EmployeeCreationOperation} from './creation-operation';
import {MobileLangProvider} from './mobile-lang';
import {creationKey,type EmployeeCreationSnapshot,type CreationDraft,type CreationMode} from '@/lib/employee-creation';
// Signed-in Spanish: Can't work, Swap and Cover in Puerto Rico Spanish, from the fictional read creation-view.test.tsx uses.
const fields={sourceShiftId:'own',sourceEpisodeId:'11111111-1111-4111-8111-111111111111',sourceTermsFingerprint:'v1:'+'a'.repeat(64)};
const read:Extract<EmployeeCreationSnapshot,{state:'ready'}>={state:'ready',kind:'creation',authority:'a'.repeat(64),observedAt:'2026-10-27T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true,mode:'callout',selection:'own',source:{id:'own',date:'2026-11-03',weekStart:'2026-11-02',startTime:'22:00',endTime:'06:00',location:'Main',position:'Support',lead:false,fields},targets:[],partial:false,check:{allowed:true,notice:null},coverage:{allowed:false,notice:null}};
const draft:CreationDraft={sourceKey:creationKey(fields),targetKey:null,reason:'OTHER',note:'Nota ficticia'};
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#x27;/g,' ').replace(/\s+/g,' ');
const draw=(snapshot:unknown,mode:CreationMode,refreshing=false)=>plain(renderToStaticMarkup(<MobileLangProvider value="es"><CreationView state={{snapshot:snapshot as EmployeeCreationSnapshot,paused:false,refreshing}} authority={read.authority} mode={mode} sourceId="own" draft={draft} operation={new EmployeeCreationOperation()} onDraft={()=>{}} onReview={()=>{}} onRefresh={()=>{}} onSubmit={()=>{}} onRetry={()=>{}}/></MobileLangProvider>));
it('can’t work this shift in Spanish',()=>{
 const text=draw(read,'callout');
 expect(text).toContain('No puedo trabajar este turno');expect(text).toContain('Enviar al gerente');expect(text).toContain('Motivo');expect(text).toContain('Enfermedad');
 expect(text).toContain('necesaria si eliges Otro');expect(text).toContain('Termina el mié, 4 nov a las 6:00');expect(text).toContain('Cancelar');expect(text).toContain('Tu gerente lo recibe enseguida');
 for(const english of ['Can’t work this shift','Send to manager','Reason','Sick','Ends ','Cancel<','Your manager gets'])expect(text).not.toContain(english);
});
it('swap and cover in Spanish',()=>{
 const empty=draw({...read,mode:'swap',targets:[],coverage:{allowed:true,notice:null}},'swap');
 expect(empty).toContain('Intercambiar turno');expect(empty).toContain('Nadie con quien intercambiar ahora');expect(empty).toContain('Ofrecer este turno para cubrir');expect(empty).toContain('Tu turno');
 expect(empty).not.toContain('No one to swap');expect(empty).not.toContain('Offer this shift');
 const cover=draw({...read,mode:'cover'},'cover');
 expect(cover).toContain('Ofrecer para cubrir');expect(cover).toContain('Tu equipo en Main');expect(cover).toContain('Ofrecer turno');expect(cover).not.toContain('Your team at');
});
it('read states in Spanish',()=>{
 expect(draw(null,'callout')).toContain('No pudimos verificar tu turno. Inténtalo de nuevo.');
 const denied=draw({state:'unavailable',reason:'access_denied'},'callout');expect(denied).toContain('Iniciar sesión');expect(denied).not.toContain('Sign in');
 expect(draw({...read,enabled:false,source:null},'callout')).toContain('Las solicitudes de turno están desactivadas en tu trabajo.');
 expect(renderToStaticMarkup(<MobileLangProvider value="es"><CreationSheetSkeleton/></MobileLangProvider>)).toContain('aria-label="Cargando"');
});
