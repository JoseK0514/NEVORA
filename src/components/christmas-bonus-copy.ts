/* Rondo Spanish (G98, Nov 23, 2026): Christmas bonus hours in English and Puerto Rico Spanish (docs/design/voice.md: tú,
 * sentence case, "bono de Navidad", "tarjeta de tiempo", "dueño", "gerente", "empresa"). English is the page's existing
 * text, character for character; the disclaimer is Jose's approved wording (Nov 18, 2026). The Spanish of every line
 * about the bonus, hours, eligibility, Payroll or the law waits for Jose's review. */
import { copy as wordingChristmasBonusReport } from "./christmas-bonus-report-copy";
import { copy as wordingReportsChristmasBonusPage } from "../app/app/reports/christmas-bonus/page-copy";
import { copy as wordingChristmasBonusYearMenu } from "./christmas-bonus-year-menu-copy";
import type { BonusRow } from '@/lib/reports/christmas-bonus';

export type BonusLang = 'en' | 'es';

const enDays = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;
const en = {
  locale: 'en-US',
  /** The disclaimer the page leads with (Jose's brief, Nov 18, 2026); kept word for word. */
  disclaimer: 'Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.',
  days: enDays,
  /** "Oct 2025 – Sep 2026": the year menu's words for one bonus year. */
  yearLabel: (endYear: number) => `Oct ${endYear - 1} – Sep ${endYear}`,
  status: { REACHED: 'Reached', CHECK_BREAKS: 'Check breaks', NOT_CONFIRMED: 'Not confirmed', NOT_REACHED: 'Not reached', NEEDS_HIRE_DATE: 'No hire date' } as Record<BonusRow['status'], string>,
  ofThreshold: (hours: string, threshold: string) => `${hours} of ${threshold} h`,
  recorded: (hours: string) => `${hours} recorded`,
  hired: (date: string) => `Hired ${date}`,
  id: (id: string) => `ID ${id}`,
  includesBreaks: (hours: string) => `Includes ${hours} of breaks`,
  notFinalized: (days: string) => `${days} not finalized`,
  inactive: 'Inactive',
  unfinalized: (people: number, days: number) => `${people === 1 ? '1 person has' : `${people} people have`} recorded time on ${enDays(days)} that ${days === 1 ? 'isn’t' : 'aren’t'} on a finalized timecard yet.`,
  insights: 'Insights',
  title: 'Christmas bonus hours',
  allLocations: 'All locations',
  bonusYear: 'Bonus year',
  bonusYearOf: (label: string) => `Bonus year: ${label}`,
  about: 'About this report',
  datesForYear: 'Dates for this bonus year',
  paymentWindow: 'Payment window',
  exemptionDeadline: 'Exemption filing deadline',
  atAGlance: 'At a glance',
  people: 'People',
  finalizedOnly: 'Hours count finalized timecards only',
  openTimecards: 'Open Timecards',
  peopleInYear: 'People in this bonus year',
  empty: 'No hours recorded in NEVORA for this bonus year',
  footnote: 'Hours are recorded time on finalized timecards in this bonus year, breaks included. People hired before Jan 26, 2017 need 700 hours; people hired on or after need 1,350. “Check breaks” means they reach it only if their recorded breaks count as hours worked. Owners aren’t listed.',
  // The route (server page, error frame).
  closedReason: 'Christmas bonus hours are for Owners and Managers',
  ownHours: 'Your own hours are on Time.',
  openTime: 'Open Time',
  unavailableTitle: 'Christmas bonus hours unavailable',
  otherZoneReason: 'Christmas bonus hours apply to Puerto Rico workspaces',
  otherZoneHelp: 'This report follows Puerto Rico’s Christmas bonus rules, and this workspace is set to another time zone.',
  openInsights: 'Open Insights',
  loadFailed: 'Couldn’t load Christmas bonus hours',
  nothingChanged: 'Nothing was changed.',
};
export type BonusCopy = typeof en;

const esDays = (count: number) => `${count} ${count === 1 ? 'día' : 'días'}`;
const es: BonusCopy = {
  locale: 'es-PR',
  disclaimer: wordingChristmasBonusReport.es.informationalOnlyChristmasBonusEligibilityAmounts,
  days: esDays,
  yearLabel: endYear => `oct ${endYear - 1} – sep ${endYear}`,
  status: { REACHED: wordingChristmasBonusReport.es.words, CHECK_BREAKS: wordingChristmasBonusReport.es.words2, NOT_CONFIRMED: wordingChristmasBonusReport.es.notConfirmedTitle, NOT_REACHED: wordingChristmasBonusReport.es.words3, NEEDS_HIRE_DATE: wordingChristmasBonusReport.es.words4 },
  ofThreshold: (hours, threshold) => `${hours} de ${threshold} h`,
  recorded: hours => `${hours} registradas`,
  hired: date => `Contratación: ${date}`,
  id: id => `ID ${id}`,
  includesBreaks: hours => `Incluye ${hours} de descansos`,
  notFinalized: days => `${days} sin finalizar`,
  inactive: wordingChristmasBonusReport.es.filterInactive,
  unfinalized: (people, days) => `${people === 1 ? '1 persona tiene' : `${people} personas tienen`} tiempo registrado en ${esDays(days)} que todavía no ${days === 1 ? 'está' : 'están'} en una tarjeta de tiempo finalizada.`,
  insights: wordingReportsChristmasBonusPage.es.insights,
  title: wordingChristmasBonusReport.es.christmasBonus,
  allLocations: 'Todas las localidades',
  bonusYear: wordingChristmasBonusYearMenu.es.bonusYear,
  bonusYearOf: label => `Año del bono: ${label}`,
  about: wordingChristmasBonusReport.es.ariaLabel,
  datesForYear: wordingChristmasBonusReport.es.datesBonusYear,
  paymentWindow: wordingChristmasBonusReport.es.paymentWindow,
  exemptionDeadline: wordingChristmasBonusReport.es.exemptionFilingDeadline,
  atAGlance: wordingChristmasBonusReport.es.atGlance,
  people: wordingChristmasBonusReport.es.people,
  finalizedOnly: wordingChristmasBonusReport.es.hoursCountFinalizedTimecardsOnly,
  openTimecards: wordingChristmasBonusReport.es.labelOpenTimecards,
  peopleInYear: wordingChristmasBonusReport.es.peopleInBonusYear,
  empty: wordingChristmasBonusReport.es.noHoursRecordedInNevoraBonus,
  footnote: wordingChristmasBonusReport.es.hoursAreRecordedTimeOnFinalized,
  closedReason: wordingReportsChristmasBonusPage.es.bonusClosedReason,
  ownHours: wordingReportsChristmasBonusPage.es.ownHours,
  openTime: wordingReportsChristmasBonusPage.es.labelOpenTime,
  unavailableTitle: wordingReportsChristmasBonusPage.es.bonusUnavailable,
  otherZoneReason: wordingReportsChristmasBonusPage.es.bonusPrOnly,
  otherZoneHelp: wordingReportsChristmasBonusPage.es.bonusPrOnlyHelp,
  openInsights: wordingReportsChristmasBonusPage.es.labelOpenInsights,
  loadFailed: wordingReportsChristmasBonusPage.es.bonusLoadFailed,
  nothingChanged: wordingReportsChristmasBonusPage.es.errorLine,
};

export const CHRISTMAS_BONUS_COPY = { en, es } as const;
