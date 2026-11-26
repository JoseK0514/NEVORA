import { copy as approvedPage } from './payroll-export/paid-time/page-copy';

import { readPageLang } from "@/lib/i18n/page-lang.server";

/** Signed-in Spanish (integration): the browser tab titles of the routes that had a fixed English title. English
 * unchanged; Puerto Rico Spanish in the words those pages already use. The key sets must match (route-titles.test.ts). */
export const ROUTE_TITLES = {
  en: {
    paidTime: "Paid time export", more: "More", callout: "Can’t work this shift", openShifts: "Posted open shifts", swap: "Swap or offer a shift",
    timeOffPolicies: "Time off policies", editShift: "Edit shift", addShift: "Add shift", publish: "Build and publish", schedule: "Schedule",
    templates: "Week templates", rules: "Scheduling rules", coverage: "Coverage", copied: "Copied schedule", christmasBonus: "Christmas bonus hours",
    insights: "Insights",
  },
  es: {
    paidTime: approvedPage.es.paidTimeExport, more: "Más", callout: "No puedo trabajar este turno", openShifts: "Turnos disponibles publicados", swap: "Intercambiar u ofrecer un turno",
    timeOffPolicies: "Políticas de días libres", editShift: "Editar turno", addShift: "Añadir turno", publish: "Crear y publicar", schedule: "Horario",
    templates: "Plantillas de semana", rules: "Reglas del horario", coverage: "Cobertura", copied: "Horario copiado", christmasBonus: "Horas para el bono de Navidad",
    insights: "Informes",
  },
} as const;

export type RouteTitle = keyof typeof ROUTE_TITLES.en;

/** A page's generateMetadata: its title in the person's language. */
export const routeTitle = (key: RouteTitle) => async () => ({ title: ROUTE_TITLES[await readPageLang()][key] });
