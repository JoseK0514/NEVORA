/* Signed-in Spanish (Nov 23, 2026): the words on Profile's "Personal info" card (profile-view.tsx), in English and Puerto
 * Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "localidad", "Iniciar sesión", "Intentar de
 * nuevo"). English is byte for byte what the card said before. The time zone row shows the zone's place name, which
 * reads the same in both languages. */
const en = {
  // src/components/employee-mobile/profile-view.tsx:14
  personalInfo: 'Personal info',
  // src/components/employee-mobile/profile-view.tsx:24
  workProfile: 'Your work profile',
  // src/components/employee-mobile/profile-view.tsx:22
  name: 'Name',
  // src/components/employee-mobile/profile-view.tsx:10
  employeeId: 'Employee ID',
  // src/components/employee-mobile/profile-view.tsx:26
  signInWithId: 'You sign in with this ID.',
  // src/components/employee-mobile/profile-view.tsx:27
  locations: 'Locations',
  // src/components/employee-mobile/profile-view.tsx:28
  timeZone: 'Time zone',
  // src/components/employee-mobile/profile-view.tsx:31
  paused: 'Profile paused. Return to this window while online to refresh.',
  // src/components/employee-mobile/profile-view.tsx:31
  denied: 'Your access changed. Sign in again to check your current details.',
  // src/components/employee-mobile/profile-view.tsx:31
  checking: 'Checking your current work details…',
  // src/components/employee-mobile/profile-view.tsx:31
  failed: 'We couldn’t load your details.',
  // src/components/employee-mobile/profile-view.tsx:31
  signIn: 'Sign in',
  // src/components/employee-mobile/profile-view.tsx:15
  tryAgain: 'Try again',
};
const es: typeof en = {
  // src/components/employee-mobile/profile-view.tsx:14
  personalInfo: 'Información personal',
  // src/components/employee-mobile/profile-view.tsx:24
  workProfile: 'Tu perfil de trabajo',
  // src/components/employee-mobile/profile-view.tsx:22
  name: 'Nombre',
  // src/components/employee-mobile/profile-view.tsx:10
  employeeId: 'ID de empleado',
  // src/components/employee-mobile/profile-view.tsx:26
  signInWithId: 'Inicias sesión con este ID.',
  // src/components/employee-mobile/profile-view.tsx:27
  locations: 'Localidades',
  // src/components/employee-mobile/profile-view.tsx:28
  timeZone: 'Zona horaria',
  // src/components/employee-mobile/profile-view.tsx:31
  paused: 'Perfil en pausa. Vuelve a esta ventana con conexión para actualizar.',
  // src/components/employee-mobile/profile-view.tsx:31
  denied: 'Tu acceso cambió. Inicia sesión de nuevo para ver tus datos actuales.',
  // src/components/employee-mobile/profile-view.tsx:31
  checking: 'Verificando tus datos de trabajo actuales…',
  // src/components/employee-mobile/profile-view.tsx:31
  failed: 'No pudimos cargar tus datos.',
  // src/components/employee-mobile/profile-view.tsx:31
  signIn: 'Iniciar sesión',
  // src/components/employee-mobile/profile-view.tsx:15
  tryAgain: 'Intentar de nuevo',
};
export const profileViewCopy = {en, es} as const;

export const copy = {
  en: {
    // src/components/employee-mobile/profile-view.tsx:23
    personalInfo: 'Personal info',
    // src/components/employee-mobile/profile-view.tsx:24
    workProfile: 'Your work profile',
    // src/components/employee-mobile/profile-view.tsx:25
    name: 'Name',
    // src/components/employee-mobile/profile-view.tsx:26
    employeeId: 'Employee ID',
    // src/components/employee-mobile/profile-view.tsx:26
    signInWithId: 'You sign in with this ID.',
    // src/components/employee-mobile/profile-view.tsx:27
    locations: 'Locations',
    // src/components/employee-mobile/profile-view.tsx:28
    timeZone: 'Time zone',
    // src/components/employee-mobile/profile-view.tsx:31
    paused: 'Profile paused. Return to this window while online to refresh.',
    // src/components/employee-mobile/profile-view.tsx:31
    denied: 'Your access changed. Sign in again to check your current details.',
    // src/components/employee-mobile/profile-view.tsx:31
    checking: 'Checking your current work details…',
    // src/components/employee-mobile/profile-view.tsx:31
    failed: 'We couldn’t load your details.',
    // src/components/employee-mobile/profile-view.tsx:32
    signIn: 'Sign in',
    // src/components/employee-mobile/profile-view.tsx:32
    tryAgain: 'Try again',
  },
  es: {
    // src/components/employee-mobile/profile-view.tsx:23
    personalInfo: 'Información personal',
    // src/components/employee-mobile/profile-view.tsx:24
    workProfile: 'Tu perfil de trabajo',
    // src/components/employee-mobile/profile-view.tsx:25
    name: 'Nombre',
    // src/components/employee-mobile/profile-view.tsx:26
    employeeId: 'ID de empleado',
    // src/components/employee-mobile/profile-view.tsx:26
    signInWithId: 'Inicias sesión con este ID.',
    // src/components/employee-mobile/profile-view.tsx:27
    locations: 'Localidades',
    // src/components/employee-mobile/profile-view.tsx:28
    timeZone: 'Zona horaria',
    // src/components/employee-mobile/profile-view.tsx:31
    paused: 'Perfil en pausa. Vuelve a esta ventana con conexión para actualizar.',
    // src/components/employee-mobile/profile-view.tsx:31
    denied: 'Tu acceso cambió. Inicia sesión de nuevo para ver tus datos actuales.',
    // src/components/employee-mobile/profile-view.tsx:31
    checking: 'Verificando tus datos de trabajo actuales…',
    // src/components/employee-mobile/profile-view.tsx:31
    failed: 'No pudimos cargar tus datos.',
    // src/components/employee-mobile/profile-view.tsx:32
    signIn: 'Iniciar sesión',
    // src/components/employee-mobile/profile-view.tsx:32
    tryAgain: 'Intentar de nuevo',
  },
} as const;
