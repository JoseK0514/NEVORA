import type { CoverageActionResult } from "@/lib/owner-advisor/coverage-actions";
export const REVIEW_ID="11111111-1111-4111-8111-111111111111";
export function ownerCoverageAction(state: CoverageActionResult["state"]="coverage_review") {
  // One clock reading: the parser requires expiresAt - preparedAt to be exactly 300000 ms, and two readings a
  // millisecond apart made the fixture fail now and then under load.
  const now=Date.now(), at=new Date(now).toISOString();
  return { state,authority:"owner",observedAt:at,validForMs:15000,
    review:{id:REVIEW_ID,date:"2026-10-22",timeZone:"America/Puerto_Rico",sourceVersion:"a".repeat(64),preparedAt:at,expiresAt:new Date(now+300000).toISOString(),assignments:[{employeeId:"ana",employeeName:"Ana Example",locationId:"north",locationName:"North",startTime:"08:00",endTime:"12:00",positionId:null,positionName:null,isDesignatedLead:false}],coverage:{requiredMinutes:240,coveredMinutes:240,requiredObligationMinutes:240,fulfilledObligationMinutes:240,remainingBlocks:0},partial:false},
    receipt:state==="coverage_review"?null:{operationId:"22222222-2222-4222-8222-222222222222",reviewId:REVIEW_ID,savedAt:at,count:1},
    progress:state!=="coverage_checked"?null:{state:"current",observedAt:at,timeZone:"America/Puerto_Rico",assignmentsPresent:1,assignmentsTotal:1,publishedAssignments:0,coverage:{requiredMinutes:240,coveredMinutes:240,requiredObligationMinutes:240,fulfilledObligationMinutes:240,remainingBlocks:0},scopeComplete:true},
  } as CoverageActionResult & {authority:string;observedAt:string;validForMs:number};
}
