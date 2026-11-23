import { cache } from 'react';
import { readPortalLanguage } from '@/lib/activation/language.server';
import { readSessionMutationProof } from '@/lib/auth/session';
import type { PortalLang } from './portal-lang';

/** Signed-in Spanish (es-rest): the person's language for a server component, the same read the app layout gives
 * `PortalLangProvider` (`readPortalLanguage`: Profile choice, then the `nv-lang` cookie, then the browser's). Cached per
 * request, so a page and its parts share one read. English when there is no session or the read fails. */
export const readPageLang = cache(async (): Promise<PortalLang> => {
  try {
    const proof = await readSessionMutationProof();
    if (!proof) return 'en';
    return (await readPortalLanguage(proof)).language === 'es' ? 'es' : 'en';
  } catch {
    return 'en';
  }
});
