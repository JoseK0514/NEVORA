/* Sign-in and recovery words (E4 redesign, docs/product/specs/auth-premium/SPEC.md). English is today's wording; the
 * Spanish is the spec's draft for Jose's review. Only the signed-out pages switch (sign-in, recovery, activation, the 404
 * and, since the Nov 14, 2026 inspection, the public error screen; Support and Account deletion keep their words beside
 * their pages); the rest of the app stays English. */

export type AuthLang = "en" | "es";
export const AUTH_LANG_COOKIE = "nv-lang";

export const isAuthLang = (value: unknown): value is AuthLang => value === "en" || value === "es";

/** First visit, no saved choice (inspection Nov 14, PB-020): the language the browser prefers, from an Accept-Language
 * header or the browser's own list joined with commas. Spanish only when it ranks ahead of English; English otherwise. */
export function preferredAuthLang(accepted: string | null | undefined): AuthLang {
  if (!accepted) return "en";
  const ranked = accepted.split(",").map((part, index) => {
    const [tag, ...params] = part.trim().toLowerCase().split(";");
    const weight = params.map(param => param.trim()).find(param => param.startsWith("q="));
    const q = weight ? Number(weight.slice(2)) : 1;
    return { lang: tag.split("-")[0], q: Number.isFinite(q) ? q : 0, index };
  }).filter(item => item.q > 0 && isAuthLang(item.lang)).sort((a, b) => b.q - a.q || a.index - b.index);
  return ranked[0]?.lang === "es" ? "es" : "en";
}

const en = {
  langLabel: "Language",
  english: "English",
  spanish: "Español",
  /** `eveningFrom` is the hour the evening greeting starts: 5 PM in English, 7 PM in Spanish (Puerto Rico usage, PB-019). */
  /** `first` greets someone arriving straight from activation (Phase 5, PB-036): it is their first sign-in, so not "back". */
  greeting: { welcome: "Welcome back", first: "Welcome", morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", eveningFrom: 17 },
  signInSubtitle: "Sign in to see your schedule, time and pay statements.",
  bandLine: "Your week, in one place.",
  panelEyebrow: "NEVORA Workforce",
  panelSupport: "Shifts, hours, time off and pay statements, ready the moment you sign in.",
  /** The front door's three proof rows (Phase 5, PB-010 and PB-011): the brand panel's foot on a desktop, under the
   * links on phones and tablets. Each says only what the Privacy Policy and the Support page already say. */
  proof: { label: "About NEVORA", security: "Encrypted sign-in. Your employer controls your records.",
    languages: "Sign-in and account help in English and Spanish.",
    helpBefore: "Help at ", helpAfter: ". We aim to reply within two business days." },
  /** The decorative device screen (aria-hidden, fictional). */
  device: { date: "Tuesday, October 20", greeting: "Good morning, Alex", nextShift: "Next shift", inMinutes: "In 22 min", time: "8:00 AM – 4:00 PM",
    place: "Front desk · Main Office", clockIn: "Clock in", thisWeek: "This week", scheduled: "Scheduled", worked: "Worked", nextPayday: "Scheduled payday",
    payday: "Fri, Oct 23", timeOff: "Time off · Oct 26", approvedBy: "Approved by Morgan", approved: "Approved", tabs: ["Home", "Schedule", "Requests", "Pay"] },
  workspaceUnavailable: "Workspace unavailable",
  employeeId: "Employee ID",
  /** Under the Employee ID field on Sign in, at every width (Phase 5, PB-012). */
  employeeIdHelp: "The ID you got when you set up your account. Ask your manager if you don’t have it.",
  employeeIdPlaceholder: "Enter your employee ID",
  password: "Password",
  passwordPlaceholder: "Enter your password",
  showPassword: "Show password",
  hidePassword: "Hide password",
  showPasswords: "Show passwords",
  hidePasswords: "Hide passwords",
  forgotAccess: "Forgot password?",
  /** The second link under the sign-in card (Phase 5, PB-012): who it is for, then what it does. */
  setUpAccount: "New here? Set up your account",
  signIn: "Sign in",
  accountHelp: "Account help",
  signingIn: "Signing in…",
  newEmployee: "New employee?",
  passkeyDesktop: "Sign in with a passkey",
  passkeyPhone: "Sign in with Face ID",
  passkeyBusyPhone: "Waiting for Face ID…",
  passkeyBusyDesktop: "Waiting for your passkey…",
  passkeyNotFoundPhone: "Face ID isn’t set up for NEVORA on this device. Sign in with your password, then set it up in Profile.",
  passkeyNotFoundDesktop: "No passkey for NEVORA is saved on this device. Sign in with your password, then add one in Profile.",
  passkeyRateLimited: "Too many attempts. Wait a minute, then try again.",
  passkeyAccountDisabled: "This account can’t sign in. Contact your manager or Owner.",
  passkeyUnavailablePhone: "Face ID sign-in isn’t available right now. Sign in with your password.",
  passkeyUnavailableDesktop: "Passkey sign-in isn’t available right now. Sign in with your password.",
  or: "or",
  orUseId: "or use your ID",
  passkeyHintPhone: "The quickest way on this phone",
  passkeyHintDesktop: "Use this computer’s passkey",
  loginError: "Employee ID or password is incorrect.",
  loginBusy: "Too many attempts. For your safety, sign-in is paused for 15 minutes. If you forgot your password, you can reset it now.",
  loginReplace: "We couldn’t start setting your new password. Try again in a minute.",
  loginDeleting: "This account is being deleted, so it can’t be used to sign in. Email support@thevelani.com with your deletion reference if you have questions.",
  /** After "Continue to sign in" on the setup finish (?activated=1): one step, one name ("set up", Phase 8). */
  activated: "Your account is set up. Sign in to continue.",
  /** A session that ended (Phase 5, PB-005). The second sentence promises the way back only when there is one. */
  sessionEnded: "You were signed out to keep your account safe. Sign in to continue.",
  sessionEndedReturn: "You were signed out to keep your account safe. Sign in to pick up where you left off.",
  backToSignIn: "Back to sign in",
  signInPill: "Sign in",
  forgotTitle: "Reset your password",
  recoveryEmail: "Email",
  recoveryEmailHint: "The email your workplace has on file.",
  requestRecovery: "Email me a reset link",
  requestingRecovery: "Asking for your link…",
  requestingRecoveryStatus: "Asking for your reset link…",
  /** After a recovery request (inspection Nov 14, PB-004). Never says the ID or the email matched: the hedged sentence
   * from the request itself is shown with these. */
  checkEmail: { title: "Check your email", sub: "Look in your inbox and your spam folder.",
    expires: "The reset link works once and expires in 15 minutes.",
    nothing: "Nothing after a few minutes? Check your Employee ID and email, then try again.", review: "Check your details" },
  haveRecoveryCode: "I have a reset code",
  cantUseEmail: "Can’t use your email?",
  cantUseEmailBody: "Ask your manager or Owner to help you reset your password. They must check who you are before they give you a reset code.",
  requestNoScript: "Enable JavaScript to ask for a reset link, or ask your manager or Owner to help you reset your password.",
  resetTitle: "Choose a new password",
  resetDoneTitle: "Password updated",
  signInWithNewPassword: "Sign in",
  recoveryCode: "Reset code",
  recoveryCodeHint: "Paste the code from your email or from your manager.",
  newPassword: "New password",
  atLeast15: "At least 15 characters",
  confirmNewPassword: "Confirm new password",
  resetPassword: "Save new password",
  resettingPassword: "Saving new password…",
  resettingStatus: "Saving your new password…",
  checkPasswords: "Check your passwords",
  useNewCode: "Use a new reset code",
  checkSignInFirst: "Check your sign-in first",
  resetNotConfirmed: "Reset not confirmed",
  requestNewCode: "Get a new reset link",
  trySigningIn: "Try signing in",
  needRecoveryCode: "Need a reset link?",
  needRecoveryCodeBody: "Ask for a reset link with the email your workplace has on file. If you can’t use that email, ask your manager or Owner. They must check who you are before they give you a code.",
  /** Phase 5 (PB-013, PB-016, PB-017): the reset page says "reset" everywhere; a link that supplied the code shows one
   * green line instead of the field; the finish is one line. */
  reset: {
    linkAccepted: "Reset link accepted", useDifferentCode: "Use a different code",
    linkRefusedTitle: "This link can’t be used", linkRefused: "This link has expired or was already used. Reset links last 15 minutes.",
    doneLine: "For your safety, we signed you out on every device.", lengthMet: "The password is long enough",
  },
  resetNoScript: "Enable JavaScript to reset your password, or contact your manager or Owner for help.",
  activateTitle: "Set up your account",
  phoneNumber: "Phone number",
  phoneHint: "Use the number your workplace has on file.",
  createPassword: "Create password",
  choosePassword: "Choose your password",
  confirmPassword: "Confirm password",
  reenterPassword: "Re-enter your password",
  activateAccount: "Set up account",
  activatingAccount: "Setting up your account…",
  needEmployeeDetails: "Need your employee details?",
  needEmployeeDetailsBody: "Your workplace sets up your employee record first. Ask your manager or Owner for your Employee ID and to confirm the phone number on file.",
  alreadyActivated: "Already set up? Sign in",
  activationNotFound: "We could not set up that account. Check the Employee ID and phone number, or the account may already be set up.",
  activationInvalid: "Enter your Employee ID and phone number, and choose a matching password of at least 15 characters.",
  privacy: "Privacy",
  terms: "Terms",
  support: "Support",
  // Quiet (v4, approved Oct 23): the sign-in pages' words from the approved mockups.
  quiet: {
    idPlaceholder: "e.g. 10482", passwordPlaceholder: "Password",
    forgotSub: "We’ll email you a reset link.",
    haveCode: "I have a code", cantUseEmail: "Can’t use your email?",
    resetTitle: "Choose a new password", confirmPassword: "Confirm password",
    noInvitation: "No invitation? Ask your Owner.",
    resetSub: "Use a phrase you don’t use anywhere else.", haveRecoveryCode: "I have a reset code",
  },
  /** Review B4 (Nov 10, 2026): the desktop activation words, so a Spanish page never shows English mid-flow. */
  activation: {
    activatedTitle: "Account set up", activatedSub: "Sign in with your Employee ID and the password you just created.",
    idForSignIn: "Employee ID for sign-in", copyId: "Copy Employee ID", copied: "Copied", idCopied: "Employee ID copied",
    continueSignIn: "Continue to sign in", opening: "Opening your invitation…",
    choose: "Choose a password to join {workspace}.", chooseNoWorkspace: "Choose a password to finish setting up your account.",
    saveId: "Save this ID. You sign in with it.",
    notConfirmed: "Setup could not be confirmed.", intro: "Open your email invitation, then choose a password.",
    invalid: "This link has expired or was already used.", invalidNext: "Ask your Owner or manager to send a new invitation.",
    unknown: "Ask your Owner to confirm your account status and Employee ID. If you know your ID, try signing in before requesting a new invitation. Your account may already be set up.",
    missing: "Open the invitation link from your email to set up your account.",
    unavailable: "Account setup isn’t available right now. Your invitation was not confirmed. Try again later.",
    noScript: "JavaScript is required to open your secure email invitation. Use an enabled browser or contact your Owner.",
    passwordsMatch: "Passwords match", sameAsNew: "Same as the new password", sameInBoth: "Enter the same password in both fields.", inviteHelp: "Get invitation help",
  },
  /** Review B4: the forms' own messages replace the browser's bubble (the server still checks everything).
   * U11 (Nov 17, 2026): no closing period, as the Phase 3 forms rule says for a field error. */
  invalid: {
    employeeId: "Enter your Employee ID", password: "Enter your password", email: "Enter your email",
    emailFormat: "Enter an email address like name@example.com", code: "Paste your reset code",
    codeShort: "Paste the complete reset code", newPassword: "Create a password of at least 15 characters",
    confirm: "Type the password again",
  },
  notFound: {
    title: "Page not found", eyebrow: "Error 404",
    body: "This link doesn’t go anywhere in NEVORA. Check the address, or sign in to find what you need.", cta: "Go to sign in",
    /** Review F2 (NV-316): the time clock hint, in the page's language. */
    hintTitle: "Is this a time clock tablet?",
    hintBody: "Your Owner sets this tablet up again in Settings → Clocker tablets.",
    clockerHintBody: "Tell a manager. Your Owner sets this tablet up again in Settings → Clocker tablets.",
    notClocker: "Not a time clock?",
  },
  /** The public error screen (inspection Nov 14, PB-025 and RA-15): a server fault and a lost connection read differently. */
  errorScreen: {
    title: "This page didn’t load", eyebrow: "Something went wrong",
    server: "Something went wrong on our side. Try again.", offline: "Nothing was changed. Check your connection, then try again.",
    reference: "Reference: {reference}", retry: "Try again", signIn: "Go to sign in",
  },
};

export type AuthCopy = typeof en;

const es: AuthCopy = {
  langLabel: "Idioma",
  english: "English",
  spanish: "Español",
  greeting: { welcome: "Hola de nuevo", first: "Te damos la bienvenida", morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches", eveningFrom: 19 },
  signInSubtitle: "Inicia sesión para ver tu horario, tus horas y tus comprobantes de pago.",
  bandLine: "Tu semana, en un solo lugar.",
  panelEyebrow: "NEVORA Workforce",
  panelSupport: "Turnos, horas, días libres y tus comprobantes de pago, listos al iniciar sesión.",
  proof: { label: "Sobre NEVORA", security: "Inicio de sesión cifrado. Tu empleador controla tus registros.",
    languages: "Inicio de sesión y ayuda con la cuenta en inglés y español.",
    helpBefore: "Ayuda en ", helpAfter: ". Nuestra meta es responder en dos días laborables." },
  device: { date: "Martes, 20 de octubre", greeting: "Buenos días, Alex", nextShift: "Próximo turno", inMinutes: "En 22 min", time: "8:00 AM – 4:00 PM",
    place: "Recepción · Oficina principal", clockIn: "Marcar entrada", thisWeek: "Esta semana", scheduled: "Programadas", worked: "Trabajadas", nextPayday: "Día de pago programado",
    payday: "vie, 23 oct", timeOff: "Días libres · 26 oct", approvedBy: "Aprobado por Morgan", approved: "Aprobado", tabs: ["Inicio", "Horario", "Solicitudes", "Pago"] },
  workspaceUnavailable: "No pudimos cargar tu lugar de trabajo",
  employeeId: "ID de empleado",
  employeeIdHelp: "El ID que recibiste al configurar tu cuenta. Si no lo tienes, pídeselo a tu gerente.",
  employeeIdPlaceholder: "Escribe tu ID de empleado",
  password: "Contraseña",
  passwordPlaceholder: "Escribe tu contraseña",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  showPasswords: "Mostrar contraseñas",
  hidePasswords: "Ocultar contraseñas",
  forgotAccess: "¿Olvidaste tu contraseña?",
  setUpAccount: "¿Primera vez? Configura tu cuenta",
  signIn: "Iniciar sesión",
  accountHelp: "Ayuda con la cuenta",
  signingIn: "Iniciando sesión…",
  newEmployee: "¿Primera vez aquí?",
  passkeyDesktop: "Usar llave de acceso",
  passkeyPhone: "Iniciar sesión con Face ID",
  passkeyBusyPhone: "Esperando Face ID…",
  passkeyBusyDesktop: "Esperando tu llave de acceso…",
  passkeyNotFoundPhone: "Face ID no está configurado para NEVORA en este dispositivo. Inicia sesión con tu contraseña y luego configúralo en tu perfil.",
  passkeyNotFoundDesktop: "No hay una llave de acceso de NEVORA guardada en este dispositivo. Inicia sesión con tu contraseña y luego agrega una en tu perfil.",
  passkeyRateLimited: "Demasiados intentos. Espera un minuto e inténtalo de nuevo.",
  passkeyAccountDisabled: "Esta cuenta no puede iniciar sesión. Comunícate con tu gerente o con el dueño.",
  passkeyUnavailablePhone: "El inicio de sesión con Face ID no está disponible ahora. Inicia sesión con tu contraseña.",
  passkeyUnavailableDesktop: "El inicio de sesión con llave de acceso no está disponible ahora. Inicia sesión con tu contraseña.",
  or: "o",
  orUseId: "o usa tu ID",
  passkeyHintPhone: "La forma más rápida en este teléfono",
  passkeyHintDesktop: "Usa la llave de acceso de esta computadora",
  loginError: "El ID de empleado o la contraseña no son correctos.",
  loginBusy: "Demasiados intentos. Por seguridad, pausamos el inicio de sesión durante 15 minutos. Si olvidaste tu contraseña, puedes restablecerla ahora.",
  loginReplace: "No pudimos empezar a crear tu nueva contraseña. Inténtalo de nuevo en un minuto.",
  loginDeleting: "Esta cuenta se está eliminando, así que no se puede usar para iniciar sesión. Si tienes preguntas, escribe a support@thevelani.com con tu referencia de eliminación.",
  activated: "Tu cuenta está configurada. Inicia sesión para continuar.",
  sessionEnded: "Cerramos tu sesión para proteger tu cuenta. Inicia sesión para continuar.",
  sessionEndedReturn: "Cerramos tu sesión para proteger tu cuenta. Inicia sesión para continuar donde estabas.",
  backToSignIn: "Volver a iniciar sesión",
  signInPill: "Iniciar sesión",
  forgotTitle: "Restablece tu contraseña",
  recoveryEmail: "Correo",
  recoveryEmailHint: "El correo que tiene tu lugar de trabajo.",
  requestRecovery: "Enviarme el enlace",
  requestingRecovery: "Pidiendo tu enlace…",
  requestingRecoveryStatus: "Pidiendo tu enlace para restablecerla…",
  checkEmail: { title: "Revisa tu correo", sub: "Busca en tu bandeja de entrada y en el correo no deseado.",
    expires: "El enlace funciona una sola vez y vence en 15 minutos.",
    nothing: "¿No llega nada en unos minutos? Revisa tu ID de empleado y tu correo, e inténtalo de nuevo.", review: "Revisar tus datos" },
  haveRecoveryCode: "Tengo un código",
  cantUseEmail: "¿No puedes usar tu correo?",
  cantUseEmailBody: "Pide a tu gerente o al dueño que te ayude a restablecer tu contraseña. Deben confirmar quién eres antes de darte un código.",
  requestNoScript: "Activa JavaScript para pedir un enlace, o pide a tu gerente o al dueño que te ayude a restablecer tu contraseña.",
  resetTitle: "Elige una contraseña nueva",
  resetDoneTitle: "Contraseña actualizada",
  signInWithNewPassword: "Iniciar sesión",
  recoveryCode: "Código de restablecimiento",
  recoveryCodeHint: "Pega el código de tu correo o el que te dio tu gerente.",
  newPassword: "Contraseña nueva",
  atLeast15: "Al menos 15 caracteres",
  confirmNewPassword: "Confirma la contraseña nueva",
  resetPassword: "Guardar contraseña nueva",
  resettingPassword: "Guardando contraseña nueva…",
  resettingStatus: "Guardando tu contraseña nueva…",
  checkPasswords: "Revisa tus contraseñas",
  useNewCode: "Usa un código nuevo",
  checkSignInFirst: "Primero intenta iniciar sesión",
  resetNotConfirmed: "No se confirmó el restablecimiento",
  requestNewCode: "Pedir un enlace nuevo",
  trySigningIn: "Intentar iniciar sesión",
  needRecoveryCode: "¿Necesitas un enlace?",
  needRecoveryCodeBody: "Pide un enlace con el correo que tiene tu lugar de trabajo. Si no puedes usar ese correo, pide ayuda a tu gerente o al dueño. Deben confirmar quién eres antes de darte un código.",
  reset: {
    linkAccepted: "Enlace aceptado", useDifferentCode: "Usar otro código",
    linkRefusedTitle: "Este enlace no se puede usar", linkRefused: "Este enlace venció o ya se usó. Los enlaces duran 15 minutos.",
    doneLine: "Por seguridad, cerramos tu sesión en todos los dispositivos.", lengthMet: "La contraseña ya tiene el largo necesario",
  },
  resetNoScript: "Activa JavaScript para restablecer tu contraseña, o pide ayuda a tu gerente o al dueño.",
  activateTitle: "Configura tu cuenta",
  phoneNumber: "Número de teléfono",
  phoneHint: "Usa el número que tiene tu lugar de trabajo.",
  createPassword: "Crea una contraseña",
  choosePassword: "Elige tu contraseña",
  confirmPassword: "Confirma la contraseña",
  reenterPassword: "Vuelve a escribirla",
  activateAccount: "Configurar cuenta",
  activatingAccount: "Configurando tu cuenta…",
  needEmployeeDetails: "¿Necesitas tus datos de empleado?",
  needEmployeeDetailsBody: "Tu lugar de trabajo crea primero tu registro de empleado. Pide a tu gerente o al dueño tu ID de empleado y que confirmen el número de teléfono que tienen.",
  alreadyActivated: "¿Ya configuraste tu cuenta? Inicia sesión",
  activationNotFound: "No pudimos configurar esa cuenta. Revisa el ID de empleado y el número de teléfono, o puede que la cuenta ya esté configurada.",
  activationInvalid: "Escribe tu ID de empleado y tu número de teléfono, y elige una contraseña de al menos 15 caracteres que coincida en los dos campos.",
  privacy: "Privacidad",
  terms: "Términos",
  support: "Ayuda",
  quiet: {
    idPlaceholder: "p. ej., 10482", passwordPlaceholder: "Contraseña",
    forgotSub: "Te enviaremos un enlace para restablecerla.",
    haveCode: "Tengo un código", cantUseEmail: "¿No puedes usar tu correo?",
    resetTitle: "Elige una contraseña nueva", confirmPassword: "Confirma la contraseña",
    noInvitation: "¿Sin invitación? Pídesela al dueño.",
    resetSub: "Usa una frase que no uses en ningún otro lugar.", haveRecoveryCode: "Tengo un código",
  },
  activation: {
    activatedTitle: "Cuenta configurada", activatedSub: "Inicia sesión con tu ID de empleado y la contraseña que acabas de crear.",
    idForSignIn: "ID de empleado para iniciar sesión", copyId: "Copiar ID de empleado", copied: "Copiado", idCopied: "ID de empleado copiado",
    continueSignIn: "Continuar al inicio de sesión", opening: "Abriendo tu invitación…",
    choose: "Elige una contraseña para unirte a {workspace}.", chooseNoWorkspace: "Elige una contraseña para terminar de configurar tu cuenta.",
    saveId: "Guarda este ID. Lo usas para iniciar sesión.",
    notConfirmed: "No pudimos confirmar la configuración.", intro: "Abre la invitación de tu correo y elige una contraseña.",
    invalid: "Este enlace venció o ya se usó.", invalidNext: "Pide al dueño o a tu gerente que te envíe una invitación nueva.",
    unknown: "Pide al dueño que confirme el estado de tu cuenta y tu ID de empleado. Si sabes tu ID, intenta iniciar sesión antes de pedir una invitación nueva. Puede que tu cuenta ya esté configurada.",
    missing: "Abre el enlace de invitación de tu correo para configurar tu cuenta.",
    unavailable: "La configuración de cuentas no está disponible por ahora. Tu invitación no se confirmó. Inténtalo más tarde.",
    noScript: "Necesitas JavaScript para abrir la invitación segura de tu correo. Usa un navegador que lo tenga activado o comunícate con el dueño.",
    passwordsMatch: "Las contraseñas coinciden", sameAsNew: "Igual a la contraseña nueva", sameInBoth: "Escribe la misma contraseña en ambos campos.", inviteHelp: "Ayuda con la invitación",
  },
  invalid: {
    employeeId: "Escribe tu ID de empleado", password: "Escribe tu contraseña", email: "Escribe tu correo",
    emailFormat: "Escribe un correo como nombre@ejemplo.com", code: "Pega tu código",
    codeShort: "Pega el código completo", newPassword: "Crea una contraseña de al menos 15 caracteres",
    confirm: "Vuelve a escribir la contraseña",
  },
  notFound: {
    title: "Página no encontrada", eyebrow: "Error 404",
    body: "Este enlace no lleva a ninguna parte de NEVORA. Revisa la dirección o inicia sesión para encontrar lo que necesitas.", cta: "Ir a iniciar sesión",
    hintTitle: "¿Es una tableta de reloj de asistencia?",
    hintBody: "El dueño vuelve a configurar esta tableta en Settings → Clocker tablets.",
    clockerHintBody: "Avísale a un gerente. El dueño vuelve a configurar esta tableta en Settings → Clocker tablets.",
    notClocker: "¿No es un reloj de asistencia?",
  },
  errorScreen: {
    title: "Esta página no cargó", eyebrow: "Algo salió mal",
    server: "Algo salió mal de nuestro lado. Inténtalo de nuevo.", offline: "No se cambió nada. Revisa tu conexión e inténtalo de nuevo.",
    reference: "Referencia: {reference}", retry: "Intentar de nuevo", signIn: "Ir a iniciar sesión",
  },
};

export const AUTH_COPY: Record<AuthLang, AuthCopy> = { en, es };

/** Messages that come from the request and reset flow (AccountRecovery and /api/auth/recovery). AccountRecovery names each
 * outcome with one of its own English sentences, and the screens decide their state on those exact sentences, so they
 * stay as they are in the code. What a person reads is looked up here, in both languages (Phase 5, PB-014: one word,
 * "reset"). Matched exactly; anything unknown is shown as it arrives. The first sentence comes from the server and
 * keeps its hedge: it never says the ID or the email matched. */
const MESSAGES: Record<string, Record<AuthLang, string>> = {
  "If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help.": {
    en: "If the details match an active account, we’ll email a reset link. Can’t use that email? Ask your manager or Owner for help.",
    es: "Si los datos coinciden con una cuenta activa, te enviaremos por correo un enlace para restablecer tu contraseña. ¿No puedes usar ese correo? Pide ayuda a tu gerente o al dueño.",
  },
  "If these details match an active account and its registered recovery channel is available, recovery instructions will be sent. If you cannot use that channel, contact your manager or Owner for assisted recovery.": {
    en: "If these details match an active account and its email is available, we’ll send a reset link. If you can’t use that email, ask your manager or Owner to help you reset your password.",
    es: "Si estos datos coinciden con una cuenta activa y su correo está disponible, enviaremos un enlace para restablecer tu contraseña. Si no puedes usar ese correo, pide a tu gerente o al dueño que te ayude a restablecerla.",
  },
  "Recovery could not be confirmed. Keep your current access and try again.": {
    en: "We couldn’t confirm this. Try again in a moment.",
    es: "No pudimos confirmarlo. Inténtalo de nuevo en un momento.",
  },
  "Recovery is unavailable. Try again or contact your manager for assisted recovery.": {
    en: "We can’t take your request right now. Try again, or ask your manager to help you reset your password.",
    es: "No podemos recibir tu solicitud ahora. Inténtalo de nuevo o pide a tu gerente que te ayude a restablecer tu contraseña.",
  },
  "Your access ended. Sign in again.": { en: "This page expired.", es: "Esta página venció." },
  "Passwords do not match.": { en: "Passwords do not match.", es: "Las contraseñas no coinciden." },
  "Password reset. You’re signed out on every device. Sign in with your new password.": {
    en: "For your safety, we signed you out on every device.",
    es: "Por seguridad, cerramos tu sesión en todos los dispositivos.",
  },
  "This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.": {
    en: "This reset code has expired, was already used, or can’t be checked. Get a new reset link or ask your manager.",
    es: "Este código venció, ya se usó o no se puede comprobar. Pide un enlace nuevo o habla con tu gerente.",
  },
  "The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.": {
    en: "We couldn’t confirm the reset. Try signing in with your new password before you ask for another link.",
    es: "No pudimos confirmar el restablecimiento. Intenta iniciar sesión con tu contraseña nueva antes de pedir otro enlace.",
  },
};

export function authMessage(lang: AuthLang, message: string): string {
  return MESSAGES[message]?.[lang] ?? message;
}
