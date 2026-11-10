export type ApprovalPolicy={managerReviewRequired:boolean|null;rulePath:'Scheduling rules › Trades'};
/** Current workflow policy belongs to the read, while notices describe this request. */
export function approvalAvailability(currentMode:string|null|undefined,recordedMode:string|null|undefined,overtime:boolean):{policy:ApprovalPolicy;notice:string|null}{
 const reasons:string[]=[];
 if(overtime)reasons.push('Projected scheduled overtime needs manager review.');
 if(currentMode!=='MANAGER_REVIEW'&&recordedMode==='MANAGER_REVIEW')reasons.push('This request was submitted under manager review.');
 return {policy:{managerReviewRequired:currentMode==='MANAGER_REVIEW'?true:currentMode==='AUTOMATIC_WHEN_VALID'?false:null,rulePath:'Scheduling rules › Trades'},notice:reasons.length?reasons.join(' '):null};
}
