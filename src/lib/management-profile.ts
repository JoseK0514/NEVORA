/** Public contract agreed with the Profile session. Never contains a session proof. */
export const managementAlertTopics = [
  {id:'time-off',label:'Time-off requests',detail:'When someone asks for time off'},
  {id:'shift-changes',label:'Shift requests',detail:'When someone asks to swap or give up a shift'},
  {id:'unable-to-work',label:'Unable to work',detail:'When someone can’t make a shift'},
  {id:'clock-review',label:'Clock-ins to review',detail:'When a clock-in needs your review'},
  {id:'payroll-ready',label:'Payroll ready to review',detail:'When a pay period is ready for you'},
] as const;
export type ManagementAlertTopic = typeof managementAlertTopics[number]['id'];
export type ManagementProfile = {state:'unavailable';reason:string} | {
  state:'ready';kind:'management-profile';observedAt:string;validForMs:number;
  contact:{email:string|null;phone:string|null};locations:{scope:'all'|'assigned';names:string[]};
  alerts:{id:ManagementAlertTopic;label:string;detail:string;on:boolean}[];
};
export function parseManagementAlertChoice(value:unknown,role:string):{topicId:ManagementAlertTopic;on:boolean} {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='on,topicId')throw Error('invalid_alert_choice');
  const v=value as Record<string,unknown>;
  if(typeof v.on!=='boolean'||!managementAlertTopics.some(t=>t.id===v.topicId)||!['OWNER','MANAGER'].includes(role)||(v.topicId==='payroll-ready'&&role!=='OWNER'))throw Error('invalid_alert_choice');
  return {topicId:v.topicId as ManagementAlertTopic,on:v.on};
}
