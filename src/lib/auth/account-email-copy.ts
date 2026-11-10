/** Account emails in English, then Spanish. The recipient's language isn't stored when an Owner invites them or when
 * someone asks for a reset, so every message carries both, English first, with the link in each half. Plain text only;
 * links stay in the URL fragment exactly as before. */
export type AccountEmail = { subject: string; text: string };

const both = (subject: [string, string], en: string, es: string): AccountEmail => ({ subject: `${subject[0]} / ${subject[1]}`, text: `${en}\n\n—\n\n${es}` });

export function invitationEmail(link: string): AccountEmail {
  return both(["Activate your NEVORA account", "Activa tu cuenta de NEVORA"],
    `Your Owner invited you to activate your NEVORA account. This single-use link expires in 7 days.\n\n${link}\n\nChoose your password, then sign in normally. If you did not expect this invitation, contact your Owner.`,
    `El dueño de tu empresa te invitó a activar tu cuenta de NEVORA. Este enlace es de un solo uso y vence en 7 días.\n\n${link}\n\nElige tu contraseña y luego inicia sesión como siempre. Si no esperabas esta invitación, comunícate con el dueño de tu empresa.`);
}

export function recoveryEmail(link: string): AccountEmail {
  return both(["Reset your NEVORA password", "Restablece tu contraseña de NEVORA"],
    `A password reset was requested for your NEVORA account. This single-use link expires in 15 minutes.\n\n${link}\n\nIf you did not request this, keep your existing password and contact your manager.\n\nCan’t use this email? Ask your manager for help. Manager and Owner accounts need another Owner.`,
    `Se pidió restablecer la contraseña de tu cuenta de NEVORA. Este enlace es de un solo uso y vence en 15 minutos.\n\n${link}\n\nSi no lo pediste, conserva tu contraseña actual y comunícate con tu gerente.\n\n¿No puedes usar este correo? Pide ayuda a tu gerente. Las cuentas de gerente y de dueño necesitan a otro dueño.`);
}

/** Sent after any password reset, including one a Manager or Owner started for the person. */
export function passwordChangedEmail(origin: string): AccountEmail {
  return both(["Your NEVORA password was changed", "Se cambió tu contraseña de NEVORA"],
    `The password for your NEVORA account was just changed, and every device was signed out.\n\nIf you did this, there's nothing else to do. If you didn't, contact your Owner right away and sign in at ${origin}/login to check your account.`,
    `Se acaba de cambiar la contraseña de tu cuenta de NEVORA y se cerró la sesión en todos los dispositivos.\n\nSi fuiste tú, no tienes que hacer nada más. Si no fuiste tú, comunícate de inmediato con el dueño de tu empresa e inicia sesión en ${origin}/login para revisar tu cuenta.`);
}
