/* SCRUM-214: the draft labor cost card's words, English and Spanish for Puerto Rico. */
export type CostLang = "en" | "es";

const en = {
  locale: "en-US" as "en-US" | "es-PR",
  title: "Base scheduled pay",
  estimate: "Estimate",
  loading: "Loading the estimate",
  shifts: (count: number, hours: string) => `${count === 1 ? "1 shift" : `${count} shifts`} · ${hours}`,
  missingRate: (count: number, hours: string) => `${count === 1 ? "1 shift has" : `${count} shifts have`} no pay rate (${hours})`,
  unresolved: (count: number) => count === 1 ? "1 shift falls on a clock change and isn’t priced" : `${count} shifts fall on a clock change and aren’t priced`,
  incomplete: "Incomplete",
  pricedOf: (money: string, priced: number, total: number) => `${money} for ${priced} of ${total} shifts`,
  noRates: "No pay rates",
  noRatesTitle: "No pay rates for this week’s shifts",
  noRatesBody: "Set each person’s pay rate on their page in Team to see what the week costs.",
  dismissWarning: "Dismiss pay rate reminder",
  openTeam: "Open Team",
  included: "What’s included",
  unavailable: "Unavailable",
  rowUnavailable: "This location’s estimate didn’t load",
  basis: "Scheduled time at each person’s hourly rate in effect, drafts included, rounded once to the cent. It leaves out overtime, premiums, break adjustments, employer taxes and benefits, deductions and released callouts. It isn’t payroll and doesn’t approve the schedule.",
  observed: (time: string) => `Schedule read at ${time}`,
  refresh: "Refresh",
  checking: "Checking…",
  failedTitle: "The estimate didn’t load",
  failedBody: "Check your connection, then try again.",
  tryAgain: "Try again",
};
export type CostCopy = typeof en;

const es: CostCopy = {
  locale: "es-PR",
  title: "Pago base programado",
  estimate: "Estimado",
  loading: "Cargando el estimado",
  shifts: (count, hours) => `${count === 1 ? "1 turno" : `${count} turnos`} · ${hours}`,
  missingRate: (count, hours) => `${count === 1 ? "1 turno no tiene" : `${count} turnos no tienen`} tarifa (${hours})`,
  unresolved: count => count === 1 ? "1 turno cae en un cambio de hora y no se calcula" : `${count} turnos caen en un cambio de hora y no se calculan`,
  incomplete: "Incompleto",
  pricedOf: (money, priced, total) => `${money} por ${priced} de ${total} turnos`,
  noRates: "Sin tarifas",
  noRatesTitle: "Los turnos de esta semana no tienen tarifas",
  noRatesBody: "Fija la tarifa de cada persona en su página de Equipo para ver cuánto cuesta la semana.",
  dismissWarning: "Ocultar el aviso de tarifas",
  openTeam: "Abrir Equipo",
  included: "Qué incluye",
  unavailable: "No disponible",
  rowUnavailable: "No se cargó el estimado de esta ubicación",
  basis: "Tiempo programado a la tarifa por hora vigente de cada persona, con borradores, redondeado una vez al centavo. No incluye horas extra, primas, ajustes de descansos, impuestos patronales ni beneficios, deducciones ni turnos liberados. No es nómina ni aprueba el horario.",
  observed: time => `Horario leído a las ${time}`,
  refresh: "Actualizar",
  checking: "Verificando…",
  failedTitle: "No se cargó el estimado",
  failedBody: "Revisa tu conexión y vuelve a intentarlo.",
  tryAgain: "Intentar de nuevo",
};

export const costCopy = (lang: CostLang): CostCopy => lang === "es" ? es : en;
