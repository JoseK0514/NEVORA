import type {CoverageBlock} from './schedule-health';
import {timeMinutes} from './periods';
export type MinuteObligation={required:number;covered:number;percent:number|null};
export type CoverageMinutes={state:'ready';staffing:MinuteObligation;positions:MinuteObligation;lead:MinuteObligation}|{state:'not_configured';staffing:null;positions:null;lead:null};
export function summarizeCoverageMinutes(blocks:readonly CoverageBlock[],configured:boolean):CoverageMinutes{
 const unavailable:CoverageMinutes={state:'not_configured',staffing:null,positions:null,lead:null};
 if(!configured||!blocks.length||blocks.some(b=>b.requiredStaff===null||b.requiresLead===null))return unavailable;
 const totals={staffing:{required:0,covered:0},positions:{required:0,covered:0},lead:{required:0,covered:0}};
 const ordered=[...blocks].sort((a,b)=>a.locationId.localeCompare(b.locationId)||a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime));
 let previous:CoverageBlock|undefined;
 const quantity=(value:number)=>{if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid coverage quantity');return value;};
 for(const block of ordered){
  const start=timeMinutes(block.startTime),end=timeMinutes(block.endTime,true),minutes=end-start;
  if(minutes<=0||previous&&previous.locationId===block.locationId&&previous.date===block.date&&timeMinutes(previous.endTime,true)>start)throw Error('Invalid coverage segments');
  previous=block;
  const required=quantity(block.requiredStaff!),assigned=quantity(block.assignedStaff);
  totals.staffing.required+=required*minutes;totals.staffing.covered+=Math.min(required,assigned)*minutes;
  const ids=new Set<string>();
  for(const position of block.positionCoverage){
   if(ids.has(position.positionId))throw Error('Duplicate position requirement');ids.add(position.positionId);
   const need=quantity(position.required),have=quantity(position.assigned);
   totals.positions.required+=need*minutes;totals.positions.covered+=Math.min(need,have)*minutes;
  }
  if(block.requiresLead){totals.lead.required+=minutes;if(block.leadCovered)totals.lead.covered+=minutes;}
 }
 const result=(value:{required:number;covered:number}):MinuteObligation=>{
  if(!Number.isSafeInteger(value.required)||!Number.isSafeInteger(value.covered))throw Error('Coverage quantity overflow');
  return {...value,percent:value.required?Math.round(value.covered/value.required*10000)/100:null};
 };
 return {state:'ready',staffing:result(totals.staffing),positions:result(totals.positions),lead:result(totals.lead)};
}
