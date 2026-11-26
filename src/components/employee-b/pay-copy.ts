import { copy as approvedPayB } from './pay-b-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Signed-in Spanish (Nov 23, 2026): the words on the Employee Pay screens (pay-b.tsx): Pay, Pay history and one pay
 * statement, in English and Puerto Rico Spanish (docs/design/voice.md: tú, Comprobante de pago, Pago). The English is
 * the approved pay wording, unchanged. Every Spanish pay line here is listed for Jose's review (es-employee report). The
 * two locked sentences from employee-mobile/pay (who pays, whom to ask about a difference) are not in this table. */
export type PayLang = 'en' | 'es';

const en = {
  pay: 'Pay',
  replaced: 'Replaced', corrected: 'Corrected',
  roleReplaced: 'replaced statement', roleCorrected: 'corrected statement', roleStatement: 'statement',
  replacedBy: (day: string) => `Replaced by the ${day} correction`,
  forWork: (period: string) => `For work ${period}`,
  payHistory: 'Pay history', recentStatements: 'Recent pay statements', loadingStatements: 'Loading your statements…',
  noStatements: 'No published statements yet', noStatementsSub: 'Your statements appear here after your employer shares them.',
  payStatement: 'Pay statement', notAvailable: 'That statement isn’t available', notAvailableSub: 'It may have been replaced, or your access changed.',
  payPeriod: (period: string) => `Pay period ${period}`, payday: 'Payday',
  replacedLine: 'A corrected statement replaced this one. Use the corrected statement for this period.',
  correctsLine: 'This corrects your earlier statement for the same period.',
  statement: 'Statement', useCorrected: 'Use the corrected statement',
  pdfLabel: (role: string, day: string, separate: boolean) => `Pay statement (PDF), ${role}, payday ${day}${separate ? ' (opens separately)' : ''}`,
  pdf: 'Pay statement (PDF)',
  downloadNote: 'Downloaded files may contain personal pay information.',
  historySub: 'Your published pay statements, newest first',
  forWorkHead: 'For work', kind: 'Kind',
  viewStatementFor: (day: string, role: string, period: string) => `View statement, ${day}, ${role} for ${period}`,
  viewStatement: 'View statement', viewStatementOn: (day: string) => `View statement, ${day}`,
  openToDownload: 'Open a statement to download its PDF. Downloaded files may contain personal pay information.',
  today: 'Today', tomorrow: 'Tomorrow', inDays: (days: number) => `In ${days} days`,
  seeHours: 'See your hours', scheduledPayday: (when: string) => `Scheduled payday · ${when}`,
  lastStatement: 'Last pay statement', statementReady: 'Statement ready',
  earlier: 'Earlier', seeAll: 'See all', seeAllStatements: 'See all statements', earlierStatements: 'Earlier statements',
  everyStatement: 'Every published statement',
};

const es: typeof en = {
  pay: approvedPayB.es.pay,
  replaced: approvedPayB.es.replaced, corrected: approvedPayB.es.corrected,
  roleReplaced: approvedPayB.es.replacedStatement, roleCorrected: approvedPayB.es.correctedStatement, roleStatement: approvedPayB.es.statement,
  replacedBy: (day: string) => `Reemplazado por la corrección del ${day}`,
  forWork: (period: string) => formatPortalCopy(approvedPayB.es.forWorkStartDate, { startDate: period }),
  payHistory: approvedPayB.es.payHistory, recentStatements: approvedPayB.es.recentPayStatements, loadingStatements: approvedPayB.es.loadingYourStatements,
  noStatements: approvedPayB.es.noPublishedStatementsYet, noStatementsSub: 'Tus comprobantes aparecen aquí cuando tu patrono los comparte.',
  payStatement: approvedPayB.es.payStatement, notAvailable: approvedPayB.es.thatStatementIsnTAvailable, notAvailableSub: approvedPayB.es.itMayHaveBeenReplacedOrYourAccessChanged,
  payPeriod: (period: string) => formatPortalCopy(approvedPayB.es.payPeriodStartDate, { startDate: period }), payday: approvedPayB.es.payday,
  replacedLine: approvedPayB.es.aCorrectedStatementReplacedThisOneUseTheCorrectedStatement,
  correctsLine: approvedPayB.es.thisCorrectsYourEarlierStatementForTheSamePeriod,
  statement: approvedPayB.es.statement2, useCorrected: approvedPayB.es.useTheCorrectedStatement,
  pdfLabel: (role: string, day: string, separate: boolean) => `Comprobante de pago (PDF), ${role}, día de pago ${day}${separate ? ' (se abre aparte)' : ''}`,
  pdf: approvedPayB.es.payStatementPDF,
  downloadNote: approvedPayB.es.downloadedFilesMayContainPersonalPayInformation,
  historySub: approvedPayB.es.yourPublishedPayStatementsNewestFirst,
  forWorkHead: approvedPayB.es.forWork, kind: approvedPayB.es.kind,
  viewStatementFor: (day: string, role: string, period: string) => formatPortalCopy(approvedPayB.es.viewStatementPaydayItemForStartDate, { payday: day, item: role, startDate: period }),
  viewStatement: approvedPayB.es.viewStatement, viewStatementOn: (day: string) => formatPortalCopy(approvedPayB.es.viewStatementPayday, { payday: day }),
  openToDownload: approvedPayB.es.openAStatementToDownloadItsPDFDownloadedFilesMay,
  today: approvedPayB.es.today, tomorrow: approvedPayB.es.tomorrow, inDays: (days: number) => formatPortalCopy(approvedPayB.es.inDaysUntilDays, { daysUntil: days }),
  seeHours: approvedPayB.es.seeYourHours, scheduledPayday: (when: string) => formatPortalCopy(approvedPayB.es.scheduledPaydayWhen, { when }),
  lastStatement: approvedPayB.es.lastPayStatement, statementReady: 'Comprobante listo',
  earlier: approvedPayB.es.earlier, seeAll: approvedPayB.es.seeAll, seeAllStatements: approvedPayB.es.seeAllStatements, earlierStatements: approvedPayB.es.earlierStatements,
  everyStatement: 'Todos los comprobantes publicados',
};

export const PAY_COPY: Record<PayLang, typeof en> = {en, es};
export type PayCopy = typeof en;
export const payCopy = (lang: PayLang = 'en'): PayCopy => PAY_COPY[lang];
