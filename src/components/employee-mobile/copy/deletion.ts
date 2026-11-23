/* Signed-in Spanish (Nov 23, 2026): the words on Delete my account (deletion.tsx: what we delete, what your employer
 * keeps, the password step, the receipt and the outcomes), in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, sentence case, "Iniciar sesión", "Perfil", passkey → "llave de acceso"). This is privacy text: the Spanish is a
 * literal translation of the English, waiting for Jose's review, and English is byte for byte what the page said
 * before. Where a sentence holds a link or a value, it is split into the text before and after it (`…Lead`, `…Tail`),
 * so the page draws the same nodes in both languages. The completion period is the server's text and stays as given. */
import {LOCALE} from '../mobile-format';

const en = {
  wrongPassword: 'That password isn’t right. Try again.', enterPassword: 'Enter your password to confirm it’s you.',
  requested: 'Deletion requested', title: 'Delete account', profile: 'Profile',
  ownerLead: 'Your company’s workspace stays open for the rest of your team. To close it, email ', ownerTail: '.',
  yourRequest: 'Your request', received: 'Received',
  wasReceived: 'Your deletion request was received', inProgress: 'A deletion request is already in progress',
  keepReference: 'Keep your reference until it’s done.',
  next: 'What happens next',
  signedOutEverywhere: 'You’re signed out everywhere',
  signedOutDetail: 'You can’t sign in again with your password or a passkey. Calendar feed links and device alerts have stopped.',
  weDelete: 'We delete your account',
  finishLead: 'We aim to finish within ', finishTail: '. If we have your email address, we’ll email you when it’s done.',
  jobStays: 'Your job doesn’t change',
  jobDetail: 'Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.',
  askLead: 'To ask about it, email ', askTail: ' with your reference. We’ll never ask for your password. Changed your mind? Contact support before the request is processed.',
  done: 'Done',
  signedOut: 'You’re signed out', otherAccount: 'A different account is signed in',
  notFound: 'We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue.',
  nothingSentProfile: 'Nothing was sent. Go to Profile to see the account that’s signed in now.',
  signIn: 'Sign in', goToProfile: 'Go to Profile',
  formLabel: 'Delete your NEVORA account',
  whatWeDelete: 'What we delete',
  accessEnds: 'Your access ends right away: you’re signed out on every device and can’t sign in again with your password or a passkey. Calendar feed links and device alerts stop.',
  withinLead: 'Within ', withinTail: ', we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can’t cancel it in the app.',
  kept: (who: string) => `What ${who} keeps`, employer: 'your employer',
  mayBeKept: 'What may be kept',
  notSent: 'Your request wasn’t sent', unavailable: 'Account deletion isn’t available right now', busy: 'Too many tries',
  unknown: 'We don’t know yet if your request was saved',
  failed: 'Nothing was saved and you’re still signed in. Enter your password again to retry.',
  unavailableLead: 'Nothing was sent. Email ', unavailableTail: ' and we’ll help you.',
  busyChecking: 'For your security, wait about 15 minutes, then check again. We still don’t know whether your request was saved.',
  busySending: 'For your security, wait about 15 minutes, then try again. Nothing was sent.',
  uncertain: 'The connection ended before NEVORA answered. Enter your password again and choose Check my request to find out. If it wasn’t saved, this sends your deletion request now, so only check if you still want your account deleted.',
  alsoLead: 'You can also email ', alsoTail: '. We’ll never ask for your password.',
  confirmYou: 'Confirm it’s you', passwordLabel: 'Enter your password to confirm', showPassword: 'Show password',
  passwordHelp: 'The password you use to sign in.',
  understand: 'I understand my NEVORA account will be deleted and I won’t be able to sign in again.',
  checkBox: 'Check this box to confirm you understand.',
  checking: 'Checking…', sending: 'Sending request…', checkRequest: 'Check my request', deleteMine: 'Delete my account',
  cantUndo: 'This can’t be undone.',
  reference: 'Reference', receivedLead: 'Received ', copyReference: 'Copy reference',
  copied: 'Reference copied.', notCopied: 'Couldn’t copy. Write the reference down instead.',
};
const es: typeof en = {
  wrongPassword: 'Esa contraseña no es correcta. Inténtalo de nuevo.', enterPassword: 'Escribe tu contraseña para confirmar que eres tú.',
  requested: 'Eliminación solicitada', title: 'Eliminar cuenta', profile: 'Perfil',
  ownerLead: 'El espacio de trabajo de tu empresa sigue abierto para el resto de tu equipo. Para cerrarlo, escribe a ', ownerTail: '.',
  yourRequest: 'Tu solicitud', received: 'Recibida',
  wasReceived: 'Recibimos tu solicitud de eliminación', inProgress: 'Ya hay una solicitud de eliminación en curso',
  keepReference: 'Guarda tu referencia hasta que termine.',
  next: 'Qué pasa ahora',
  signedOutEverywhere: 'Se cerró tu sesión en todas partes',
  signedOutDetail: 'No puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detuvieron.',
  weDelete: 'Eliminamos tu cuenta',
  finishLead: 'Intentamos terminar en un plazo de ', finishTail: '. Si tenemos tu correo electrónico, te escribiremos cuando termine.',
  jobStays: 'Tu empleo no cambia',
  jobDetail: 'Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar.',
  askLead: 'Para preguntar sobre ella, escribe a ', askTail: ' con tu referencia. Nunca te pediremos tu contraseña. ¿Cambiaste de idea? Comunícate con soporte antes de que se procese la solicitud.',
  done: 'Terminar',
  signedOut: 'Se cerró tu sesión', otherAccount: 'Hay otra cuenta con la sesión iniciada',
  notFound: 'No encontramos una solicitud de eliminación para esta cuenta, así que no se eliminó nada. Inicia sesión de nuevo para continuar.',
  nothingSentProfile: 'No se envió nada. Ve a Perfil para ver la cuenta que tiene la sesión iniciada ahora.',
  signIn: 'Iniciar sesión', goToProfile: 'Ir a Perfil',
  formLabel: 'Eliminar tu cuenta de NEVORA',
  whatWeDelete: 'Qué eliminamos',
  accessEnds: 'Tu acceso termina de inmediato: se cierra tu sesión en todos los dispositivos y no puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detienen.',
  withinLead: 'En un plazo de ', withinTail: ', intentamos eliminar tu perfil, tus datos de inicio de sesión, tus suscripciones a notificaciones, tus enlaces del calendario y el contenido que aportaste. Después de confirmar, no puedes cancelarla en la aplicación.',
  kept: (who: string) => `Qué conserva ${who}`, employer: 'tu patrono',
  mayBeKept: 'Qué se puede conservar',
  notSent: 'Tu solicitud no se envió', unavailable: 'La eliminación de cuentas no está disponible ahora', busy: 'Demasiados intentos',
  unknown: 'Todavía no sabemos si tu solicitud se guardó',
  failed: 'No se guardó nada y tu sesión sigue iniciada. Escribe tu contraseña otra vez para intentarlo de nuevo.',
  unavailableLead: 'No se envió nada. Escribe a ', unavailableTail: ' y te ayudaremos.',
  busyChecking: 'Por tu seguridad, espera unos 15 minutos y vuelve a verificar. Todavía no sabemos si tu solicitud se guardó.',
  busySending: 'Por tu seguridad, espera unos 15 minutos e inténtalo de nuevo. No se envió nada.',
  uncertain: 'La conexión terminó antes de que NEVORA respondiera. Escribe tu contraseña otra vez y elige Verificar mi solicitud para saberlo. Si no se guardó, esto envía tu solicitud de eliminación ahora, así que verifica solo si todavía quieres eliminar tu cuenta.',
  alsoLead: 'También puedes escribir a ', alsoTail: '. Nunca te pediremos tu contraseña.',
  confirmYou: 'Confirma que eres tú', passwordLabel: 'Escribe tu contraseña', showPassword: 'Mostrar contraseña',
  passwordHelp: 'La contraseña que usas para iniciar sesión.',
  understand: 'Entiendo que mi cuenta de NEVORA se eliminará y que no podré volver a iniciar sesión.',
  checkBox: 'Marca esta casilla para confirmar que entiendes.',
  checking: 'Verificando…', sending: 'Enviando solicitud…', checkRequest: 'Verificar mi solicitud', deleteMine: 'Eliminar mi cuenta',
  cantUndo: 'No se puede deshacer.',
  reference: 'Referencia', receivedLead: 'Recibida el ', copyReference: 'Copiar referencia',
  copied: 'Referencia copiada.', notCopied: 'No pudimos copiarla. Anota la referencia.',
};
export const deletionCopy = {en, es};

/** The receipt's time in Spanish ("1 ene 2030, 10:00 a. m."), read the way employee-b's receivedAt reads the server's
 * timestamp; English keeps receivedAt itself. */
export function receivedAtEs(text: string) {
  const iso = text.trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/([+-]\d\d)$/, '$1:00');
  const time = Date.parse(iso);
  return Number.isFinite(time) ? new Intl.DateTimeFormat(LOCALE.es, {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'}).format(time) : null;
}
