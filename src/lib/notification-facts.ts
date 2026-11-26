import type {EmployeeNotificationItem} from './employee-view';
import {notificationKind,type NotificationKind} from './notification-labels';
import {NOTIFICATION_TEXT_COPY,type NotificationLang} from './notification-text-copy';

/* Backend contract (Nov 15, 2026): an authorized list item may carry its event type, the request's current status
 * (`outcome`), the names it may show and a count. These helpers turn only what is present into words; nothing is
 * guessed when a fact is absent, and free text, reasons and amounts never reach the list. */

type Facts=Pick<EmployeeNotificationItem,'label'|'eventType'|'outcome'|'names'|'count'>;

/** The row's kind: from its event type when the list sends one (the labels now name the event, "Time off approved"),
 * otherwise from its exact current or legacy label, as before. */
export function notificationKindFor(item:Pick<Facts,'label'|'eventType'>):NotificationKind|null{
 const event=item.eventType??'';
 if(/^SCHEDULE_/.test(event))return 'SCHEDULE';
 if(/^TIME_OFF_/.test(event))return 'TIME_OFF';
 if(/^CALLOUT_/.test(event))return 'CALLOUT';
 // A manager summary can be COVERAGE_ATTENTION, so only the cover request's own events are shift requests.
 if(/^SWAP_/.test(event)||['COVERAGE_INVITATION','COVERAGE_APPROVED','COVERAGE_DENIED'].includes(event))return 'EXCHANGE';
 if(event==='PAYROLL_STATEMENT')return 'PAYROLL_STATEMENT';
 if(event==='COMMUNICATION')return 'COMMUNICATION';
 if(/^AVAILABILITY_/.test(event))return 'AVAILABILITY';
 return notificationKind(item.label);
}

const STATUS_WORDS:Readonly<Record<string,string>>=NOTIFICATION_TEXT_COPY.en.status;

/** "Now cancelled": only for a decision notice (…_APPROVED or …_DENIED) whose request has since moved to another known
 * status. The notice itself stays true to what happened; an unknown status says nothing. */
export function notificationOutcomeNote(item:Pick<Facts,'eventType'|'outcome'>,lang:NotificationLang='en'):string|null{
 const decided=/_(APPROVED|DENIED)$/.exec(item.eventType??'')?.[1];
 if(!decided||!item.outcome||item.outcome===decided||!Object.hasOwn(STATUS_WORDS,item.outcome))return null;
 const t=NOTIFICATION_TEXT_COPY[lang];
 return t.now(t.status[item.outcome]);
}

/** The count, where the list sends one: a schedule notice counts the reader's own shifts in it, a manager summary the
 * items it gathers. Null when there is none (never "0 items" invented from a missing count). */
export function notificationCountNote(item:Pick<Facts,'eventType'|'count'>,lang:NotificationLang='en'):string|null{
 if(item.count===null||item.count===undefined||!Number.isSafeInteger(item.count)||item.count<0)return null;
 const n=item.count,t=NOTIFICATION_TEXT_COPY[lang];
 if(/^SCHEDULE_/.test(item.eventType??''))return n===0?t.noShifts:t.shifts(n);
 if(item.eventType==='MANAGER_REVIEW'||item.eventType==='COVERAGE_ATTENTION')return t.waiting(n);
 return null;
}

/** The first name the list may show for this notice, when it sends one. */
export const notificationName=(item:Pick<Facts,'names'>)=>item.names?.find(name=>name.trim().length>0)??null;
