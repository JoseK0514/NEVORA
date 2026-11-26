import type { AuthLang } from "@/lib/auth-copy";
import { ACCOUNT_DELETION, SUPPORT_EMAIL, type PolicySection } from "@/lib/legal/policies";

/* Account deletion in English and Spanish (inspection Nov 14, 2026, PB-001). The page follows the sign-in language.
 * English is the approved policy text from src/lib/legal/policies.ts, unchanged. The Spanish below is its translation,
 * for Jose's review: it says the same things, with the same periods, and names the app's own screens as the app shows
 * them (the app itself is in English for now). */
const mail = { href: `mailto:${SUPPORT_EMAIL}`, text: SUPPORT_EMAIL };

type DeletionCopy = { metaTitle: string; back: string; start: string; title: string; /** Under the title (Phase 5, PB-024). */ sub: string; summary: string; sections: PolicySection[] };

const en: DeletionCopy = {
  metaTitle: "Account deletion · NEVORA", back: "Sign in", start: "Start deletion request",
  title: ACCOUNT_DELETION.title, sub: "How to delete your account and what happens to your records.", summary: ACCOUNT_DELETION.summary, sections: ACCOUNT_DELETION.sections,
};

const es: DeletionCopy = {
  metaTitle: "Eliminar cuenta · NEVORA", back: "Iniciar sesión", start: "Iniciar solicitud de eliminación",
  title: "Elimina tu cuenta de NEVORA", sub: "Cómo eliminar tu cuenta y qué pasa con tus registros.",
  summary: "Puedes pedirnos que eliminemos tu cuenta de NEVORA y la información vinculada a ella, en la aplicación o en la web.",
  sections: [
    { heading: "En la aplicación o en la web", blocks: [
      { p: ["Abre Profile (tu perfil), elige ", { strong: "Delete my account" }, " (Eliminar mi cuenta), lee lo que pasa, vuelve a escribir tu contraseña y confirma. Si desinstalaste la aplicación, ", { href: "/login", text: "inicia sesión en NEVORA en la web" }, " y haz lo mismo; la página se abre después de iniciar sesión."] },
      { p: ["Si no puedes iniciar sesión, usa primero ", { href: "/forgot-access", text: "¿Olvidaste tu contraseña?" }, ", o escribe a ", mail, " y te ayudaremos a confirmar que eres tú."] },
    ] },
    { heading: "Qué pasa después", blocks: [{ p: ["Cuando confirmas, guardamos tu solicitud y te mostramos una referencia, como DEL-7KQ2M9XA. Se cierra tu sesión en todos los dispositivos y ya no puedes volver a iniciar sesión. Nuestra meta es eliminar tu cuenta dentro de los 30 días calendario siguientes a la fecha en que recibimos la solicitud, y te avisamos por correo cuando esté listo si tenemos tu dirección de correo. Para preguntar por tu solicitud, escribe a ", mail, " e incluye tu referencia."] }] },
    { heading: "Qué se elimina", blocks: [{ p: ["Tu cuenta y la información vinculada a ella que se puede eliminar: tu perfil, tus datos de inicio de sesión, tus sesiones, tus suscripciones a notificaciones, los enlaces a tu calendario y el contenido que aportaste. Las copias en manos de nuestros proveedores siguen sujetas a las obligaciones y los plazos de retención aplicables. Esto no promete el borrado inmediato de todas las copias de proveedores, de respaldo o de buzones de correo."] }] },
    { heading: "Qué se puede conservar", blocks: [{ p: ["Es posible que algunos registros de asistencia, nómina, seguridad o disputas deban conservarse por una obligación registrada. Conservamos la asistencia, los registros de horas aprobados, los cálculos de nómina, los comprobantes de pago publicados y sus correcciones y aprobaciones durante tres años desde la última anotación del registro, y los registros que respaldan los impuestos sobre la nómina durante al menos cuatro años después de la fecha en que el impuesto vence o se paga, lo que ocurra más tarde; los registros de seguridad y de acceso hasta 90 días; los registros de solicitudes de privacidad durante 24 meses después de cerrada la solicitud; y los registros sujetos a una retención legal o a una disputa sin resolver hasta que se levante la retención y haya pasado el plazo aplicable. Se aplica el plazo más largo que corresponda, y una solicitud de eliminación no lo reinicia. Copias de respaldo: la base de datos de NEVORA tiene un historial de restauración de siete días. La información cambiada o eliminada puede permanecer en ese historial hasta que venza. Las copias de recuperación separadas, como las que se toman antes de una actualización, se limitan a su propósito, nunca se usan para restaurar una cuenta eliminada y se eliminan cuando ya no hacen falta para ese propósito. Este plazo no determina la retención de los registros de los proveedores ni de las copias en buzones de correo. Los registros conservados están restringidos y nunca se usan para restaurar tu cuenta."] }] },
    { heading: "Tu empleo y tu lugar de trabajo", blocks: [{ p: ["Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar. Si eres el dueño, tu empresa sigue abierta en NEVORA para el resto de tu equipo; cerrarla es un trámite aparte, así que escribe a ", mail, " para coordinarlo."] }] },
  ],
};

export const DELETION_COPY: Record<AuthLang, DeletionCopy> = { en, es };
