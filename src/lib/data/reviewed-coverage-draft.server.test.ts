import { expect, it } from '@rstest/core';
import { automaticWeek } from "@/test/fixtures/automatic-week";
import { fictionalProfile } from "@/test/fixtures/shift-changes";
import { deriveGenerationDemand } from "../scheduling/generation/demand";
import { reviewCoverageDraft, ReviewedDraftConflict } from "./reviewed-coverage-draft.server";
const terms = {employeeId:"e1",locationId:"loc-1",startTime:"08:00",endTime:"16:00",positionId:null,isDesignatedLead:false};
const input=()=>{const i=automaticWeek();i.employees.forEach(e=>e.operationalProfile=fictionalProfile());return i;};
// Observed before the reviewed Monday (Oct 5), so the whole day is still ahead.
const seen="2026-10-01T12:00:00.000Z";
it("rehydrates canonical names and measures the exact partial set without changing the ledger",()=>{
 const i=input();const r=reviewCoverageDraft(i,"2026-10-05",[terms],seen);expect(i.ledger).toEqual([]);expect(r.assignments[0].employeeName).toBe("Person1 Fictional");expect(r.coverage.remainingBlocks).toBeGreaterThan(0);
});
it("cannot bypass a Manager exclusion using another employee or manual origin",()=>{
 const i=input();const d=deriveGenerationDemand(i);i.exclusions.push({id:"excluded",workspaceId:"work",weekStart:i.weekStart,locationId:"loc-1",assignmentStart:"2026-10-05T08:00",assignmentEnd:"2026-10-05T16:00",positionId:null,claims:{version:1,claims:d.needs.map(n=>({...n,coveredStart:n.needStart,coveredEnd:n.needEnd,quantity:1}))},deletedSourceShiftId:"deleted",createdBy:"manager",createdAt:"2026-10-01T00:00:00Z",clearedBy:null,clearedAt:null});
 expect(()=>reviewCoverageDraft(i,"2026-10-05",[terms,{...terms,employeeId:"e2"}],seen)).toThrow();
});
it("rejects a combined over-capacity batch and an entire mixed published target",()=>{
 const i=input();expect(()=>reviewCoverageDraft(i,"2026-10-05",[terms,{...terms,employeeId:"e2"},{...terms,employeeId:"e3"}],seen)).toThrow();
 i.schedules.push({id:"published",locationId:"loc-1",weekStart:i.weekStart,status:"PUBLISHED"});expect(()=>reviewCoverageDraft(i,"2026-10-05",[terms],seen)).toThrow();
});
it("never saves a whole-day 00:00–24:00 shift, and keeps saves inside the coverage they fill (QA S-09)",()=>{
 const wholeDay={...terms,startTime:"00:00",endTime:"24:00"};
 // Coverage is 8:00 AM – 4:00 PM: an all-day shift, or one reaching outside the period, is not what any plan reviewed.
 expect(()=>reviewCoverageDraft(input(),"2026-10-05",[wholeDay],seen)).toThrow(ReviewedDraftConflict);
 expect(()=>reviewCoverageDraft(input(),"2026-10-05",[{...terms,endTime:"17:00"}],seen)).toThrow(ReviewedDraftConflict);
 expect(()=>reviewCoverageDraft(input(),"2026-10-05",[{...terms,startTime:"07:00"}],seen)).toThrow(ReviewedDraftConflict);
 expect(reviewCoverageDraft(input(),"2026-10-05",[terms],seen).assignments.map(a=>[a.startTime,a.endTime])).toEqual([["08:00","16:00"]]);
 // Coverage set for the whole day (Jose, Nov 22, 2026): a day plan's shifts are capped at 10 hours with no per-shift
 // maximum configured, so a 24-hour term is refused and a 10-hour one inside the coverage is saved.
 const i=input();i.coverageWindows[0]={...i.coverageWindows[0],startTime:"00:00",endTime:"24:00"};
 expect(()=>reviewCoverageDraft(i,"2026-10-05",[wholeDay],seen)).toThrow(ReviewedDraftConflict);
 expect(()=>reviewCoverageDraft(i,"2026-10-05",[{...terms,startTime:"00:00",endTime:"10:15"}],seen)).toThrow(ReviewedDraftConflict);
 expect(reviewCoverageDraft(i,"2026-10-05",[{...terms,startTime:"00:00",endTime:"10:00"}],seen).assignments.map(a=>[a.startTime,a.endTime])).toEqual([["00:00","10:00"]]);
});
it("rejects time that has already passed today in the company's zone",()=>{
 // 15:42 UTC on Oct 5 is 11:42 AM in Puerto Rico: plans for today start at 11:45 AM.
 const now="2026-10-05T15:42:00.000Z";
 expect(()=>reviewCoverageDraft(input(),"2026-10-05",[terms],now)).toThrow(ReviewedDraftConflict);
 const r=reviewCoverageDraft(input(),"2026-10-05",[{...terms,startTime:"11:45"}],now);
 expect(r.assignments.map(a=>[a.startTime,a.endTime])).toEqual([["11:45","16:00"]]);expect(r.coverage.requiredMinutes).toBe(255);
 const i=input();i.coverageWindows[0]={...i.coverageWindows[0],startTime:"00:00",endTime:"24:00"};
 expect(()=>reviewCoverageDraft(i,"2026-10-05",[{...terms,startTime:"00:00",endTime:"24:00"}],now)).toThrow(ReviewedDraftConflict);
});
