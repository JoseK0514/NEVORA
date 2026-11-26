import { copy as approvedPayCorp } from '../pay-corp-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Signed-in Spanish (Nov 23, 2026): the words only the corporate-kit Pay (pay-corp.tsx: Pay, Pay history and one Pay
 * statement) draws, in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, "Pago", "Comprobante de
 * pago", "Historial"). The states, notices and roles it shares with the older view come from copy/pay.ts. Pay text is
 * serious and exact: the Spanish is a literal rendering of the approved English and needs Jose's sign-off. English is
 * byte for byte what the screen said before. */
const en={
 recentStatements:'Recent pay statements',
 /** A statement row's screen reader label: "Thursday, January 24, 2030, corrected statement for Jan 6–19". */
 rowLabel:(payday:string,role:string,period:string)=>`${payday}, ${role} for ${period}`,
 payStatement:'Pay statement',
 payPeriod:(period:string)=>`Pay period ${period}`,
 payday:'Payday',
 statement:'Statement',
 pdf:'Pay statement (PDF)',
 pdfLabel:(role:string,payday:string,separate:boolean)=>`Pay statement (PDF), ${role}, payday ${payday}${separate?' (opens separately)':''}`,
 downloaded:'Downloaded files may contain personal pay information.',
 payHistory:'Pay history',
 newestFirst:'Your published pay statements, newest first.',
 thisPeriod:'This pay period',
 thisPeriodOf:(period:string)=>`This pay period · ${period}`,
 paydayToday:'Scheduled payday is today',
 paydayTomorrow:'Scheduled payday is tomorrow',
 paydayIn:(days:number)=>`Scheduled payday is in ${days} days`,
 seeHours:'See your hours',
 seeAll:'See all',
 seeAllStatements:'See all statements',
};
const es:typeof en={
 recentStatements:approvedPayCorp.es.recentPayStatements,
 rowLabel:(payday:string,role:string,period:string)=>formatPortalCopy(approvedPayCorp.es.paydayItemForStartDate, { payday, item: role, startDate: period }),
 payStatement:approvedPayCorp.es.payStatement,
 payPeriod:(period:string)=>formatPortalCopy(approvedPayCorp.es.payPeriodStartDate, { startDate: period }),
 payday:approvedPayCorp.es.payday,
 statement:approvedPayCorp.es.statement2,
 pdf:approvedPayCorp.es.payStatementPDF,
 pdfLabel:(role:string,payday:string,separate:boolean)=>`Comprobante de pago (PDF), ${role}, día de pago ${payday}${separate?' (se abre aparte)':''}`,
 downloaded:approvedPayCorp.es.downloadedFilesMayContainPersonalPayInformation,
 payHistory:approvedPayCorp.es.payHistory,
 newestFirst:approvedPayCorp.es.yourPublishedPayStatementsNewestFirst,
 thisPeriod:approvedPayCorp.es.thisPayPeriod,
 thisPeriodOf:(period:string)=>formatPortalCopy(approvedPayCorp.es.thisPayPeriodStartDate, { startDate: period }),
 paydayToday:approvedPayCorp.es.scheduledPaydayIsToday,
 paydayTomorrow:approvedPayCorp.es.daysToPaydayOne,
 paydayIn:(days:number)=>formatPortalCopy(approvedPayCorp.es.daysToPaydayOther, { daysUntil: days }),
 seeHours:approvedPayCorp.es.seeYourHours,
 seeAll:'Ver todos',
 seeAllStatements:approvedPayCorp.es.seeAllStatements,
};
export const payCorpCopy={en,es};
