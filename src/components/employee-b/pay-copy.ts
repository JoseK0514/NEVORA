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
  pay: 'Pago',
  replaced: 'Reemplazado', corrected: 'Corregido',
  roleReplaced: 'comprobante reemplazado', roleCorrected: 'comprobante corregido', roleStatement: 'comprobante',
  replacedBy: (day: string) => `Reemplazado por la corrección del ${day}`,
  forWork: (period: string) => `Por el trabajo del ${period}`,
  payHistory: 'Historial de pago', recentStatements: 'Comprobantes de pago recientes', loadingStatements: 'Cargando tus comprobantes…',
  noStatements: 'Todavía no hay comprobantes publicados', noStatementsSub: 'Tus comprobantes aparecen aquí cuando tu patrono los comparte.',
  payStatement: 'Comprobante de pago', notAvailable: 'Ese comprobante no está disponible', notAvailableSub: 'Puede que lo hayan reemplazado o que tu acceso haya cambiado.',
  payPeriod: (period: string) => `Período de pago ${period}`, payday: 'Día de pago',
  replacedLine: 'Un comprobante corregido reemplazó este. Usa el comprobante corregido para este período.',
  correctsLine: 'Este corrige tu comprobante anterior del mismo período.',
  statement: 'Comprobante', useCorrected: 'Usar el comprobante corregido',
  pdfLabel: (role: string, day: string, separate: boolean) => `Comprobante de pago (PDF), ${role}, día de pago ${day}${separate ? ' (se abre aparte)' : ''}`,
  pdf: 'Comprobante de pago (PDF)',
  downloadNote: 'Los archivos descargados pueden contener información personal de pago.',
  historySub: 'Tus comprobantes de pago publicados, del más reciente al más antiguo',
  forWorkHead: 'Por el trabajo', kind: 'Tipo',
  viewStatementFor: (day: string, role: string, period: string) => `Ver comprobante, ${day}, ${role} del ${period}`,
  viewStatement: 'Ver comprobante', viewStatementOn: (day: string) => `Ver comprobante, ${day}`,
  openToDownload: 'Abre un comprobante para descargar su PDF. Los archivos descargados pueden contener información personal de pago.',
  today: 'Hoy', tomorrow: 'Mañana', inDays: (days: number) => `En ${days} días`,
  seeHours: 'Ver tus horas', scheduledPayday: (when: string) => `Día de pago programado · ${when}`,
  lastStatement: 'Último comprobante de pago', statementReady: 'Comprobante listo',
  earlier: 'Anteriores', seeAll: 'Ver todos', seeAllStatements: 'Ver todos los comprobantes', earlierStatements: 'Comprobantes anteriores',
  everyStatement: 'Todos los comprobantes publicados',
};

export const PAY_COPY: Record<PayLang, typeof en> = {en, es};
export type PayCopy = typeof en;
export const payCopy = (lang: PayLang = 'en'): PayCopy => PAY_COPY[lang];
