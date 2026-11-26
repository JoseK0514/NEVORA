import type { OwnerActivityChange } from "@/lib/activity/owner-feed";

export const activityCopy = {
  en: {
    title: "Activity log", events: "Recorded changes", checking: "Loading activity…", slow: "Still loading activity…",
    empty: "No recorded changes yet", emptyBody: "Schedule, access and wage changes will appear here.",
    unavailable: "Activity didn’t load", retry: "Try again", retryBody: "Check your connection and try again.", expired: "Your session ended", signIn: "Sign in",
    denied: "Owner access required", deniedBody: "Ask a current owner if you need access to the activity log.",
    offline: "Activity is offline", offlineBody: "Reconnect to check the activity log.",
    older: "Older changes", newer: "Newer changes", unknown: "Name unavailable", company: "Company-wide",
    actor: (name: string) => `Changed by ${name}`, week: (date: string) => `Week of ${date}`,
    locations: (n: number) => n === 1 ? "1 location" : `${n} locations`,
    kinds: {
      SCHEDULE_PUBLISHED: "Schedule published", SCHEDULE_EDITED: "Published schedule edited",
      SCHEDULE_EXCHANGE: "Schedule changed after a shift exchange", SCHEDULE_CALLOUT: "Schedule changed after a callout",
      MANAGER_SCOPE_ASSIGNED: "Manager access assigned", MANAGER_SCOPE_REVOKED: "Manager access removed",
      EMPLOYEE_ACTIVATED: "Employee activated", EMPLOYEE_DEACTIVATED: "Employee deactivated", WAGE_CHANGED: "Wage changed",
    } satisfies Record<OwnerActivityChange["kind"], string>,
  },
  es: {
    title: "Registro de actividad", events: "Cambios registrados", checking: "Cargando actividad…", slow: "La actividad sigue cargando…",
    empty: "Aún no hay cambios registrados", emptyBody: "Aquí verás los cambios de horario, acceso y salario.",
    unavailable: "No pudimos cargar la actividad", retry: "Intentar de nuevo", retryBody: "Verifica tu conexión e inténtalo de nuevo.", expired: "Tu sesión terminó", signIn: "Iniciar sesión",
    denied: "Se requiere acceso de dueño", deniedBody: "Si necesitas ver el registro de actividad, pídele acceso a un dueño.",
    offline: "Actividad sin conexión", offlineBody: "Conéctate para consultar el registro de actividad.",
    older: "Ver cambios anteriores", newer: "Ver cambios más recientes", unknown: "Nombre no disponible", company: "Toda la empresa",
    actor: (name: string) => `Cambio realizado por ${name}`, week: (date: string) => `Semana del ${date}`,
    locations: (n: number) => n === 1 ? "1 localidad" : `${n} localidades`,
    kinds: {
      SCHEDULE_PUBLISHED: "Horario publicado", SCHEDULE_EDITED: "Horario publicado editado",
      SCHEDULE_EXCHANGE: "Cambio de horario por intercambio de turno", SCHEDULE_CALLOUT: "Cambio de horario por ausencia",
      MANAGER_SCOPE_ASSIGNED: "Acceso de gerente asignado", MANAGER_SCOPE_REVOKED: "Acceso de gerente retirado",
      EMPLOYEE_ACTIVATED: "Empleado activado", EMPLOYEE_DEACTIVATED: "Empleado desactivado", WAGE_CHANGED: "Cambio de salario",
    } satisfies Record<OwnerActivityChange["kind"], string>,
  },
} as const;
