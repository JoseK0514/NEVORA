import type {ReadinessSections,StepId,SectionState,OnboardingAction} from './contracts';
export type CanonicalReadiness={businessValid:boolean;activeLocations:number;activePositions:number;schedulingIssues:string[];teamCount:number;uninvitedCount:number;missingEmailCount:number;payrollEnabled:boolean;timekeepingConfigured:boolean;payrollConfigured:boolean};
export function deriveReadiness(c:CanonicalReadiness):ReadinessSections{
 const section=(id:StepId,state:SectionState,reasonCodes:string[]=[],allowedActions:OnboardingAction[]=['OPEN'] )=>({id,state,reasonCodes,allowedActions});
 return [
  section('BUSINESS',c.businessValid?'READY':'BLOCKED',c.businessValid?[]:['BUSINESS_PROFILE_REQUIRED'],['OPEN','SAVE']),
  section('LOCATIONS',c.activeLocations?'READY':'BLOCKED',c.activeLocations?[]:['ACTIVE_LOCATION_REQUIRED'],['OPEN','SAVE']),
  section('POSITIONS',c.activePositions?'READY':'OPTIONAL',c.activePositions?[]:['POSITIONS_OPTIONAL_UNLESS_REQUIRED'],['OPEN','SAVE']),
  section('SCHEDULING',c.schedulingIssues.length?'IN_PROGRESS':'READY',[...new Set(c.schedulingIssues)],['OPEN','SAVE']),
  section('PEOPLE',c.teamCount?'READY':'OPTIONAL',c.teamCount?[]:['TEAM_CAN_BE_ADDED_LATER'],['OPEN','SAVE']),
  section('INVITATIONS',c.uninvitedCount?'IN_PROGRESS':'OPTIONAL',[...(c.uninvitedCount?['EXPLICIT_SEND_REQUIRED']:[]),...(c.missingEmailCount?['EMPLOYEE_EMAIL_REQUIRED']:[])],['OPEN','CHECK_STATUS','INVITE']),
  section('TIME_TRACKING','OPTIONAL',[c.timekeepingConfigured?'REVIEW_CURRENT_TIMEKEEPING_SETUP':'TIMEKEEPING_SETUP_REQUIRED'],['OPEN']),
  section('PAYROLL','OPTIONAL',[!c.payrollEnabled?'PAYROLL_DISABLED':c.payrollConfigured?'REVIEW_CURRENT_PAYROLL_SETUP':'PAYROLL_SETUP_REQUIRED'],['OPEN']),
  section('OPTIONAL_FEATURES','OPTIONAL',['FEATURES_REQUIRE_EXPLICIT_CONFIGURATION'],['OPEN']),
 ];
}
export const onboardingDestinations:Record<StepId,string>={BUSINESS:'/app/settings/workspace',LOCATIONS:'/app/settings/locations',POSITIONS:'/app/settings/positions',SCHEDULING:'/app/schedule/settings',PEOPLE:'/app/employees',INVITATIONS:'/app/employees',TIME_TRACKING:'/app/settings/clocker',PAYROLL:'/app/settings/payroll',OPTIONAL_FEATURES:'/app/settings/features'};
