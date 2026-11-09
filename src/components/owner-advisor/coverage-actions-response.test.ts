import {expect,it} from "vitest";
import {ownerCoverageAction} from "@/test/fixtures/owner-coverage-action";
import {parseCoverageActionResult} from "./coverage-actions-response";
it.each(["coverage_review","coverage_saved","coverage_checked"] as const)("accepts a bounded %s with exact receipt relationships",state=>{
 const v=ownerCoverageAction(state);expect(parseCoverageActionResult(v)).toEqual(v);
});
it.each([
 (v:ReturnType<typeof ownerCoverageAction>)=>v.review.assignments[0].employeeId="",
 (v:ReturnType<typeof ownerCoverageAction>)=>v.review.assignments.push(...Array.from({length:12},()=>v.review.assignments[0])),
 (v:ReturnType<typeof ownerCoverageAction>)=>v.review.expiresAt=new Date(Date.now()+900000).toISOString(),
 (v:ReturnType<typeof ownerCoverageAction>)=>v.review.timeZone="fictional/invalid",
 (v:ReturnType<typeof ownerCoverageAction>)=>v.review.coverage.coveredMinutes=241,
 (v:ReturnType<typeof ownerCoverageAction>)=>v.receipt!.reviewId="33333333-3333-4333-8333-333333333333",
 (v:ReturnType<typeof ownerCoverageAction>)=>v.receipt!.count=2,
 (v:ReturnType<typeof ownerCoverageAction>)=>v.progress!.assignmentsPresent=2,
 (v:ReturnType<typeof ownerCoverageAction>)=>v.progress!.publishedAssignments=2,
 (v:ReturnType<typeof ownerCoverageAction>)=>v.progress!.coverage=null,
 (v:ReturnType<typeof ownerCoverageAction>)=>Object.assign(v,{extra:"unexpected"}),
 (v:ReturnType<typeof ownerCoverageAction>)=>v.validForMs=15001,
])("rejects malformed or contradictory private results",change=>{
 const v=ownerCoverageAction("coverage_checked");change(v);expect(()=>parseCoverageActionResult(v)).toThrow();
});
