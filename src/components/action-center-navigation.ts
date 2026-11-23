import type {ActionItem} from '../lib/action-center/project';
import {isStaffingRepair} from '../lib/time-off-staffing/present';

/* Signed-in Spanish (es-rest): each action's link label in English as written and in Puerto Rico Spanish. */
const COPY={
 en:{labels:{
  COVERAGE_GAP:'View coverage gap',TIME_OFF:'Review time off',EXCHANGE:'Review shift request',CALLOUT:'Review callout',
  HOURS_REVIEW:'Review weekly hours',TARGET_MISSING:'Set hour target',AVAILABILITY_MISSING:'View availability',
  ACKNOWLEDGEMENT_MISSING:'View schedule',DEADLINE_MISSING:'Set deadline',COVERAGE_RULES_MISSING:'Configure coverage',
  ATTENDANCE:'Review attendance',TIME_CORRECTION:'Review correction',TIMECARD:'Review timecard',
 } as Record<ActionItem['type'],string>,viewIssue:'View issue',fillShift:'Fill shift',configureStaffing:'Configure staffing'},
 es:{labels:{
  COVERAGE_GAP:'Ver turno sin cubrir',TIME_OFF:'Revisar días libres',EXCHANGE:'Revisar solicitud de turno',CALLOUT:'Revisar no puedo trabajar',
  HOURS_REVIEW:'Revisar horas semanales',TARGET_MISSING:'Fijar meta de horas',AVAILABILITY_MISSING:'Ver disponibilidad',
  ACKNOWLEDGEMENT_MISSING:'Ver horario',DEADLINE_MISSING:'Fijar fecha límite',COVERAGE_RULES_MISSING:'Configurar cobertura',
  ATTENDANCE:'Revisar asistencia',TIME_CORRECTION:'Revisar corrección',TIMECARD:'Revisar tarjeta de tiempo',
 } as Record<ActionItem['type'],string>,viewIssue:'Ver asunto',fillShift:'Cubrir turno',configureStaffing:'Configurar personal'},
};
export const ACTION_CENTER_NAVIGATION_COPY=COPY;

/** Add presentation targets to the existing authorized workflow destination. */
export function actionCenterNavigation(item:ActionItem,lang:'en'|'es'='en'){
 const t=COPY[lang];
 const url=new URL(item.href,'https://nevora.invalid');
 let label=t.labels[item.type]??t.viewIssue;
 // Approved leave over a published shift: the schedule with the person and the repair kept (week, location, person,
 // repair id are already in the read's link); the schedule's repair note takes focus there. Never Review time off.
 if(isStaffingRepair(item))return {label:t.fillShift,href:url.pathname+url.search+'#leave-repair'};
 const employee=url.searchParams.get('employeeId'),request=url.searchParams.get('requestId');
 if(!url.hash){
  if(['TIME_OFF','EXCHANGE','CALLOUT'].includes(item.type)&&request)url.hash='request-'+encodeURIComponent(request);
  else if(item.type==='AVAILABILITY_MISSING'&&employee)url.hash='employee-'+encodeURIComponent(employee);
  else if(item.type==='TARGET_MISSING'&&employee)url.hash='target-'+encodeURIComponent(employee);
  else if(['HOURS_REVIEW','ACKNOWLEDGEMENT_MISSING'].includes(item.type)&&employee)url.hash='schedule-employee-'+encodeURIComponent(employee);
  else if(item.type==='DEADLINE_MISSING')url.hash='schedule-deadline';
  else if(item.type==='COVERAGE_RULES_MISSING')url.hash='coverage-windows';
  else if(item.type==='COVERAGE_GAP'){
   if(url.pathname==='/app/schedule/settings'){
    label=t.configureStaffing;url.hash=item.locationId?'staffing-'+encodeURIComponent(item.locationId):'coverage-staffing';
   }else if(url.pathname==='/app/schedule/coverage')url.hash='coverage-issue';
   else if(url.pathname==='/app/schedule'){
    const location=url.searchParams.get('locationId'),day=url.searchParams.get('date');
    if(location)url.searchParams.set('location',location);
    if(day)url.searchParams.set('day',day);
    url.hash='schedule-review';
   }
  }
 }
 return {label,href:url.pathname+url.search+url.hash};
}
