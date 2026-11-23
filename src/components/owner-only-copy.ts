/* Signed-in Spanish (es-rest, Nov 23, 2026): the closed-page notice's own words (OwnerOnlyNotice, ClosedSettingsTitle),
 * in English and Puerto Rico Spanish (docs/design/voice.md: "Dueño", tú). The page's title, reason and sentence are the
 * caller's; these are the defaults and the joins. */
import type { PortalLang } from '@/lib/i18n/portal-lang';

const en = {
  askAnOwner: 'Ask an Owner if you need a change here.',
  returnToHome: 'Return to Home',
  backToHome: 'Back to Home',
  home: 'Home',
  settings: 'Settings',
  shiftMatching: 'Shift matching',
  or: ' or ',
  ownersCan: (named: string, can: string) => `${named} can ${can}.`,
  // closedPayrollForManager.
  yourPartIsTimecards: (who: string | null) => `Your part is timecards. ${who ?? 'An Owner'} runs payroll after you approve them.`,
  canGivePayrollAccess: (who: string) => `${who} can give you payroll access.`,
  ownersCanGivePayrollAccess: 'Owners can give you payroll access.',
  openTimecards: 'Open Timecards',
  seeMyPay: 'See my pay',
};

export type OwnerOnlyCopy = typeof en;

const es: OwnerOnlyCopy = {
  askAnOwner: 'Pide ayuda a un dueño si necesitas un cambio aquí.',
  returnToHome: 'Volver a Inicio',
  backToHome: 'Volver a Inicio',
  home: 'Inicio',
  settings: 'Configuración',
  shiftMatching: 'Coincidencia de turnos',
  or: ' o ',
  ownersCan: (named, can) => `${named} puede ${can}.`,
  yourPartIsTimecards: who => `Lo tuyo son las tarjetas de tiempo. ${who ?? 'Un dueño'} corre la nómina cuando las apruebas.`,
  canGivePayrollAccess: who => `${who} puede darte acceso a nómina.`,
  ownersCanGivePayrollAccess: 'Los dueños pueden darte acceso a nómina.',
  openTimecards: 'Abrir Tarjetas de tiempo',
  seeMyPay: 'Ver mi pago',
};

export const OWNER_ONLY_COPY: Record<PortalLang, OwnerOnlyCopy> = { en, es };
