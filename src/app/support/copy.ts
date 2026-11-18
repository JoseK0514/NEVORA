import type { AuthLang } from "@/lib/auth-copy";
import { SUPPORT_EMAIL, type Block } from "@/lib/legal/policies";

/* Support in English and Spanish (inspection Nov 14, 2026, PB-001). The page follows the sign-in language. English keeps
 * the approved policy text from src/lib/legal/policies.ts word for word; the Spanish below is its translation, for
 * Jose's review. Screen names inside the app stay as the app shows them. */
const en = {
  metaTitle: "Support · NEVORA", title: "Support", back: "Sign in", contact: "Contact", emailSupport: "Email support",
  safety: "Never email passwords, codes, bank details or pay documents.",
  common: "Common questions", cantSignIn: "I can’t sign in", work: "Shift, time off or pay",
  report: "Report a problem", mail: "Mailing address",
};
export type SupportCopy = typeof en;
const es: SupportCopy = {
  metaTitle: "Ayuda · NEVORA", title: "Ayuda", back: "Iniciar sesión", contact: "Contacto", emailSupport: "Escríbenos por correo",
  safety: "Nunca envíes por correo contraseñas, códigos, datos bancarios ni documentos de pago.",
  common: "Preguntas frecuentes", cantSignIn: "No puedo iniciar sesión", work: "Turnos, días libres o pago",
  report: "Reportar un problema", mail: "Correo postal",
};
export const SUPPORT_COPY: Record<AuthLang, SupportCopy> = { en, es };

const mail = { href: `mailto:${SUPPORT_EMAIL}`, text: SUPPORT_EMAIL };

/** The Support document's text in Spanish: the summary, the response commitment and the three answers. */
export const SUPPORT_ES: { summary: string; promise: string; signIn: Block[]; work: Block[]; report: Block[] } = {
  summary: "Recibe ayuda con NEVORA, un producto de VELANI LLC para programar turnos y operar equipos de trabajo.",
  promise: "Nuestra meta es responder las consultas de ayuda y de privacidad en un plazo de dos días laborables. Los días laborables son de lunes a viernes, sin contar los días feriados que se observan en Puerto Rico. Las solicitudes que requieren investigación pueden tardar más en resolverse.",
  signIn: [{ p: ["Usa ", { href: "/forgot-access", text: "¿Olvidaste tu contraseña?" }, " en la página de inicio de sesión. Si ya no tienes el correo registrado en tu cuenta, pide ayuda a tu gerente o al dueño: pueden verificar tu identidad y darte un código de recuperación. Nunca te pediremos tu contraseña ni un código de verificación por correo."] }],
  work: [{ p: ["Pregunta a tu gerente o al administrador de tu lugar de trabajo sobre turnos, decisiones sobre días libres, pago o correcciones a tus registros de trabajo. Escribe al equipo de ayuda de NEVORA si un problema en la aplicación te impide comunicarte con ellos."] }],
  report: [
    { p: ["Incluye la versión de la aplicación, tu dispositivo y la versión de su sistema operativo, y lo que pasó. Añade el nombre de tu lugar de trabajo si lo necesitamos para encontrar el problema. Quita la información personal de las capturas de pantalla. ", { strong: "Nunca envíes por correo tu contraseña, un código de verificación, datos bancarios ni documentos de nómina." }] },
    { p: ["Escribe a ", mail, " con una descripción breve del contenido y dónde aparece, sin información personal innecesaria."] },
  ],
};
