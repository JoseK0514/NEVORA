import { expect, it } from "vitest";
import { automaticWeek } from "@/test/fixtures/automatic-week";
import { fictionalProfile } from "@/test/fixtures/shift-changes";
import { deriveGenerationDemand } from "../scheduling/generation/demand";
import { reviewCoverageDraft } from "./reviewed-coverage-draft.server";
const terms = {employeeId:"e1",locationId:"loc-1",startTime:"08:00",endTime:"16:00",positionId:null,isDesignatedLead:false};
const input=()=>{const i=automaticWeek();i.employees.forEach(e=>e.operationalProfile=fictionalProfile());return i;};
it("rehydrates canonical names and measures the exact partial set without changing the ledger",()=>{
 const i=input();const r=reviewCoverageDraft(i,"2026-10-05",[terms]);expect(i.ledger).toEqual([]);expect(r.assignments[0].employeeName).toBe("Person1 Fictional");expect(r.coverage.remainingBlocks).toBeGreaterThan(0);
});
it("cannot bypass a Manager exclusion using another employee or manual origin",()=>{
 const i=input();const d=deriveGenerationDemand(i);i.exclusions.push({id:"excluded",workspaceId:"work",weekStart:i.weekStart,locationId:"loc-1",assignmentStart:"2026-10-05T08:00",assignmentEnd:"2026-10-05T16:00",positionId:null,claims:{version:1,claims:d.needs.map(n=>({...n,coveredStart:n.needStart,coveredEnd:n.needEnd,quantity:1}))},deletedSourceShiftId:"deleted",createdBy:"manager",createdAt:"2026-10-01T00:00:00Z",clearedBy:null,clearedAt:null});
 expect(()=>reviewCoverageDraft(i,"2026-10-05",[terms,{...terms,employeeId:"e2"}])).toThrow();
});
it("rejects a combined over-capacity batch and an entire mixed published target",()=>{
 const i=input();expect(()=>reviewCoverageDraft(i,"2026-10-05",[terms,{...terms,employeeId:"e2"},{...terms,employeeId:"e3"}])).toThrow();
 i.schedules.push({id:"published",locationId:"loc-1",weekStart:i.weekStart,status:"PUBLISHED"});expect(()=>reviewCoverageDraft(i,"2026-10-05",[terms])).toThrow();
});
