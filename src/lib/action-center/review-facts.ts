import {isValidIsoDate} from '../date-utils';

/** Identity/scope eligibility at an authorized observation. Never a command
 * permission: the canonical mutation rechecks current authority and source. */
export type ReviewFacts = {
  concernsActor:boolean|null;
  independentReviewRequired:boolean;
  actorMayReview:boolean;
  unavailableReason:null|'independent_review_required'|'facts_unavailable';
  requiredReviewer:{roles:['OWNER','MANAGER'];scope:'COMPANY';assignment:'unassigned';independentOf:'SUBJECT'|'SUBJECT_AND_REQUESTER'};
  period:{startDate:string;endDate:string}|null;
  deadlineAt:null;
};

export function reviewFacts(concernsActor:boolean|null,independentReviewRequired:boolean,kind:'TIMECARD'|'TIME_CORRECTION',period:ReviewFacts['period']=null):ReviewFacts {
  return {concernsActor,independentReviewRequired,actorMayReview:concernsActor!==null&&!independentReviewRequired,
    unavailableReason:independentReviewRequired?'independent_review_required':concernsActor===null?'facts_unavailable':null,
    requiredReviewer:{roles:['OWNER','MANAGER'],scope:'COMPANY',assignment:'unassigned',independentOf:kind==='TIMECARD'?'SUBJECT':'SUBJECT_AND_REQUESTER'},
    period,deadlineAt:null};
}

export function validateReviewFacts(value:ReviewFacts,kind:string) {
  if(!value||typeof value!=='object'||Array.isArray(value)||!['TIMECARD','TIME_CORRECTION'].includes(kind)||
    Object.keys(value).sort().join(',')!=='actorMayReview,concernsActor,deadlineAt,independentReviewRequired,period,requiredReviewer,unavailableReason'||
    !(value.concernsActor===null||typeof value.concernsActor==='boolean')||typeof value.independentReviewRequired!=='boolean'||
    value.concernsActor===true&&!value.independentReviewRequired)throw Error('Invalid review facts');
  const expected=reviewFacts(value.concernsActor,value.independentReviewRequired,kind as 'TIMECARD'|'TIME_CORRECTION',value.period);
  if(value.actorMayReview!==expected.actorMayReview||value.unavailableReason!==expected.unavailableReason||value.deadlineAt!==null||
    !value.requiredReviewer||Object.keys(value.requiredReviewer).sort().join(',')!=='assignment,independentOf,roles,scope'||
    value.requiredReviewer.roles?.join(',')!=='OWNER,MANAGER'||value.requiredReviewer.scope!=='COMPANY'||value.requiredReviewer.assignment!=='unassigned'||
    value.requiredReviewer.independentOf!==expected.requiredReviewer.independentOf)throw Error('Invalid review facts');
  if(kind==='TIMECARD'?!value.period:value.period!==null)throw Error('Invalid review period');
  if(value.period&&(Object.keys(value.period).sort().join(',')!=='endDate,startDate'||!isValidIsoDate(value.period.startDate)||!isValidIsoDate(value.period.endDate)||value.period.endDate<value.period.startDate))throw Error('Invalid review period');
}
