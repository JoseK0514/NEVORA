import {expect,it} from 'vitest';
import type {CoverageBlock} from './schedule-health';
import {summarizeCoverageMinutes} from './coverage-minutes';
const block:CoverageBlock={key:'one',locationId:'place',locationName:'Fictional',date:'2030-10-08',startTime:'08:00',endTime:'12:00',assignedStaff:1,requiredStaff:2,gap:1,staffCovered:false,requiresLead:true,leadCovered:false,leadNames:[],positionCoverage:[{positionId:'barista',positionName:'Barista',assigned:1,required:2,missing:1}],positionsCovered:false,covered:false};
it('weights required staffing, position and lead obligations by minutes instead of row counts',()=>{
 expect(summarizeCoverageMinutes([block],true)).toEqual({state:'ready',staffing:{required:480,covered:240,percent:50},positions:{required:480,covered:240,percent:50},lead:{required:240,covered:0,percent:0}});
});
it('does not change when an equivalent coverage interval is split',()=>{
 expect(summarizeCoverageMinutes([{...block,endTime:'09:00'},{...block,key:'two',startTime:'09:00'}],true)).toEqual({state:'ready',staffing:{required:480,covered:240,percent:50},positions:{required:480,covered:240,percent:50},lead:{required:240,covered:0,percent:0}});
});
it('weights long gaps more heavily and never lets surplus staffing erase another interval shortage',()=>{
 const result=summarizeCoverageMinutes([block,{...block,key:'two',startTime:'12:00',endTime:'13:00',assignedStaff:20,leadCovered:true,positionCoverage:[]}],true);
 expect(result.state==='ready'&&result.staffing).toEqual({required:600,covered:360,percent:60});
});
it('keeps missing configuration and absent denominators distinct from 100 percent',()=>{
 expect(summarizeCoverageMinutes([block],false).state).toBe('not_configured');
 expect(summarizeCoverageMinutes([{...block,requiredStaff:null}],true).state).toBe('not_configured');
 const result=summarizeCoverageMinutes([{...block,requiredStaff:0,requiresLead:false,positionCoverage:[]}],true);
 expect(result.state==='ready'&&result.staffing).toEqual({required:0,covered:0,percent:null});
});
it('rejects overlapping segments rather than double counting their obligations',()=>{
 expect(()=>summarizeCoverageMinutes([block,{...block,key:'duplicate'}],true)).toThrow();
});
