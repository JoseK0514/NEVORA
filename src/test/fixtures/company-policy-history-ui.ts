import type { StoredPolicyRevision } from '../../lib/business-improvements/company-policies/history';
import type { CompanyPolicySettings } from '../../lib/business-improvements/company-policies/model';
export const policyUISettings: CompanyPolicySettings = {
  version:1,
  attendance:{lateness:{thresholdMinutes:7,comparison:'GT',effectiveFrom:'2030-10-01T00:00:00Z'},earlyDeparture:null},
  labor:{
    compensation:{effectiveFrom:'2030-10-01T00:00:00Z',ruleReference:'Owner-approved compensation reference',breakTreatment:'INCLUDE_ALL_RECORDED_BREAKS',excludedBreakTypeIds:[]},
    rates:[{id:'private-rate',employeeId:'QAOWNER',locationId:null,rate:'12.125',currency:'USD',rateUnit:'HOUR',validFrom:'2030-10-01T00:00:00Z',validUntil:null}],
    budgets:[{id:'private-budget',locationId:null,startAt:'2030-10-01T00:00:00Z',endAt:'2030-11-01T00:00:00Z',amount:'900.50',currency:'USD'}],
    calculationMethod:{id:'owner-method',revision:4},
  },
};
export function policyUIRows(replacement=true,locationId:string|null=null):StoredPolicyRevision[]{
  const rows:StoredPolicyRevision[]=[
    {operationId:'10000000-0000-4000-8000-000000000001',revision:1,locationId,changedAt:'2030-10-03T00:00:00Z',changedKeys:['attendance.lateness'],settings:policyUISettings},
    {operationId:'10000000-0000-4000-8000-000000000002',revision:2,locationId,changedAt:'2030-10-02T00:00:00Z',changedKeys:'private-invalid-key-metadata',settings:{version:1,attendance:{longEntry:{thresholdMinutes:7,comparison:'GT',effectiveFrom:'2030-10-01T00:00:00Z',basis:['RECORDED_ELAPSED'],appliesTo:'BOTH'}},labor:{privateRawMarker:'NEVER_RENDER_INVALID_PRIVATE_PAYLOAD'}}},
  ];
  if(replacement)rows.push({operationId:'10000000-0000-4000-8000-000000000003',revision:3,locationId,changedAt:'2030-10-01T00:00:00Z',changedKeys:['attendance.lateness'],settings:{...policyUISettings,attendance:{...policyUISettings.attendance,lateness:{...policyUISettings.attendance!.lateness!,thresholdMinutes:9}}}});
  return rows;
}
