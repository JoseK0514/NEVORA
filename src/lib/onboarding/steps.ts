import {isClosedRecord,parseOnboardingCommand,readableText,type StepId} from './contracts';
import {validateWorkspaceProfile} from '../workspace/validation';
export type SetupPayload=
 |{kind:'BUSINESS';name:string;timeZone:string}
 |{kind:'LOCATION_CREATE';name:string;shortName:string;clockerKey:string}
 |{kind:'LOCATION_UPDATE';id:string;name:string;shortName:string;active:boolean;expectedUpdatedAt:string}
 |{kind:'POSITION_CREATE';name:string}
 |{kind:'POSITION_UPDATE';id:string;name:string;active:boolean;expectedUpdatedAt:string}
 |{kind:'STAFFING';staffingSettings:{locationId:string;minimumStaffPerShift:number;requiresDesignatedLead:boolean}[];hourTargets:{employeeId:string;targetWeeklyHours?:number;maximumWeeklyHours:number}[]}
 |{kind:'COVERAGE_CREATE';locationId:string;dayOfWeek:number;startTime:string;endTime:string;minimumStaff?:number;positionRequirements:{positionId:string;quantity:number}[]}
 |{kind:'COVERAGE_DELETE';windowId:string}
 |{kind:'COVERAGE_POSITIONS';windowId:string;requirements:{positionId:string;quantity:number}[]}
 |{kind:'SKIP'};
const text=(v:unknown)=>readableText(v,200);
const requirements=(v:unknown):v is {positionId:string;quantity:number}[]=>Array.isArray(v)&&v.length<=100&&v.every(r=>isClosedRecord(r,['positionId','quantity'])&&text(r.positionId)&&Number.isInteger(r.quantity)&&Number(r.quantity)>=1&&Number(r.quantity)<=100);
export function parseSetupCommand(stepId:StepId|string,value:unknown){return parseOnboardingCommand<SetupPayload>(value,v=>{
 if(stepId==='BUSINESS'){if(!isClosedRecord(v,['name','timeZone']))return null;try{return {kind:'BUSINESS',...validateWorkspaceProfile({name:v.name,timeZone:v.timeZone})};}catch{return null;}}
 if(stepId==='LOCATIONS'){
  if(isClosedRecord(v,['action','name','shortName','clockerKey'])&&v.action==='CREATE'&&readableText(v.name,160)&&readableText(v.shortName,48)&&typeof v.clockerKey==='string'&&v.clockerKey.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.clockerKey))return {kind:'LOCATION_CREATE',name:v.name,shortName:v.shortName,clockerKey:v.clockerKey};
  if(isClosedRecord(v,['action','id','name','shortName','active','expectedUpdatedAt'])&&v.action==='UPDATE'&&text(v.id)&&readableText(v.name,160)&&readableText(v.shortName,48)&&typeof v.active==='boolean'&&text(v.expectedUpdatedAt))return {kind:'LOCATION_UPDATE',id:v.id,name:v.name,shortName:v.shortName,active:v.active,expectedUpdatedAt:v.expectedUpdatedAt};
 }
 if(stepId==='POSITIONS'){
  if(isClosedRecord(v,['action','name'])&&v.action==='CREATE'&&readableText(v.name,80))return {kind:'POSITION_CREATE',name:v.name};
  if(isClosedRecord(v,['action','id','name','active','expectedUpdatedAt'])&&v.action==='UPDATE'&&text(v.id)&&readableText(v.name,80)&&typeof v.active==='boolean'&&text(v.expectedUpdatedAt))return {kind:'POSITION_UPDATE',id:v.id,name:v.name,active:v.active,expectedUpdatedAt:v.expectedUpdatedAt};
 }
 if(stepId==='SCHEDULING'){
  if(isClosedRecord(v,['action','staffingSettings','hourTargets'])&&v.action==='STAFFING'&&Array.isArray(v.staffingSettings)&&v.staffingSettings.length<=100&&v.staffingSettings.every(s=>isClosedRecord(s,['locationId','minimumStaffPerShift','requiresDesignatedLead'])&&text(s.locationId)&&Number.isInteger(s.minimumStaffPerShift)&&Number(s.minimumStaffPerShift)>=1&&Number(s.minimumStaffPerShift)<=100&&typeof s.requiresDesignatedLead==='boolean')&&Array.isArray(v.hourTargets)&&v.hourTargets.length<=100&&v.hourTargets.every(t=>isClosedRecord(t,['employeeId','maximumWeeklyHours'],['targetWeeklyHours'])&&text(t.employeeId)&&typeof t.maximumWeeklyHours==='number'&&Number.isFinite(t.maximumWeeklyHours)&&t.maximumWeeklyHours>=0&&t.maximumWeeklyHours<=168&&(t.targetWeeklyHours===undefined||(typeof t.targetWeeklyHours==='number'&&Number.isFinite(t.targetWeeklyHours)&&t.targetWeeklyHours>=0&&t.targetWeeklyHours<=168))))return {kind:'STAFFING',staffingSettings:v.staffingSettings,hourTargets:v.hourTargets};
  if(isClosedRecord(v,['action','locationId','dayOfWeek','startTime','endTime','positionRequirements'],['minimumStaff'])&&v.action==='COVERAGE_CREATE'&&text(v.locationId)&&Number.isInteger(v.dayOfWeek)&&Number(v.dayOfWeek)>=0&&Number(v.dayOfWeek)<=6&&typeof v.startTime==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.startTime)&&typeof v.endTime==='string'&&/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(v.endTime)&&v.startTime<v.endTime&&requirements(v.positionRequirements)&&(v.minimumStaff===undefined||(Number.isInteger(v.minimumStaff)&&Number(v.minimumStaff)>=1&&Number(v.minimumStaff)<=100)))return {kind:'COVERAGE_CREATE',locationId:v.locationId,dayOfWeek:Number(v.dayOfWeek),startTime:v.startTime,endTime:v.endTime,positionRequirements:v.positionRequirements,...(v.minimumStaff===undefined?{}:{minimumStaff:Number(v.minimumStaff)})};
  if(isClosedRecord(v,['action','windowId'])&&v.action==='COVERAGE_DELETE'&&text(v.windowId))return {kind:'COVERAGE_DELETE',windowId:v.windowId};
  if(isClosedRecord(v,['action','windowId','requirements'])&&v.action==='COVERAGE_POSITIONS'&&text(v.windowId)&&requirements(v.requirements))return {kind:'COVERAGE_POSITIONS',windowId:v.windowId,requirements:v.requirements};
 }
 if(['TIME_TRACKING','PAYROLL','OPTIONAL_FEATURES'].includes(stepId)&&isClosedRecord(v,['action'])&&v.action==='SKIP')return {kind:'SKIP'};
 return null;
});}
