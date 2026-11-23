/* Signed-in Spanish (Nov 23, 2026): the words Pick up and swap's shell draws itself (exchange.tsx): the first frame while
 * the phone screen loads and the card for an earlier response that still needs checking, in English and Puerto Rico
 * Spanish (docs/design/voice.md: tú, sentence case, "Verificando…", "Cargando…"). The list and request pages keep their
 * words in exchange-view.ts. English is byte for byte what the screen said before. */
const en={
 previousChecking:'Your previous response is being checked.',
 previousMaybeSaved:'A previous response may have been saved. Check its status before sending it again.',
 unconfirmed:'Unconfirmed response',
 checkPrevious:'Check previous response',
 loading:'Loading requests…',
 checking:'Checking your current requests…',
};
const es:typeof en={
 previousChecking:'Estamos verificando tu respuesta anterior.',
 previousMaybeSaved:'Puede que se haya guardado una respuesta anterior. Verifica su estado antes de enviarla de nuevo.',
 unconfirmed:'Respuesta sin confirmar',
 checkPrevious:'Verificar respuesta anterior',
 loading:'Cargando solicitudes…',
 checking:'Verificando tus solicitudes actuales…',
};
export const exchangeCopy={en,es};
