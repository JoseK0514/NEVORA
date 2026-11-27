import type { updateLocationAction } from "@/app/app/settings/actions";

export const recoveryRoutes = {
  SCHEDULE: "/app/schedule",
  OPEN_SHIFT_POSTINGS: "/app/exchange/open-shifts",
  OPEN_TIME: "/app/timecards",
  TIME_CORRECTIONS: "/app/timecards/corrections",
  SHIFT_REQUESTS: "/app/inbox#todo-requests",
} as const;

/** The retirement candidate extends the catalog action with optional blocker codes. Older action results use the same form. */
export type LocationSaveResult = Awaited<ReturnType<typeof updateLocationAction>> & {
  locationRetirementBlockers?: (keyof typeof recoveryRoutes)[];
};

const en = {
  confirm: (name: string) => `Deactivate ${name}?`,
  consequence: "The Clocker link will stop working here. Past schedules and time records will stay available.",
  keep: "Keep active", keepRestaurant: "Keep active", deactivate: "Deactivate",
  blocked: (name: string) => `${name} can’t be deactivated yet`,
  resolve: "Review the work below before deactivating. Each link opens in a new tab so you can return to your edits.",
  blockers: {
    SCHEDULE: "Reassign or cancel shifts, then publish changes",
    OPEN_SHIFT_POSTINGS: "Review posted open shifts",
    OPEN_TIME: "Review open time in Timecards",
    TIME_CORRECTIONS: "Review pending time corrections",
    SHIFT_REQUESTS: "Review pending shift requests",
  },
  inactive: (name: string) => `${name} is inactive`,
  history: "The Clocker link is unavailable. Past schedules and time records are kept.",
  check: "Check again", checking: "Checking saved details…",
  unknown: "Saved details unavailable", checkFirst: "Your entries are kept. Check the saved details before trying again.",
  checked: "Saved details checked", review: "Review the current details below and your edits before saving again.",
  matches: "The saved details match your entries.",
  current: "Current details", active: "Active", inactiveStatus: "Inactive",
};
const es: typeof en = {
  confirm: name => `¿Desactivar ${name}?`,
  consequence: "El enlace de Clocker dejará de funcionar aquí. Los horarios y registros de tiempo anteriores seguirán disponibles.",
  keep: "Mantener activa", keepRestaurant: "Mantener activo", deactivate: "Desactivar",
  blocked: name => `No se puede desactivar ${name} todavía`,
  resolve: "Revisa los pendientes antes de desactivar. Cada enlace abre en otra pestaña para que puedas volver a tus cambios.",
  blockers: {
    SCHEDULE: "Reasignar o cancelar turnos y publicar los cambios",
    OPEN_SHIFT_POSTINGS: "Revisar turnos disponibles publicados",
    OPEN_TIME: "Revisar ponches abiertos en las tarjetas de tiempo",
    TIME_CORRECTIONS: "Revisar correcciones de tiempo pendientes",
    SHIFT_REQUESTS: "Revisar solicitudes de turnos pendientes",
  },
  inactive: name => `Se desactivó ${name}`,
  history: "El enlace de Clocker no está disponible. Los horarios y registros de tiempo anteriores se conservan.",
  check: "Volver a verificar", checking: "Verificando los datos guardados…",
  unknown: "Datos guardados no disponibles", checkFirst: "Tus cambios se conservan. Verifica los datos guardados antes de volver a intentarlo.",
  checked: "Datos guardados verificados", review: "Revisa los datos actuales y tus cambios antes de volver a guardar.",
  matches: "Los datos guardados coinciden con tus cambios.",
  current: "Datos actuales", active: "Activa", inactiveStatus: "Inactiva",
};
export const LOCATION_RETIREMENT_COPY = { en, es };
