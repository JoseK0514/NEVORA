/* Signed-in Spanish (Nov 23, 2026): the words on the Employee Profile and settings page and its pushed document frame
 * (profile.tsx), in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Perfil",
 * "Cerrar sesión", passkey → "llave de acceso"). English is byte for byte what the page said before. The language
 * choices keep their own names ("English", "Español") in both languages, so they are not here. */
const en = {
  display: 'Display', language: 'Language',
  more: 'More', title: 'Profile and settings',
  noscript: 'Enable JavaScript to view your profile and account settings.',
  signingOut: 'Signing out…',
  security: 'Security', account: 'Account', passkeys: 'Passkeys', deleteAccount: 'Delete my account',
  profile: 'Profile',
};
const es: typeof en = {
  display: 'Pantalla', language: 'Idioma',
  more: 'Más', title: 'Perfil y ajustes',
  noscript: 'Activa JavaScript para ver tu perfil y los ajustes de tu cuenta.',
  signingOut: 'Cerrando sesión…',
  security: 'Seguridad', account: 'Cuenta', passkeys: 'Llaves de acceso', deleteAccount: 'Eliminar mi cuenta',
  profile: 'Perfil',
};
export const profileCopy = {en, es};
