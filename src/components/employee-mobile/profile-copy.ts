/* Signed-in Spanish (Nov 23, 2026): the words on the Employee Profile and settings page and its pushed document frame
 * (profile.tsx), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Perfil",
 * "Cerrar sesión", passkey → "llave de acceso"). English is byte for byte what the page said before. The language
 * choices keep their own names ("English", "Español") in both languages, so they are not here. */
const en = {
  // src/components/employee-mobile/profile.tsx:21
  display: 'Display',
  // src/components/employee-mobile/profile.tsx:27
  language: 'Language',
  // src/components/employee-mobile/profile.tsx:27
  languageHint: 'Sign-in pages only. The rest of NEVORA is in English for now.',
  // src/components/employee-mobile/profile.tsx:30
  languageFailed: 'We couldn’t save your language. Try again.',
  // src/components/employee-mobile/profile.tsx:41
  more: 'More',
  // src/components/employee-mobile/profile.tsx:41
  title: 'Profile and settings',
  // src/components/employee-mobile/profile.tsx:59
  noscript: 'Enable JavaScript to view your profile and account settings.',
  // src/components/employee-mobile/profile.tsx:70
  signingOut: 'Signing out…',
  // src/components/employee-mobile/profile.tsx:41
  security: 'Security',
  // src/components/employee-mobile/profile.tsx:7
  account: 'Account',
  // src/components/employee-mobile/profile.tsx:76
  passkeys: 'Passkeys',
  // src/components/employee-mobile/profile.tsx:77
  deleteAccount: 'Delete my account',
  // src/components/employee-mobile/profile.tsx:8
  profile: 'Profile',
};
const es: typeof en = {
  // src/components/employee-mobile/profile.tsx:21
  display: 'Pantalla',
  // src/components/employee-mobile/profile.tsx:27
  language: 'Idioma',
  // src/components/employee-mobile/profile.tsx:27
  languageHint: 'Elige el idioma de tu cuenta.',
  // src/components/employee-mobile/profile.tsx:30
  languageFailed: 'No pudimos guardar el idioma. Inténtalo de nuevo.',
  // src/components/employee-mobile/profile.tsx:41
  more: 'Más',
  // src/components/employee-mobile/profile.tsx:41
  title: 'Perfil y configuración',
  // src/components/employee-mobile/profile.tsx:59
  noscript: 'Activa JavaScript para ver tu perfil y la configuración de tu cuenta.',
  // src/components/employee-mobile/profile.tsx:70
  signingOut: 'Cerrando sesión…',
  // src/components/employee-mobile/profile.tsx:41
  security: 'Seguridad',
  // src/components/employee-mobile/profile.tsx:7
  account: 'Cuenta',
  // src/components/employee-mobile/profile.tsx:76
  passkeys: 'Llaves de acceso',
  // src/components/employee-mobile/profile.tsx:77
  deleteAccount: 'Eliminar mi cuenta',
  // src/components/employee-mobile/profile.tsx:8
  profile: 'Perfil',
};
export const profileCopy = {en, es} as const;

export const copy = {
  en: {
    // src/components/employee-mobile/profile.tsx:24
    display: 'Display',
    // src/components/employee-mobile/profile.tsx:27
    language: 'Language',
    // src/components/employee-mobile/profile.tsx:27
    languageHint: 'Sign-in pages only. The rest of NEVORA is in English for now.',
    // src/components/employee-mobile/profile.tsx:29
    english: 'English',
    // src/components/employee-mobile/profile.tsx:29
    spanish: 'Español',
    // src/components/employee-mobile/profile.tsx:57, src/components/employee-mobile/profile.tsx:58
    profileSettings: 'Profile and settings',
    // src/components/employee-mobile/profile.tsx:59
    noscript: 'Enable JavaScript to view your profile and account settings.',
    // src/components/employee-mobile/profile.tsx:70
    signingOut: 'Signing out…',
    // src/components/employee-mobile/profile.tsx:74
    security: 'Security',
    // src/components/employee-mobile/profile.tsx:74
    account: 'Account',
    // src/components/employee-mobile/profile.tsx:76
    passkeys: 'Passkeys',
    // src/components/employee-mobile/profile.tsx:77
    deleteAccount: 'Delete my account',
    // src/components/employee-mobile/profile.tsx:96
    profile: 'Profile',
  },
  es: {
    // src/components/employee-mobile/profile.tsx:24
    display: 'Pantalla',
    // src/components/employee-mobile/profile.tsx:27
    language: 'Idioma',
    // src/components/employee-mobile/profile.tsx:27
    languageHint: 'Solo las páginas de inicio de sesión. El resto de NEVORA está en inglés por ahora.',
    // src/components/employee-mobile/profile.tsx:29
    english: 'Español',
    // src/components/employee-mobile/profile.tsx:29
    spanish: 'Español',
    // src/components/employee-mobile/profile.tsx:57, src/components/employee-mobile/profile.tsx:58
    profileSettings: 'Perfil y configuración',
    // src/components/employee-mobile/profile.tsx:59
    noscript: 'Activa JavaScript para ver tu perfil y los configuración de tu cuenta.',
    // src/components/employee-mobile/profile.tsx:70
    signingOut: 'Cerrando sesión…',
    // src/components/employee-mobile/profile.tsx:74
    security: 'Seguridad',
    // src/components/employee-mobile/profile.tsx:74
    account: 'Cuenta',
    // src/components/employee-mobile/profile.tsx:76
    passkeys: 'Llaves de acceso',
    // src/components/employee-mobile/profile.tsx:77
    deleteAccount: 'Eliminar mi cuenta',
    // src/components/employee-mobile/profile.tsx:96
    profile: 'Perfil',
  },
} as const;
