/* Signed-in Spanish (es-rest): the Profile row's own words for Face ID and passkeys (the rest is in
 * src/lib/passkeys/copy.ts). The English is word for word what the row said before. */
const en = {
  faceId: 'Face ID', passkeys: 'Passkeys', notSetUp: 'Not set up', setUpCount: (n: number) => `${n} set up`,
};
const es: typeof en = {
  faceId: 'Face ID', passkeys: 'Llaves de acceso', notSetUp: 'Sin configurar', setUpCount: (n: number) => `${n} configuradas`,
};
export const PASSKEY_ROW_COPY = {en, es};
