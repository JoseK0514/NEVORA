import type {ManagerAlertTopic} from './contract';

export const profileCopy = {
  en: {
    // src/components/manager-profile/manager-profile-live.tsx:13
    profile: 'Profile',
    // src/components/manager-profile/manager-profile-live.tsx:228
    more: 'More',
    // src/components/manager-profile/manager-profile.tsx:61
    edit: 'Edit',
    // src/components/manager-profile/manager-profile-live.tsx:26
    owner: 'Owner',
    // src/components/manager-profile/manager-profile-live.tsx:13
    manager: 'Manager',
    // src/components/manager-profile/manager-profile-live.tsx:184
    yourDetails: 'Your details',
    // src/components/manager-profile/manager-profile-live.tsx:111
    phone: 'Phone',
    // src/components/manager-profile/manager-profile-live.tsx:103
    email: 'Email',
    // src/components/manager-profile/manager-profile-live.tsx:189
    notAdded: 'Not added',
    // src/components/manager-profile/manager-profile-live.tsx:202
    timeZone: 'Time zone',
    // src/components/manager-profile/manager-profile-live.tsx:81
    checking: 'Checking…',
    // src/components/manager-profile/manager-profile-live.tsx:79
    offline: 'You’re offline',
    // src/components/manager-profile/manager-profile-live.tsx:79
    paused: 'Updates paused',
    // src/components/manager-profile/manager-profile-live.tsx:83
    loginToSee: 'Sign in to see this',
    // src/components/manager-profile/manager-profile-live.tsx:84
    couldntLoad: 'Couldn’t load',
    // src/components/manager-profile/manager-profile-live.tsx:83
    sessionEnded: 'Your session ended. Sign in again to see your contact details, locations and alert choices.',
    // src/components/manager-profile/manager-profile-live.tsx:84
    detailsFailed: 'We couldn’t load your contact details, locations and alert choices.',
    // src/components/manager-profile/manager-profile-live.tsx:168
    detailsStillFailed: 'Still couldn’t load your contact details, locations and alert choices.',
    // src/components/manager-profile/manager-profile-live.tsx:184
    detailsLoaded: 'Your details loaded.',
    // src/components/manager-profile/manager-profile-live.tsx:94
    notShown: 'Not shown yet',
    // src/components/manager-profile/manager-profile-live.tsx:142
    saving: 'Saving…',
    // src/components/manager-profile/manager-profile-live.tsx:124
    notSavedOffline: 'Not saved. You’re offline.',
    // src/components/manager-profile/manager-profile-live.tsx:125
    notSavedSignedOut: 'Not saved. Sign in again.',
    // src/components/manager-profile/manager-profile-live.tsx:57
    notSaved: 'Not saved. Try again.',
    // src/components/manager-profile/manager-profile-live.tsx:165
    alertsOffline: 'You’re offline. Your alert choices show again when you’re back online.',
    // src/components/manager-profile/manager-profile-live.tsx:165
    alertsPaused: 'Updates paused. Your alert choices show again when you come back to this window.',
    // src/components/manager-profile/manager-profile-live.tsx:83
    alertsSignedOut: 'Your session ended. Sign in again to see your alert choices.',
    // src/components/manager-profile/manager-profile-live.tsx:166
    alertsFailed: 'Your alert choices couldn’t load.',
    // src/components/manager-profile/manager-profile-live.tsx:57
    tryAgain: 'Try again',
    // src/components/manager-profile/manager-profile-live.tsx:53
    retrying: 'Trying again…',
    // src/components/manager-profile/manager-profile-live.tsx:83
    signIn: 'Sign in',
    // src/components/manager-profile/manager-profile-live.tsx:210
    accountAlerts: 'Notifications and account',
    // src/components/manager-profile/manager-profile-live.tsx:63
    notifications: 'Notifications',
    // src/components/manager-profile/manager-profile-live.tsx:129
    on: 'On',
    // src/components/manager-profile/manager-profile-live.tsx:212
    off: 'Off',
    // src/components/manager-profile/manager-profile-live.tsx:213
    toldAbout: 'You’re told about',
    // src/components/manager-profile/manager-profile-live.tsx:217
    allNotifications: 'All notifications',
    // src/components/manager-profile/manager-profile-live.tsx:224
    alertsOnThis: 'Alerts on this ',
    // src/components/manager-profile/manager-profile-live.tsx:10
    devicePhone: 'phone',
    // src/components/manager-profile/manager-profile-live.tsx:24
    device: 'device',
    // src/components/manager-profile/manager-profile-live.tsx:40
    access: 'Access',
    // src/components/manager-profile/manager-profile-live.tsx:41
    closed: 'Payroll and Settings are for Owners.',
    // src/components/manager-profile/manager-profile-live.tsx:43
    allPlaces: 'All {word}',
    // src/components/manager-profile/manager-profile-live.tsx:46
    coversAll: 'Schedule, time, team and requests. {closed}',
    // src/components/manager-profile/manager-profile-live.tsx:48
    coversSome: 'Schedule and team at your {word}. {closed}',
    // src/components/manager-profile/manager-profile-live.tsx:177
    changeLine: '{owner} can change this',
    // src/components/manager-profile/manager-profile-live.tsx:28
    fallbackOwner: 'An Owner',
  },
  es: {
    // src/components/manager-profile/manager-profile-live.tsx:13
    profile: 'Perfil',
    // src/components/manager-profile/manager-profile-live.tsx:228
    more: 'Más',
    // src/components/manager-profile/manager-profile.tsx:61
    edit: 'Editar',
    // src/components/manager-profile/manager-profile-live.tsx:26
    owner: 'Dueño',
    // src/components/manager-profile/manager-profile-live.tsx:13
    manager: 'Gerente',
    // src/components/manager-profile/manager-profile-live.tsx:184
    yourDetails: 'Tus datos',
    // src/components/manager-profile/manager-profile-live.tsx:111
    phone: 'Teléfono',
    // src/components/manager-profile/manager-profile-live.tsx:103
    email: 'Correo electrónico',
    // src/components/manager-profile/manager-profile-live.tsx:189
    notAdded: 'Sin añadir',
    // src/components/manager-profile/manager-profile-live.tsx:202
    timeZone: 'Zona horaria',
    // src/components/manager-profile/manager-profile-live.tsx:81
    checking: 'Verificando…',
    // src/components/manager-profile/manager-profile-live.tsx:79
    offline: 'Estás sin conexión',
    // src/components/manager-profile/manager-profile-live.tsx:79
    paused: 'Actualizaciones en pausa',
    // src/components/manager-profile/manager-profile-live.tsx:83
    loginToSee: 'Inicia sesión para ver estos datos',
    // src/components/manager-profile/manager-profile-live.tsx:84
    couldntLoad: 'No pudimos cargar los datos',
    // src/components/manager-profile/manager-profile-live.tsx:83
    sessionEnded: 'Tu sesión terminó. Inicia sesión de nuevo para ver tus datos de contacto, localidades y preferencias de alertas.',
    // src/components/manager-profile/manager-profile-live.tsx:84
    detailsFailed: 'No pudimos cargar tus datos de contacto, localidades ni preferencias de alertas.',
    // src/components/manager-profile/manager-profile-live.tsx:168
    detailsStillFailed: 'Todavía no pudimos cargar tus datos de contacto, localidades ni preferencias de alertas.',
    // src/components/manager-profile/manager-profile-live.tsx:184
    detailsLoaded: 'Se cargaron tus datos.',
    // src/components/manager-profile/manager-profile-live.tsx:94
    notShown: 'Aún sin mostrar',
    // src/components/manager-profile/manager-profile-live.tsx:142
    saving: 'Guardando…',
    // src/components/manager-profile/manager-profile-live.tsx:124
    notSavedOffline: 'No se guardó. Estás sin conexión.',
    // src/components/manager-profile/manager-profile-live.tsx:125
    notSavedSignedOut: 'No se guardó. Inicia sesión de nuevo.',
    // src/components/manager-profile/manager-profile-live.tsx:57
    notSaved: 'No se guardó. Inténtalo de nuevo.',
    // src/components/manager-profile/manager-profile-live.tsx:165
    alertsOffline: 'Estás sin conexión. Tus preferencias de alertas volverán a aparecer cuando te conectes.',
    // src/components/manager-profile/manager-profile-live.tsx:165
    alertsPaused: 'Actualizaciones en pausa. Tus preferencias de alertas volverán a aparecer cuando regreses a esta ventana.',
    // src/components/manager-profile/manager-profile-live.tsx:83
    alertsSignedOut: 'Tu sesión terminó. Inicia sesión de nuevo para ver tus preferencias de alertas.',
    // src/components/manager-profile/manager-profile-live.tsx:166
    alertsFailed: 'No pudimos cargar tus preferencias de alertas.',
    // src/components/manager-profile/manager-profile-live.tsx:57
    tryAgain: 'Intentar de nuevo',
    // src/components/manager-profile/manager-profile-live.tsx:53
    retrying: 'Intentando de nuevo…',
    // src/components/manager-profile/manager-profile-live.tsx:83
    signIn: 'Iniciar sesión',
    // src/components/manager-profile/manager-profile-live.tsx:210
    accountAlerts: 'Notificaciones y cuenta',
    // src/components/manager-profile/manager-profile-live.tsx:63
    notifications: 'Notificaciones',
    // src/components/manager-profile/manager-profile-live.tsx:129
    on: 'Activadas',
    // src/components/manager-profile/manager-profile-live.tsx:212
    off: 'Desactivadas',
    // src/components/manager-profile/manager-profile-live.tsx:213
    toldAbout: 'Recibes avisos sobre',
    // src/components/manager-profile/manager-profile-live.tsx:217
    allNotifications: 'Todas las notificaciones',
    // src/components/manager-profile/manager-profile-live.tsx:224
    alertsOnThis: 'Alertas en este ',
    // src/components/manager-profile/manager-profile-live.tsx:10
    devicePhone: 'teléfono',
    // src/components/manager-profile/manager-profile-live.tsx:24
    device: 'dispositivo',
    // src/components/manager-profile/manager-profile-live.tsx:40
    access: 'Acceso',
    // src/components/manager-profile/manager-profile-live.tsx:41
    closed: 'La nómina y la configuración son para los dueños.',
    // src/components/manager-profile/manager-profile-live.tsx:43
    allPlaces: 'Todas las {word}',
    // src/components/manager-profile/manager-profile-live.tsx:46
    coversAll: 'Horario, horas, equipo y solicitudes. {closed}',
    // src/components/manager-profile/manager-profile-live.tsx:48
    coversSome: 'Horario y equipo en tus {word}. {closed}',
    // src/components/manager-profile/manager-profile-live.tsx:177
    changeLine: '{owner} puede cambiar estos datos',
    // src/components/manager-profile/manager-profile-live.tsx:28
    fallbackOwner: 'Un dueño',
  },
} as const;

export const profilePrivacyCopy = {
  en: {
    // src/components/legal/account-privacy-links.tsx:26
    heading: 'Privacy and terms',
    links: {
      // src/components/legal/account-privacy-links.tsx:12
      '/privacy': 'Privacy Policy',
      // src/components/legal/account-privacy-links.tsx:13
      '/terms': 'Terms of Use',
      // src/components/legal/account-privacy-links.tsx:14
      '/support': 'Support',
      // src/components/legal/account-privacy-links.tsx:15
      '/app/account/delete': 'Delete my account',
    },
  },
  es: {
    // src/components/legal/account-privacy-links.tsx:26
    heading: 'Privacidad y términos',
    links: {
      // src/components/legal/account-privacy-links.tsx:12
      '/privacy': 'Política de privacidad',
      // src/components/legal/account-privacy-links.tsx:13
      '/terms': 'Términos de uso',
      // src/components/legal/account-privacy-links.tsx:14
      '/support': 'Ayuda',
      // src/components/legal/account-privacy-links.tsx:15
      '/app/account/delete': 'Eliminar mi cuenta',
    },
  },
} as const;

export type ProfileLang = keyof typeof profileCopy;
export type ProfileWords = (typeof profileCopy)[ProfileLang];

export const topicCopy = {
  en: {
    // src/lib/management-profile.ts:3
    'time-off': {label:'Time-off requests',detail:'When someone asks for time off'},
    // src/lib/management-profile.ts:4
    'shift-changes': {label:'Shift requests',detail:'When someone asks to swap or give up a shift'},
    // src/lib/management-profile.ts:5
    'unable-to-work': {label:'Can’t work',detail:'When someone can’t make a shift'},
    // src/lib/management-profile.ts:6
    'clock-review': {label:'Clock-ins to review',detail:'When a clock-in needs your review'},
    // src/lib/management-profile.ts:7
    'payroll-ready': {label:'Payroll ready to review',detail:'When a pay period is ready for you'},
  },
  es: {
    // src/lib/management-profile.ts:3
    'time-off': {label:'Solicitudes de días libres',detail:'Cuando alguien pide días libres'},
    // src/lib/management-profile.ts:4
    'shift-changes': {label:'Cambios de turno',detail:'Cuando alguien pide cambiar o ceder un turno'},
    // src/lib/management-profile.ts:5
    'unable-to-work': {label:'No puedo trabajar',detail:'Cuando alguien no puede trabajar su turno'},
    // src/lib/management-profile.ts:6
    'clock-review': {label:'Entradas por revisar',detail:'Cuando un ponche de entrada requiere revisión'},
    // src/lib/management-profile.ts:7
    'payroll-ready': {label:'Nómina por revisar',detail:'Cuando un período de pago está listo para revisar'},
  },
} as const satisfies Record<ProfileLang, Record<string,{label:string;detail:string}>>;

export function localizedTopic(topic:ManagerAlertTopic,lang:ProfileLang):ManagerAlertTopic {
  if (lang === 'en' || !Object.hasOwn(topicCopy.en, topic.id)) return topic;
  const id = topic.id as keyof typeof topicCopy.en;
  return {...topic, ...topicCopy.es[id]};
}
