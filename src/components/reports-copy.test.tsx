// Signed-in Spanish (es-rest): Insights draws every word from reports-copy.ts; the Spanish has a key for every English one,
// and each view renders in Puerto Rico Spanish for a person whose language is Spanish (fictional data).
import {createElement,type ComponentProps,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import {projectReports} from '@/lib/reports/project';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
rs.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',props,children)}));
const {CorpReportsView,ReportsView,Reports}=await import('./reports');
const {REPORTS_COPY}=await import('./reports-copy');

const keys=(value:unknown,prefix=''):string[]=>value&&typeof value==='object'&&!Array.isArray(value)
 ?Object.entries(value).flatMap(([key,inner])=>[prefix+key,...keys(inner,prefix+key+'.')]):[];
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s ⁠]+/g,' ').trim();
const es=(node:ReactNode)=>text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));

const zone='America/Puerto_Rico';
const entry=(id:string,date:string)=>({id,locationId:'L1',locationName:'Condado',positionId:'P1',positionName:'Barista',sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,
 startAt:`${date}T12:00:00Z`,endAt:`${date}T20:00:00Z`,rawStartAt:`${date}T12:00:00Z`,rawEndAt:`${date}T20:00:00Z`,breaks:[]});
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
const report=()=>projectReports({workspaceId:'W1',timeZone:zone,observedAt:'2026-10-05T12:00:00Z',period,
 cards:[{source:{employeeId:'E1',employeeName:'Ana Colón',timeZone:zone,...period,pendingCorrections:0,corrections:[],entries:[entry('T1','2026-09-21'),entry('T2','2026-09-22')]},sourceHash:'a'.repeat(32),revision:0,state:'DRAFT',history:[]}],
 schedules:[],requests:[],changes:[],publications:[],attendanceSources:[],publishedWeeks:[]} as never);

it('has a Spanish entry for every English word',()=>{
 expect(keys(REPORTS_COPY.es).sort()).toEqual(keys(REPORTS_COPY.en).sort());
 expect(REPORTS_COPY.es.howWeCountLines).toHaveLength(REPORTS_COPY.en.howWeCountLines.length);
});

it('renders the Insights cards in Spanish for a Spanish speaker, and in English by default',()=>{
 const r=report();
 const out=es(<CorpReportsView report={r} state="ready"/>);
 for(const words of['Horas trabajadas','Asistencia','Horas por día','Cómo contamos','Las horas salen de las marcaciones','lun','hora de Puerto Rico'])expect(out).toContain(words);
 for(const english of['Hours worked','Attendance','Hours by day','How we count','As of','Puerto Rico time'])expect(out).not.toContain(english);
 const en=text(renderToStaticMarkup(<CorpReportsView report={r} state="ready"/>));
 expect(en).toContain('Hours worked');expect(en).toContain('How we count');expect(en).toContain('Puerto Rico time');
});

it('renders the printed report and the waiting states in Spanish',()=>{
 const out=es(<ReportsView report={report()} state="ready"/>);
 for(const words of['Tiempo registrado por día','Horas por persona','Detalles del período','Programado y registrado','Notas de entrada','Estado de aprobación','Definiciones del informe'])expect(out).toContain(words);
 for(const english of['Recorded time by day','Hours by person','Period details','Approval status','Report definitions'])expect(out).not.toContain(english);
 expect(es(<CorpReportsView report={null} state="offline"/>)).toContain('No tienes conexión');
 expect(es(<CorpReportsView report={null} state="access_lost"/>)).toContain('Iniciar sesión');
});

it('renders the Insights page in Spanish when the page passes Spanish',()=>{
 const out=text(renderToStaticMarkup(<Reports initialPeriod={{startDate:'2026-11-16',endDate:'2026-11-18'}} today="2026-11-18" lang="es"/>));
 for(const words of['Informes','Esta semana','Semana pasada','30 días','Otro','16–18 nov hasta hoy · Todas las localidades','Informes anuales','Horas para el bono de Navidad','Exportar','Descargar CSV','Cargando…'])expect(out).toContain(words);
 for(const english of['Insights','This week','Last week','Custom','All locations','Yearly reports','Download CSV'])expect(out).not.toContain(english);
 expect(out).not.toMatch(/\bExport\b/);
});
