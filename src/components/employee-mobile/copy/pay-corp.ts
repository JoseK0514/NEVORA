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
 recentStatements:'Comprobantes de pago recientes',
 rowLabel:(payday:string,role:string,period:string)=>`${payday}, ${role} del ${period}`,
 payStatement:'Comprobante de pago',
 payPeriod:(period:string)=>`Período de pago ${period}`,
 payday:'Día de pago',
 statement:'Comprobante',
 pdf:'Comprobante de pago (PDF)',
 pdfLabel:(role:string,payday:string,separate:boolean)=>`Comprobante de pago (PDF), ${role}, día de pago ${payday}${separate?' (se abre aparte)':''}`,
 downloaded:'Los archivos descargados pueden contener información personal de pago.',
 payHistory:'Historial de pagos',
 newestFirst:'Tus comprobantes de pago publicados, del más reciente al más antiguo.',
 thisPeriod:'Este período de pago',
 thisPeriodOf:(period:string)=>`Este período de pago · ${period}`,
 paydayToday:'El día de pago programado es hoy',
 paydayTomorrow:'El día de pago programado es mañana',
 paydayIn:(days:number)=>`El día de pago programado es en ${days} ${days===1?'día':'días'}`,
 seeHours:'Ver tus horas',
 seeAll:'Ver todos',
 seeAllStatements:'Ver todos los comprobantes',
};
export const payCorpCopy={en,es};
