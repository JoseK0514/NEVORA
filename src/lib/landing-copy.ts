/* The public landing page's words, English and Spanish (the Spanish is a draft for Jose's review, like the
 * sign-in copy in auth-copy.ts). Every claim is limited to what the app does today: scheduling, time at the
 * location's Clocker, pay preparation and exports. NEVORA moves no money, and the copy says so. */

import type { AuthLang } from "./auth-copy";

export type LandingCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  signIn: string;
  contact: string;
  contactHint: string;
  features: { title: string; body: string }[];
  trustTitle: string;
  trust: string[];
  existing: string;
};

const en: LandingCopy = {
  eyebrow: "NEVORA Workforce",
  title: "Your team's week, in one place.",
  subtitle: "Scheduling, time and pay preparation for small teams in Puerto Rico — in English and Spanish.",
  signIn: "Sign in",
  contact: "Talk to us",
  contactHint: "We reply by email.",
  features: [
    { title: "Plan the week", body: "Publish schedules by location. Coverage gaps, time off and shift requests arrive in one Inbox, so nothing waits in a side channel." },
    { title: "Time you can check", body: "People punch at their location's Clocker, and every punch gets a receipt. Timecards show each day's clock-ins, and corrections keep the original times." },
    { title: "Pay, prepared", body: "Review hours against the schedule, close the period, and export finalized time for your payroll provider. NEVORA prepares pay — it never moves money." },
  ],
  trustTitle: "Built to be checked",
  trust: [
    "Every number says how fresh it is — and a failed read says \"unavailable\", never zero.",
    "Nothing shows as done before the server confirms it.",
    "Puerto Rico time, written as Puerto Rico time.",
  ],
  existing: "Already use NEVORA at work? Sign in with your Employee ID.",
};

const es: LandingCopy = {
  eyebrow: "NEVORA Workforce",
  title: "La semana de tu equipo, en un solo lugar.",
  subtitle: "Horarios, tiempo y preparación de pago para equipos pequeños en Puerto Rico — en inglés y en español.",
  signIn: "Iniciar sesión",
  contact: "Escríbenos",
  contactHint: "Respondemos por correo electrónico.",
  features: [
    { title: "Planifica la semana", body: "Publica horarios por local. Los turnos sin cubrir, el tiempo libre y los cambios de turno llegan a un solo buzón, sin canales aparte." },
    { title: "Tiempo que puedes verificar", body: "Cada persona marca en el Clocker de su local, y cada marca recibe un recibo. Las tarjetas de tiempo muestran las entradas de cada día, y las correcciones conservan las horas originales." },
    { title: "El pago, preparado", body: "Revisa las horas contra el horario, cierra el período y exporta el tiempo finalizado para tu proveedor de nómina. NEVORA prepara el pago — nunca mueve dinero." },
  ],
  trustTitle: "Hecho para verificarse",
  trust: [
    "Cada número dice qué tan reciente es — y una lectura fallida dice «no disponible», nunca cero.",
    "Nada aparece como hecho antes de que el servidor lo confirme.",
    "Hora de Puerto Rico, escrita como hora de Puerto Rico.",
  ],
  existing: "¿Ya usas NEVORA en tu trabajo? Inicia sesión con tu ID de empleado.",
};

export const LANDING_COPY: Record<AuthLang, LandingCopy> = { en, es };

/** The landing shows in development and previews. In production it stays off (the old redirect to /app) until
 * Jose turns it on with NEVORA_LANDING=on — the same shape as policiesVisible in lib/legal/policies.ts. */
export function landingVisible(env: Record<string, string | undefined> = process.env): boolean {
  if (env.NEVORA_LANDING === "on") return true;
  if (env.NEVORA_LANDING === "off") return false;
  return env.NODE_ENV !== "production";
}
