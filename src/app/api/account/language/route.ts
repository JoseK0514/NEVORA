import { readSessionMutationProof } from '@/lib/auth/session';
import { isManagementAuthorizationError } from '@/lib/data/management-session';
import { parseLanguagePreference, resolveUserLanguage } from '@/lib/activation/language';
import { readPortalLanguage, saveUserLanguage } from '@/lib/activation/language.server';
import { correctionBoundaryResponse, correctionJson, readCorrectionJson } from '@/lib/time-corrections/http.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const intent = 'x-nevora-language-preference';
const bodyLimit = 128;
const unavailable = { state: 'unavailable' } as const;

async function languageRequest(request: Request, write: boolean): Promise<Response> {
  const denied = correctionBoundaryResponse(request, write, intent, bodyLimit);
  if (denied) return denied;
  try {
    const proof = await readSessionMutationProof();
    if (!proof) return correctionJson(unavailable, 401);
    if (!write) return correctionJson(await readPortalLanguage(proof));

    const language = parseLanguagePreference(await readCorrectionJson(request, bodyLimit).catch(() => null));
    if (!language) return correctionJson({ state: 'invalid' }, 400);
    const saved = await saveUserLanguage(proof, language);
    return correctionJson(resolveUserLanguage(saved, saved));
  } catch (error) {
    return correctionJson(unavailable, isManagementAuthorizationError(error) ? 403 : 503);
  }
}

export const GET = (request: Request) => languageRequest(request, false);
export const PUT = (request: Request) => languageRequest(request, true);
