import type { WorkforcePermission } from "@/lib/workforce/permissions";

/* SCRUM-215 (Nov 19, 2026): the words for a Manager's action grants (docs/handoffs/2026-11-18-scheduling-pto-claude.md),
 * shared by the Owner's grants panel, the Manager's own Profile and the escalation notes. English and Spanish for Puerto
 * Rico ("tú"). An action is granted per location; the Owner always has every action everywhere. */
export type PermissionLang = "en" | "es";

const list = (items: string[], and: string) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items.at(-1)}`;

const en = {
  and: "and",
  actions: {
    PUBLISH_SCHEDULE: { name: "Publish schedules", line: "Publish this location’s week and its changes" },
    APPROVE_LEAVE: { name: "Approve time off", line: "Decide time-off requests from people here" },
    REVIEW_TIME_EXCEPTION: { name: "Review time exceptions", line: "Approve or decline corrections and missed punches" },
  } as Record<WorkforcePermission, { name: string; line: string }>,
  // Owner: the grants panel on a Manager's Access page.
  panelTitle: "What they can approve",
  panelIntro: (first: string) => `Each action is separate and applies only at the locations ${first} manages. Everything else at those locations, like building shifts and the team list, comes with Management access.`,
  noScope: (first: string) => `${first} doesn’t manage a location yet. Choose locations under Management access first.`,
  notManager: "Action grants apply to Managers. Make this person a Manager to grant them.",
  inactiveLocation: "Inactive location",
  switchLabel: (action: string, location: string) => `${action} at ${location}`,
  saving: "Saving…",
  saved: "Saved",
  unknown: "Not confirmed",
  checkAgain: "Check again",
  conflict: "Changed by someone else. Reload to see the latest.",
  reload: "Reload",
  failed: "Not saved. Try again.",
  denied: "Only Owners can change this.",
  loadFailedTitle: "Action grants didn’t load",
  loadFailedBody: "Check your connection, then try again.",
  tryAgain: "Try again",
  loading: "Loading action grants",
  // Manager: their own Profile.
  youTitle: "What you can approve",
  youNone: "Not granted",
  youAt: (locations: string[]) => list(locations, "and"),
  youEveryLocation: "Every location you manage",
  youEscalate: (owners: string) => `For anything else, ask ${owners}. An Owner can publish the whole week and decide requests at every location.`,
  youUnavailable: "What you can approve couldn’t load. Reload the page to try again.",
  anOwner: "an Owner",
  // Escalation notes where an action is refused.
  publishDenied: (owners: string) => `You can’t publish here. Publishing this location isn’t part of your access, so ask ${owners}, or publish the locations you can.`,
  // Queue review (Nov 23, 2026), each fact once: the band and title already say time off.
  leaveDenied: (owners: string) => `${owners} decides requests at your locations.`,
  leaveDeniedTitle: "Time off is decided by an Owner",
  exceptionDenied: (owners: string) => `Reviewing time exceptions isn’t part of your access, or this one is your own. Ask ${owners} to review it.`,
};
export type PermissionCopy = typeof en;

const es: PermissionCopy = {
  and: "y",
  actions: {
    PUBLISH_SCHEDULE: { name: "Publicar horarios", line: "Publicar la semana de esta ubicación y sus cambios" },
    APPROVE_LEAVE: { name: "Aprobar tiempo libre", line: "Decidir las solicitudes de tiempo libre del personal de aquí" },
    REVIEW_TIME_EXCEPTION: { name: "Revisar excepciones de tiempo", line: "Aprobar o rechazar correcciones y ponches omitidos" },
  },
  panelTitle: "Lo que puede aprobar",
  panelIntro: first => `Cada acción es independiente y aplica solo en las ubicaciones que ${first} gestiona. Lo demás en esas ubicaciones, como crear turnos y la lista del equipo, viene con el acceso de gerencia.`,
  noScope: first => `${first} todavía no gestiona ninguna ubicación. Elige ubicaciones en Acceso de gerencia primero.`,
  notManager: "Los permisos de acción aplican a los gerentes. Haz gerente a esta persona para otorgarlos.",
  inactiveLocation: "Ubicación inactiva",
  switchLabel: (action, location) => `${action} en ${location}`,
  saving: "Guardando…",
  saved: "Guardado",
  unknown: "Sin confirmar",
  checkAgain: "Verificar de nuevo",
  conflict: "Otra persona lo cambió. Recarga para ver lo más reciente.",
  reload: "Recargar",
  failed: "No se guardó. Inténtalo de nuevo.",
  denied: "Solo los dueños pueden cambiar esto.",
  loadFailedTitle: "No se cargaron los permisos de acción",
  loadFailedBody: "Revisa tu conexión y vuelve a intentarlo.",
  tryAgain: "Intentar de nuevo",
  loading: "Cargando permisos de acción",
  youTitle: "Lo que puedes aprobar",
  youNone: "Sin permiso",
  youAt: locations => list(locations, "y"),
  youEveryLocation: "Todas las ubicaciones que gestionas",
  youEscalate: owners => `Para todo lo demás, pregúntale a ${owners}. Un dueño puede publicar la semana completa y decidir solicitudes en todas las ubicaciones.`,
  youUnavailable: "No se pudo cargar lo que puedes aprobar. Recarga la página para intentarlo de nuevo.",
  anOwner: "un dueño",
  publishDenied: owners => `No puedes publicar aquí. Publicar esta ubicación no es parte de tu acceso; pregúntale a ${owners} o publica las ubicaciones que sí puedes.`,
  leaveDenied: owners => `${owners} decide las solicitudes en tus ubicaciones.`,
  leaveDeniedTitle: "Un dueño decide el tiempo libre",
  exceptionDenied: owners => `Revisar excepciones de tiempo no es parte de tu acceso, o esta es tuya. Pídele a ${owners} que la revise.`,
};

export const permissionCopy = (lang: PermissionLang): PermissionCopy => lang === "es" ? es : en;
export const PERMISSION_ORDER: WorkforcePermission[] = ["PUBLISH_SCHEDULE", "APPROVE_LEAVE", "REVIEW_TIME_EXCEPTION"];
