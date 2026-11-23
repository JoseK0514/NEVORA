import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import {HoursCorrectionForm,HoursCorrectionHistory} from './hours-corrections';
import {HoursCorrectionOperation} from './hours-operation';
import {MobileLangProvider} from './mobile-lang';
import type {PublicCorrectionItem} from '@/lib/time-corrections/read-model';

const noop=()=>{};
const zone='America/Puerto_Rico';
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s  ]+/g,' ');
const request:PublicCorrectionItem={id:'req-1',kind:'MISSING_ENTRY',status:'APPROVED',revision:1,createdAt:'2026-10-26T20:05:00Z',locationId:'loc-1',locationName:'Condado',originalStartAt:null,originalEndAt:null,proposedStartAt:'2026-10-26T12:00:00Z',proposedEndAt:'2026-10-26T20:00:00Z',breakName:null,reason:'Fictional reason',baseChanged:false,context:{state:'none'}};
const snapshot={state:'ready' as const,authority:'a'.repeat(64),observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:1,locations:[{id:'loc-1',name:'Condado'}],targets:[],requests:[request]};
const es=(node:React.ReactNode)=>plain(renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>));

it('draws the correction history and a decided request in Spanish',()=>{
 const list=es(<HoursCorrectionHistory snapshot={snapshot} decisions={[]} requestId={null} filter="decided" onRefresh={noop}/>);
 expect(list).toContain('Decisiones');expect(list).toContain('Tiempo sin registrar');expect(list).toContain('Condado · Aprobada');expect(list).toContain('26 oct, 8:00 a. m.');expect(list).toContain('Solicitar tiempo sin registrar');
 expect(list).not.toContain('Decisions');expect(list).not.toContain('Request missing time');
 const detail=es(<HoursCorrectionHistory snapshot={snapshot} decisions={[{requestId:'req-1',status:'APPROVED',at:'2026-10-27T14:00:00Z',by:'Ana R.',note:null}]} requestId="req-1" filter="decided" onRefresh={noop}/>);
 expect(detail).toContain('Enviada el 26 oct, 4:05 p. m.');expect(detail).toContain('Aprobada por Ana R.');expect(detail).toContain('Tu motivo');expect(detail).toContain('Decisiones anteriores sobre este tiempo');
 expect(detail).not.toContain('Approved by');expect(detail).not.toContain('Your reason');
});
it('draws the request form and its recovery in Spanish',()=>{
 const form=es(<HoursCorrectionForm snapshot={snapshot} basis={'b'.repeat(32)} edit="new" draft={undefined} onDraft={noop} operation={new HoursCorrectionOperation()} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop}/>);
 expect(form).toContain('Localidad de trabajo');expect(form).toContain('Inicio propuesto');expect(form).toContain('Hora de fin');expect(form).toContain('0/500 caracteres · Tu gerente lo verá');expect(form).toContain('Enviar solicitud de corrección');expect(form).toContain('Las horas están en hora de Puerto Rico.');
 expect(form).not.toContain('Send correction request');expect(form).not.toContain('Work location');
});
it('draws an unconfirmed send in Spanish',async()=>{
 const operation=new HoursCorrectionOperation();
 await operation.submit({basis:'a'.repeat(32),command:{operationId:'c3849d11-f86e-4f08-8b90-84a8e2053290',kind:'ENTRY_BOUNDARY',timeEntryId:'no-longer-editable',proposedStartAt:'2026-10-27T13:00:00Z',proposedEndAt:'2026-10-27T17:00:00Z',reason:'Fictional proposal'}},async()=>({status:'unknown'}),()=>true);
 const html=es(<HoursCorrectionForm snapshot={{...snapshot,requests:[]}} basis={'b'.repeat(32)} edit="entry:no-longer-editable" draft={undefined} onDraft={noop} operation={operation} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop}/>);
 expect(html).toContain('Verificar el estado');expect(html).toContain('No pudimos confirmar que tu solicitud se envió.');expect(html).not.toContain('Check request status');
});
