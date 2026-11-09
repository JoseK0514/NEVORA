import {schedulingIssueMessage} from '@/lib/scheduling/validate-shift';

const scheduleErrors:Record<string,string>={
 DEADLINE_WORKSPACE_CHANGED:'Workspace settings changed while saving. Your deadline was not saved. Review the business timezone and submit again.',
 INVALID_DEADLINE:'Enter a valid business-local deadline. Daylight saving times that are skipped or occur twice cannot be used.',
 INVALID_SHIFT:'Couldn’t open that shift. Pick it again from this week.',
 EMPLOYEE_NOT_FOUND:'The selected employee could not be found.',
 LOCATION_NOT_ELIGIBLE:'That employee is not eligible to work at the selected location.',
 SHIFT_OVERLAP:'That employee already has an overlapping shift.',
 APPROVED_TIME_OFF:'That employee has approved time off during the selected shift.',
 EMPLOYEE_INACTIVE:'Inactive employees cannot be scheduled.',
 INVALID_TIME_RANGE:'Enter a valid shift date and time period.',
 INVALID_SHIFT_LEAD:'Only an Owner, Manager, or Lead can be the designated shift lead.',
 INVALID_PUBLISH:'The schedule could not be published.',
 NO_PENDING_CHANGES:'There were no unpublished changes to publish.',
 NO_SCHEDULE:'There is no schedule to publish for that location yet.',
 SHIFT_HAS_EXCHANGE_HISTORY:'This shift has scheduling history and cannot be deleted. Edit it instead.',
};
const editorErrors:Record<string,string>={
 LOCATION_NOT_ELIGIBLE:'That employee is not eligible to work at this location.',
 SHIFT_OVERLAP:'That employee already has an overlapping shift.',
 APPROVED_TIME_OFF:'That employee has approved time off during this shift.',
 EMPLOYEE_INACTIVE:'Inactive employees cannot be scheduled.',
 INVALID_TIME_RANGE:'Enter a valid shift date and time period.',
 INVALID_SHIFT_LEAD:'Only an Owner, Manager, or Lead can be the designated shift lead.',
};
const companyWarnings:Record<string,string>={
 OUTSIDE_AVAILABILITY:"Shift saved, but it is outside the employee's submitted availability.",
 WEEKLY_HOURS:'Shift saved, but the employee is now scheduled for more than 40 hours.',
};
const scopedWarnings:Record<string,string>={
 OUTSIDE_AVAILABILITY:"Review this shift: it is outside the employee's submitted availability.",
 WEEKLY_HOURS:'Review this employee’s scheduled hours; they may exceed 40 hours.',
};
function knownMessage(messages:Record<string,string>,code:string){
 if(Object.hasOwn(messages,code))return messages[code];
 const standard=schedulingIssueMessage(code);
 return typeof standard==='string'&&standard.trim()?standard:undefined;
}

/** Route hints explain a redirect; they are not transaction receipts. Scoped
 * destinations therefore prompt review instead of certifying a save from a URL.
 */
export function ScheduleRouteFeedback({destination='schedule',error,warning,scoped=false,reviewChange=false}:{destination?:'schedule'|'editor';error?:string;warning?:string;scoped?:boolean;reviewChange?:boolean}){
 return <>
  {error&&<p className="form-error" role="alert">{knownMessage(destination==='editor'?editorErrors:scheduleErrors,error)??(destination==='editor'?'The shift could not be updated.':'The schedule could not be updated.')}</p>}
  {warning&&<p className="form-warning" role="status">{knownMessage(scoped?scopedWarnings:companyWarnings,warning)??(scoped?'Review the current schedule for any scheduling warnings.':'Shift saved with a scheduling warning.')}</p>}
  {scoped&&reviewChange&&!error&&!warning&&<p className="form-warning" role="status">Review the current schedule to confirm your change.</p>}
 </>;
}
