/* Signed-in Spanish (Nov 23, 2026): the words on Delete my account (deletion.tsx: what we delete, what your employer
 * keeps, the password step, the receipt and the outcomes), in English and Puerto Rico Spanish (docs/design/voice.md:
 * tú, sentence case, "Iniciar sesión", "Perfil", passkey → "llave de acceso"). This is privacy text: the Spanish is a
 * literal translation of the English, waiting for Jose's review, and English is byte for byte what the page said
 * before. Where a sentence holds a link or a value, it is split into the text before and after it (`…Lead`, `…Tail`),
 * so the page draws the same nodes in both languages. The completion period is the server's text and stays as given. */
const en = {
  // src/components/employee-mobile/deletion.tsx:44
  wrongPassword: 'That password isn’t right. Try again.',
  // src/components/employee-mobile/deletion.tsx:44
  enterPassword: 'Enter your password to confirm it’s you.',
  // src/components/employee-mobile/deletion.tsx:45
  requested: 'Deletion requested',
  // src/components/employee-mobile/deletion.tsx:45
  title: 'Delete account',
  // src/components/employee-mobile/deletion.tsx:23
  profile: 'Profile',
  // src/components/employee-mobile/deletion.tsx:50
  ownerLead: 'Your company’s workspace stays open for the rest of your team. To close it, email ',
  // src/components/employee-mobile/deletion.tsx:10
  ownerTail: '.',
  // src/components/employee-mobile/deletion.tsx:60
  yourRequest: 'Your request',
  // src/components/employee-mobile/deletion.tsx:60
  received: 'Received',
  // src/components/employee-mobile/deletion.tsx:61
  wasReceived: 'Your deletion request was received',
  // src/components/employee-mobile/deletion.tsx:61
  inProgress: 'A deletion request is already in progress',
  // src/components/employee-mobile/deletion.tsx:61
  keepReference: 'Keep your reference until it’s done.',
  // src/components/employee-mobile/deletion.tsx:65
  next: 'What happens next',
  // src/components/employee-mobile/deletion.tsx:67
  signedOutEverywhere: 'You’re signed out everywhere',
  // src/components/employee-mobile/deletion.tsx:67
  signedOutDetail: 'You can’t sign in again with your password or a passkey. Calendar feed links and device alerts have stopped.',
  // src/components/employee-mobile/deletion.tsx:68
  weDelete: 'We delete your account',
  // src/components/employee-mobile/deletion.tsx:68
  finishLead: 'We aim to finish within ',
  // src/components/employee-mobile/deletion.tsx:68
  finishTail: '. If we have your email address, we’ll email you when it’s done.',
  // src/components/employee-mobile/deletion.tsx:69
  jobStays: 'Your job doesn’t change',
  // src/components/employee-mobile/deletion.tsx:69
  jobDetail: 'Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.',
  // src/components/employee-mobile/deletion.tsx:71
  askLead: 'To ask about it, email ',
  // src/components/employee-mobile/deletion.tsx:71
  askTail: ' with your reference. We’ll never ask for your password. Changed your mind? Contact support before the request is processed.',
  // src/components/employee-mobile/deletion.tsx:73
  done: 'Done',
  // src/components/employee-mobile/deletion.tsx:67
  signedOut: 'You’re signed out',
  // src/components/employee-mobile/deletion.tsx:75
  otherAccount: 'A different account is signed in',
  // src/components/employee-mobile/deletion.tsx:76
  notFound: 'We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue.',
  // src/components/employee-mobile/deletion.tsx:76
  nothingSentProfile: 'Nothing was sent. Go to Profile to see the account that’s signed in now.',
  // src/components/employee-mobile/deletion.tsx:76
  signIn: 'Sign in',
  // src/components/employee-mobile/deletion.tsx:76
  goToProfile: 'Go to Profile',
  // src/components/employee-mobile/deletion.tsx:78
  formLabel: 'Delete your NEVORA account',
  // src/components/employee-mobile/deletion.tsx:83
  whatWeDelete: 'What we delete',
  // src/components/employee-mobile/deletion.tsx:84
  accessEnds: 'Your access ends right away: you’re signed out on every device and can’t sign in again with your password or a passkey. Calendar feed links and device alerts stop.',
  // src/components/employee-mobile/deletion.tsx:85
  withinLead: 'Within ',
  // src/components/employee-mobile/deletion.tsx:85
  withinTail: ', we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can’t cancel it in the app.',
  // src/components/employee-mobile/deletion.tsx:90
  kept: 'What {who} keeps',
  // src/components/employee-mobile/deletion.tsx:69
  employer: 'your employer',
  // src/components/employee-mobile/deletion.tsx:23
  mayBeKept: 'What may be kept',
  // src/components/employee-mobile/deletion.tsx:93
  notSent: 'Your request wasn’t sent',
  // src/components/employee-mobile/deletion.tsx:93
  unavailable: 'Account deletion isn’t available right now',
  // src/components/employee-mobile/deletion.tsx:93
  busy: 'Too many tries',
  // src/components/employee-mobile/deletion.tsx:93
  unknown: 'We don’t know yet if your request was saved',
  // src/components/employee-mobile/deletion.tsx:94
  failed: 'Nothing was saved and you’re still signed in. Enter your password again to retry.',
  // src/components/employee-mobile/deletion.tsx:95
  unavailableLead: 'Nothing was sent. Email ',
  // src/components/employee-mobile/deletion.tsx:95
  unavailableTail: ' and we’ll help you.',
  // src/components/employee-mobile/deletion.tsx:96
  busyChecking: 'For your security, wait about 15 minutes, then check again. We still don’t know whether your request was saved.',
  // src/components/employee-mobile/deletion.tsx:96
  busySending: 'For your security, wait about 15 minutes, then try again. Nothing was sent.',
  // src/components/employee-mobile/deletion.tsx:97
  uncertain: 'The connection ended before NEVORA answered. Enter your password again and choose Check my request to find out. If it wasn’t saved, this sends your deletion request now, so only check if you still want your account deleted.',
  // src/components/employee-mobile/deletion.tsx:98
  alsoLead: 'You can also email ',
  // src/components/employee-mobile/deletion.tsx:71
  alsoTail: '. We’ll never ask for your password.',
  // src/components/employee-mobile/deletion.tsx:55
  confirmYou: 'Confirm it’s you',
  // src/components/employee-mobile/deletion.tsx:44
  passwordLabel: 'Enter your password to confirm',
  // src/components/employee-mobile/deletion.tsx:108
  showPassword: 'Show password',
  // src/components/employee-mobile/deletion.tsx:109
  passwordHelp: 'The password you use to sign in.',
  // src/components/employee-mobile/deletion.tsx:115
  understand: 'I understand my NEVORA account will be deleted and I won’t be able to sign in again.',
  // src/components/employee-mobile/deletion.tsx:116
  checkBox: 'Check this box to confirm you understand.',
  // src/components/employee-mobile/deletion.tsx:120
  checking: 'Checking…',
  // src/components/employee-mobile/deletion.tsx:120
  sending: 'Sending request…',
  // src/components/employee-mobile/deletion.tsx:97
  checkRequest: 'Check my request',
  // src/components/employee-mobile/deletion.tsx:48
  deleteMine: 'Delete my account',
  // src/components/employee-mobile/deletion.tsx:127
  deleteMineShort: 'Delete my account',
  // src/components/employee-mobile/deletion.tsx:121
  cantUndo: 'This can’t be undone.',
  // src/components/employee-mobile/deletion.tsx:11
  reference: 'Reference',
  // src/components/employee-mobile/deletion.tsx:60
  receivedLead: 'Received ',
  // src/components/employee-mobile/deletion.tsx:135
  copyReference: 'Copy reference',
  // src/components/employee-mobile/deletion.tsx:136
  copied: 'Reference copied.',
  // src/components/employee-mobile/deletion.tsx:136
  notCopied: 'Couldn’t copy. Write the reference down instead.',
};
const es: typeof en = {
  // src/components/employee-mobile/deletion.tsx:44
  wrongPassword: 'Esa contraseña no es correcta. Inténtalo de nuevo.',
  // src/components/employee-mobile/deletion.tsx:44
  enterPassword: 'Escribe tu contraseña para confirmar que eres tú.',
  // src/components/employee-mobile/deletion.tsx:45
  requested: 'Eliminación solicitada',
  // src/components/employee-mobile/deletion.tsx:45
  title: 'Eliminar cuenta',
  // src/components/employee-mobile/deletion.tsx:23
  profile: 'Perfil',
  // src/components/employee-mobile/deletion.tsx:50
  ownerLead: 'El espacio de trabajo de tu empresa sigue abierto para el resto de tu equipo. Para cerrarlo, escribe a ',
  // src/components/employee-mobile/deletion.tsx:10
  ownerTail: '.',
  // src/components/employee-mobile/deletion.tsx:60
  yourRequest: 'Tu solicitud',
  // src/components/employee-mobile/deletion.tsx:60
  received: 'Recibida',
  // src/components/employee-mobile/deletion.tsx:61
  wasReceived: 'Recibimos tu solicitud de eliminación',
  // src/components/employee-mobile/deletion.tsx:61
  inProgress: 'Ya hay una solicitud de eliminación en curso',
  // src/components/employee-mobile/deletion.tsx:61
  keepReference: 'Guarda tu referencia hasta que termine.',
  // src/components/employee-mobile/deletion.tsx:65
  next: 'Qué pasa ahora',
  // src/components/employee-mobile/deletion.tsx:67
  signedOutEverywhere: 'Se cerró tu sesión en todas partes',
  // src/components/employee-mobile/deletion.tsx:67
  signedOutDetail: 'No puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detuvieron.',
  // src/components/employee-mobile/deletion.tsx:68
  weDelete: 'Eliminamos tu cuenta',
  // src/components/employee-mobile/deletion.tsx:68
  finishLead: 'Intentamos terminar en un plazo de ',
  // src/components/employee-mobile/deletion.tsx:68
  finishTail: '. Si tenemos tu correo electrónico, te escribiremos cuando termine.',
  // src/components/employee-mobile/deletion.tsx:69
  jobStays: 'Tu empleo no cambia',
  // src/components/employee-mobile/deletion.tsx:69
  jobDetail: 'Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar.',
  // src/components/employee-mobile/deletion.tsx:71
  askLead: 'Para preguntar sobre ella, escribe a ',
  // src/components/employee-mobile/deletion.tsx:71
  askTail: ' con tu referencia. Nunca te pediremos tu contraseña. ¿Cambiaste de idea? Comunícate con soporte antes de que se procese la solicitud.',
  // src/components/employee-mobile/deletion.tsx:73
  done: 'Terminar',
  // src/components/employee-mobile/deletion.tsx:67
  signedOut: 'Se cerró tu sesión',
  // src/components/employee-mobile/deletion.tsx:75
  otherAccount: 'Hay otra cuenta con la sesión iniciada',
  // src/components/employee-mobile/deletion.tsx:76
  notFound: 'No encontramos una solicitud de eliminación para esta cuenta, así que no se eliminó nada. Inicia sesión de nuevo para continuar.',
  // src/components/employee-mobile/deletion.tsx:76
  nothingSentProfile: 'No se envió nada. Ve a Perfil para ver la cuenta que tiene la sesión iniciada ahora.',
  // src/components/employee-mobile/deletion.tsx:76
  signIn: 'Iniciar sesión',
  // src/components/employee-mobile/deletion.tsx:76
  goToProfile: 'Ir a Perfil',
  // src/components/employee-mobile/deletion.tsx:78
  formLabel: 'Eliminar tu cuenta de NEVORA',
  // src/components/employee-mobile/deletion.tsx:83
  whatWeDelete: 'Qué eliminamos',
  // src/components/employee-mobile/deletion.tsx:84
  accessEnds: 'Tu acceso termina de inmediato: se cierra tu sesión en todos los dispositivos y no puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detienen.',
  // src/components/employee-mobile/deletion.tsx:85
  withinLead: 'En un plazo de ',
  // src/components/employee-mobile/deletion.tsx:85
  withinTail: ', intentamos eliminar tu perfil, tus datos de inicio de sesión, tus suscripciones a notificaciones, tus enlaces del calendario y el contenido que aportaste. Después de confirmar, no puedes cancelarla en la aplicación.',
  // src/components/employee-mobile/deletion.tsx:90
  kept: 'Qué conserva {who}',
  // src/components/employee-mobile/deletion.tsx:69
  employer: 'tu patrono',
  // src/components/employee-mobile/deletion.tsx:23
  mayBeKept: 'Qué se puede conservar',
  // src/components/employee-mobile/deletion.tsx:93
  notSent: 'Tu solicitud no se envió',
  // src/components/employee-mobile/deletion.tsx:93
  unavailable: 'La eliminación de cuentas no está disponible ahora',
  // src/components/employee-mobile/deletion.tsx:93
  busy: 'Demasiados intentos',
  // src/components/employee-mobile/deletion.tsx:93
  unknown: 'Todavía no sabemos si tu solicitud se guardó',
  // src/components/employee-mobile/deletion.tsx:94
  failed: 'No se guardó nada y tu sesión sigue iniciada. Escribe tu contraseña otra vez para intentarlo de nuevo.',
  // src/components/employee-mobile/deletion.tsx:95
  unavailableLead: 'No se envió nada. Escribe a ',
  // src/components/employee-mobile/deletion.tsx:95
  unavailableTail: ' y te ayudaremos.',
  // src/components/employee-mobile/deletion.tsx:96
  busyChecking: 'Por tu seguridad, espera unos 15 minutos y vuelve a verificar. Todavía no sabemos si tu solicitud se guardó.',
  // src/components/employee-mobile/deletion.tsx:96
  busySending: 'Por tu seguridad, espera unos 15 minutos e inténtalo de nuevo. No se envió nada.',
  // src/components/employee-mobile/deletion.tsx:97
  uncertain: 'La conexión terminó antes de que NEVORA respondiera. Escribe tu contraseña otra vez y elige Verificar mi solicitud para saberlo. Si no se guardó, esto envía tu solicitud de eliminación ahora, así que verifica solo si todavía quieres eliminar tu cuenta.',
  // src/components/employee-mobile/deletion.tsx:98
  alsoLead: 'También puedes escribir a ',
  // src/components/employee-mobile/deletion.tsx:71
  alsoTail: '. Nunca te pediremos tu contraseña.',
  // src/components/employee-mobile/deletion.tsx:55
  confirmYou: 'Confirma que eres tú',
  // src/components/employee-mobile/deletion.tsx:44
  passwordLabel: 'Escribe tu contraseña',
  // src/components/employee-mobile/deletion.tsx:108
  showPassword: 'Mostrar contraseña',
  // src/components/employee-mobile/deletion.tsx:109
  passwordHelp: 'La contraseña que usas para iniciar sesión.',
  // src/components/employee-mobile/deletion.tsx:115
  understand: 'Entiendo que mi cuenta de NEVORA se eliminará y que no podré volver a iniciar sesión.',
  // src/components/employee-mobile/deletion.tsx:116
  checkBox: 'Marca esta casilla para confirmar que entiendes.',
  // src/components/employee-mobile/deletion.tsx:120
  checking: 'Verificando…',
  // src/components/employee-mobile/deletion.tsx:120
  sending: 'Enviando solicitud…',
  // src/components/employee-mobile/deletion.tsx:97
  checkRequest: 'Verificar mi solicitud',
  // src/components/employee-mobile/deletion.tsx:48
  deleteMine: 'Eliminar mi cuenta',
  // src/components/employee-mobile/deletion.tsx:127
  deleteMineShort: 'Eliminar cuenta',
  // src/components/employee-mobile/deletion.tsx:121
  cantUndo: 'No se puede deshacer.',
  // src/components/employee-mobile/deletion.tsx:11
  reference: 'Referencia',
  // src/components/employee-mobile/deletion.tsx:60
  receivedLead: 'Recibida el ',
  // src/components/employee-mobile/deletion.tsx:135
  copyReference: 'Copiar referencia',
  // src/components/employee-mobile/deletion.tsx:136
  copied: 'Referencia copiada.',
  // src/components/employee-mobile/deletion.tsx:136
  notCopied: 'No pudimos copiarla. Anota la referencia.',
};
export const deletionCopy = {en, es} as const;

export const copy = {
  en: {
    // src/components/employee-mobile/deletion.tsx:44
    wrongPassword: 'That password isn’t right. Try again.',
    // src/components/employee-mobile/deletion.tsx:44
    enterPassword: 'Enter your password to confirm it’s you.',
    // src/components/employee-mobile/deletion.tsx:45
    requested: 'Deletion requested',
    // src/components/employee-mobile/deletion.tsx:45
    deleteAccount: 'Delete account',
    // src/components/employee-mobile/deletion.tsx:50
    companyWorkspaceStaysOpenRestTeam: 'Your company’s workspace stays open for the rest of your team. To close it, email {support}.',
    // src/components/employee-mobile/deletion.tsx:60
    yourRequest: 'Your request',
    // src/components/employee-mobile/deletion.tsx:60
    received: 'Received',
    // src/components/employee-mobile/deletion.tsx:61
    wasReceived: 'Your deletion request was received',
    // src/components/employee-mobile/deletion.tsx:61
    inProgress: 'A deletion request is already in progress',
    // src/components/employee-mobile/deletion.tsx:61
    keepReference: 'Keep your reference until it’s done.',
    // src/components/employee-mobile/deletion.tsx:65
    next: 'What happens next',
    // src/components/employee-mobile/deletion.tsx:67
    signedOutEverywhere: 'You’re signed out everywhere',
    // src/components/employee-mobile/deletion.tsx:67
    signedOutDetail: 'You can’t sign in again with your password or a passkey. Calendar feed links and device alerts have stopped.',
    // src/components/employee-mobile/deletion.tsx:68
    weDelete: 'We delete your account',
    // src/components/employee-mobile/deletion.tsx:68
    weAimFinishWithinIfWe: 'We aim to finish within {period}. If we have your email address, we’ll email you when it’s done.',
    // src/components/employee-mobile/deletion.tsx:69
    jobStays: 'Your job doesn’t change',
    // src/components/employee-mobile/deletion.tsx:69, src/components/employee-mobile/deletion.tsx:89
    jobDetail: 'Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.',
    // src/components/employee-mobile/deletion.tsx:71
    askAboutEmailReferenceWeNever: 'To ask about it, email {reference} with your reference. We’ll never ask for your password. Changed your mind? Contact support before the request is processed.',
    // src/components/employee-mobile/deletion.tsx:73
    done: 'Done',
    // src/components/employee-mobile/deletion.tsx:75
    signedOut: 'You’re signed out',
    // src/components/employee-mobile/deletion.tsx:75
    otherAccount: 'A different account is signed in',
    // src/components/employee-mobile/deletion.tsx:76
    notFound: 'We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue.',
    // src/components/employee-mobile/deletion.tsx:76
    nothingSentProfile: 'Nothing was sent. Go to Profile to see the account that’s signed in now.',
    // src/components/employee-mobile/deletion.tsx:77
    signIn: 'Sign in',
    // src/components/employee-mobile/deletion.tsx:77
    goToProfile: 'Go to Profile',
    // src/components/employee-mobile/deletion.tsx:78
    formLabel: 'Delete your NEVORA account',
    // src/components/employee-mobile/deletion.tsx:83
    whatWeDelete: 'What we delete',
    // src/components/employee-mobile/deletion.tsx:84
    accessEnds: 'Your access ends right away: you’re signed out on every device and can’t sign in again with your password or a passkey. Calendar feed links and device alerts stop.',
    // src/components/employee-mobile/deletion.tsx:85
    withinWeAimDeleteProfileSign: 'Within {period}, we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can’t cancel it in the app.',
    // src/components/employee-mobile/deletion.tsx:88
    kept: 'What {workplace} keeps',
    // src/components/employee-mobile/deletion.tsx:90
    mayBeKept: 'What may be kept',
    // src/components/employee-mobile/deletion.tsx:93
    notSent: 'Your request wasn’t sent',
    // src/components/employee-mobile/deletion.tsx:93
    unavailable: 'Account deletion isn’t available right now',
    // src/components/employee-mobile/deletion.tsx:93
    busy: 'Too many tries',
    // src/components/employee-mobile/deletion.tsx:93
    weDonKnowYetIfRequest: 'We don’t know yet if your request was saved',
    // src/components/employee-mobile/deletion.tsx:94
    failed: 'Nothing was saved and you’re still signed in. Enter your password again to retry.',
    // src/components/employee-mobile/deletion.tsx:94
    busyChecking: 'For your security, wait about 15 minutes, then check again. We still don’t know whether your request was saved.',
    // src/components/employee-mobile/deletion.tsx:94
    busySending: 'For your security, wait about 15 minutes, then try again. Nothing was sent.',
    // src/components/employee-mobile/deletion.tsx:94
    uncertain: 'The connection ended before NEVORA answered. Enter your password again and choose Check my request to find out. If it wasn’t saved, this sends your deletion request now, so only check if you still want your account deleted.',
    // src/components/employee-mobile/deletion.tsx:98
    canAlsoEmailWeNeverAsk: 'You can also email {support}. We’ll never ask for your password.',
    // src/components/employee-mobile/deletion.tsx:102
    confirmYou: 'Confirm it’s you',
    // src/components/employee-mobile/deletion.tsx:104
    passwordLabel: 'Enter your password to confirm',
    // src/components/employee-mobile/deletion.tsx:108
    showPassword: 'Show password',
    // src/components/employee-mobile/deletion.tsx:109
    passwordHelp: 'The password you use to sign in.',
    // src/components/employee-mobile/deletion.tsx:115
    understand: 'I understand my NEVORA account will be deleted and I won’t be able to sign in again.',
    // src/components/employee-mobile/deletion.tsx:116
    checkBox: 'Check this box to confirm you understand.',
    // src/components/employee-mobile/deletion.tsx:120
    checking: 'Checking…',
    // src/components/employee-mobile/deletion.tsx:120
    sending: 'Sending request…',
    // src/components/employee-mobile/deletion.tsx:120
    checkRequest: 'Check my request',
    // src/components/employee-mobile/deletion.tsx:120
    deleteMine: 'Delete my account',
    // src/components/employee-mobile/deletion.tsx:121
    cantUndo: 'This can’t be undone.',
    // src/components/employee-mobile/deletion.tsx:132
    reference: 'Reference',
    // src/components/employee-mobile/deletion.tsx:134
    receivedAt: 'Received {at}',
    // src/components/employee-mobile/deletion.tsx:135
    copyReference: 'Copy reference',
    // src/components/employee-mobile/deletion.tsx:136
    copied: 'Reference copied.',
    // src/components/employee-mobile/deletion.tsx:136
    notCopied: 'Couldn’t copy. Write the reference down instead.',
  },
  es: {
    // src/components/employee-mobile/deletion.tsx:44
    wrongPassword: 'Esa contraseña no es correcta. Inténtalo de nuevo.',
    // src/components/employee-mobile/deletion.tsx:44
    enterPassword: 'Escribe tu contraseña para confirmar que eres tú.',
    // src/components/employee-mobile/deletion.tsx:45
    requested: 'Eliminación solicitada',
    // src/components/employee-mobile/deletion.tsx:45
    deleteAccount: 'Eliminar cuenta',
    // src/components/employee-mobile/deletion.tsx:50
    companyWorkspaceStaysOpenRestTeam: 'El espacio de trabajo de tu empresa permanece abierto para el resto de tu equipo. Para cerrarlo, envía un correo electrónico a {support}',
    // src/components/employee-mobile/deletion.tsx:60
    yourRequest: 'Tu solicitud',
    // src/components/employee-mobile/deletion.tsx:60
    received: 'Recibida',
    // src/components/employee-mobile/deletion.tsx:61
    wasReceived: 'Recibimos tu solicitud de eliminación',
    // src/components/employee-mobile/deletion.tsx:61
    inProgress: 'Ya hay una solicitud de eliminación en curso',
    // src/components/employee-mobile/deletion.tsx:61
    keepReference: 'Guarda tu referencia hasta que termine.',
    // src/components/employee-mobile/deletion.tsx:65
    next: 'Qué pasa ahora',
    // src/components/employee-mobile/deletion.tsx:67
    signedOutEverywhere: 'Se cerró tu sesión en todas partes',
    // src/components/employee-mobile/deletion.tsx:67
    signedOutDetail: 'No puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detuvieron.',
    // src/components/employee-mobile/deletion.tsx:68
    weDelete: 'Eliminamos tu cuenta',
    // src/components/employee-mobile/deletion.tsx:68
    weAimFinishWithinIfWe: 'Buscamos terminar dentro de {period}. Si tenemos tu dirección de correo electrónico, te enviaremos un correo electrónico cuando esté terminado',
    // src/components/employee-mobile/deletion.tsx:69
    jobStays: 'Tu empleo no cambia',
    // src/components/employee-mobile/deletion.tsx:69, src/components/employee-mobile/deletion.tsx:89
    jobDetail: 'Eliminar tu cuenta de NEVORA no termina tu empleo ni borra los registros que tu patrono tiene que conservar.',
    // src/components/employee-mobile/deletion.tsx:71
    askAboutEmailReferenceWeNever: 'Para consultarlo, envíe un correo electrónico a {reference} con tu referencia. Nunca le pediremos tu contraseña. ¿Ha cambiado de opinión? Contacte con el soporte antes de que se procese la solicitud',
    // src/components/employee-mobile/deletion.tsx:73
    done: 'Listo',
    // src/components/employee-mobile/deletion.tsx:75
    signedOut: 'Se cerró tu sesión',
    // src/components/employee-mobile/deletion.tsx:75
    otherAccount: 'Hay otra cuenta con la sesión iniciada',
    // src/components/employee-mobile/deletion.tsx:76
    notFound: 'No encontramos una solicitud de eliminación para esta cuenta, así que no se eliminó nada. Inicia sesión de nuevo para continuar.',
    // src/components/employee-mobile/deletion.tsx:76
    nothingSentProfile: 'No se envió nada. Ve a Perfil para ver la cuenta que tiene la sesión iniciada ahora.',
    // src/components/employee-mobile/deletion.tsx:77
    signIn: 'Iniciar sesión',
    // src/components/employee-mobile/deletion.tsx:77
    goToProfile: 'Ir a Perfil',
    // src/components/employee-mobile/deletion.tsx:78
    formLabel: 'Eliminar tu cuenta de NEVORA',
    // src/components/employee-mobile/deletion.tsx:83
    whatWeDelete: 'Qué eliminamos',
    // src/components/employee-mobile/deletion.tsx:84
    accessEnds: 'Tu acceso termina de inmediato: se cierra tu sesión en todos los dispositivos y no puedes volver a iniciar sesión con tu contraseña ni con una llave de acceso. Los enlaces del calendario y las alertas del dispositivo se detienen.',
    // src/components/employee-mobile/deletion.tsx:85
    withinWeAimDeleteProfileSign: 'Dentro de {period}, nuestro objetivo es eliminar tu perfil, los detalles de inicio de sesión, las suscripciones a notificaciones, los enlaces del calendario y el contenido que has contribuido. Después de confirmar, no podrás cancelarlo en la aplicación',
    // src/components/employee-mobile/deletion.tsx:88
    kept: 'Qué conserva {workplace}',
    // src/components/employee-mobile/deletion.tsx:90
    mayBeKept: 'Qué se puede conservar',
    // src/components/employee-mobile/deletion.tsx:93
    notSent: 'Tu solicitud no se envió',
    // src/components/employee-mobile/deletion.tsx:93
    unavailable: 'La eliminación de cuentas no está disponible ahora',
    // src/components/employee-mobile/deletion.tsx:93
    busy: 'Demasiados intentos',
    // src/components/employee-mobile/deletion.tsx:93
    weDonKnowYetIfRequest: 'Todavía no sabemos si tu solicitud se guardó',
    // src/components/employee-mobile/deletion.tsx:94
    failed: 'No se guardó nada y tu sesión sigue iniciada. Escribe tu contraseña otra vez para intentarlo de nuevo.',
    // src/components/employee-mobile/deletion.tsx:94
    busyChecking: 'Por tu seguridad, espera unos 15 minutos y vuelve a verificar. Todavía no sabemos si tu solicitud se guardó.',
    // src/components/employee-mobile/deletion.tsx:94
    busySending: 'Por tu seguridad, espera unos 15 minutos e inténtalo de nuevo. No se envió nada.',
    // src/components/employee-mobile/deletion.tsx:94
    uncertain: 'La conexión terminó antes de que NEVORA respondiera. Escribe tu contraseña otra vez y elige Verificar mi solicitud para saberlo. Si no se guardó, esto envía tu solicitud de eliminación ahora, así que verifica solo si todavía quieres eliminar tu cuenta.',
    // src/components/employee-mobile/deletion.tsx:98
    canAlsoEmailWeNeverAsk: 'También puedes enviar un correo electrónico a {support}. Nunca te pediremos tu contraseña',
    // src/components/employee-mobile/deletion.tsx:102
    confirmYou: 'Confirma que eres tú',
    // src/components/employee-mobile/deletion.tsx:104
    passwordLabel: 'Escribe tu contraseña',
    // src/components/employee-mobile/deletion.tsx:108
    showPassword: 'Mostrar contraseña',
    // src/components/employee-mobile/deletion.tsx:109
    passwordHelp: 'La contraseña que usas para iniciar sesión.',
    // src/components/employee-mobile/deletion.tsx:115
    understand: 'Entiendo que mi cuenta de NEVORA se eliminará y que no podré volver a iniciar sesión.',
    // src/components/employee-mobile/deletion.tsx:116
    checkBox: 'Marca esta casilla para confirmar que entiendes.',
    // src/components/employee-mobile/deletion.tsx:120
    checking: 'Verificando…',
    // src/components/employee-mobile/deletion.tsx:120
    sending: 'Enviando solicitud…',
    // src/components/employee-mobile/deletion.tsx:120
    checkRequest: 'Verificar mi solicitud',
    // src/components/employee-mobile/deletion.tsx:120
    deleteMine: 'Eliminar mi cuenta',
    // src/components/employee-mobile/deletion.tsx:121
    cantUndo: 'No se puede deshacer.',
    // src/components/employee-mobile/deletion.tsx:132
    reference: 'Referencia',
    // src/components/employee-mobile/deletion.tsx:134
    receivedAt: 'Recibida el {at}',
    // src/components/employee-mobile/deletion.tsx:135
    copyReference: 'Copiar referencia',
    // src/components/employee-mobile/deletion.tsx:136
    copied: 'Referencia copiada.',
    // src/components/employee-mobile/deletion.tsx:136
    notCopied: 'No pudimos copiarla. Anota la referencia.',
  },
} as const;
